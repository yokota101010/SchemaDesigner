import React from 'react';
import { calculateRelationshipPath } from '../utils/layoutUtils';
import { Relationship, Table } from '../../../domain/models';

interface RelationshipLinesProps {
    relationships: Relationship[];
    tables: Table[];
    viewOffset: { x: number; y: number };
}

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({ relationships, tables, viewOffset }) => {
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
                const pathInfo = calculateRelationshipPath(rel, tables, relationships, viewOffset);
                if (!pathInfo) return null;
                
                const color = "#64748b";

                return (
                    <g key={rel.id} id={`rel-${rel.id}`} className="group pointer-events-none">
                        <path 
                            d={pathInfo.pathData} 
                            stroke={color} 
                            strokeWidth="1.5" 
                            fill="none" 
                            strokeDasharray={pathInfo.isIdentifying ? "none" : "5,5"} 
                            markerStart={`url(#marker-one-normal)`}
                            markerEnd={`url(#marker-many-normal)`}
                        />
                    </g>
                );
            })}
        </svg>
    );
};
