import { Table, Column } from '../types';

/**
 * FK参照などのデータ型から、実際の物理データ型を再帰的に解決する
 */
export const resolveColumnType = (col: Column, tables: Table[]): string => {
  if (col.type && col.type.startsWith('FK:')) {
    const refTableId = col.type.substring(3);
    const refTable = tables.find(t => t.id === refTableId);
    const refPkCol = refTable?.columns.find(c => c.isPk);
    if (refPkCol) {
      return resolveColumnType(refPkCol, tables);
    }
  }
  return col.type;
};

/**
 * テーブルの物理的な（値オブジェクト親カラムを除いた）表示対象となるカラムのリストを取得する
 */
export const getVisibleColumns = (table: Table): Column[] => {
  const parentColIds = new Set(
    table.columns
      .filter(c => c.parentColumnId)
      .map(c => c.parentColumnId)
  );

  return table.columns.filter(col => {
    // 値オブジェクトの親カラムは表示対象外
    if (parentColIds.has(col.id)) return false;

    // isVisible === false かつ、キー項目（PK、UQ、FK）でない場合は非表示
    const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(col.id));
    if (col.isVisible === false && !col.isPk && !isColUnique && !col.isFk) {
      return false;
    }

    return true;
  });
};
