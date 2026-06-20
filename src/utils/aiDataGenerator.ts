/**
 * Google Gemini API と連携してサンプルデータを自動生成するユーティリティ
 */
import { buildSingleTableResponseSchema, buildSingleTableDerivationSchema, buildInitialValueParsingSchema, buildAllTablesResponseSchema, buildAllTablesDerivationSchema } from './aiSchemaBuilder';
import { buildSingleTablePrompt, buildSingleTableDerivationPrompt, buildInitialValueParsingPrompt, buildAllTablesPrompt, buildAllTablesDerivationPrompt } from './aiPromptBuilder';
import { Table, Relationship, ValueObjectPreset } from '../types';

const GEMINI_MODEL = 'gemini-2.5-flash';

const parseAndApplyInitialValues = async (tables: Table[], initialInstructions: string, apiKey: string): Promise<any> => {
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

/**
 * レートリミット（429）やサーバー一時エラーに対応するための指数バックオフ付き自動リトライfetch
 */
const fetchWithRetry = async (url: string, options: any, maxRetries = 7): Promise<Response> => {
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
        } catch (err: any) {
            if (i === maxRetries - 1) throw err;
            console.warn(`[Gemini API] 通信エラー: ${err.message}。${delay}ms 後に自動リトライします... (試行 ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2.0;
        }
    }
    throw new Error("Fetch failed after maximum retries");
};

/**
 * テーブル間の依存関係を解析し、トポロジカルソートされたレベルごとの配列を返す
 */
export const getDependencyLevels = (tables: Table[], relationships: Relationship[]): Table[][] => {
    const dependencyMap: Record<string, Set<string>> = {};
    const tableMap: Record<string, Table> = {};

    tables.forEach(t => {
        tableMap[t.id] = t;
        dependencyMap[t.id] = new Set<string>();
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
    const levels: Table[][] = [];
    const processed = new Set<string>();
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
const calculateSingleTableDerivations = async (
  table: Table, 
  currentTableData: any[], 
  allGeneratedData: Record<string, any[]>, 
  apiKey: string, 
  tables: Table[], 
  otherInstructions = ''
): Promise<any[]> => {
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
const generateSingleTableData = async (
  table: Table, 
  relationships: Relationship[], 
  parentData: Record<string, any[]>, 
  apiKey: string, 
  rowCount: number, 
  otherInstructions = '', 
  includeDependent = false,
  valueObjects: ValueObjectPreset[] = []
): Promise<any[]> => {
    const prompt = buildSingleTablePrompt(table, relationships, parentData, rowCount, otherInstructions, includeDependent, valueObjects);
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

const generateAllTablesData = async (
  tables: Table[], 
  relationships: Relationship[], 
  parentData: Record<string, any[]>, 
  apiKey: string, 
  rowCount: number, 
  otherInstructions = '',
  valueObjects: ValueObjectPreset[] = []
): Promise<any> => {
    const prompt = buildAllTablesPrompt(tables, relationships, parentData, rowCount, otherInstructions, valueObjects);
    const responseSchema = buildAllTablesResponseSchema(tables);

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
        console.error(`Gemini API Error for all tables generation:`, errText);
        throw new Error(`一括モックデータの生成に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        return parsed;
    } catch (e) {
        console.error(`JSON parsing error for all tables generation:`, e);
        throw new Error(`一括モックデータ生成レスポンスのJSON解析に失敗しました。`);
    }
};

const calculateAllTablesDerivations = async (
  tables: Table[], 
  allGeneratedData: Record<string, any[]>, 
  apiKey: string, 
  otherInstructions = ''
): Promise<any> => {
    const prompt = buildAllTablesDerivationPrompt(tables, allGeneratedData, otherInstructions);
    const responseSchema = buildAllTablesDerivationSchema(tables);

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
        console.error(`Gemini API Error for all tables derivation:`, errText);
        throw new Error(`一括導出計算に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        return parsed;
    } catch (e) {
        console.error(`JSON parsing error for all tables derivation:`, e);
        throw new Error(`一括導出計算レスポンスのJSON解析に失敗しました。`);
    }
};

export const generateMockDataWithAI = async (
  tables: Table[], 
  relationships: Relationship[], 
  apiKey: string, 
  rowCount = 3, 
  initialInstructions = '', 
  otherInstructions = '',
  valueObjects: ValueObjectPreset[] = []
): Promise<Record<string, any[]>> => {
    if (!apiKey) {
        throw new Error("APIキーが設定されていません。");
    }

    const allGeneratedData: Record<string, any[]> = {};

    // 1. 初期値の事前解析フェーズ
    let initialParsedData: Record<string, any[]> = {};
    if (initialInstructions && initialInstructions.trim() !== '') {
        console.log(`[RDB Mock Data Generator] 初期値の事前解析を開始します...`);
        try {
            initialParsedData = await parseAndApplyInitialValues(tables, initialInstructions, apiKey);
            console.log(`[RDB Mock Data Generator] 初期値の解析が完了しました。`);
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

    // 2. 第1段階: 全テーブルのデータ一括生成（生の入力項目のみ）
    console.log(`[RDB Mock Data Generator] 第1段階: 全テーブルの一括データ生成を開始...`);
    try {
        if (initialInstructions && initialInstructions.trim() !== '') {
            console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 5000ms 待機中...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        const generatedData = await generateAllTablesData(tables, relationships, allGeneratedData, apiKey, rowCount, otherInstructions, valueObjects);

        // 生成された各テーブルのデータをマージする
        tables.forEach(table => {
            const generatedRows = generatedData[table.id] || [];
            const existingRows = allGeneratedData[table.id] || [];
            const pkCols = table.columns.filter(col => col.isPk);

            const finalRows = [...existingRows];
            generatedRows.forEach((newRow: any) => {
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

            // 導出カラムの初期値（空文字列）を設定する
            const dependentCols = table.columns.filter(c => c.attributeType === 'dependent' && !table.columns.some(x => x.parentColumnId === c.id));
            allGeneratedData[table.id] = finalRows.map(row => {
                const updatedRow = { ...row };
                dependentCols.forEach(col => {
                    if (updatedRow[col.id] === undefined) {
                        updatedRow[col.id] = "";
                    }
                });
                return updatedRow;
            });

            console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の一括生成が完了しました（合計: ${allGeneratedData[table.id].length}件）`);
        });
    } catch (err) {
        console.error(`[RDB Mock Data Generator] 一括データ生成中にエラーが発生しました:`, err);
        throw err;
    }

    // 3. 第2段階: 導出項目の一括計算
    console.log("[RDB Mock Data Generator] 第1段階完了。クールダウンのため 5000ms 待機します...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("[RDB Mock Data Generator] 第2段階: 全テーブルの導出項目の一括計算を開始します...");
    try {
        const calculatedData = await calculateAllTablesDerivations(tables, allGeneratedData, apiKey, otherInstructions);

        // 各テーブルの計算結果をマージする
        tables.forEach(table => {
            const calculatedRows = calculatedData[table.id] || [];
            const currentTableData = allGeneratedData[table.id] || [];
            const pkCols = table.columns.filter(col => col.isPk && col.attributeType !== 'dependent' && !table.columns.some(x => x.parentColumnId === col.id));

            allGeneratedData[table.id] = currentTableData.map((row, idx) => {
                let match = null;
                if (pkCols.length === 0) {
                    match = calculatedRows[idx];
                } else {
                    match = calculatedRows.find((r: any) => {
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
        });
    } catch (err) {
        console.error(`[RDB Mock Data Generator] 一括導出計算中にエラーが発生しました:`, err);
        throw err;
    }

    return allGeneratedData;
};
