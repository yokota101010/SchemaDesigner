import { Table } from '../models';
import { getVisibleColumns } from '../../utils/schemaUtils';

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
      const nameLen = col.name ? col.name.length : 0;
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
