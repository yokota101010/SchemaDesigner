import React from 'react';
import { getTableRect, generateOrthogonalPath } from '../utils/layoutUtils';

export const RelationshipLines = ({ relationships, tables, viewOffset }) => {


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

                const fromRect = getTableRect(fromTable, viewOffset);
                const toRect = getTableRect(toTable, viewOffset);

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
                // テーブルの境界から 8px 離れた位置を、関連線（および横棒マーカー）の出発点にします
                const startY = isChildBelow ? (fromRect.y + fromRect.height + 8) : (fromRect.y - 8);

                const endX = toRect.x;
                const endY = toRect.y + toRect.height / 2 + yOffset;

                // 共通ユーティリティを使用して直角角丸パスデータを生成
                const pathData = generateOrthogonalPath(startX, startY, endX, endY, isChildBelow);
                
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
