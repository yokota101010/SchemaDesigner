import { generateMockDataWithAI } from '../src/utils/aiDataGenerator.js';

// グローバル fetch をモック化
// APIコールが発生した回数や、どのテーブルに対して発生したかを記録する
const apiCalls = [];
globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const promptText = body.contents[0].parts[0].text;
    
    // プロンプトの内容から、どのテーブルのどの段階の生成かを推測
    let phase = "unknown";
    let tableName = "unknown";
    
    if (promptText.includes("Current Data for Target Table")) {
        phase = "Phase 2 (Derivations)";
    } else if (promptText.includes("Calculate its value based on the referenced parent row's attributes")) {
        phase = "Phase 1 (Basic Data + Phase 1 Derivations)";
    } else {
        phase = "Phase 1 (Basic Data)";
    }
    
    // テーブル名を特定する
    const match = promptText.match(/table '([^']+)'/i) || promptText.match(/Target Table '([^']+)'/i);
    if (match) {
        tableName = match[1];
    }
    
    apiCalls.push({ tableName, phase });
    
    // ダミーデータを返す
    return {
        ok: true,
        status: 200,
        json: async () => ({
            candidates: [
                {
                    content: {
                        parts: [
                            { text: JSON.stringify({ rows: [ { id: "row_1" } ] }) }
                        ]
                    }
                }
            ]
        })
    };
};

// テスト用のダミーテーブル定義
const tables = [
    {
        id: 'table_dept', // 祖父 (Level 0)
        name: '部門',
        columns: [
            { id: 'col_dept_id', name: '部門C', isPk: true, isFk: false }
        ],
        rows: []
    },
    {
        id: 'table_store', // 親 (Level 1)
        name: '店舗',
        columns: [
            { id: 'col_store_id', name: '店舗C', isPk: true, isFk: false },
            { id: 'col_store_dept', name: '部門C', isPk: false, isFk: true, reference: { tableId: 'table_dept', columnId: 'col_dept_id' } }
        ],
        rows: []
    },
    {
        id: 'table_emp', // 子 (Level 2)
        name: '従業員',
        columns: [
            { id: 'col_emp_id', name: '従業員C', isPk: true, isFk: false },
            { id: 'col_emp_store', name: '店舗C', isPk: false, isFk: true, reference: { tableId: 'table_store', columnId: 'col_store_id' } },
            // 親の親（祖父）の引き写し。第1フェーズで解決可能であるべき (isFirstPhaseCalculable = true)
            {
                id: 'col_emp_dept_name',
                name: '部門名',
                attributeType: 'dependent',
                derivation: '店舗経由で 部門.部門名 を取得して設定する'
            },
            // 自己完結型の導出。第1フェーズで解決可能であるべき (isFirstPhaseCalculable = true)
            {
                id: 'col_emp_ym',
                name: '年月',
                attributeType: 'dependent',
                derivation: '当レコードの入社日（YYYY-MM-01形式）を抽出して設定する'
            },
            // 自テーブルの自己参照（過去行参照など）。第2フェーズに回るべき (isFirstPhaseCalculable = false)
            {
                id: 'col_emp_accum',
                name: '累積従業員数',
                attributeType: 'dependent',
                derivation: '従業員 テーブルの過去レコード数を累積する'
            }
        ],
        rows: []
    },
    {
        id: 'table_dept_summary', // 孫 (Level 1) - 集約用
        name: '部門サマリ',
        columns: [
            { id: 'col_sum_id', name: 'サマリC', isPk: true, isFk: false },
            { id: 'col_sum_dept', name: '部門C', isPk: false, isFk: true, reference: { tableId: 'table_dept', columnId: 'col_dept_id' } },
            // 下流（子）テーブルからの集約。第2フェーズに回るべき (isFirstPhaseCalculable = false)
            {
                id: 'col_sum_emp_count',
                name: '従業員数',
                attributeType: 'dependent',
                derivation: '従業員 テーブルから部門Cが一致する数を集計（COUNT）する'
            }
        ],
        rows: []
    }
];

const relationships = [
    { from: 'table_dept', to: 'table_store' },
    { from: 'table_store', to: 'table_emp' },
    { from: 'table_dept', to: 'table_dept_summary' }
];

async function runTest() {
    console.log("Starting test for aiDataGenerator.js optimization...");
    
    // AIデータ生成の実行 (行数1でダミー実行)
    // 待機時間をスキップするため、このスクリプト内では setTimeout をモックして待機時間をなくす
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, delay) => {
        // 即座に実行
        return originalSetTimeout(fn, 0);
    };
    
    await generateMockDataWithAI(tables, relationships, "fake-api-key", 1);
    
    // 元に戻す
    globalThis.setTimeout = originalSetTimeout;
    
    // --- 1. カラム判定フラグの検証 ---
    console.log("\n--- Verification 1: isFirstPhaseCalculable flags ---");
    const empTable = tables.find(t => t.id === 'table_emp');
    
    // 従業員.部門名
    const deptNameCol = empTable.columns.find(c => c.id === 'col_emp_dept_name');
    console.log(`従業員.部門名 (祖先参照): isFirstPhaseCalculable = ${deptNameCol.isFirstPhaseCalculable} (Expected: true)`);
    if (deptNameCol.isFirstPhaseCalculable !== true) {
        throw new Error("dept_name should be first-phase calculable");
    }
    
    // 従業員.年月
    const ymCol = empTable.columns.find(c => c.id === 'col_emp_ym');
    console.log(`従業員.年月 (自己完結): isFirstPhaseCalculable = ${ymCol.isFirstPhaseCalculable} (Expected: true)`);
    if (ymCol.isFirstPhaseCalculable !== true) {
        throw new Error("ym should be first-phase calculable");
    }
    
    // 従業員.累積従業員数
    const accumCol = empTable.columns.find(c => c.id === 'col_emp_accum');
    console.log(`従業員.累積従業員数 (自己参照): isFirstPhaseCalculable = ${accumCol.isFirstPhaseCalculable} (Expected: false)`);
    if (accumCol.isFirstPhaseCalculable !== false) {
        throw new Error("accum should not be first-phase calculable");
    }
    
    // 部門サマリ.従業員数
    const summaryTable = tables.find(t => t.id === 'table_dept_summary');
    const empCountCol = summaryTable.columns.find(c => c.id === 'col_sum_emp_count');
    console.log(`部門サマリ.従業員数 (下流集約): isFirstPhaseCalculable = ${empCountCol.isFirstPhaseCalculable} (Expected: false)`);
    if (empCountCol.isFirstPhaseCalculable !== false) {
        throw new Error("emp_count should not be first-phase calculable");
    }
    
    // --- 2. APIコールスキップの検証 ---
    console.log("\n--- Verification 2: API Call Logs ---");
    console.log("Total API calls:", apiCalls.length);
    apiCalls.forEach((call, idx) => {
        console.log(`  Call ${idx + 1}: Table = '${call.tableName}', Phase = '${call.phase}'`);
    });
    
    // 第2段階のAPIコール一覧を抽出
    const phase2Calls = apiCalls.filter(c => c.phase.includes("Phase 2"));
    
    // 第2段階でAPIが呼ばれるべきなのは：
    // - 「従業員」テーブル (累積従業員数 col_emp_accum が未解決のため)
    // - 「部門サマリ」テーブル (従業員数 col_sum_emp_count が未解決のため)
    // 逆に、「部門」と「店舗」は第2段階でAPIが呼ばれてはいけない（スキップされるべき）。
    console.log("\nChecking Phase 2 calls...");
    const calledTables = phase2Calls.map(c => c.tableName);
    console.log("Tables called in Phase 2:", calledTables);
    
    if (calledTables.includes("部門") || calledTables.includes("店舗")) {
        throw new Error("FAILED: Phase 2 API was called for '部門' or '店舗' which have no 2nd phase derived columns!");
    }
    if (!calledTables.includes("従業員") || !calledTables.includes("部門サマリ")) {
        throw new Error("FAILED: Phase 2 API was NOT called for '従業員' or '部門サマリ' which have 2nd phase derived columns!");
    }
    
    console.log("\nSUCCESS: All optimizations verified successfully!");
}

runTest().catch(err => {
    console.error("\nTEST FAILED:", err.message);
    process.exit(1);
});
