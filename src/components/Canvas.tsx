import React from 'react';
import { Loader2, LinkIcon } from './Icons';
import { RelationshipLines } from './RelationshipLines';
import { TableNode } from './TableNode';
import { Table, Relationship } from '../types';

interface CanvasProps {
    canvasRef: React.RefObject<HTMLDivElement | null>;
    handleDragStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, tableId: string | null) => void;
    isPanning: boolean;
    viewOffset: { x: number; y: number };
    isLoading: boolean;
    relationships: Relationship[];
    tables: Table[];
    connectionMode: { fromId: string } | null;
    setConnectionMode: (mode: { fromId: string } | null) => void;
    addRow: (tableId: string) => void;
    setEditingTableId: (tableId: string) => void;
    initiateDeleteTable: (tableId: string) => void;
    toggleTableMinimize: (tableId: string) => void;
    updateRowValue: (tableId: string, rowId: string, columnId: string, value: any) => void;
    deleteRow: (tableId: string, rowId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    canvasRef, handleDragStart, isPanning, viewOffset, isLoading,
    relationships, tables, connectionMode, setConnectionMode,
    addRow, setEditingTableId, initiateDeleteTable, toggleTableMinimize,
    updateRowValue, deleteRow
}) => {
    return (
        <div 
            ref={canvasRef}
            onMouseDown={(e) => handleDragStart(e, null)} 
            onTouchStart={(e) => handleDragStart(e, null)}
            className={`relative flex-1 overflow-hidden bg-slate-50 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ 
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px` 
            }}
        >
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium text-gray-600">読み込み中...</span>
                    </div>
                </div>
            )}

            <RelationshipLines 
                relationships={relationships} 
                tables={tables} 
                viewOffset={viewOffset} 
            />

            {tables.map(table => (
                <TableNode 
                    key={table.id}
                    table={table}
                    tables={tables}
                    viewOffset={viewOffset}
                    connectionMode={connectionMode}
                    handleDragStart={handleDragStart}
                    addRow={addRow}
                    setEditingTableId={setEditingTableId}
                    initiateDeleteTable={initiateDeleteTable}
                    toggleTableMinimize={toggleTableMinimize}
                    updateRowValue={updateRowValue}
                    deleteRow={deleteRow}
                />
            ))}

            {connectionMode && (
                 <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl text-xs flex items-center gap-2 animate-bounce z-50">
                     <LinkIcon className="w-4 h-4" />
                     <span>子テーブル（N側）を選択</span>
                     <button onClick={() => setConnectionMode(null)} className="ml-2 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-xs">キャンセル</button>
                 </div>
            )}
        </div>
    );
};
