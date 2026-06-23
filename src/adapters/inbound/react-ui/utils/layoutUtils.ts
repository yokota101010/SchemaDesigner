import { Table, Relationship } from '../../../../domain/models';

/**
 * テーブルの推定矩形サイズを算出します。
 * ドラッグ中の一時座標 (dragPos) が指定された場合は、それを優先します。
 */
export const getTableRect = (
  table: Table, 
  viewOffset = { x: 0, y: 0 }, 
  dragPos: { x: number; y: number } | null = null
) => {
    const x = (dragPos ? dragPos.x : table.x) + viewOffset.x;
    const y = (dragPos ? dragPos.y : table.y) + viewOffset.y;
    
    const minWidth = 180; 
    const colWidth = 100; 
    const estimatedWidth = Math.max(minWidth, table.columns.length * colWidth + 60);
    
    const headerHeight = 40; 
    const colHeaderHeight = 30; 
    const rowHeight = 24; 
    const footerHeight = 0; 
    
    let height = headerHeight + colHeaderHeight; 
    if (!table.isMinimized) {
        height += (table.rows.length * rowHeight) + footerHeight;
    }
    
    return { x, y, width: estimatedWidth, height };
};

/**
 * 直角角丸コネクタ用のパスデータ (SVG d属性) を生成します。
 */
export const generateOrthogonalPath = (
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number, 
  isChildBelow: boolean
): string => {
    const r = 40; // 角丸の半径
    const actualR = Math.max(0, Math.min(r, Math.abs(endY - startY) - 4, Math.abs(endX - startX) - 4));

    if (actualR > 0) {
        const cornerY = endY;
        const startToCornerY = isChildBelow ? (cornerY - actualR) : (cornerY + actualR);
        const cornerToEndX = endX > startX ? (startX + actualR) : (startX - actualR);
        
        return `M ${startX} ${startY} L ${startX} ${startToCornerY} Q ${startX} ${cornerY}, ${cornerToEndX} ${cornerY} L ${endX} ${endY}`;
    } else {
        return `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
    }
};

/**
 * 縦の幹線 (midX) を経由する直角角丸コネクタ用のパスデータを生成します。
 */
export const generateBusOrthogonalPath = (
  startX: number, 
  startY: number, 
  midX: number, 
  endX: number, 
  endY: number, 
  isChildBelow: boolean
): string => {
    const pullDistance = 12;
    const pullY = isChildBelow ? (startY + pullDistance) : (startY - pullDistance);
    
    const r = 8; // 角丸の半径
    
    // 各区間の長さをチェック
    const distX1 = Math.abs(midX - startX);
    const distY1 = pullDistance;
    const distY2 = Math.abs(endY - pullY);
    const distX2 = Math.abs(endX - midX);
    
    // 安全のため、角丸半径の最大値を制限
    const actualR = Math.min(r, distY1, distX1 / 2, distY2 / 2, distX2 / 2);
    
    if (actualR > 0) {
        // 1つ目の角（垂直から水平へ）
        const rY1 = isChildBelow ? (pullY - actualR) : (pullY + actualR);
        const rX1 = midX > startX ? (startX + actualR) : (startX - actualR);
        
        // 2つ目の角（水平から垂直へ）
        const rX2 = midX > startX ? (midX - actualR) : (midX + actualR);
        const rY2 = endY > pullY ? (pullY + actualR) : (pullY - actualR);
        
        // 3つ目の角（垂直から水平へ：到着点）
        const rY3 = endY > pullY ? (endY - actualR) : (endY + actualR);
        const rX3 = midX + actualR; // endX は常に midX より右なので
        
        return `M ${startX} ${startY} ` +
               `L ${startX} ${rY1} ` +
               `Q ${startX} ${pullY}, ${rX1} ${pullY} ` +
               `L ${rX2} ${pullY} ` +
               `Q ${midX} ${pullY}, ${midX} ${rY2} ` +
               `L ${midX} ${rY3} ` +
               `Q ${midX} ${endY}, ${rX3} ${endY} ` +
               `L ${endX} ${endY}`;
    } else {
        return `M ${startX} ${startY} L ${startX} ${pullY} L ${midX} ${pullY} L ${midX} ${endY} L ${endX} ${endY}`;
    }
};

/**
 * 関連線の座標・経路計算ロジックを一括で処理します。
 * ドラッグ中の一時座標 (dragPos) やドラッグ中のテーブルID (draggingId) にも対応します。
 */
export const calculateRelationshipPath = (
  rel: Relationship, 
  tables: Table[], 
  relationships: Relationship[], 
  viewOffset: { x: number; y: number }, 
  draggingId: string | null = null, 
  dragPos: { x: number; y: number } | null = null
) => {
    const fromTable = tables.find(t => t.id === rel.from);
    const toTable = tables.find(t => t.id === rel.to);
    if (!fromTable || !toTable) return null;

    const getRect = (table: Table) => {
        const dp = table.id === draggingId ? dragPos : null;
        return getTableRect(table, viewOffset, dp);
    };

    const fromRect = getRect(fromTable);
    const toRect = getRect(toTable);
    const isChildBelow = toRect.y > fromRect.y;

    const incomingRels = relationships.filter(r => r.to === rel.to);
    const sortedIncomingRels = incomingRels.sort((a, b) => {
        const tableA = tables.find(t => t.id === a.from);
        const tableB = tables.find(t => t.id === b.from);
        
        const ya = tableA?.id === draggingId && dragPos ? dragPos.y : (tableA?.y || 0);
        const yb = tableB?.id === draggingId && dragPos ? dragPos.y : (tableB?.y || 0);
        const xa = tableA?.id === draggingId && dragPos ? dragPos.x : (tableA?.x || 0);
        const xb = tableB?.id === draggingId && dragPos ? dragPos.x : (tableB?.x || 0);
        
        const toY = toRect.y;
        const isAboveA = ya < toY;
        const isAboveB = yb < toY;
        
        if (isAboveA && !isAboveB) return -1;
        if (!isAboveA && isAboveB) return 1;
        
        return xb - xa; // 親のX座標の降順
    });
    
    const index = sortedIncomingRels.findIndex(r => r.id === rel.id);
    const total = incomingRels.length;
    
    const gap = 15;
    const yOffset = (index - (total - 1) / 2) * gap;

    // 1対1関係（主キー共有）かどうかの判定
    const isOneToOne = isOneToOneRelationship(rel, tables);

    let startX: number, startY: number, endX: number, endY: number, pathData: string;

    if (isOneToOne) {
        // コの字型パスの計算（親の左端から子の左端へ）
        startX = fromRect.x;
        // 出発点を親テーブルの左端中央に固定し、複数の1対1線を完全に重ねます
        startY = fromRect.y + fromRect.height / 2; 
        
        endX = toRect.x;
        endY = toRect.y + toRect.height / 2 + yOffset;

        // 幹線の位置：親テーブルの左端から固定で45px左に伸ばして完全に一本の縦線にします
        const midX = fromRect.x - 45;

        pathData = generateLoopOrthogonalPath(startX, startY, midX, endX, endY);
    } else {
        // 従来のL字型パス（親の上下端から子の左端へ）
        startX = fromRect.x + 24; 
        startY = isChildBelow ? (fromRect.y + fromRect.height + 8) : (fromRect.y - 8);
        endX = toRect.x;
        endY = toRect.y + toRect.height / 2 + yOffset;

        pathData = generateOrthogonalPath(startX, startY, endX, endY, isChildBelow);
    }
    
    return {
        pathData,
        isIdentifying: rel.type === 'identifying'
    };
};

/**
 * 2つのテーブル間のリレーションシップが1対1関係（主キー共有）であるか判定します。
 */
export const isOneToOneRelationship = (rel: Relationship, tables: Table[]): boolean => {
    const fromTable = tables.find(t => t.id === rel.from);
    const toTable = tables.find(t => t.id === rel.to);
    if (!fromTable || !toTable || !rel.mappings || rel.mappings.length === 0) return false;

    // 子テーブルの主キー（PK）カラムリスト
    const childPkCols = toTable.columns.filter(c => c.isPk);
    if (childPkCols.length === 0) return false;

    // マッピングされた子テーブルのカラムIDリスト
    const relChildColIds = rel.mappings.map(m => m.childColId);

    // 1. マッピングに含まれる子カラムが、子テーブルの主キー(PK)をすべてカバーしているか判定
    const coversAllChildPks = childPkCols.every(pk => relChildColIds.includes(pk.id));

    // 2. マッピングされた子カラムが、すべて主キー(PK)であるか判定
    const allChildColsArePk = relChildColIds.every(cid => {
        const col = toTable.columns.find(c => c.id === cid);
        return col ? col.isPk : false;
    });

    return coversAllChildPks && allChildColsArePk;
};

/**
 * 両テーブルの「左端」から出発し、左へはみ出して垂直に並行する「コの字（ループ）」の直角角丸パスデータを生成します。
 */
export const generateLoopOrthogonalPath = (
  startX: number, 
  startY: number, 
  midX: number, 
  endX: number, 
  endY: number
): string => {
    const r = 8; // 角丸の半径
    const distY = Math.abs(endY - startY);
    
    // 安全のため、角丸半径の最大値を制限
    const actualR = Math.min(r, Math.abs(midX - startX) / 2, distY / 2, Math.abs(endX - midX) / 2);

    if (actualR > 0) {
        // 左折して上下に進むための方向
        const rY1 = endY > startY ? (startY + actualR) : (startY - actualR);
        const rY2 = endY > startY ? (endY - actualR) : (endY + actualR);
        
        // 避難レーンから右折して到着点へ進む
        const rX2 = midX + actualR;

        return `M ${startX} ${startY} ` +
               `L ${midX + actualR} ${startY} ` +
               `Q ${midX} ${startY}, ${midX} ${rY1} ` +
               `L ${midX} ${rY2} ` +
               `Q ${midX} ${endY}, ${rX2} ${endY} ` +
               `L ${endX} ${endY}`;
    } else {
        return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    }
};
