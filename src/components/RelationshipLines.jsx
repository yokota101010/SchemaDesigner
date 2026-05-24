import React from 'react';

export const RelationshipLines = ({ relationships, tables, viewOffset }) => {
    const getTableRect = (table) => {
        const minWidth = 180; 
        const colWidth = 100; 
        const estimatedWidth = Math.max(minWidth, table.columns.length * colWidth + 60);
        
        const headerHeight = 40; 
        const colHeaderHeight = 30; 
        const rowHeight = 30; 
        const footerHeight = 0; 
        
        let height = headerHeight + colHeaderHeight; 
        if (!table.isMinimized) {
            height += (table.rows.length * rowHeight) + footerHeight;
        }
        
        return {
            x: table.x + viewOffset.x,
            y: table.y + viewOffset.y,
            width: estimatedWidth,
            height
        };
    };

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
            <defs>
                <marker id="marker-one-normal" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto">
                    <path d="M1 0 L1 10" stroke="#64748b" strokeWidth="2" />
                </marker>
                <marker id="marker-many-normal" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                    <path d="M0 0 L10 5 L0 10" fill="none" stroke="#64748b" strokeWidth="2" />
                </marker>
            </defs>

            {relationships.map(rel => {
                const fromTable = tables.find(t => t.id === rel.from);
                const toTable = tables.find(t => t.id === rel.to);
                if (!fromTable || !toTable) return null;

                const fromRect = getTableRect(fromTable);
                const toRect = getTableRect(toTable);

                const isChildBelow = toRect.y > fromRect.y;

                const incomingRels = relationships.filter(r => r.to === rel.to);
                const sortedIncomingRels = incomingRels.sort((a, b) => {
                    const tableA = tables.find(t => t.id === a.from);
                    const tableB = tables.find(t => t.id === b.from);
                    return (tableA?.y || 0) - (tableB?.y || 0);
                });
                
                const index = sortedIncomingRels.findIndex(r => r.id === rel.id);
                const total = incomingRels.length;
                
                const gap = 15;
                const yOffset = (index - (total - 1) / 2) * gap;

                const startX = fromRect.x + 24; 
                const startY = isChildBelow ? (fromRect.y + fromRect.height) : fromRect.y;

                const endX = toRect.x;
                const endY = toRect.y + toRect.height / 2 + yOffset;

                const cx = startX;
                const cy = endY;

                const pathData = `M ${startX} ${startY} Q ${cx} ${cy}, ${endX} ${endY}`;
                
                const isIdentifying = rel.type === 'identifying';
                const color = "#64748b";

                return (
                    <g key={rel.id} id={`rel-${rel.id}`} className="group pointer-events-none">
                        <path 
                            d={pathData} 
                            stroke={color} 
                            strokeWidth="1.5" 
                            fill="none" 
                            strokeDasharray={isIdentifying ? "none" : "5,5"} 
                            markerStart={`url(#marker-one-normal)`}
                            markerEnd={`url(#marker-many-normal)`}
                        />
                    </g>
                );
            })}
        </svg>
    );
};
