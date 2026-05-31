import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMockDataWithAI } from '../../../src/utils/aiDataGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const schemaPathArg = process.argv[2];
    const apiKey = process.env.GEMINI_API_KEY;

    if (!schemaPathArg) {
        console.error("エラー: スキーマJSONファイルのパスを指定してください。");
        console.log("使用方法: GEMINI_API_KEY=xxx node generate-mock-data.js <path_to_schema_json>");
        process.exit(1);
    }
    if (!apiKey) {
        console.error("エラー: GEMINI_API_KEY 環境変数が設定されていません。");
        process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), schemaPathArg);
    if (!fs.existsSync(absolutePath)) {
        console.error(`エラー: ファイルが見つかりません -> ${absolutePath}`);
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(absolutePath, 'utf-8');
        const project = JSON.parse(raw);

        if (!project.tables || !Array.isArray(project.tables)) {
            console.error("エラー: 無効なスキーマJSONファイルです。'tables'配列がありません。");
            process.exit(1);
        }

        console.log(`[RDB Mock Data Generator] プロジェクト "${project.name || '無題'}" のデータを生成中...`);
        const relationships = project.relationships || [];

        // AIデータ生成ユーティリティを実行
        const generatedData = await generateMockDataWithAI(project.tables, relationships, apiKey);

        // 各テーブルの rows にデータをマッピングして上書き
        project.tables = project.tables.map((table, idx) => {
            const newRows = generatedData[table.id];
            if (newRows && Array.isArray(newRows)) {
                const formattedRows = newRows.map((row, rIdx) => ({
                    id: `row_ai_${Date.now()}_${idx}_${rIdx}`,
                    ...row
                }));
                return {
                    ...table,
                    rows: formattedRows,
                    isMinimized: false
                };
            }
            return table;
        });

        // データを埋め込んだスキーマJSONを保存
        fs.writeFileSync(absolutePath, JSON.stringify(project, null, 2), 'utf-8');
        console.log(`[RDB Mock Data Generator] 成功: データを生成して上書き保存しました -> ${absolutePath}`);
    } catch (e) {
        console.error("[RDB Mock Data Generator] 失敗:", e.message);
        process.exit(1);
    }
}

run();
