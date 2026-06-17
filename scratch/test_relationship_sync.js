import { syncRelationshipsWithTables } from '../src/utils/relationshipUtils.js';

// --- テストケース1: 同一親子テーブル間の複数外部キー ---
function testMultipleFks() {
    console.log("--- Test Case 1: Multiple FKs between same parent/child ---");
    const currentTables = [
        {
            id: 'table_A',
            name: 'TableA',
            columns: [
                { id: 'col_a_id', name: 'id', isPk: true, isFk: false }
            ]
        },
        {
            id: 'table_B',
            name: 'TableB',
            columns: [
                { id: 'col_b_id', name: 'id', isPk: true, isFk: false },
                {
                    id: 'col_fk_1',
                    name: 'fk_1',
                    isPk: false,
                    isFk: true,
                    reference: { tableId: 'table_A', columnId: 'col_a_id' }
                },
                {
                    id: 'col_fk_2',
                    name: 'fk_2',
                    isPk: false,
                    isFk: true,
                    reference: { tableId: 'table_A', columnId: 'col_a_id' }
                }
            ]
        }
    ];

    const currentRelationships = [
        {
            id: 'rel_from_fk1',
            from: 'table_A',
            to: 'table_B',
            type: 'non_identifying',
            mappings: [
                { childColId: 'col_fk_1', parentColId: 'col_a_id' }
            ]
        },
        {
            id: 'rel_from_fk2',
            from: 'table_A',
            to: 'table_B',
            type: 'non_identifying',
            mappings: [
                { childColId: 'col_fk_2', parentColId: 'col_a_id' }
            ]
        }
    ];

    const result = syncRelationshipsWithTables(currentTables, currentRelationships);
    console.log("Result relationships count:", result.length);
    if (result.length !== 2) {
        throw new Error(`Expected 2 relationships, got ${result.length}`);
    }
    console.log("Test Case 1 Passed!");
}

// --- テストケース2: 複合外部キー (複数のカラムが1つのリレーションシップに対応) ---
function testCompositeFk() {
    console.log("\n--- Test Case 2: Composite FK ---");
    const currentTables = [
        {
            id: 'table_A',
            name: 'TableA',
            columns: [
                { id: 'col_a_pk1', name: 'pk1', isPk: true, isFk: false },
                { id: 'col_a_pk2', name: 'pk2', isPk: true, isFk: false }
            ]
        },
        {
            id: 'table_B',
            name: 'TableB',
            columns: [
                { id: 'col_b_id', name: 'id', isPk: true, isFk: false },
                {
                    id: 'col_fk_pk1',
                    name: 'fk_pk1',
                    isPk: false,
                    isFk: true,
                    reference: { tableId: 'table_A', columnId: 'col_a_pk1' }
                },
                {
                    id: 'col_fk_pk2',
                    name: 'fk_pk2',
                    isPk: false,
                    isFk: true,
                    reference: { tableId: 'table_A', columnId: 'col_a_pk2' }
                }
            ]
        }
    ];

    // 複合キーなので、1つのリレーションシップオブジェクト (rel_composite) の mappings に2つのカラムが入っている
    const currentRelationships = [
        {
            id: 'rel_composite',
            from: 'table_A',
            to: 'table_B',
            type: 'non_identifying',
            mappings: [
                { childColId: 'col_fk_pk1', parentColId: 'col_a_pk1' },
                { childColId: 'col_fk_pk2', parentColId: 'col_a_pk2' }
            ]
        }
    ];

    const result = syncRelationshipsWithTables(currentTables, currentRelationships);
    console.log("Result relationships count:", result.length);
    if (result.length !== 1) {
        throw new Error(`Expected 1 relationship, got ${result.length}`);
    }
    console.log("Mappings count:", result[0].mappings.length);
    if (result[0].mappings.length !== 2) {
        throw new Error(`Expected 2 mappings inside composite relationship, got ${result[0].mappings.length}`);
    }
    console.log("Test Case 2 Passed!");
}

try {
    testMultipleFks();
    testCompositeFk();
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
} catch (error) {
    console.error("\nTEST FAILED:", error.message);
    process.exit(1);
}
