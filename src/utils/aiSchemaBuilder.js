/**
 * 単一のテーブル定義に基づいて Gemini API 用の動的 JSON Schema を構築する (第1段階用)
 */
export const buildSingleTableResponseSchema = (table, parentData = {}, includeDependent = false) => {
    const columnProps = {};
    const tableUqs = table.uniqueKeys || [];
    
    table.columns.forEach(col => {
        // 第1段階では導出項目（dependent）を除外する
        if (!includeDependent && col.attributeType === 'dependent') return;

        let desc = `Value for column '${col.name}' (${col.type})`;
        if (col.description) desc += ` [Business Rule/Instruction: ${col.description}]`;
        if (col.isPk) desc += ' [Primary Key - MUST BE UNIQUE]';
        
        const isColUnique = tableUqs.some(uq => uq.columnIds?.includes(col.id));
        if (isColUnique) desc += ' [Unique constraint]';
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

        columnProps[col.id] = {
            type: 'string',
            description: desc
        };
    });

    // 必須項目の抽出
    const requiredCols = table.columns
        .filter(col => {
            if (!includeDependent && col.attributeType === 'dependent') return false;
            return col.isPk || col.isFk || col.attributeType === 'dependent';
        })
        .map(col => col.id);

    return {
        type: 'object',
        properties: {
            rows: {
                type: 'array',
                description: `List of realistic row objects for table '${table.name}'`,
                items: {
                    type: 'object',
                    properties: columnProps,
                    required: requiredCols
                }
            }
        },
        required: ['rows']
    };
};

/**
 * 第2段階用のレスポンススキーマを構築する (すべてのカラムを必須で返してもらう)
 */
export const buildSingleTableDerivationSchema = (table, allGeneratedData = {}) => {
    const columnProps = {};
    table.columns.forEach(col => {
        let desc = `Value for column '${col.name}' (${col.type})`;
        if (col.isFk) {
            const parentTableId = col.reference?.tableId;
            desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}']`;
            
            if (parentTableId && allGeneratedData[parentTableId]) {
                const parentKeys = allGeneratedData[parentTableId]
                    .map(row => row[col.reference.columnId])
                    .filter(value => value !== undefined && value !== null && value !== "");
                if (parentKeys.length > 0) {
                    desc += ` MUST BE EXACTLY ONE OF THESE VALUES: ${JSON.stringify(parentKeys)}`;
                }
            }
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
                description: `List of rows for table '${table.name}' with derived values filled in`,
                items: {
                    type: 'object',
                    properties: columnProps,
                    required: table.columns.map(col => col.id)
                }
            }
        },
        required: ['rows']
    };
};
