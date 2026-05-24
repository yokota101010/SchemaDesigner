export const syncRelationshipsWithTables = (currentTables, currentRelationships) => {
  const newRelationships = [];
  
  currentTables.forEach(table => {
      table.columns.forEach(col => {
          if (col.isFk && col.reference?.tableId && col.reference?.columnId) {
              const parentTable = currentTables.find(t => t.id === col.reference.tableId);
              
              if (parentTable && parentTable.id !== table.id) {
                  const type = col.isPk ? 'identifying' : 'non_identifying';
                  
                  const existingRel = currentRelationships.find(r => 
                      r.from === parentTable.id && r.to === table.id
                  );

                  newRelationships.push({
                      id: existingRel ? existingRel.id : `rel_${parentTable.id}_${table.id}`,
                      from: parentTable.id,
                      to: table.id,
                      type: type
                  });
              }
          }
      });
  });

  const relMap = new Map();
  newRelationships.forEach(rel => {
      const key = `${rel.from}-${rel.to}`;
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
