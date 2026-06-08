/**
 * Google Gemini API と連携してサンプルデータを自動生成するユーティリティ
 */
import { buildSingleTableResponseSchema, buildSingleTableDerivationSchema } from './aiSchemaBuilder.js';
import { buildSingleTablePrompt, buildSingleTableDerivationPrompt } from './aiPromptBuilder.js';

/**
 * レートリミット（429）やサーバー一時エラーに対応するための指数バックオフ付き自動リトライfetch
 */
const fetchWithRetry = async (url, options, maxRetries = 7) => {
    let delay = 10000; // 無料枠の1分間制限をクリアするため、初期待機時間は強気の10秒
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            // 429 (Too Many Requests) または 5xx サーバー一時エラーを検知
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
                if (i === maxRetries - 1) {
                    return response; // 上限に達した場合はそのまま返して呼び出し元に任せる
                }
                console.warn(`[Gemini API] ステータス ${response.status} (アクセス制限) を検出。制限解除のため ${delay}ms 待機し、自動リトライします... (試行 ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2.0; // 指数バックオフ (5s -> 10s -> 20s -> 40s)
                continue;
            }
            return response;
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            console.warn(`[Gemini API] 通信エラー: ${err.message}。${delay}ms 後に自動リトライします... (試行 ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2.0;
        }
    }
};

/**
 * テーブル間の依存関係を解析し、トポロジカルソートされたレベルごとの配列を返す
 * @param {Array} tables テーブル定義配列
 * @param {Array} relationships リレーションシップ定義配列
 * @returns {Array<Array<Object>>} 依存関係レベルごとのテーブル配列
 */
export const getDependencyLevels = (tables, relationships) => {
    const dependencyMap = {};
    const tableMap = {};

    tables.forEach(t => {
        tableMap[t.id] = t;
        dependencyMap[t.id] = new Set();
    });

    // 1. カラムの参照関係から親子関係（FK）を抽出して依存マッピング
    tables.forEach(t => {
        t.columns.forEach(col => {
            if (col.isFk && col.reference?.tableId && col.reference.tableId !== t.id) {
                if (tableMap[col.reference.tableId]) {
                    dependencyMap[t.id].add(col.reference.tableId);
                }
            }
        });
    });

    // 2. リレーションシップ定義からも依存関係を補強
    relationships.forEach(r => {
        if (r.from && r.to && r.from !== r.to) {
            if (tableMap[r.from] && tableMap[r.to]) {
                dependencyMap[r.to].add(r.from);
            }
        }
    });

    // トポロジカルソートを実行し、依存レベルごとにグループ化
    const levels = [];
    const processed = new Set();
    let remaining = [...tables];

    while (remaining.length > 0) {
        // 全ての依存テーブルがすでに処理済みのテーブルを抽出
        const currentLevel = remaining.filter(t => {
            const deps = dependencyMap[t.id];
            for (const depId of deps) {
                if (!processed.has(depId)) {
                    return false;
                }
            }
            return true;
        });

        // 循環参照などで依存が解決しないデッドロック時は、残りを全て次のレベルとして強制追加
        if (currentLevel.length === 0) {
            levels.push(remaining);
            break;
        }

        levels.push(currentLevel);
        currentLevel.forEach(t => processed.add(t.id));
        remaining = remaining.filter(t => !processed.has(t.id));
    }

    return levels;
};

/**
 * 単一テーブルの導出計算用APIコール関数
 */
const calculateSingleTableDerivations = async (table, currentTableData, allGeneratedData, apiKey, tables) => {
    const prompt = buildSingleTableDerivationPrompt(table, currentTableData, allGeneratedData, tables);
    const responseSchema = buildSingleTableDerivationSchema(table, allGeneratedData);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2 // 計算・引き写しタスクなので、温度は低くして決定論的にする
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API Error for table ${table.name} (Derivations):`, errText);
        throw new Error(`テーブル '${table.name}' の導出計算に失敗しました: ${response.status}`);
    }

    const json = await response.json();
    
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        
        if (!parsed.rows || !Array.isArray(parsed.rows)) {
            throw new Error("返却されたデータフォーマットが無効です。'rows'配列がありません。");
        }
        
        return parsed.rows;
    } catch (e) {
        console.error(`JSON parsing error for table ${table.name} (Derivations):`, e);
        throw new Error(`テーブル '${table.name}' の導出計算レスポンスJSON解析に失敗しました。`);
    }
};

/**
 * 単一のテーブルのデータをAIで生成するヘルパー関数
 */
const generateSingleTableData = async (table, relationships, parentData, apiKey, rowCount, aiInstructions = '', includeDependent = false) => {
    const prompt = buildSingleTablePrompt(table, relationships, parentData, rowCount, aiInstructions, includeDependent);
    const responseSchema = buildSingleTableResponseSchema(table, parentData, includeDependent);

    // REST API エンドポイント (Gemini 2.5 Flash モデルを使用)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.7
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API Error for table ${table.name}:`, errText);
        throw new Error(`テーブル '${table.name}' の生成に失敗しました: ${response.status}`);
    }

    const json = await response.json();
    
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        
        if (!parsed.rows || !Array.isArray(parsed.rows)) {
            throw new Error("返却されたデータフォーマットが無効です。'rows'配列がありません。");
        }
        
        return parsed.rows;
    } catch (e) {
        console.error(`JSON parsing error for table ${table.name}:`, e);
        throw new Error(`テーブル '${table.name}' のAIレスポンスJSON解析に失敗しました。`);
    }
};

/**
 * Gemini API を呼び出してデータを自動生成する（トポロジカル並列生成）
 * @param {Array} tables テーブル定義配列
 * @param {Array} relationships リレーションシップ定義配列
 * @param {string} apiKey Gemini API キー
 * @param {number} [rowCount=3] 各テーブルの生成行数
 * @param {string} [aiInstructions=''] ユーザーからのAIへの追加指示
 * @returns {Promise<Object>} 生成されたテーブルデータオブジェクト { [tableId]: [rows] }
 */
export const generateMockDataWithAI = async (tables, relationships, apiKey, rowCount = 3, aiInstructions = '') => {
    if (!apiKey) {
        throw new Error("APIキーが設定されていません。");
    }

    // 1. 依存ツリー解析とトポロジカルソートを実行
    const levels = getDependencyLevels(tables, relationships);
    console.log(`[RDB Mock Data Generator] トポロジカルソート完了。依存レベル数: ${levels.length}`);
    levels.forEach((level, idx) => {
        console.log(` - Level ${idx}: ${level.map(t => t.name).join(', ')}`);
    });

    const allGeneratedData = {};

    // 2. 第1段階: レベル順に生成処理を進める（導出項目は除外して生成）
    for (let i = 0; i < levels.length; i++) {
        const levelTables = levels[i];
        console.log(`[RDB Mock Data Generator] 第1段階: Level ${i} のテーブル生成を開始... (${levelTables.map(t => t.name).join(', ')})`);

        for (let j = 0; j < levelTables.length; j++) {
            const table = levelTables[j];
            
            // 同時アクセス集中を防ぐため、2回目以降のリクエスト送信前に 5000ms の確定インターバルを挟む
            if (i > 0 || j > 0) {
                console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 5000ms 待機中...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            try {
                const rows = await generateSingleTableData(table, relationships, allGeneratedData, apiKey, rowCount, aiInstructions, false);
                allGeneratedData[table.id] = rows;
                console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の生成が完了しました（${rows.length}件）`);
            } catch (err) {
                console.error(`[RDB Mock Data Generator] テーブル '${table.name}' の生成中にエラーが発生しました:`, err);
                throw err;
            }
        }
    }

    // 1段階目で生成された各行に、導出項目の初期値（空文字列）を設定しておく
    tables.forEach(table => {
        const dependentCols = table.columns.filter(c => c.attributeType === 'dependent');
        if (dependentCols.length > 0 && allGeneratedData[table.id]) {
            allGeneratedData[table.id] = allGeneratedData[table.id].map(row => {
                const updatedRow = { ...row };
                dependentCols.forEach(col => {
                    if (updatedRow[col.id] === undefined) {
                        updatedRow[col.id] = "";
                    }
                });
                return updatedRow;
            });
        }
    });

    // 3. 第2段階: トポロジカルソート逆順（子 → 親）で導出項目を算出
    console.log("[RDB Mock Data Generator] 第1フェーズ完了。クールダウンのため 5000ms 待機します...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("[RDB Mock Data Generator] 第2段階: 導出項目の計算を開始します...");
    const reverseLevels = levels.slice().reverse();
    let derivationCallCount = 0;

    for (let i = 0; i < reverseLevels.length; i++) {
        const levelTables = reverseLevels[i];
        for (let j = 0; j < levelTables.length; j++) {
            const table = levelTables[j];
            
            // 導出項目が存在するかチェック
            const hasDerivation = table.columns.some(c => c.attributeType === 'dependent');
            if (!hasDerivation) continue;

            console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の導出計算を開始...`);

            // 同時アクセス集中を防ぐため、2回目以降のリクエスト送信前に 5000ms の確定インターバルを挟む
            if (derivationCallCount > 0) {
                console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 5000ms 待機中...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            try {
                let currentTableData = allGeneratedData[table.id] || [];

                // orderBy 設定が定義されている場合は、JavaScript 側であらかじめソートする
                if (table.orderBy && table.orderBy.type && currentTableData.length > 0) {
                    let sortKeys = [];
                    
                    if (table.orderBy.keys && table.orderBy.keys.length > 0) {
                        sortKeys = table.orderBy.keys;
                    } else {
                        // 互換性フォールバック（旧データ等で keys 配列がない場合）
                        let sortColIds = [];
                        if (table.orderBy.type === 'pk') {
                            sortColIds = table.columns.filter(c => c.isPk).map(c => c.id);
                        } else if (table.orderBy.type === 'uq' && table.orderBy.uqId) {
                            const targetUq = table.uniqueKeys?.find(uq => uq.id === table.orderBy.uqId);
                            sortColIds = targetUq ? (targetUq.columnIds || []) : [];
                        }
                        
                        const defaultDir = table.orderBy.direction || 'ASC';
                        sortKeys = sortColIds.map(cid => ({
                            columnId: cid,
                            direction: table.orderBy.directions?.[cid] || defaultDir
                        }));
                    }

                    if (sortKeys.length > 0) {
                        currentTableData = [...currentTableData].sort((a, b) => {
                            for (const keyInfo of sortKeys) {
                                const colId = keyInfo.columnId;
                                const dir = keyInfo.direction || 'ASC';

                                const valA = a[colId] !== undefined ? String(a[colId]) : '';
                                const valB = b[colId] !== undefined ? String(b[colId]) : '';

                                const numA = Number(valA);
                                const numB = Number(valB);

                                let diff = 0;
                                if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
                                    diff = dir === 'DESC' ? numB - numA : numA - numB;
                                } else {
                                    diff = dir === 'DESC' ? valB.localeCompare(valA) : valA.localeCompare(valB);
                                }

                                // 現在のカラムで差が出た場合はその比較結果を返す
                                if (diff !== 0) return diff;
                            }
                            return 0;
                        });
                    }
                }

                if (currentTableData.length > 0) {
                    const calculatedRows = await calculateSingleTableDerivations(table, currentTableData, allGeneratedData, apiKey, tables);
                    
                    // 主キー（ただし導出項目は除く）をベースに計算結果を元のデータにマージする
                    const pkCols = table.columns.filter(col => col.isPk && col.attributeType !== 'dependent');
                    
                    allGeneratedData[table.id] = currentTableData.map((row, idx) => {
                        let match = null;
                        if (pkCols.length === 0) {
                            // 主キーが定義されていないテーブルの場合はインデックスベースでマッチング
                            match = calculatedRows[idx];
                        } else {
                            match = calculatedRows.find(r => {
                                return pkCols.every(pkCol => {
                                    return r[pkCol.id] !== undefined && row[pkCol.id] !== undefined && String(r[pkCol.id]) === String(row[pkCol.id]);
                                });
                            });
                        }

                        if (match) {
                            const merged = { ...row };
                            table.columns.forEach(col => {
                                if (col.attributeType === 'dependent' && match[col.id] !== undefined) {
                                    merged[col.id] = match[col.id];
                                }
                            });
                            return merged;
                        }
                        return row;
                    });
                    
                    console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の導出計算が完了しました`);
                    derivationCallCount++;
                }
            } catch (err) {
                console.error(`[RDB Mock Data Generator] テーブル '${table.name}' の導出計算中にエラーが発生しました:`, err);
                throw err;
            }
        }
    }

    return allGeneratedData;
};
