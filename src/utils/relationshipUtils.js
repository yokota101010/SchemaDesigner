/**
 * 既存のリレーションシップの中から、最も適したものを検索する
 * @param {Array} relationships 既存のリレーションシップリスト
 * @param {string} parentTableId 親テーブルID
 * @param {string} childTableId 子テーブルID
 * @param {string} childColId 子カラムID
 * @returns {Object|undefined} 最もマッチするリレーションシップ
 */
const findExistingRelationship = (relationships, parentTableId, childTableId, childColId) => {
    // 1. カラムIDがマッピングに含まれる既存リレーションを優先して検索
    let match = relationships.find(r => 
        r.from === parentTableId && 
        r.to === childTableId &&
        r.mappings?.some(m => m.childColId === childColId)
    );
    if (match) return match;

    // 2. マッピングが空の既存リレーションを検索
    match = relationships.find(r => 
        r.from === parentTableId && 
        r.to === childTableId &&
        (!r.mappings || r.mappings.length === 0)
    );
    if (match) return match;

    // 3. 通常のfrom-to一致で検索（フォールバック）
    return relationships.find(r => 
        r.from === parentTableId && r.to === childTableId
    );
};

export const syncRelationshipsWithTables = (currentTables, currentRelationships) => {
  const newRelationships = [];
  
  currentTables.forEach(table => {
      table.columns.forEach(col => {
          if (col.isFk && col.reference?.tableId && col.reference?.columnId) {
              const parentTable = currentTables.find(t => t.id === col.reference.tableId);
              
              if (parentTable && parentTable.id !== table.id) {
                  const type = col.isPk ? 'identifying' : 'non_identifying';
                  
                  const existingRel = findExistingRelationship(
                      currentRelationships,
                      parentTable.id,
                      table.id,
                      col.id
                  );

                  newRelationships.push({
                      id: existingRel ? existingRel.id : `rel_${parentTable.id}_${table.id}_${col.id}`,
                      from: parentTable.id,
                      to: table.id,
                      type: type,
                      mappings: existingRel ? (existingRel.mappings || []) : []
                  });
              }
          }
      });
  });

  const relMap = new Map();
  newRelationships.forEach(rel => {
      const key = rel.id; // 重複排除のキーを ID に変更
      if (relMap.has(key)) {
          if (rel.type === 'identifying') {
              relMap.set(key, rel);
          }
      } else {
          relMap.set(key, rel);
      }
  });
  
  return Array.from(relMap.values());
};
