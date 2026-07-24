import fs from 'fs';
import path from 'path';

// `domain-model.md` から メタデータを抽出
const filePath = path.resolve('modeling-data/業績管理システム/domain-model.md');
const content = fs.readFileSync(filePath, 'utf-8');

const match = content.match(/SCHEMA_DESIGNER_METADATA_START\s*([\s\S]*?)\s*SCHEMA_DESIGNER_METADATA_END/);
if (!match) {
  console.error("Metadata not found!");
  process.exit(1);
}

const metadata = JSON.parse(match[1]);
const { tables, relationships } = metadata;

// relationshipSync のロジックと同等のテストを実施
function syncRelationshipsWithTables(currentTables, currentRelationships) {
  const validRelationships = [];
  
  currentRelationships.forEach(rel => {
    const parentTable = currentTables.find(t => t.id === rel.from);
    const childTable = currentTables.find(t => t.id === rel.to);
    if (parentTable && childTable) {
      const validMappings = rel.mappings ? rel.mappings.filter(m => {
        const pCol = parentTable.columns.find(c => c.id === m.parentColId);
        const cCol = childTable.columns.find(c => c.id === m.childColId);
        return pCol && cCol;
      }) : [];
      
      // 【案A（完全一致方式）】
      const rawMappings = rel.mappings || [];
      const parentPkColIds = parentTable.columns.filter(c => c.isPk).map(c => c.id);
      
      let isIdentifying = false;
      if (rawMappings.length > 0 && parentPkColIds.length > 0) {
        const allChildMappedArePk = rawMappings.every(m => {
          const cCol = childTable.columns.find(c => c.id === m.childColId);
          return cCol && cCol.isPk;
        });
        const allParentPkMapped = parentPkColIds.every(pPkId =>
          rawMappings.some(m => m.parentColId === pPkId)
        );
        isIdentifying = allChildMappedArePk && allParentPkMapped;
      }

      const type = isIdentifying ? 'identifying' : 'non_identifying';

      validRelationships.push({
        ...rel,
        type: type,
        mappings: validMappings
      });
    }
  });

  return validRelationships;
}

const synced = syncRelationshipsWithTables(tables, relationships);

// 1. 「社員単価」(table_1784918946090) -> 「月別社員単価」(table_1784919720920) のリレーションを探す
const relShainTanka = synced.find(r => r.from === 'table_1784918946090' && r.to === 'table_1784919720920');

console.log("=== 社員単価 -> 月別社員単価 ===");
console.log("Type:", relShainTanka ? relShainTanka.type : "NOT FOUND");

if (relShainTanka && relShainTanka.type === 'non_identifying') {
  console.log("SUCCESS: 「社員単価 -> 月別社員単価」は期待通り 'non_identifying' (破線) に判定されました！");
} else {
  console.error("FAIL: 期待される判定結果ではありません。");
  process.exit(1);
}

// 2. 「プロジェクト」(table_1784066570927) -> 「案件」(table_1784066610123) の識別リレーションをテスト
const relProjectAnken = synced.find(r => r.from === 'table_1784066570927' && r.to === 'table_1784066610123');
console.log("\n=== プロジェクト -> 案件 ===");
console.log("Type:", relProjectAnken ? relProjectAnken.type : "NOT FOUND");

if (relProjectAnken && relProjectAnken.type === 'identifying') {
  console.log("SUCCESS: 「プロジェクト -> 案件」は期待通り 'identifying' (実線) に正しく判定されています！");
} else {
  console.error("FAIL: 識別リレーションの判定が正しくありません。");
  process.exit(1);
}

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
