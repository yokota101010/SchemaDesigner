import { generateMockDataWithAI } from '../src/utils/aiDataGenerator.js';

// テスト用の簡単なテーブル定義
const tables = [
    {
        id: 't1',
        name: 'テーブル1',
        columns: [
            { id: 'c1', name: 'id', isPk: true }
        ],
        rows: []
    }
];
const relationships = [];

// 1. テストケースA: 1日あたりの上限に達した場合（即座に諦める）
async function runTestDailyExhausted() {
    console.log("--- Test Case A: Daily Quota Exhausted ---");
    let fetchCount = 0;
    
    // fetchのモック化
    globalThis.fetch = async (url, options) => {
        fetchCount++;
        return {
            status: 429,
            ok: false,
            clone: () => ({
                json: async () => ({
                    error: {
                        code: 429,
                        message: "Resource has been exhausted (e.g. queries per day limit reached).",
                        status: "RESOURCE_EXHAUSTED"
                    }
                })
            })
        };
    };
    
    try {
        await generateMockDataWithAI(tables, relationships, "fake-key", 1);
    } catch (err) {
        console.log("Caught expected error:", err.message);
    }
    
    console.log("Fetch Count:", fetchCount);
    if (fetchCount === 1) {
        console.log("SUCCESS: Daily quota exhausted aborted retry immediately!");
    } else {
        throw new Error(`FAILED: Expected 1 fetch call, but got ${fetchCount}`);
    }
}

// 2. テストケースB: 1分あたり制限に達した場合（リトライされる）
async function runTestMinuteExceeded() {
    console.log("\n--- Test Case B: Minute Rate Limit Exceeded ---");
    let fetchCount = 0;
    
    // fetchのモック化
    globalThis.fetch = async (url, options) => {
        fetchCount++;
        return {
            status: 429,
            ok: false,
            clone: () => ({
                json: async () => ({
                    error: {
                        code: 429,
                        message: "Quota exceeded for quota metric 'requests per minute'...",
                        status: "RESOURCE_EXHAUSTED"
                    }
                })
            })
        };
    };
    
    // 待機時間をスキップするため、setTimeoutをモック
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, delay) => originalSetTimeout(fn, 0);
    
    try {
        await generateMockDataWithAI(tables, relationships, "fake-key", 1);
    } catch (err) {
        console.log("Caught expected error:", err.message);
    }
    
    globalThis.setTimeout = originalSetTimeout;
    
    console.log("Fetch Count:", fetchCount);
    // maxRetries = 7 なので、最初の呼び出し + 6回のリトライ = 計7回呼ばれるはず
    if (fetchCount === 7) {
        console.log("SUCCESS: Minute rate limit triggered full retries!");
    } else {
        throw new Error(`FAILED: Expected 7 fetch calls, but got ${fetchCount}`);
    }
}

async function runAll() {
    try {
        await runTestDailyExhausted();
        await runTestMinuteExceeded();
        console.log("\nALL TESTS PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (error) {
        console.error("\nTEST FAILED:", error.message);
        process.exit(1);
    }
}

runAll();
