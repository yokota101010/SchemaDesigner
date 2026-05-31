/**
 * AIによるインスタンスデータ自動生成用のUI文言・プロンプト定数定義
 * このファイルは、RDBモックデータ生成スキルにおける知識のSingle Source of Truth (唯一の真実のソース) です。
 */

// --- UI側 (AiGeneratePromptModal.jsx) で参照する定数 ---

/**
 * AIサンプル生成モーダルで表示する「意図通りに動かすコツ」の解説テキスト (HTML形式)
 */
export const AI_MODAL_TIPS = {
    title: "💡 意図通りに動かすコツ:",
    body: "同名項目の混同を防ぐため、「[テーブル名].[項目名]」の形式（例: <code>収支取引明細.摘要</code>）で明記するとAIが正しく理解しやすくなります。<br />特に指定がなければ、そのまま「生成開始」をクリックしてください（全面的に再生成されます）。"
};

/**
 * AIサンプル生成モーダルのテキストエリアに設定するプレースホルダー
 */
export const AI_MODAL_PLACEHOLDER = "例：「費目」テーブルに「光熱費」を追加して。（※これだけで、連動する明細データなどはAIが自動で察して生成します）";


// --- 生成エンジン (aiDataGenerator.js) で参照するプロンプト定数 ---

/**
 * AIに対するシステム側の基本的な役割定義 (System Role Prompt)
 */
export const AI_PROMPT_SYSTEM_ROLE = (tableName, tableId) => 
    `You are an expert database administrator and mock data generator assistant.\nYour task is to generate realistic, diverse, and coherent sample mock data (in Japanese) for the table '${tableName}' (ID: '${tableId}').`;

/**
 * 外部キー参照（親子関係）がある場合の、参照整合性に関するAIへの追加プロンプト
 */
export const AI_PROMPT_REFERENTIAL_INTEGRITY_HEADER = 
    `\n### Referenced Parent Tables Data (Referential Integrity Constraint):\nYou MUST ensure 100% referential integrity. For foreign key columns, you MUST ONLY use primary keys that exist in the parent tables listed below.\n`;

/**
 * セマンティック整合性（マスタテーブル等の非直接関係データの共有）に関するAIへの追加プロンプト
 */
export const AI_PROMPT_SEMANTIC_CONSISTENCY_HEADER = 
    `\n### Indirectly Related Tables Data (Reference for Semantic Consistency):\nUse the following datasets to ensure consistent and coherent business meaning across tables (e.g., matching code values to their original master names/types defined in master tables, even if not directly referenced by a foreign key in this table):\n`;

/**
 * 導出カラムがある場合のプロンプトヘッダー
 */
export const AI_PROMPT_DERIVED_COLUMNS_HEADER = `\n### Derived Columns calculation rules:\n`;

/**
 * 既存のデータが存在する場合のプロンプトヘッダー
 */
export const AI_PROMPT_EXISTING_DATA_HEADER = 
    `\n### Existing Mock Data in this Table (Before Refinement):\nHere are the currently existing rows in this table. Use this as a base/reference dataset. Depending on the user's refinement requests, you should preserve, modify, add, or delete records from this set to fulfill the instruction:\n`;

/**
 * ユーザーからの追加指示を注入するプロンプトヘッダーと境界ルール
 */
export const AI_PROMPT_USER_INSTRUCTIONS_HEADER = (aiInstructions, tableName, tableId) => 
    `\n### User Custom Instructions / Refinement Requests (HIGHEST PRIORITY):\nThe user has requested the following changes to this mock data. You MUST strictly apply this instruction to the existing data IF AND ONLY IF it is relevant to this table '${tableName}' (ID: '${tableId}') or its columns:\nRequest: "${aiInstructions}"\n\n* CRITICAL RULE FOR RELEVANCY AND SCHEMA STRICTNESS:\n- If this request is NOT relevant to this specific table '${tableName}' (e.g. it asks to add/modify/delete items in a different table, or references columns not present here), you MUST IGNORE this instruction for this table and simply focus on generating standard, coherent mock data that semantic-aligns with the newly generated parent/master datasets.\n- NEVER attempt to add columns or object properties that are not defined in the JSON Schema of this table. Strict schema validation is required.\nEnsure the final records reflect this instruction perfectly while maintaining consistent business logic and relationships across tables.\n`;

/**
 * AIによるデータ生成における基本的なコア規約群
 */
export const AI_PROMPT_GENERATION_RULES = (rowCount, pkColumnId) => `
### Rules for Data Generation:
1. **Diverse & Real Data**: Generate realistic mock data in Japanese (aim for approximately ${rowCount} rows, but you can increase or decrease this count dynamically to fulfill the user's specific refinement requests, such as adding or deleting items).
2. **Referential Integrity & Dynamic Synchronization (CRITICAL)**: 
   - Your foreign key columns MUST exactly reference valid existing primary key values from the parent tables provided above.
   - Do NOT use any IDs that are not present in the parent data list.
   - **[Dynamic Synchronization]**: If you detect that the parent table data (in "Referenced Parent Tables Data") has NEW primary keys that are NOT present in this table's "Existing Mock Data" (e.g. a new category code like "104" or "娯楽費" was added to the parent master), you MUST automatically and dynamically GENERATE new matching child rows in this table for those new keys to ensure complete semantic continuity.
   - **[Dynamic Cleanup]**: Conversely, if any keys present in this table's "Existing Mock Data" are no longer present in the parent table's keys (e.g. a category was deleted), you MUST completely DELETE/OMIT those orphaned rows from your output rows.
3. **Derived/Computed Items**:
   - For derived columns, calculate and populate their values based on the referenced parent row.
4. **Primary Key Uniqueness**: Ensure all generated rows have unique values for the primary key ('${pkColumnId}').
5. **Key Names**: Populate the JSON fields precisely using the Column IDs (like 'b1', 'e2', 't4', etc.) as the object keys.
`;
