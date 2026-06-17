import { 
    AI_PROMPT_SYSTEM_ROLE,
    AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER,
    AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER,
    AI_PROMPT_DERIVED_COLUMNS_HEADER,
    AI_PROMPT_EXISTING_DATA_HEADER,
    AI_PROMPT_USER_INSTRUCTIONS_HEADER,
    AI_PROMPT_GENERATION_RULES,
    AI_PROMPT_DERIVATION_ROLE,
    AI_PROMPT_DERIVATION_RULES
} from './aiPromptTemplates.js';

/**
 * 単一テーブル用のデータ生成用プロンプトを構築する
 */
export const buildSingleTablePrompt = (table, relationships, parentData = {}, rowCount = 3, otherInstructions = '', includeDependent = false) => {
    let prompt = AI_PROMPT_SYSTEM_ROLE(table.name, table.id) + `\n\n### Table Columns:\n`;

    table.columns.forEach(c => {
        // 第1段階では導出項目を無視する。ただし、第一段階解決可能項目は含める
        if (!includeDependent && c.attributeType === 'dependent' && !c.isFirstPhaseCalculable) return;

        const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(c.id));
        prompt += `- Column ID: '${c.id}', Physics Name: '${c.name}', Data Type: '${c.type}', PK: ${c.isPk}, UQ: ${isColUnique}, FK: ${c.isFk}`;
        if (c.description) {
            prompt += `, Description/Instruction: "${c.description}"`;
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
    const dependentCols = table.columns.filter(c => {
        if (includeDependent) return c.attributeType === 'dependent';
        return c.attributeType === 'dependent' && c.isFirstPhaseCalculable;
    });
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
        prompt += `\n* CRITICAL INSTRUCTION FOR EXISTING DATA (INITIAL RECORDS):\n`;
        prompt += `- The existing rows listed above represent FIXED INITIAL/STARTING data. You MUST PRESERVE all these existing rows exactly as they are. Do NOT modify their values, and do NOT delete them.\n`;
        prompt += `- Your job is to generate ADDITIONAL rows (like transaction items for subsequent dates, or other business records) that align with and build upon these initial records, complying with the user instructions.\n`;
    }

    // ユニークキー制約の明示
    if (table.uniqueKeys && table.uniqueKeys.length > 0) {
        let uqText = '';
        table.uniqueKeys.forEach((uq, idx) => {
            const cols = uq.columnIds?.map(id => {
                const col = table.columns.find(c => c.id === id);
                return col ? col.name : null;
            }).filter(Boolean) || [];
            
            if (cols.length > 0) {
                uqText += `- UQ ${idx + 1}: Unique constraint on columns (${cols.join(', ')})\n`;
            }
        });
        if (uqText) {
            prompt += `\n### Unique Constraints:\n` + uqText;
        }
    }

    if (otherInstructions) {
        prompt += AI_PROMPT_USER_INSTRUCTIONS_HEADER(otherInstructions, table.name, table.id);
    }

    const pkColumnId = table.columns.find(col => col.isPk)?.id || 'id';
    prompt += AI_PROMPT_GENERATION_RULES(rowCount, pkColumnId);

    return prompt;
};

/**
 * 第2段階用のプロンプトを構築する (導出項目の計算)
 */
export const buildSingleTableDerivationPrompt = (table, currentTableData, allGeneratedData, tables, otherInstructions = '') => {
    let prompt = AI_PROMPT_DERIVATION_ROLE(table.name);
    
    prompt += `### Target Table '${table.name}' Columns:\n`;
    table.columns.forEach(col => {
        const isDep = col.attributeType === 'dependent';
        prompt += `- Column ID: '${col.id}', Physics Name: '${col.name}'${isDep ? ` (Derived using formula: [${col.derivation}])` : ''}\n`;
    });
    
    prompt += `\n### Current Data for Target Table '${table.name}' (derived columns are empty or incomplete):\n`;
    prompt += JSON.stringify(currentTableData, null, 2) + `\n\n`;
    
    prompt += `### Related Database Tables & Data (for your calculation reference):\n`;
    Object.keys(allGeneratedData).forEach(tId => {
        if (tId !== table.id) {
            const refTable = tables.find(t => t.id === tId);
            if (refTable) {
                prompt += `- Table Name: '${refTable.name}' (ID: '${tId}'):\n`;
                prompt += `  * Columns Map:\n`;
                refTable.columns.forEach(col => {
                    prompt += `    - Column ID: '${col.id}', Physics Name: '${col.name}'\n`;
                });
                prompt += `  * Data:\n`;
                prompt += JSON.stringify(allGeneratedData[tId], null, 2) + `\n\n`;
            }
        }
    });
    // orderBy 設定がある場合に AI へ伝える指示を差し込む
    if (table.orderBy && table.orderBy.type) {
        let sortKeys = [];
        
        if (table.orderBy.keys && table.orderBy.keys.length > 0) {
            sortKeys = table.orderBy.keys;
        } else {
            // 互換性フォールバック
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

        const sortDescriptions = sortKeys.map(keyInfo => {
            const col = table.columns.find(c => c.id === keyInfo.columnId);
            if (!col) return '';
            const directionText = keyInfo.direction === 'DESC' ? 'descending' : 'ascending';
            return `'${col.name}' (${directionText})`;
        }).filter(Boolean);

        if (sortDescriptions.length > 0) {
            prompt += `### Sorting Context:\n`;
            prompt += `* **Pre-sorted Sequence**: The rows in 'Current Data for Target Table' above are already sorted in the following order: ${sortDescriptions.join(', ')}. You must process the rows and carry over the calculations sequentially from top to bottom based on this order.\n\n`;
        }
    }

    if (otherInstructions) {
        prompt += `### User Rules & Requirements (IMPORTANT for matching calculations):\n`;
        prompt += `* Instructions: "${otherInstructions}"\n`;
        prompt += `* Make sure any calculated values (like dynamic totals, counts, or carry-overs) comply with these rules (e.g., if there are specific count limits or monthly limits, ensure calculations match the actual generated transaction count).\n\n`;
    }
    
    prompt += AI_PROMPT_DERIVATION_RULES;
    
    return prompt;
};

/**
 * 初期値設定用のプロンプトを構築する
 */
export const buildInitialValueParsingPrompt = (tables, initialInstructions) => {
    let prompt = `You are an expert database administrator.\n`;
    prompt += `Your task is to analyze the user's natural language instruction for setting up INITIAL values (like starting balances, categories, initial master values, etc.) and map them onto the appropriate table columns.\n\n`;
    
    prompt += `### Database Schema Definition:\n`;
    tables.forEach(table => {
        prompt += `- Table Name: '${table.name}' (ID: '${table.id}')\n`;
        prompt += `  * Columns:\n`;
        table.columns.forEach(col => {
            prompt += `    - Column ID: '${col.id}', Physics Name: '${col.name}', Type: '${col.type}', PK: ${col.isPk}, FK: ${col.isFk}`;
            if (col.description) {
                prompt += `, Description: "${col.description}"`;
            }
            prompt += `\n`;
        });
        prompt += `\n`;
    });
    
    prompt += `### User Initial Value Instructions:\n`;
    prompt += `"${initialInstructions}"\n\n`;
    
    prompt += `### Output Rules:\n`;
    prompt += `1. Parse the user's request, identify which tables and columns should contain the initial/starting records.\n`;
    prompt += `2. Formulate the initial rows. Use ONLY the table IDs as keys for the outer object, and column IDs as keys for each row object.\n`;
    prompt += `3. Set appropriate values matching the data types (e.g., numbers for INT, proper ISO dates YYYY-MM-DD for DATE, etc.).\n`;
    prompt += `4. Ensure referential integrity if the user sets values across multiple related tables (e.g., the FK column in table B must match the PK column in table A).\n`;
    prompt += `5. If the instructions do not apply to a specific table, do not generate any rows for that table ID (leave it as an empty array or omit it).\n`;
    
    return prompt;
};
