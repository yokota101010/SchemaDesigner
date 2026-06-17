/**
 * Google Gemini API と連携してサンプルデータを自動生成するユーティリティ
 */
import { buildSingleTableResponseSchema, buildSingleTableDerivationSchema, buildInitialValueParsingSchema } from './aiSchemaBuilder.js';
import { buildSingleTablePrompt, buildSingleTableDerivationPrompt, buildInitialValueParsingPrompt } from './aiPromptBuilder.js';

const parseAndApplyInitialValues = async (tables, initialInstructions, apiKey) => {
    const prompt = buildInitialValueParsingPrompt(tables, initialInstructions);
    const responseSchema = buildInitialValueParsingSchema(tables);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
                temperature: 0.1
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API Error for Initial Value Parsing:`, errText);
        throw new Error(`初期値の事前解析に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        return parsed.tables || {};
    } catch (e) {
        console.error("JSON parsing error for Initial Value Parsing:", e);
        throw new Error("初期値解析レスポンスのJSONパースに失敗しました。");
    }
};

const GEMINI_MODEL = 'gemini-2.5-flash';

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
                if (response.status === 429) {
                    try {
                        const clonedResponse = response.clone();
                        const errJson = await clonedResponse.json();
                        const errMsg = errJson?.error?.message || "";
                        if (errMsg.toLowerCase().includes("day") || errMsg.toLowerCase().includes("daily")) {
                            console.error(`[Gemini API] 1日の利用上限（Daily Quota）に達したため、リトライを中止します: ${errMsg}`);
                            return response; // リトライを中断して即座に返す
                        }
                    } catch (jsonErr) {
                        // JSONパースに失敗した場合は何もしない
                    }
                }

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
const calculateSingleTableDerivations = async (table, currentTableData, allGeneratedData, apiKey, tables, otherInstructions = '') => {
    const prompt = buildSingleTableDerivationPrompt(table, currentTableData, allGeneratedData, tables, otherInstructions);
    const responseSchema = buildSingleTableDerivationSchema(table, allGeneratedData);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
        let errMsg = `テーブル '${table.name}' の導出計算に失敗しました (${response.status})`;
        try {
            const errJson = JSON.parse(errText);
            const apiErrMsg = errJson?.error?.message || "";
            if (apiErrMsg.toLowerCase().includes("day") || apiErrMsg.toLowerCase().includes("daily") || apiErrMsg.toLowerCase().includes("quota")) {
                errMsg = `Gemini APIの1日の利用上限（Daily Quota）に達したため、テーブル '${table.name}' の導出計算に失敗しました。明日以降に再度お試しください。`;
            } else if (apiErrMsg) {
                errMsg += `: ${apiErrMsg}`;
            }
        } catch (e) {
            // パース失敗時はデフォルトのエラーメッセージ
        }
        throw new Error(errMsg);
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
const generateSingleTableData = async (table, relationships, parentData, apiKey, rowCount, otherInstructions = '', includeDependent = false) => {
    const prompt = buildSingleTablePrompt(table, relationships, parentData, rowCount, otherInstructions, includeDependent);
    const responseSchema = buildSingleTableResponseSchema(table, parentData, includeDependent);

    // REST API エンドポイント (Gemini 2.5 Flash-Lite モデルを使用)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
        let errMsg = `テーブル '${table.name}' の生成に失敗しました (${response.status})`;
        try {
            const errJson = JSON.parse(errText);
            const apiErrMsg = errJson?.error?.message || "";
            if (apiErrMsg.toLowerCase().includes("day") || apiErrMsg.toLowerCase().includes("daily") || apiErrMsg.toLowerCase().includes("quota")) {
                errMsg = `Gemini APIの1日の利用上限（Daily Quota）に達したため、テーブル '${table.name}' の生成に失敗しました。明日以降に再度お試しください。`;
            } else if (apiErrMsg) {
                errMsg += `: ${apiErrMsg}`;
            }
        } catch (e) {
            // パース失敗時はデフォルトのエラーメッセージ
        }
        throw new Error(errMsg);
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
 * @param {number} [rowCount=3] 各テーブル of 生成行数
 * @param {string} [aiInstructions=''] ユーザーからのAIへの追加指示
 * @returns {Promise<Object>} 生成されたテーブルデータオブジェクト { [tableId]: [rows] }
 */
/**
 * 導出カラムが第1段階（親から子へのトポロジカル生成順）で計算可能かを判定する
 * @param {Object} col 判定対象のカラム定義
 * @param {Object} table 判定対象のカラムが所属するテーブル
 * @param {Array} tables 全テーブルの定義配列
 * @param {Object} tableLevelMap 各テーブルIDとその依存レベル（インデックス）のマップ
 * @returns {boolean} 第1段階で計算可能であれば true
 */
const isFirstPhaseCalculableColumn = (col, table, tables, tableLevelMap) => {
    if (col.attributeType !== 'dependent') return false;
    const derivationText = col.derivation || '';
    
    const selfLevel = tableLevelMap[table.id];
    
    const otherTables = tables.filter(t => t.id !== table.id);
    for (const otherTable of otherTables) {
        const escapedName = otherTable.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedName, 'i');
        if (regex.test(derivationText)) {
            // 他のテーブルを参照している場合、そのテーブルの依存レベルを取得
            const otherLevel = tableLevelMap[otherTable.id];
            
            // もし参照先テーブルが自分と同じレベル、または自分より下流（レベル値が大きい）の場合は、
            // 第1段階では計算できない（相互参照や集約など）ため、第1段階での計算対象外とする
            if (otherLevel === undefined || otherLevel >= selfLevel) {
                return false;
            }
        }
    }
    
    // 自分自身のテーブル名が登場する場合のチェック（時系列ループなどの自己参照）
    const escapedSelfName = table.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const selfRegex = new RegExp(escapedSelfName, 'i');
    if (selfRegex.test(derivationText)) {
        return false;
    }
    
    return true;
};

export const generateMockDataWithAI = async (tables, relationships, apiKey, rowCount = 3, initialInstructions = '', otherInstructions = '') => {
    if (!apiKey) {
        throw new Error("APIキーが設定されていません。");
    }

    // 1. 依存ツリー解析とトポロジカルソートを実行
    const levels = getDependencyLevels(tables, relationships);
    console.log(`[RDB Mock Data Generator] トポロジカルソート完了。依存レベル数: ${levels.length}`);
    levels.forEach((level, idx) => {
        console.log(` - Level ${idx}: ${level.map(t => t.name).join(', ')}`);
    });

    // 2. 各テーブルのレベルインデックスをマップ化する
    const tableLevelMap = {};
    levels.forEach((level, idx) => {
        level.forEach(t => {
            tableLevelMap[t.id] = idx;
        });
    });

    // 3. 各テーブルの導出カラムについて、第一段階で解決可能かどうかを判定してフラグをセット
    tables.forEach(table => {
        table.columns.forEach(col => {
            col.isFirstPhaseCalculable = isFirstPhaseCalculableColumn(col, table, tables, tableLevelMap);
        });
    });

    const allGeneratedData = {};

    // ★ 初期値の事前解析フェーズ
    let initialParsedData = {};
    if (initialInstructions && initialInstructions.trim() !== '') {
        console.log(`[RDB Mock Data Generator] 初期値の事前解析を開始します...`);
        try {
            initialParsedData = await parseAndApplyInitialValues(tables, initialInstructions, apiKey);
            console.log(`[RDB Mock Data Generator] 初期値の解析が完了しました。解析されたテーブル:`, Object.keys(initialParsedData));
        } catch (err) {
            console.error(`[RDB Mock Data Generator] 初期値解析中にエラーが発生しました:`, err);
            throw err;
        }
    }

    // 各テーブルの初期行を設定する
    tables.forEach(table => {
        const initialRows = initialParsedData[table.id] || [];
        if (initialRows.length > 0) {
            allGeneratedData[table.id] = initialRows.map((row, idx) => ({
                id: `row_ai_init_${Date.now()}_${idx}`,
                ...row
            }));
            console.log(`[RDB Mock Data Generator] テーブル '${table.name}' に初期値レコードを適用しました（${initialRows.length}件）`);
        } else {
            allGeneratedData[table.id] = [];
        }
    });

    let firstPhaseCallCount = 0;

    // 2. 第1段階: レベル順に生成処理を進める（導出項目は除外して生成）
    for (let i = 0; i < levels.length; i++) {
        const levelTables = levels[i];
        console.log(`[RDB Mock Data Generator] 第1段階: Level ${i} のテーブル生成を開始... (${levelTables.map(t => t.name).join(', ')})`);

        for (let j = 0; j < levelTables.length; j++) {
            const table = levelTables[j];
            
            // 同時アクセス集中を防ぐため、リクエスト送信前に 5000ms の確定インターバルを挟む
            if (firstPhaseCallCount > 0 || (initialInstructions && initialInstructions.trim() !== '')) {
                console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 5000ms 待機中...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            try {
                // すでに設定されている初期レコードがある場合、それを Existing Mock Data として提示するために
                // table.rows を一時的に差し替えたオブジェクトを生成関数に渡す。
                const tableWithInitial = {
                    ...table,
                    rows: allGeneratedData[table.id] || []
                };

                const generatedRows = await generateSingleTableData(tableWithInitial, relationships, allGeneratedData, apiKey, rowCount, otherInstructions, false);
                
                // 生成された行と、既存の初期値行をマージする。
                const existingRows = allGeneratedData[table.id] || [];
                const pkCols = table.columns.filter(col => col.isPk);

                const finalRows = [...existingRows];
                
                generatedRows.forEach(newRow => {
                    const isDuplicate = existingRows.some(exRow => {
                        if (pkCols.length === 0) return false;
                        return pkCols.every(pkCol => {
                            return exRow[pkCol.id] !== undefined && newRow[pkCol.id] !== undefined && String(exRow[pkCol.id]) === String(newRow[pkCol.id]);
                        });
                    });

                    if (!isDuplicate) {
                        finalRows.push({
                            id: `row_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            ...newRow
                        });
                    }
                });

                allGeneratedData[table.id] = finalRows;
                console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の生成が完了しました（合計: ${finalRows.length}件、追加: ${generatedRows.length}件）`);
                firstPhaseCallCount++;
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
            
            // 第二段階で計算すべき導出項目（第一段階で解決できなかったもの）が存在するかチェック
            const hasSecondPhaseDerivation = table.columns.some(c => c.attributeType === 'dependent' && !c.isFirstPhaseCalculable);
            if (!hasSecondPhaseDerivation) continue;

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
                    const calculatedRows = await calculateSingleTableDerivations(table, currentTableData, allGeneratedData, apiKey, tables, otherInstructions);
                    
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
