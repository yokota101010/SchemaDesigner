import { Table, Column } from '../domain/models';

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

/**
 * テーブルがサブビュー（マスタテーブル等）であるか判定する
 */
export const isMasterTable = (table: Table): boolean => {
  return table.viewPane === 'sub';
};

/**
 * カラムの表示名を取得します。
 * 値オブジェクトの子カラムの場合は「個別の項目名@値オブジェクト名（親カラム名）」の形式で返します。
 */
export const getDisplayColumnName = (col: Column, table: Table): string => {
  if (col.isVoProperty && col.parentColumnId) {
    const parentCol = table.columns.find(c => c.id === col.parentColumnId);
    const parentName = parentCol ? parentCol.name : '';
    
    let propName = col.voPropertyName;
    if (!propName) {
      if (col.name.includes('@')) {
        propName = col.name.split('@')[0];
      } else if (col.name.includes('_')) {
        const parts = col.name.split('_');
        propName = parts[parts.length - 1];
      } else {
        propName = col.name;
      }
    }
    
    if (parentName) {
      return formatVoColumnName(propName, parentName);
    }
  }
  return col.name;
};

/**
 * 値オブジェクトの子カラムの物理名（個別の項目名@親カラム名）を統一生成する
 */
export const formatVoColumnName = (propName: string, parentName: string): string => {
  return `${propName}@${parentName}`;
};

/**
 * 指定されたテーブル内で、特定の親カラムIDに紐づく子カラム群を取得する
 */
export const getChildColumns = (table: Table, parentColId: string): Column[] => {
  return table.columns.filter(c => c.parentColumnId === parentColId);
};

/**
 * 指定されたカラムIDが値オブジェクトの親カラムであるか判定する
 */
export const isVoParentColumn = (table: Table, colId: string): boolean => {
  return table.columns.some(c => c.parentColumnId === colId);
};
