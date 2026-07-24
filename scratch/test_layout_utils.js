// layoutUtils のロジックの単体検証スクリプト

const getTableRect = (table) => {
  const minWidth = 180; 
  const colWidth = 100; 
  const estimatedWidth = Math.max(minWidth, table.columns.length * colWidth + 60);
  
  const headerHeight = 40; 
  const colHeaderHeight = 30; 
  const rowHeight = 24; 
  
  let height = headerHeight + colHeaderHeight; 
  if (!table.isMinimized) {
    height += (table.rows.length * rowHeight);
  }
  
  return { x: table.x, y: table.y, width: estimatedWidth, height };
};

const childTable = {
  id: 'child_1',
  name: '子テーブル',
  x: 500,
  y: 500,
  isMinimized: false,
  columns: [{ id: 'c1', name: 'id', isPk: true }],
  rows: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]
};

const parentAbove = {
  id: 'parent_above',
  name: '親テーブル（上）',
  x: 100,
  y: 100,
  isMinimized: false,
  columns: [{ id: 'p1', name: 'id', isPk: true }],
  rows: [{ id: 'r1' }]
};

const parentBelow = {
  id: 'parent_below',
  name: '親テーブル（下）',
  x: 100,
  y: 900,
  isMinimized: false,
  columns: [{ id: 'p2', name: 'id', isPk: true }],
  rows: [{ id: 'r1' }]
};

const tables = [childTable, parentAbove, parentBelow];

const relAbove = { id: 'rel_above', from: 'parent_above', to: 'child_1' };
const relBelow = { id: 'rel_below', from: 'parent_below', to: 'child_1' };

const incomingRels = [relAbove, relBelow];
const toRect = getTableRect(childTable);

const sortedIncomingRels = incomingRels.sort((a, b) => {
    const tableA = tables.find(t => t.id === a.from);
    const tableB = tables.find(t => t.id === b.from);
    
    const rectA = tableA ? getTableRect(tableA) : null;
    const rectB = tableB ? getTableRect(tableB) : null;

    const centerYA = rectA ? rectA.y + rectA.height / 2 : 0;
    const centerYB = rectB ? rectB.y + rectB.height / 2 : 0;
    const centerYTo = toRect.y + toRect.height / 2;

    const isAboveA = centerYA < centerYTo;
    const isAboveB = centerYB < centerYTo;

    if (isAboveA && !isAboveB) return -1;
    if (!isAboveA && isAboveB) return 1;

    const xa = rectA ? rectA.x : 0;
    const xb = rectB ? rectB.x : 0;

    return xb - xa;
});

console.log("ソート結果:");
sortedIncomingRels.forEach((r, idx) => {
  console.log(`Index ${idx}: ${r.id}`);
});

if (sortedIncomingRels[0].id === 'rel_above' && sortedIncomingRels[1].id === 'rel_below') {
  console.log("\nSUCCESS: 上にある親のリレーションがIndex 0 (上側の接続点) に正しくソートされました！");
} else {
  console.error("\nFAIL: ソート順が期待通りではありません。");
  process.exit(1);
}
