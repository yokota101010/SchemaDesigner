import { Table } from '../models';
import { getVisibleColumns, getDisplayColumnName } from '../../utils/schemaUtils';

/**
 * サブビューのテーブルをトポロジカル/名前順に整列した新しい配置座標を算出します。
 */
export const calculateAlignSubTablesPlacements = (tables: Table[]): Table[] => {
  const subTables = tables.filter(t => t.viewPane === 'sub');
  if (subTables.length === 0) return tables;

  const sorted = [...subTables].sort((a, b) => a.name.localeCompare(b.name));

  const getTableWidth = (table: Table) => {
    const el = document.getElementById(`table-${table.id}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) return rect.width;
    }
    
    const visibleCols = getVisibleColumns(table);
    
    let estimatedColsWidth = 0;
    visibleCols.forEach(col => {
      const displayName = getDisplayColumnName(col, table);
      const nameLen = displayName ? displayName.length : 0;
      const colWidth = Math.max(100, nameLen * 8 + 30);
      estimatedColsWidth += colWidth;
    });

    return Math.max(180, estimatedColsWidth + 80);
  };

  const getTableHeight = (table: Table) => {
    const el = document.getElementById(`table-${table.id}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) return rect.height;
    }
    if (table.isMinimized) return 40;
    const headerHeight = 40;
    const visibleCols = getVisibleColumns(table);
    const columnsHeight = visibleCols.length * 22;
    const rowsHeight = table.rows.length * 32;
    const footerHeight = 40;
    return headerHeight + columnsHeight + rowsHeight + footerHeight;
  };

  const col1X = 50;
  const marginX = 40;
  const marginY = 40;

  let col1Height = 40;
  let col2Height = 40;
  let maxCol1Width = 180;

  const placements = sorted.map(table => {
    const width = getTableWidth(table);
    const height = getTableHeight(table);
    
    let column: 1 | 2 = 1;
    let y = 0;

    if (col2Height < col1Height) {
      column = 2;
      y = col2Height;
      col2Height += height + marginY;
    } else {
      column = 1;
      y = col1Height;
      col1Height += height + marginY;
      if (width > maxCol1Width) {
        maxCol1Width = width;
      }
    }

    return { table, column, y };
  });

  const col2X = col1X + maxCol1Width + marginX;

  const updatedSubTables = placements.map(({ table, column, y }) => {
    const x = column === 1 ? col1X : col2X;
    return { ...table, x, y };
  });

  const subTableMap = new Map(updatedSubTables.map(t => [t.id, t]));
  return tables.map(t => subTableMap.get(t.id) || t);
};

/**
 * 対象テーブルのY座標より下にある、同じペインのテーブル群のY座標を shiftY だけ移動します。
 */
export const shiftTablesBelow = (targetTableId: string, tables: Table[], shiftY: number): Table[] => {
  if (shiftY === 0) return tables;
  const targetTable = tables.find(t => t.id === targetTableId);
  if (!targetTable) return tables;

  const targetViewPane = targetTable.viewPane;
  const targetY = targetTable.y;

  return tables.map(t => {
    if (t.id === targetTableId) return t;

    const isSamePane = (t.viewPane === targetViewPane) || (!t.viewPane && !targetViewPane) || (t.viewPane !== 'sub' && targetViewPane !== 'sub');
    if (isSamePane && t.y > targetY) {
      return { ...t, y: Math.max(0, t.y + shiftY) };
    }
    return t;
  });
};

/**
 * インスタンス（データ行）の追加に伴い、その下にあるテーブルのY座標を自動調整します。
 */
export const adjustTablesYOnRowAddition = (tableId: string, tables: Table[]): Table[] => {
  const targetTable = tables.find(t => t.id === tableId);
  if (!targetTable) return tables;

  const ROW_HEIGHT = 26;
  let shiftY = ROW_HEIGHT;

  // 追加前の時点で非表示（折りたたみ）だった場合、行追加に伴い展開状態（isMinimized: false）になるため、
  // (追加後の行数) * ROW_HEIGHT 分、直下のテーブルを押し下げる
  if (targetTable.isMinimized) {
    const nextRowCount = targetTable.rows.length + 1;
    shiftY = nextRowCount * ROW_HEIGHT;
  }

  return shiftTablesBelow(tableId, tables, shiftY);
};

/**
 * インスタンス（データ行）の削除に伴い、その下にあるテーブルのY座標を自動調整します。
 */
export const adjustTablesYOnRowDeletion = (tableId: string, tables: Table[]): Table[] => {
  const targetTable = tables.find(t => t.id === tableId);
  if (!targetTable) return tables;

  // 削除前の時点で非表示（折りたたみ）の場合、見た目の高さ変化はないためシフト不要
  if (targetTable.isMinimized) {
    return tables;
  }

  const ROW_HEIGHT = 26;
  const shiftY = -ROW_HEIGHT;

  return shiftTablesBelow(tableId, tables, shiftY);
};

/**
 * 特定のテーブルの isMinimized トグルに伴い、その下にあるテーブルのY座標を自動調整します。
 */
export const adjustTablesYOnMinimizeToggle = (tableId: string, tables: Table[]): Table[] => {
  const targetTable = tables.find(t => t.id === tableId);
  if (!targetTable) return tables;

  const nextMinimized = !targetTable.isMinimized;
  const rowCount = targetTable.rows.length;

  const updatedTables = tables.map(t => t.id === tableId ? { ...t, isMinimized: nextMinimized } : t);

  if (rowCount === 0) {
    return updatedTables;
  }

  const ROW_HEIGHT = 26;
  const deltaY = rowCount * ROW_HEIGHT;
  const shiftY = nextMinimized ? -deltaY : deltaY;

  return shiftTablesBelow(tableId, updatedTables, shiftY);
};

/**
 * 対象ビューのインスタンス一括表示/非表示を切り替え、縦位置を調整します。
 */
export const toggleAllTablesMinimize = (tables: Table[], activeTab: 'main' | 'sub' = 'main', forceMinimize?: boolean): Table[] => {
  const isSub = activeTab === 'sub';
  const targetTables = tables.filter(t => isSub ? t.viewPane === 'sub' : t.viewPane !== 'sub');
  if (targetTables.length === 0) return tables;

  const shouldMinimize = forceMinimize !== undefined 
    ? forceMinimize 
    : !targetTables.every(t => t.isMinimized);

  // 対象テーブルを Y 座標順にソート
  const sorted = [...targetTables].sort((a, b) => a.y - b.y);

  let cumulativeShift = 0;
  const newYMap = new Map<string, number>();

  sorted.forEach(table => {
    const currentIsMin = table.isMinimized;
    const nextIsMin = shouldMinimize;

    let deltaH = 0;
    if (currentIsMin !== nextIsMin && table.rows.length > 0) {
      const rowHeightTotal = table.rows.length * 26;
      deltaH = nextIsMin ? -rowHeightTotal : rowHeightTotal;
    }

    const newY = Math.max(0, table.y + cumulativeShift);
    newYMap.set(table.id, newY);

    cumulativeShift += deltaH;
  });

  return tables.map(t => {
    const isTarget = isSub ? t.viewPane === 'sub' : t.viewPane !== 'sub';
    if (isTarget) {
      return {
        ...t,
        isMinimized: shouldMinimize,
        y: newYMap.has(t.id) ? newYMap.get(t.id)! : t.y
      };
    }
    return t;
  });
};

