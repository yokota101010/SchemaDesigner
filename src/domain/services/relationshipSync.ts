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
  const validRelationships: Relationship[] = [];
  
  currentRelationships.forEach(rel => {
    const parentTable = currentTables.find(t => t.id === rel.from);
    const childTable = currentTables.find(t => t.id === rel.to);
    if (parentTable && childTable) {
      // 親テーブル・子テーブル双方にマッピング対象のカラムが実在するもののみを抽出
      const validMappings = rel.mappings ? rel.mappings.filter(m => {
        const pCol = parentTable.columns.find(c => c.id === m.parentColId);
        const cCol = childTable.columns.find(c => c.id === m.childColId);
        return pCol && cCol;
      }) : [];
      
      // 【案A（完全一致方式）】
      // ① マッピングされた子カラムがすべて子テーブルの主キー(isPk: true)であること
      // ② 親テーブルのすべての主キー(PK)カラムがマッピングに含まれていること
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

  // ID重複の排除
  const relMap = new Map<string, Relationship>();
  validRelationships.forEach(rel => {
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
    const mappedCols = new Set<string>();

    childRels.forEach(rel => {
      rel.mappings.forEach(m => {
        if (m.childColId) {
          mappedCols.add(m.childColId);
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
          isFk: false
        };
      }

      const isFk = mappedCols.has(col.id);
      return {
        ...col,
        isFk: isFk
      };
    });

    return { ...table, columns: updatedColumns };
  });
};
