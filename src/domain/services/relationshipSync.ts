import { Table, Relationship } from '../models';

/**
 * 既存のリレーションシップの中から、最も適したものを検索する
 */
const findExistingRelationship = (
  relationships: Relationship[], 
  parentTableId: string, 
  childTableId: string, 
  childColId: string
): Relationship | undefined => {
  let match = relationships.find(r => 
    r.from === parentTableId && 
    r.to === childTableId &&
    r.mappings?.some(m => m.childColId === childColId)
  );
  if (match) return match;

  match = relationships.find(r => 
    r.from === parentTableId && 
    r.to === childTableId &&
    (!r.mappings || r.mappings.length === 0)
  );
  if (match) return match;

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

export const cleanRelationshipsForValueObjects = (
  tables: Table[],
  relationships: Relationship[]
): Relationship[] => {
  const allParentColIds = new Set<string>();
  tables.forEach(t => {
    t.columns.forEach(c => {
      if (c.parentColumnId) {
        allParentColIds.add(c.parentColumnId);
      }
    });
  });

  return relationships.map(rel => {
    if (rel.mappings) {
      return {
        ...rel,
        mappings: rel.mappings.filter(m => !allParentColIds.has(m.childColId))
      };
    }
    return rel;
  });
};

/**
 * リレーション情報をもとに、テーブルのカラムの isFk / reference 属性を同期した新しいテーブル情報を生成します。
 */
export const syncTableColumnsWithRelationships = (
  tables: Table[],
  relationships: Relationship[]
): Table[] => {
  return tables.map(table => {
    const childRels = relationships.filter(r => r.to === table.id && r.from && r.mappings);
    const mappedCols = new Map<string, { tableId: string; columnId: string }>();

    childRels.forEach(rel => {
      rel.mappings.forEach(m => {
        if (m.childColId) {
          mappedCols.set(m.childColId, {
            tableId: rel.from,
            columnId: m.parentColId || ''
          });
        }
      });
    });

    const parentColIds = new Set(
      table.columns.filter(c => c.parentColumnId).map(c => c.parentColumnId)
    );

    const updatedColumns = table.columns.map(col => {
      if (parentColIds.has(col.id)) {
        return {
          ...col,
          isFk: false,
          reference: undefined
        };
      }

      const fkInfo = mappedCols.get(col.id);
      if (fkInfo) {
        return {
          ...col,
          isFk: true,
          reference: fkInfo
        };
      } else {
        return {
          ...col,
          isFk: false,
          reference: undefined
        };
      }
    });

    return { ...table, columns: updatedColumns };
  });
};
