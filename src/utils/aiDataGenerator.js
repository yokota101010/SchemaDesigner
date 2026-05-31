/**
 * Google Gemini API と連携してサンプルデータを自動生成するユーティリティ
 */
import { 
    AI_PROMPT_SYSTEM_ROLE,
    AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER,
    AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER,
    AI_PROMPT_DERIVED_COLUMNS_HEADER,
    AI_PROMPT_EXISTING_DATA_HEADER,
    AI_PROMPT_USER_INSTRUCTIONS_HEADER,
    AI_PROMPT_GENERATION_RULES
} from '../../skills/rdb-mock-data-generator/aiPromptTemplates';


/**
 * レートリミット（429）やサーバー一時エラーに対応するための指数バックオフ付き自動リトライfetch
 */
const fetchWithRetry = async (url, options, maxRetries = 5) => {
    let delay = 5000; // 無料枠の1分間制限をクリアするため、初期待機時間は強気の5秒
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
 * 単一のテーブル定義に基づいて Gemini API 用の動的 JSON Schema を構築する
 */
const buildSingleTableResponseSchema = (table, parentData = {}) => {
    const columnProps = {};
    
    table.columns.forEach(col => {
        let desc = `Value for column '${col.name}' (${col.type})`;
        if (col.description) desc += ` [Business Rule/Instruction: ${col.description}]`;
        if (col.isPk) desc += ' [Primary Key - MUST BE UNIQUE]';
        if (col.isUnique) desc += ' [Unique constraint]';
        if (col.isFk) {
            const parentTableId = col.reference?.tableId;
            desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}']`;
            
            // 親データのPK候補リストをスキーマの説明に埋め込むことで、LLMへの制約を強化する
            if (parentTableId && parentData[parentTableId]) {
                const parentKeys = parentData[parentTableId]
                    .map(row => row[col.reference.columnId])
                    .filter(Boolean);
                if (parentKeys.length > 0) {
                    desc += ` MUST BE EXACTLY ONE OF THESE VALUES: ${JSON.stringify(parentKeys)}`;
                }
            }
        }
        if (col.attributeType === 'dependent') {
            desc += ` [Derived Item computed by: ${col.derivation || ''}]`;
        }

        columnProps[col.id] = {
            type: 'string',
            description: desc
        };
    });

    return {
        type: 'object',
        properties: {
            rows: {
                type: 'array',
                description: `List of realistic row objects for table '${table.name}'`,
                items: {
                    type: 'object',
                    properties: columnProps,
                    // 主キー、外部キー、導出項目は入力必須にする
                    required: table.columns.filter(col => col.isPk || col.isFk || col.attributeType === 'dependent').map(col => col.id)
                }
            }
        },
        required: ['rows']
    };
};

/**
 * 単一テーブル用のプロンプトを構築する
 */
const buildSingleTablePrompt = (table, relationships, parentData = {}, rowCount = 3, aiInstructions = '') => {
    let prompt = AI_PROMPT_SYSTEM_ROLE(table.name, table.id) + `\n\n### Table Columns:\n`;

    table.columns.forEach(c => {
        prompt += `- Column ID: '${c.id}', Physics Name: '${c.name}', Data Type: '${c.type}', PK: ${c.isPk}, UQ: ${c.isUnique}, FK: ${c.isFk}`;
        if (c.description) {
            prompt += `, Description/Instruction: "${c.description}"`;
        }
        if (c.attributeType === 'dependent') {
            prompt += `, Derived Formula: [${c.derivation}]`;
        }
        prompt += '\n';
    });

    // 親テーブルの生成データがある場合は、それをプロンプトに明示的に記載する
    const relevantFks = table.columns.filter(c => c.isFk && c.reference?.tableId);
    if (relevantFks.length > 0) {
        prompt += AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER;
        
        relevantFks.forEach(c => {
            const parentTableId = c.reference.tableId;
            const parentColId = c.reference.columnId;
            
            if (parentData[parentTableId] && Array.isArray(parentData[parentTableId])) {
                const parentRows = parentData[parentTableId];
                // 親テーブルのデータ全体を示す（他の項目の意味的一貫性を保つため。例：注文データを作るために、ユーザーの名前や住所などを参考にできるようにする）
                prompt += `- Parent Table ID '${parentTableId}' generated rows:\n`;
                prompt += JSON.stringify(parentRows, null, 2) + '\n';
                
                const validKeys = parentRows.map(row => row[parentColId]).filter(value => value !== undefined && value !== null);
                prompt += `  * VALID values for foreign key column '${c.id}' (referencing parent column '${parentColId}'): ${JSON.stringify(validKeys)}\n`;
            }
        });
    }

    // 直接の親テーブル以外の、これまでに生成されたすべての関連テーブル of データも意味的整合性（セマンティック整合性）のために提示する
    const allGeneratedTableIds = Object.keys(parentData);
    const indirectTableIds = allGeneratedTableIds.filter(id => !relevantFks.some(c => c.reference?.tableId === id));
    if (indirectTableIds.length > 0) {
        prompt += AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER;
        
        indirectTableIds.forEach(pId => {
            if (parentData[pId] && Array.isArray(parentData[pId])) {
                prompt += `- Table ID '${pId}' generated rows:\n`;
                prompt += JSON.stringify(parentData[pId], null, 2) + '\n';
            }
        });
    }

    // 導出項目の計算に関するヒント
    const dependentCols = table.columns.filter(c => c.attributeType === 'dependent');
    if (dependentCols.length > 0) {
        prompt += AI_PROMPT_DERIVED_COLUMNS_HEADER;
        dependentCols.forEach(c => {
            prompt += `- Column '${c.id}' is derived. Calculate its value based on the referenced parent row's attributes using formula: [${c.derivation}]. Ensure it perfectly matches the corresponding parent row value.\n`;
        });
    }

    // 既存のモックデータが存在する場合は、それをプロンプトにインジェクションする
    if (table.rows && table.rows.length > 0) {
        prompt += AI_PROMPT_EXISTING_DATA_HEADER;
        // IDや画面用のプロパティを省いて実データ値のみを渡すことで、AIの重複キー生成混乱を避ける
        const existingData = table.rows.map(({ id, isMinimized, ...rest }) => rest);
        prompt += JSON.stringify(existingData, null, 2) + '\n';
    }

    if (aiInstructions) {
        prompt += AI_PROMPT_USER_INSTRUCTIONS_HEADER(aiInstructions, table.name, table.id);
    }

    const pkColumnId = table.columns.find(col => col.isPk)?.id || 'id';
    prompt += AI_PROMPT_GENERATION_RULES(rowCount, pkColumnId);

    return prompt;
};

/**
 * 単一のテーブルのデータをAIで生成するヘルパー関数
 */
const generateSingleTableData = async (table, relationships, parentData, apiKey, rowCount, aiInstructions = '') => {
    const prompt = buildSingleTablePrompt(table, relationships, parentData, rowCount, aiInstructions);
    const responseSchema = buildSingleTableResponseSchema(table, parentData);

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

    // 2. レベル順に生成処理を進める（完全に直列実行し、各APIコールの間に適正なインターバルを置いて429を防ぐ）
    for (let i = 0; i < levels.length; i++) {
        const levelTables = levels[i];
        console.log(`[RDB Mock Data Generator] Level ${i} のテーブル生成を開始... (${levelTables.map(t => t.name).join(', ')})`);

        for (let j = 0; j < levelTables.length; j++) {
            const table = levelTables[j];
            
            // 同時アクセス集中を防ぐため、2回目以降のリクエスト送信前に 1500ms の確定インターバルを挟む
            if (i > 0 || j > 0) {
                console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 1500ms 待機中...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            try {
                const rows = await generateSingleTableData(table, relationships, allGeneratedData, apiKey, rowCount, aiInstructions);
                allGeneratedData[table.id] = rows;
                console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の生成が完了しました（${rows.length}件）`);
            } catch (err) {
                console.error(`[RDB Mock Data Generator] テーブル '${table.name}' の生成中にエラーが発生しました:`, err);
                throw err;
            }
        }
    }

    return allGeneratedData;
};

