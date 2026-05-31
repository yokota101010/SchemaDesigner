/**
 * テーブルの推定矩形サイズを算出します。
 * ドラッグ中の一時座標 (dragPos) が指定された場合は、それを優先します。
 */
export const getTableRect = (table, viewOffset = { x: 0, y: 0 }, dragPos = null) => {
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
export const generateOrthogonalPath = (startX, startY, endX, endY, isChildBelow) => {
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
