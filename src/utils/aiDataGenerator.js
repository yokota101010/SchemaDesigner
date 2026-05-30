/**
 * Google Gemini API と連携してサンプルデータを自動生成するユーティリティ
 */

/**
 * テーブル定義に基づいて Gemini API 用の動的 JSON Schema を構築する
 */
const buildResponseSchema = (tables) => {
    const properties = {};
    
    tables.forEach(table => {
        const columnProps = {};
        table.columns.forEach(col => {
            // AIがデータ型に合わせやすいよう説明を付加
            let desc = `Value for column '${col.name}' (${col.type})`;
            if (col.isPk) desc += ' [Primary Key - MUST BE UNIQUE]';
            if (col.isUnique) desc += ' [Unique constraint]';
            if (col.isFk) desc += ` [Foreign Key referencing tableId: '${col.reference?.tableId || ''}']`;
            if (col.attributeType === 'dependent') desc += ` [Derived Item computed by: ${col.derivation || ''}]`;

            columnProps[col.id] = {
                type: 'string',
                description: desc
            };
        });

        properties[table.id] = {
            type: 'array',
            description: `List of realistic row objects for table '${table.name}'`,
            items: {
                type: 'object',
                properties: columnProps,
                // 主キー、外部キー、導出項目は入力必須にする
                required: table.columns.filter(col => col.isPk || col.isFk || col.attributeType === 'dependent').map(col => col.id)
            }
        };
    });

    return {
        type: 'object',
        properties: {
            tableData: {
                type: 'object',
                properties: properties,
                required: tables.map(t => t.id)
            }
        },
        required: ['tableData']
    };
};

/**
 * テーブル定義とリレーション情報から Gemini API 用のプロンプトを構築する
 */
const buildPrompt = (tables, relationships) => {
    let prompt = `You are an expert database administrator and mock data generator assistant.
I have designed a relational database schema.
Your task is to generate realistic, diverse, and coherent sample mock data (in Japanese) for ALL tables, ensuring 100% referential integrity (foreign key constraints).

### Database Schema Tables:
`;

    tables.forEach(t => {
        prompt += `- Table Name: '${t.name}' (Internal Table ID: '${t.id}')\n`;
        t.columns.forEach(c => {
            prompt += `  * Column ID: '${c.id}', Physics Name: '${c.name}', Data Type: '${c.type}', PK: ${c.isPk}, UQ: ${c.isUnique}, FK: ${c.isFk}`;
            if (c.attributeType === 'dependent') {
                prompt += `, Derived Formula: [${c.derivation}]`;
            }
            prompt += '\n';
        });
    });

    prompt += `\n### Table Relationships:\n`;
    relationships.forEach(r => {
        const fromTable = tables.find(t => t.id === r.from);
        const toTable = tables.find(t => t.id === r.to);
        if (fromTable && toTable) {
            prompt += `- Relationship: Parent Table '${fromTable.name}' (ID: '${fromTable.id}') -> Child Table '${toTable.name}' (ID: '${toTable.id}') [${r.type}]\n`;
            if (r.mappings) {
                r.mappings.forEach(m => {
                    const pCol = fromTable.columns.find(c => c.id === m.parentColId);
                    const cCol = toTable.columns.find(c => c.id === m.childColId);
                    if (pCol && cCol) {
                        prompt += `  * Key Mapping: Parent Column '${pCol.name}' (ID: '${pCol.id}') -> Child Column '${cCol.name}' (ID: '${cCol.id}')\n`;
                    }
                });
            }
        }
    });

    prompt += `
### Rules for Data Generation:
1. **Diverse & Real Data**: Generate 3 to 5 rows of realistic mock data in Japanese for each table. The records should look like authentic, professional business data.
2. **Referential Integrity (CRITICAL)**: 
   - A child table's foreign key columns MUST exactly reference valid existing primary key values in the parent table.
   - If a relationship is composite (multiple mappings), the combination of parent primary keys MUST exactly match the combination of child foreign keys. No orphaned records!
3. **Derived/Computed Items**:
   - For derived columns (attributeType = 'dependent'), calculate and populate their values based on the referenced parent row (e.g. 'employee_name' should match the 'name' of the referenced employee).
4. **Primary Key Uniqueness**: Ensure all rows within a table have unique values for primary keys (or composite primary keys).
5. **Key Names**: Populate the JSON fields precisely using the Column IDs (like 'b1', 'e2', 't4', etc.) as the object keys.
`;

    return prompt;
};

/**
 * Gemini API を呼び出してデータを自動生成する
 * @param {Array} tables テーブル定義配列
 * @param {Array} relationships リレーションシップ定義配列
 * @param {string} apiKey Gemini API キー
 * @returns {Promise<Object>} 生成されたテーブルデータオブジェクト { [tableId]: [rows] }
 */
export const generateMockDataWithAI = async (tables, relationships, apiKey) => {
    if (!apiKey) {
        throw new Error("APIキーが設定されていません。");
    }

    const prompt = buildPrompt(tables, relationships);
    const responseSchema = buildResponseSchema(tables);

    // REST API エンドポイント (Gemini 2.5 Flash モデルを使用)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
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
        console.error("Gemini API Error Response:", errText);
        throw new Error(`Gemini API リクエストに失敗しました: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    
    try {
        const textResponse = json.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        
        if (!parsed.tableData) {
            throw new Error("返却されたデータフォーマットが無効です。");
        }
        
        return parsed.tableData;
    } catch (e) {
        console.error("JSON parsing error from LLM response:", e);
        throw new Error("AIからのレスポンスJSONの解析に失敗しました。");
    }
};
