import { Table } from '../domain/models';

/**
 * 単一のテーブル定義に基づいて Gemini API 用の動的 JSON Schema を構築する (第1段階用)
 */
export const buildSingleTableResponseSchema = (table: Table, parentData: Record<string, any[]> = {}, includeDependent = false): any => {
    const columnProps: Record<string, any> = {};
    const tableUqs = table.uniqueKeys || [];
    
    table.columns.forEach(col => {
        const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
        if (isVoParent) return;

        if (!includeDependent && col.attributeType === 'dependent' && !col.isFirstPhaseCalculable) return;

        let desc = `Value for column '${col.name}' (${col.type})`;
        if (col.description) desc += ` [Business Rule/Instruction: ${col.description}]`;
        if (col.isPk) desc += ' [Primary Key - MUST BE UNIQUE]';
        
        const isColUnique = tableUqs.some(uq => uq.columnIds?.includes(col.id));
        if (isColUnique) desc += ' [Unique constraint]';
        if (col.isFk) {
            const parentTableId = col.reference?.tableId;
            desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}']`;
            
            if (parentTableId && parentData[parentTableId]) {
                const parentKeys = parentData[parentTableId]
                    .map(row => row[col.reference!.columnId])
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

    const requiredCols = table.columns
        .filter(col => {
            const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
            if (isVoParent) return false;

            if (!includeDependent && col.attributeType === 'dependent' && !col.isFirstPhaseCalculable) return false;
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
export const buildSingleTableDerivationSchema = (table: Table, allGeneratedData: Record<string, any[]> = {}): any => {
    const columnProps: Record<string, any> = {};
    table.columns.forEach(col => {
        const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
        if (isVoParent) return;

        let desc = `Value for column '${col.name}' (${col.type})`;
        if (col.isFk) {
            const parentTableId = col.reference?.tableId;
            desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}']`;
            
            if (parentTableId && allGeneratedData[parentTableId]) {
                const parentKeys = allGeneratedData[parentTableId]
                    .map(row => row[col.reference!.columnId])
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
                    required: table.columns.filter(col => !table.columns.some(x => x.parentColumnId === col.id)).map(col => col.id)
                }
            }
        },
        required: ['rows']
    };
};

/**
 * 初期値解析結果を受け取るための動的 JSON Schema を構築する
 */
export const buildInitialValueParsingSchema = (tables: Table[]): any => {
    const tableProps: Record<string, any> = {};
    
    tables.forEach(table => {
        const columnProps: Record<string, any> = {};
        
        table.columns.forEach(col => {
            const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
            if (isVoParent) return;

            columnProps[col.id] = {
                type: 'string',
                description: `Value for column '${col.name}' (${col.type}). PK: ${col.isPk}, FK: ${col.isFk}`
            };
        });
        
        tableProps[table.id] = {
            type: 'array',
            description: `List of initial rows for table '${table.name}'. Generate rows only if initial instructions define values for this table. Otherwise, return empty array.`,
            items: {
                type: 'object',
                properties: columnProps
            }
        };
    });
    
    return {
        type: 'object',
        properties: {
            tables: {
                type: 'object',
                properties: tableProps,
                description: 'Object mapping table IDs to their list of initial rows.'
            }
        },
        required: ['tables']
    };
};

/**
 * 全テーブルを一括生成するための Gemini API 用 JSON Schema を構築する (ステップ1用)
 */
export const buildAllTablesResponseSchema = (tables: Table[]): any => {
    const tableProps: Record<string, any> = {};

    tables.forEach(table => {
        const columnProps: Record<string, any> = {};
        
        table.columns.forEach(col => {
            const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
            if (isVoParent) return;

            if (col.attributeType === 'dependent') return;

            let desc = `Value for column '${col.name}' (${col.type})`;
            if (col.description) desc += ` [Business Rule/Instruction: ${col.description}]`;
            if (col.isPk) desc += ' [Primary Key - MUST BE UNIQUE]';
            if (col.isFk) {
                const parentTableId = col.reference?.tableId;
                desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}', columnId: '${col.reference?.columnId || ''}']`;
            }

            columnProps[col.id] = {
                type: 'string',
                description: desc
            };
        });

        const requiredCols = table.columns
            .filter(col => {
                const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
                if (isVoParent) return false;

                if (col.attributeType === 'dependent') return false;
                return col.isPk || col.isFk;
            })
            .map(col => col.id);

        tableProps[table.id] = {
            type: 'array',
            description: `List of realistic row objects for table '${table.name}'`,
            items: {
                type: 'object',
                properties: columnProps,
                required: requiredCols
            }
        };
    });

    return {
        type: 'object',
        properties: tableProps,
        required: tables.map(t => t.id)
    };
};

/**
 * 全テーブルの一括導出計算用の JSON Schema を構築する (ステップ2用)
 */
export const buildAllTablesDerivationSchema = (tables: Table[]): any => {
    const tableProps: Record<string, any> = {};

    tables.forEach(table => {
        const columnProps: Record<string, any> = {};
        
        table.columns.forEach(col => {
            const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
            if (isVoParent) return;

            let desc = `Value for column '${col.name}' (${col.type})`;
            if (col.attributeType === 'dependent') {
                desc += ` [Derived using formula: ${col.derivation || ''}]`;
            }
            if (col.isFk) {
                const parentTableId = col.reference?.tableId;
                desc += ` [Foreign Key referencing tableId: '${parentTableId || ''}']`;
            }

            columnProps[col.id] = {
                type: 'string',
                description: desc
            };
        });

        tableProps[table.id] = {
            type: 'array',
            description: `List of rows for table '${table.name}' with derived values filled in`,
            items: {
                type: 'object',
                properties: columnProps,
                required: table.columns.filter(col => !table.columns.some(x => x.parentColumnId === col.id)).map(col => col.id)
            }
        };
    });

    return {
        type: 'object',
        properties: tableProps,
        required: tables.map(t => t.id)
    };
};
