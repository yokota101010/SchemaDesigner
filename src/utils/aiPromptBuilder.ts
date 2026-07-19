import { Table, Relationship, ValueObjectPreset, Column } from '../domain/models';
import { INITIAL_VALUE_OBJECTS } from '../constants';
import { 
    AI_PROMPT_SYSTEM_ROLE,
    AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER,
    AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER,
    AI_PROMPT_DERIVED_COLUMNS_HEADER,
    AI_PROMPT_EXISTING_DATA_HEADER,
    AI_PROMPT_USER_INSTRUCTIONS_HEADER,
    AI_PROMPT_GENERATION_RULES,
    AI_PROMPT_DERIVATION_ROLE,
    AI_PROMPT_DERIVATION_RULES,
    AI_PROMPT_DERIVATION_VERIFICATION_RULES
} from './aiPromptTemplates';
import { resolveColumnType, isMasterTable } from './schemaUtils';

/**
 * 関連線（relationships）から指定された外部キーカラムの親テーブルおよび親カラム情報を逆引き解決する
 */
const getFkReference = (colId: string, tableId: string, relationships: Relationship[]) => {
  const rel = relationships.find(r => r.to === tableId && r.mappings?.some(m => m.childColId === colId));
  if (rel) {
    const mapping = rel.mappings?.find(m => m.childColId === colId);
    if (mapping) {
      return { tableId: rel.from, columnId: mapping.parentColId || '' };
    }
  }
  return undefined;
};

const getColumnTypeDescription = (col: Column, tables: Table[]): string => {
  if (col.type && col.type.startsWith('FK:')) {
    const refTableId = col.type.substring(3);
    const refTable = tables.find(t => t.id === refTableId);
    const resolvedType = resolveColumnType(col, tables);
    return `${resolvedType} (FK referencing ${refTable ? refTable.name : 'unknown table'})`;
  }
  return col.type;
};

/**
 * テーブルのソート順設定を文字列表現で取得する
 */
const getSortDescriptions = (table: Table): string => {
    if (!table.orderBy || !table.orderBy.keys || table.orderBy.keys.length === 0) return '';
    return table.orderBy.keys.map(keyInfo => {
        const col = table.columns.find(c => c.id === keyInfo.columnId);
        if (!col) return '';
        const directionText = keyInfo.direction === 'DESC' ? 'descending' : 'ascending';
        return `'${col.name}' (${directionText})`;
    }).filter(Boolean).join(', ');
};

/**
 * テーブルが順序に基づく引き継ぎ・累積を行う導出カラムを持っているか判定する
 */
const hasCarryOverFormula = (table: Table): boolean => {
    return table.columns?.some(c => c.attributeType === 'dependent') || false;
};

/**
 * テーブル内の値オブジェクトに関するマッピングとビジネスルール制約のテキスト表現を取得する
 */
const getVoConstraintsText = (table: Table, valueObjects: ValueObjectPreset[] = INITIAL_VALUE_OBJECTS): string => {
    const voParentCols = table.columns.filter(col => 
        table.columns.some(c => c.parentColumnId === col.id)
    );

    if (voParentCols.length === 0) return '';

    let text = `\n### Value Object Constraints:\n`;
    
    voParentCols.forEach(parentCol => {
        const voPreset = valueObjects.find(vo => vo.name === parentCol.type);
        if (!voPreset) return;

        const childCols = table.columns.filter(c => c.parentColumnId === parentCol.id);
        
        text += `- Column group '${parentCol.name}' (${parentCol.type} VO) properties mapping:\n`;
        childCols.forEach(child => {
            if (child.voPropertyName) {
                text += `  * '${child.voPropertyName}' maps to physical column '${child.name}'\n`;
            }
        });

        if (voPreset.description) {
            text += `  * Business Rules/Constraints: "${voPreset.description}"\n`;
        }
        text += '\n';
    });

    return text;
};

/**
 * 単一テーブル用のデータ生成用プロンプトを構築する
 */
export const buildSingleTablePrompt = (
  table: Table, 
  relationships: Relationship[], 
  parentData: Record<string, any[]> = {}, 
  rowCount = 3, 
  otherInstructions = '', 
  includeDependent = false,
  valueObjects?: ValueObjectPreset[],
  tables: Table[] = []
): string => {
    let prompt = AI_PROMPT_SYSTEM_ROLE(table.name, table.id) + `\n\n`;
    if (table.description && table.description.trim() !== '') {
        prompt += `### Table Business Rules:\n"${table.description}"\n\n`;
    }
    prompt += `### Table Columns:\n`;

    const physicalColIds = table.columns.filter(c => !table.columns.some(x => x.parentColumnId === c.id)).map(c => c.id);

    table.columns.forEach(c => {
        const isVoParent = table.columns.some(x => x.parentColumnId === c.id);
        if (isVoParent) return;

        if (!includeDependent && c.attributeType === 'dependent' && !c.isFirstPhaseCalculable) return;

        const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(c.id));
        const typeDesc = getColumnTypeDescription(c, tables);
        prompt += `- Column ID: '${c.id}', Physics Name: '${c.name}', Data Type: '${typeDesc}', PK: ${c.isPk}, UQ: ${isColUnique}, FK: ${c.isFk}`;
        if (c.description) {
            prompt += `, Description/Instruction: "${c.description}"`;
        }
        prompt += '\n';
    });

    const relevantFks = table.columns.map(c => {
        if (!c.isFk) return null;
        const ref = getFkReference(c.id, table.id, relationships);
        return ref ? { colId: c.id, ...ref } : null;
    }).filter(Boolean) as Array<{ colId: string, tableId: string, columnId: string }>;

    if (relevantFks.length > 0) {
        prompt += AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER;
        
        relevantFks.forEach(rf => {
            const parentTableId = rf.tableId;
            const parentColId = rf.columnId;
            
            if (parentData[parentTableId] && Array.isArray(parentData[parentTableId])) {
                const parentRows = parentData[parentTableId];
                prompt += `- Parent Table ID '${parentTableId}' generated rows:\n`;
                prompt += JSON.stringify(parentRows, null, 2) + '\n';
                
                const validKeys = parentRows.map(row => row[parentColId]).filter(value => value !== undefined && value !== null);
                prompt += `  * VALID values for foreign key column '${rf.colId}' (referencing parent column '${parentColId}'): ${JSON.stringify(validKeys)}\n`;
            }
        });
    }

    const allGeneratedTableIds = Object.keys(parentData);
    const indirectTableIds = allGeneratedTableIds.filter(id => !relevantFks.some(rf => rf.tableId === id));
    if (indirectTableIds.length > 0) {
        prompt += AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER;
        
        indirectTableIds.forEach(pId => {
            if (parentData[pId] && Array.isArray(parentData[pId])) {
                prompt += `- Table ID '${pId}' generated rows:\n`;
                prompt += JSON.stringify(parentData[pId], null, 2) + '\n';
            }
        });
    }

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

    if (table.rows && table.rows.length > 0) {
        prompt += AI_PROMPT_EXISTING_DATA_HEADER;
        const cleanRows = table.rows.map(row => {
            const r: any = {};
            physicalColIds.forEach(id => r[id] = row[id]);
            return r;
        });
        prompt += JSON.stringify(cleanRows, null, 2) + '\n';
    }

    if (otherInstructions && otherInstructions.trim() !== '') {
        prompt += AI_PROMPT_USER_INSTRUCTIONS_HEADER + otherInstructions + '\n\n';
    }

    prompt += AI_PROMPT_GENERATION_RULES(rowCount);
    return prompt;
};

/**
 * 単一テーブルの導出項目計算用のプロンプトを構築する
 */
export const buildSingleTableDerivationPrompt = (table: Table, allGeneratedData: Record<string, any[]> = {}): string => {
    let prompt = AI_PROMPT_DERIVATION_ROLE(table.name, table.id) + `\n\n`;
    if (table.description && table.description.trim() !== '') {
        prompt += `### Table Business Rules:\n"${table.description}"\n\n`;
    }
    
    prompt += `### Table Schema Definition:\n`;
    table.columns.forEach(c => {
        const isVoParent = table.columns.some(x => x.parentColumnId === c.id);
        if (isVoParent) return;

        const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(c.id));
        prompt += `- Column ID: '${c.id}', Physics Name: '${c.name}', Type: '${c.type}', PK: ${c.isPk}, UQ: ${isColUnique}, FK: ${c.isFk}`;
        if (c.attributeType === 'dependent') {
            prompt += `, (DERIVED) Formula: [${c.derivation || ''}]`;
        }
        if (c.description) {
            prompt += `, Description/Instruction: "${c.description}"`;
        }
        prompt += '\n';
    });
    prompt += '\n';

    const currentRows = allGeneratedData[table.id] || [];
    const physicalColIds = table.columns.filter(c => !table.columns.some(x => x.parentColumnId === c.id)).map(c => c.id);
    const cleanCurrentRows = currentRows.map(row => {
        const r: any = {};
        physicalColIds.forEach(id => {
            if (row[id] !== undefined) r[id] = row[id];
        });
        return r;
    });

    prompt += `### Current Generated Rows (Input - Some derived columns might be empty or incomplete. Fill them in!):\n`;
    prompt += JSON.stringify(cleanCurrentRows, null, 2) + '\n\n';

    prompt += `### Other Tables Data (for reference/lookup consistency):\n`;
    Object.keys(allGeneratedData).forEach(pId => {
        if (pId === table.id) return;
        const rows = allGeneratedData[pId] || [];
        if (rows.length > 0) {
            prompt += `- Table ID '${pId}':\n`;
            prompt += JSON.stringify(rows, null, 2) + '\n';
        }
    });
    prompt += '\n';

    const sortDesc = getSortDescriptions(table);
    if (sortDesc) {
        prompt += `### Sequenced Evaluation Order:\n`;
        prompt += `This table requires sequential evaluation along the keys: [${sortDesc}]. Calculate values row by row in this order, especially if values carry over.\n\n`;
    }

    prompt += AI_PROMPT_DERIVATION_RULES;
    prompt += AI_PROMPT_DERIVATION_VERIFICATION_RULES;
    return prompt;
};

/**
 * 初期値設定の指示を解析し、各テーブルに当てはまる初期レコードのJSON配列を出力させるプロンプトを構築する
 */
export const buildInitialValueParsingPrompt = (tables: Table[], initialInstructions: string): string => {
    let prompt = `You are a database data extraction assistant. The user will provide natural language instructions about the initial records (seed data) that must exist in certain tables.\n\n`;
    prompt += `Your task is to parse these instructions and construct a structured JSON object containing the initial rows for each relevant table.\n\n`;
    
    prompt += `### Database Schema Definitions:\n`;
    tables.forEach(table => {
        prompt += `- Table ID: '${table.id}', Name: '${table.name}'\n`;
        prompt += `  * Columns:\n`;
        table.columns.forEach(c => {
            const isVoParent = table.columns.some(x => x.parentColumnId === c.id);
            if (isVoParent) return;

            prompt += `    - Column ID: '${c.id}', Name: '${c.name}', Type: '${c.type}', PK: ${c.isPk}, FK: ${c.isFk}\n`;
        });
    });
    prompt += '\n';

    prompt += `### User Initial Value Instructions:\n`;
    prompt += `"""\n${initialInstructions}\n"""\n\n`;

    prompt += `### Instructions for output:\n`;
    prompt += `1. Analyze which tables are mentioned or implied in the user's instructions.\n`;
    prompt += `2. Formulate the initial rows. Use ONLY the table IDs as keys for the outer object, and column IDs as keys for each row object.\n`;
    prompt += `3. Set appropriate values matching the data types (e.g., numbers for INT, proper ISO dates YYYY-MM-DD for DATE, etc.).\n`;
    prompt += `4. Ensure referential integrity if the user sets values across multiple related tables (e.g., the FK column in table B must match the PK column in table A).\n`;
    prompt += `5. If the instructions do not apply to a specific table, do not generate any rows for that table ID (leave it as an empty array or omit it).\n`;
    
    return prompt;
};

/**
 * データベース全体のモックデータを一括生成するためのプロンプトを構築する (ステップ1用)
 */
export const buildAllTablesPrompt = (
  tables: Table[], 
  relationships: Relationship[], 
  parentData: Record<string, any[]> = {}, 
  rowCount = 3, 
  otherInstructions = '',
  valueObjects?: ValueObjectPreset[]
): string => {
    let prompt = `You are an expert database administrator. Your task is to generate realistic mock data for all tables in a relational database simultaneously, maintaining strict referential integrity and semantic consistency across tables.\n\n`;

    prompt += `### Database Schema Definitions:\n`;
    tables.forEach(table => {
        prompt += `- Table: '${table.name}' (ID: '${table.id}')\n`;
        if (table.description && table.description.trim() !== '') {
            prompt += `  * Table Business Rules: "${table.description}"\n`;
        }
        prompt += `  * Columns:\n`;
        const physicalColIds = table.columns.filter(c => !table.columns.some(x => x.parentColumnId === c.id)).map(c => c.id);

        table.columns.forEach(c => {
            const isVoParent = table.columns.some(x => x.parentColumnId === c.id);
            if (isVoParent) return;

            if (c.attributeType === 'dependent') return;

            const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(c.id));
            const typeDesc = getColumnTypeDescription(c, tables);
            prompt += `    - Column ID: '${c.id}', Physics Name: '${c.name}', Type: '${typeDesc}', PK: ${c.isPk}, UQ: ${isColUnique}, FK: ${c.isFk}`;
            if (c.description) {
                prompt += `, Description/Instruction: "${c.description}"`;
            }
            prompt += '\n';
        });

        const parentRows = parentData[table.id] || [];
        const existingRows = isMasterTable(table) ? (table.rows || []) : parentRows;

        if (existingRows.length > 0) {
            const existingData = existingRows.map((row: any) => {
                const cleanRow: any = {};
                physicalColIds.forEach(id => {
                    if (row[id] !== undefined) cleanRow[id] = row[id];
                });
                return cleanRow;
            });
            if (isMasterTable(table)) {
                prompt += `  * PRE-EXISTING INITIAL ROWS (This is a sub-view master table. You MUST preserve these rows exactly as they are in your output rows for this table. Do NOT modify them, and do NOT generate any additional rows for this table. Only return these rows): \n`;
            } else {
                prompt += `  * PRE-EXISTING INITIAL ROWS (You MUST preserve the specific values explicitly defined in these initial rows. However, you CAN update or fill in other columns in these rows, such as flags, statuses, or other unspecified fields, if requested by the user instructions. Generate ADDITIONAL rows starting after these): \n`;
            }
            prompt += `    ` + JSON.stringify(existingData) + '\n';
        } else if (isMasterTable(table)) {
            prompt += `  * NOTE: This is a sub-view master table. It currently has no pre-existing rows. Do NOT generate any rows for this table.\n`;
        }

        const voConstraints = getVoConstraintsText(table, valueObjects);
        if (voConstraints) {
            prompt += voConstraints;
        }

        if (table.uniqueKeys && table.uniqueKeys.length > 0) {
            table.uniqueKeys.forEach((uq, idx) => {
                const cols = uq.columnIds?.map(id => {
                    const col = table.columns.find(c => c.id === id);
                    return col ? col.name : null;
                }).filter(Boolean) || [];
                
                if (cols.length > 0) {
                    prompt += `  * Unique Constraint ${idx + 1}: Columns (${cols.join(', ')}) must be unique together.\n`;
                }
            });
        }

        const sortDesc = getSortDescriptions(table);
        if (sortDesc && hasCarryOverFormula(table)) {
            prompt += `  * Evaluation Order and Carry-Over Constraint: This table is evaluated sequentially based on the ORDER BY keys: [${sortDesc}]. Some derived columns carry over values from the previous record in this sequence (e.g., previous month's balance, previous row's value). Therefore, when the main sequence key (e.g., date, period, or sequence ID) advances, you MUST continue to generate corresponding rows for all active key/entity combinations (e.g., account codes, categories) that existed in the previous step of the sequence. This ensures the calculation and carry-over chain along the evaluation order is not broken.\n`;
        }
        prompt += '\n';
    });

    prompt += `### Relationships (Referential Integrity Constraints):\n`;
    relationships.forEach(r => {
        if (r.from && r.to && r.mappings && r.mappings.length > 0) {
            prompt += `- Table '${r.from}' (parent) is referenced by Table '${r.to}' (child) on mappings:\n`;
            r.mappings.forEach(m => {
                prompt += `  * Parent Column ID '${m.parentColId}' = Child Column ID '${m.childColId}'\n`;
            });
        }
    });

    if (otherInstructions && otherInstructions.trim() !== '') {
        prompt += `### Special Instructions / Goals from User:\n`;
        prompt += `"""\n${otherInstructions}\n"""\n\n`;
    }

    prompt += `### Rules for Generating Data:\n`;
    prompt += `1. Output a JSON object mapping table IDs to their list of generated rows (similar structure as the input but with row data).\n`;
    prompt += `2. For non-master tables, generate exactly ${rowCount} rows (excluding any pre-existing rows). If there are pre-existing rows, output them first, then generate ${rowCount} additional rows.\n`;
    prompt += `3. Always ensure that the values in child tables' FK columns exactly match existing values in the parent tables' corresponding PK columns.\n`;
    prompt += `4. Generate highly realistic, consistent mock values (e.g., real names, matching dates, logical amounts, valid sequential IDs).\n`;
    
    return prompt;
};

/**
 * データベース全体の一括導出項目計算用のプロンプトを構築する (ステップ2用)
 */
export const buildAllTablesDerivationPrompt = (
  tables: Table[], 
  allGeneratedData: Record<string, any[]>, 
  otherInstructions = ''
): string => {
    let prompt = `You are a database calculation engine. Your task is to compute and fill in all derived columns (dependent columns) in all tables sequentially, preserving consistency and carry-over logic.\n\n`;

    prompt += `### Database Schema Definitions:\n`;
    tables.forEach(table => {
        prompt += `- Table: '${table.name}' (ID: '${table.id}')\n`;
        if (table.description && table.description.trim() !== '') {
            prompt += `  * Table Business Rules: "${table.description}"\n`;
        }
        prompt += `  * Columns:\n`;
        table.columns.forEach(c => {
            const isVoParent = table.columns.some(x => x.parentColumnId === c.id);
            if (isVoParent) return;

            const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(c.id));
            prompt += `    - Column ID: '${c.id}', Physics Name: '${c.name}', Type: '${c.type}', PK: ${c.isPk}, UQ: ${isColUnique}, FK: ${c.isFk}`;
            if (c.attributeType === 'dependent') {
                prompt += `, (DERIVED) Formula: [${c.derivation || ''}]`;
            }
            if (c.description) {
                prompt += `, Description/Instruction: "${c.description}"`;
            }
            prompt += '\n';
        });

        const sortDesc = getSortDescriptions(table);
        if (sortDesc) {
            prompt += `  * Evaluation Sequence: Order by [${sortDesc}]. Compute derived fields sequentially in this row order.\n`;
        }
        prompt += '\n';
    });

    prompt += `### Input Data (Rows with empty or draft derived values):\n`;
    tables.forEach(table => {
        const rows = allGeneratedData[table.id] || [];
        prompt += `- Table ID '${table.id}' (${table.name}) rows:\n`;
        prompt += JSON.stringify(rows, null, 2) + '\n\n';
    });

    if (otherInstructions && otherInstructions.trim() !== '') {
        prompt += `### Additional Instructions:\n"""\n${otherInstructions}\n"""\n\n`;
    }

    prompt += `### Rules for Computation:\n`;
    prompt += `1. Compute all derived values for each row in each table. Ensure calculations strictly adhere to the business rules and derivation formulas.\n`;
    prompt += `2. If a derived column depends on values from another table (e.g. sum of hours from details), perform a relational lookup/aggregate based on the FK relations.\n`;
    prompt += `3. If a derived column carries over values (e.g. balance) along the evaluation order, compute it sequentially row by row.\n`;
    prompt += `4. Return a JSON object mapping table IDs to their list of rows, with all derived columns fully computed.\n`;

    return prompt;
};
