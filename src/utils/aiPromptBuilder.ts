import { Table, Relationship, ValueObjectPreset, Column } from '../types';
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
import { resolveColumnType } from './schemaUtils';

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
    if (!table.orderBy || !table.orderBy.type) return '';
    let sortKeys: any[] = [];
    if (table.orderBy.keys && table.orderBy.keys.length > 0) {
        sortKeys = table.orderBy.keys;
    } else {
        let sortColIds: string[] = [];
        if (table.orderBy.type === 'pk') {
            sortColIds = table.columns.filter(c => c.isPk).map(c => c.id);
        } else if (table.orderBy.type === 'uq' && table.orderBy.uqId) {
            const targetUq = table.uniqueKeys?.find(uq => uq.id === table.orderBy!.uqId);
            sortColIds = targetUq ? (targetUq.columnIds || []) : [];
        }
        const defaultDir = table.orderBy.direction || 'ASC';
        sortKeys = sortColIds.map(cid => ({
            columnId: cid,
            direction: table.orderBy!.directions?.[cid] || defaultDir
        }));
    }
    return sortKeys.map(keyInfo => {
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
  valueObjects?: ValueObjectPreset[]
): string => {
    let prompt = AI_PROMPT_SYSTEM_ROLE(table.name, table.id) + `\n\n### Table Columns:\n`;

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

    const relevantFks = table.columns.filter(c => c.isFk && c.reference?.tableId);
    if (relevantFks.length > 0) {
        prompt += AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER;
        
        relevantFks.forEach(c => {
            const parentTableId = c.reference!.tableId;
            const parentColId = c.reference!.columnId;
            
            if (parentData[parentTableId] && Array.isArray(parentData[parentTableId])) {
                const parentRows = parentData[parentTableId];
                prompt += `- Parent Table ID '${parentTableId}' generated rows:\n`;
                prompt += JSON.stringify(parentRows, null, 2) + '\n';
                
                const validKeys = parentRows.map(row => row[parentColId]).filter(value => value !== undefined && value !== null);
                prompt += `  * VALID values for foreign key column '${c.id}' (referencing parent column '${parentColId}'): ${JSON.stringify(validKeys)}\n`;
            }
        });
    }

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
        const existingData = table.rows.map((row: any) => {
            const cleanRow: any = {};
            physicalColIds.forEach(id => {
                if (row[id] !== undefined) cleanRow[id] = row[id];
            });
            return cleanRow;
        });
        prompt += JSON.stringify(existingData, null, 2) + '\n';
        prompt += `\n* CRITICAL INSTRUCTION FOR EXISTING DATA (INITIAL RECORDS):\n`;
        prompt += `- The existing rows listed above represent FIXED INITIAL/STARTING data. You MUST PRESERVE all these existing rows exactly as they are. Do NOT modify their values, and do NOT delete them.\n`;
        prompt += `- Your job is to generate ADDITIONAL rows (like transaction items for subsequent dates, or other business records) that align with and build upon these initial records, complying with the user instructions.\n`;
    }

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

    const sortDesc = getSortDescriptions(table);
    if (sortDesc && hasCarryOverFormula(table)) {
        prompt += `\n### Evaluation Order and Carry-Over Constraint:\n`;
        prompt += `- This table is evaluated sequentially based on the ORDER BY keys: [${sortDesc}]. Some derived columns carry over values from the previous record in this sequence (e.g., previous month's balance, previous row's value). Therefore, when the main sequence key (e.g., date, period, or sequence ID) advances, you MUST continue to generate corresponding rows for all active key/entity combinations (e.g., account codes, categories) that existed in the previous step of the sequence. This ensures the calculation and carry-over chain along the evaluation order is not broken.\n`;
    }

    const voConstraints = getVoConstraintsText(table, valueObjects);
    if (voConstraints) {
        prompt += voConstraints;
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
export const buildSingleTableDerivationPrompt = (
  table: Table, 
  currentTableData: any[], 
  allGeneratedData: Record<string, any[]>, 
  tables: Table[], 
  otherInstructions = ''
): string => {
    let prompt = AI_PROMPT_DERIVATION_ROLE(table.name);
    
    prompt += `### Target Table '${table.name}' Columns:\n`;
    table.columns.forEach(col => {
        const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
        if (isVoParent) return;

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
                    const isVoParent = refTable.columns.some(x => x.parentColumnId === col.id);
                    if (isVoParent) return;

                    prompt += `    - Column ID: '${col.id}', Physics Name: '${col.name}'\n`;
                });
                prompt += `  * Data:\n`;
                prompt += JSON.stringify(allGeneratedData[tId], null, 2) + `\n\n`;
            }
        }
    });

    if (table.orderBy && table.orderBy.type) {
        let sortKeys: any[] = [];
        
        if (table.orderBy.keys && table.orderBy.keys.length > 0) {
            sortKeys = table.orderBy.keys;
        } else {
            let sortColIds: string[] = [];
            if (table.orderBy.type === 'pk') {
                sortColIds = table.columns.filter(c => c.isPk).map(c => c.id);
            } else if (table.orderBy.type === 'uq' && table.orderBy.uqId) {
                const targetUq = table.uniqueKeys?.find(uq => uq.id === table.orderBy!.uqId);
                sortColIds = targetUq ? (targetUq.columnIds || []) : [];
            }
            
            const defaultDir = table.orderBy.direction || 'ASC';
            sortKeys = sortColIds.map(cid => ({
                columnId: cid,
                direction: table.orderBy!.directions?.[cid] || defaultDir
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
export const buildInitialValueParsingPrompt = (tables: Table[], initialInstructions: string): string => {
    let prompt = `You are an expert database administrator.\n`;
    prompt += `Your task is to analyze the user's natural language instruction for setting up INITIAL values (like starting balances, categories, initial master values, etc.) and map them onto the appropriate table columns.\n\n`;
    
    prompt += `### Database Schema Definition:\n`;
    tables.forEach(table => {
        prompt += `- Table Name: '${table.name}' (ID: '${table.id}')\n`;
        prompt += `  * Columns:\n`;
        table.columns.forEach(col => {
            const isVoParent = table.columns.some(x => x.parentColumnId === col.id);
            if (isVoParent) return;

            const typeDesc = getColumnTypeDescription(col, tables);
            prompt += `    - Column ID: '${col.id}', Physics Name: '${col.name}', Type: '${typeDesc}', PK: ${col.isPk}, FK: ${col.isFk}`;
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
        const existingRows = parentRows.length > 0 ? parentRows : (table.rows || []);

        if (existingRows.length > 0) {
            const existingData = existingRows.map((row: any) => {
                const cleanRow: any = {};
                physicalColIds.forEach(id => {
                    if (row[id] !== undefined) cleanRow[id] = row[id];
                });
                return cleanRow;
            });
            if (table.viewPane === 'sub') {
                prompt += `  * PRE-EXISTING INITIAL ROWS (This is a sub-view master table. You MUST preserve these rows exactly as they are in your output rows for this table. Do NOT modify them, and do NOT generate any additional rows for this table. Only return these rows): \n`;
            } else {
                prompt += `  * PRE-EXISTING INITIAL ROWS (You MUST preserve these rows exactly as they are in your output rows for this table, do NOT modify them. generate ADDITIONAL rows starting after these): \n`;
            }
            prompt += `    ` + JSON.stringify(existingData) + '\n';
        } else if (table.viewPane === 'sub') {
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

    if (otherInstructions) {
        prompt += `\n### User General Rules & Business Requirements:\n`;
        prompt += `"${otherInstructions}"\n`;
    }

    prompt += `\n### Mock Data Generation Rules:\n`;
    prompt += `1. For each main-view table (tables not in sub-view), generate approximately ${rowCount} realistic rows (in addition to any pre-existing initial rows listed above) by default. However, complying with all database schemas, referential integrity constraints, uniqueness constraints, and evaluation/calculation rules is your HIGHEST PRIORITY. You MUST automatically increase the number of generated rows for any table if it is logically required to maintain consistent relationships, business logic, or evaluation chains (such as ensuring carry-over records exist for all active keys when a sequence/order-by key advances) across the database. Never compromise data integrity to fit the row count limit.\n`;
    prompt += `2. For any sub-view table (viewPane: 'sub'), do NOT generate any additional rows. You MUST only output the pre-existing rows provided for that table. If the sub-view table has no pre-existing rows, output an empty array for that table ID.\n`;
    prompt += `3. You MUST maintain referential integrity. Child tables' foreign key columns MUST EXACTLY match one of the parent tables' primary key values generated in the same response or present in pre-existing rows.\n`;
    prompt += `4. Maintain semantic consistency across tables (e.g. transaction dates, accounts, descriptions should align logically).\n`;
    prompt += `5. Format the output JSON as an object mapping each Table ID to an array of row objects.\n`;

    return prompt;
};

/**
 * データベース全体のすべての導出項目を一括計算するためのプロンプトを構築する (ステップ2用)
 */
export const buildAllTablesDerivationPrompt = (
  tables: Table[], 
  allGeneratedData: Record<string, any[]>, 
  otherInstructions = ''
): string => {
    let prompt = `You are a database engine. Your task is to calculate and populate all derived (dependent) column values for all tables in the database, ensuring perfect mathematical correctness and consistent values based on pre-existing raw data.\n\n`;

    prompt += `### Database Schema and Derivation Formulas:\n`;
    tables.forEach(table => {
        prompt += `- Table: '${table.name}' (ID: '${table.id}')\n`;
        const depCols = table.columns.filter(c => c.attributeType === 'dependent' && !table.columns.some(x => x.parentColumnId === c.id));
        if (depCols.length > 0) {
            prompt += `  * Derived Columns & Calculation Formulas:\n`;
            depCols.forEach(col => {
                prompt += `    - Column ID: '${col.id}', Physics Name: '${col.name}': Formula is [${col.derivation || ''}]\n`;
            });
        }

        if (table.orderBy && table.orderBy.type) {
            let sortKeys: any[] = [];
            if (table.orderBy.keys && table.orderBy.keys.length > 0) {
                sortKeys = table.orderBy.keys;
            } else {
                let sortColIds: string[] = [];
                if (table.orderBy.type === 'pk') {
                    sortColIds = table.columns.filter(c => c.isPk).map(c => c.id);
                } else if (table.orderBy.type === 'uq' && table.orderBy.uqId) {
                    const targetUq = table.uniqueKeys?.find(uq => uq.id === table.orderBy!.uqId);
                    sortColIds = targetUq ? (targetUq.columnIds || []) : [];
                }
                const defaultDir = table.orderBy.direction || 'ASC';
                sortKeys = sortColIds.map(cid => ({
                    columnId: cid,
                    direction: table.orderBy!.directions?.[cid] || defaultDir
                }));
            }

            const sortDescriptions = sortKeys.map(keyInfo => {
                const col = table.columns.find(c => c.id === keyInfo.columnId);
                if (!col) return '';
                const directionText = keyInfo.direction === 'DESC' ? 'descending' : 'ascending';
                return `'${col.name}' (${directionText})`;
            }).filter(Boolean);

            if (sortDescriptions.length > 0) {
                prompt += `  * Sorting/Calculation Sequence (IMPORTANT): You MUST process the rows of this table sequentially in this order: ${sortDescriptions.join(', ')}. Carry over any running totals (e.g. transaction balances, monthly summaries) step-by-step from top to bottom based on this order.\n`;
            }
        }
        prompt += '\n';
    });

    prompt += `### Current Database Mock Data (derived columns are empty or incomplete):\n`;
    tables.forEach(table => {
        prompt += `- Table Name: '${table.name}' (ID: '${table.id}'):\n`;
        prompt += JSON.stringify(allGeneratedData[table.id] || [], null, 2) + `\n\n`;
    });

    if (otherInstructions) {
        prompt += `### User Rules & Requirements:\n`;
        prompt += `* Instructions: "${otherInstructions}"\n\n`;
    }

    prompt += `### Instructions for Calculations:\n`;
    prompt += `1. You MUST calculate the derived values for all tables. Do NOT change, insert, or delete any of the existing raw data values (such as transaction amounts, names, or dates). Just compute and fill in the missing derived values.\n`;
    prompt += `2. Pay extreme attention to sequential running totals (like '口座残高', '月初残高', '月末残高'). You must calculate them progressively based on the specified sort order (e.g. sorting by time or年月). Ensure that previous row's final balance properly becomes the current row's starting balance.\n`;
    prompt += `\n### Verification and Output Process (CRITICAL):\n`;
    prompt += AI_PROMPT_DERIVATION_VERIFICATION_RULES;

    return prompt;
};
