import { Table, Relationship } from '../types';

/**
 * 既存のリレーションシップの中から、最も適したものを検索する
 */
const findExistingRelationship = (
  relationships: Relationship[], 
  parentTableId: string, 
  childTableId: string, 
  childColId: string
): Relationship | undefined => {
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

export const syncRelationshipsWithTables = (
  currentTables: Table[], 
  currentRelationships: Relationship[]
): Relationship[] => {
  const newRelationships: Relationship[] = [];
  
  currentTables.forEach(table => {
      table.columns.forEach(col => {
          if (col.isFk && col.reference?.tableId && col.reference?.columnId) {
              const parentTable = currentTables.find(t => t.id === col.reference?.tableId);
              
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

  const relMap = new Map<string, Relationship>();
  newRelationships.forEach(rel => {
      const key = rel.id; 
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
