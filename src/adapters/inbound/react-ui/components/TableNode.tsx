import React from 'react';
import { GripHorizontal, Plus, Settings, Trash2, ChevronDown, ChevronUp, Key, KeyRound, LinkIcon, FunctionSquare, X } from './Icons';
import { Table } from '../../../domain/models';
import { getVisibleColumns } from '../../../../utils/schemaUtils';

interface TableNodeProps {
    table: Table;
    tables: Table[];
    viewOffset: { x: number; y: number };
    connectionMode: { fromId: string } | null;
    handleDragStart: (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, tableId: string | null) => void;
    addRow: (tableId: string) => void;
    setEditingTableId: (tableId: string) => void;
    initiateDeleteTable: (tableId: string) => void;
    toggleTableMinimize: (tableId: string) => void;
    updateRowValue: (tableId: string, rowId: string, columnId: string, value: any) => void;
    deleteRow: (tableId: string, rowId: string) => void;
}

export const TableNode: React.FC<TableNodeProps> = ({ 
    table, tables, viewOffset, connectionMode, handleDragStart, 
    addRow, setEditingTableId, initiateDeleteTable, toggleTableMinimize, 
    updateRowValue, deleteRow 
}) => {
    return (
        <div
            id={`table-${table.id}`}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`absolute flex flex-col bg-white rounded shadow-lg border transition-shadow duration-200 z-10
                ${connectionMode?.fromId === table.id ? 'ring-2 ring-blue-500 shadow-blue-200' : 'hover:shadow-xl border-gray-300'}
            `}
            style={{ 
                transform: `translate(${table.x + viewOffset.x}px, ${table.y + viewOffset.y}px)`,
                width: 'auto',
                minWidth: '180px',
                maxWidth: 'none',
                touchAction: 'none'
            }}
        >
            <div 
                className={`px-2 py-2 rounded-t ${table.isMinimized ? 'rounded-b' : ''} border-b border-gray-200 flex items-center justify-between cursor-move select-none group bg-white`}
                onMouseDown={(e) => handleDragStart(e, table.id)}
                onTouchStart={(e) => handleDragStart(e, table.id)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <GripHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-bold text-gray-700 truncate text-sm">{table.name}</span>
                </div>
                
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); addRow(table.id); }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="行を追加"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setEditingTableId(table.id); }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="定義編集"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); initiateDeleteTable(table.id); }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="テーブル削除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleTableMinimize(table.id); }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        title={table.isMinimized ? "データ行を表示" : "データ行を隠す"}
                    >
                        {table.isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className={`${table.isMinimized ? 'rounded-b' : ''}`}> 
                <table className="w-full text-xs text-left border-collapse min-w-max">
                    <thead className="text-gray-600 font-semibold select-none bg-gray-50/50">
                        <tr>
                            <th className="px-2 py-1.5 border-b border-gray-200 w-8 text-center text-gray-400">#</th>
                            {getVisibleColumns(table).map(col => {
                                const isDependent = col.attributeType === 'dependent';
                                const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(col.id));

                                const titleParts: string[] = [];
                                if (col.isPk) titleParts.push("主キー(PK)");
                                if (isColUnique) titleParts.push("ユニークキー(UK)");
                                if (col.isFk) titleParts.push("外部キー(FK)");
                                if (isDependent) titleParts.push(`導出項目: ${col.derivation}`);
                                if (titleParts.length === 0) titleParts.push("独立項目");
                                const titleText = titleParts.join(", ");

                                return (
                                    <th 
                                        key={col.id} 
                                        className={`px-2 py-1.5 border-b border-gray-200 border-l border-gray-100 min-w-[80px] ${isDependent ? 'bg-orange-50/50 text-orange-800' : ''}`}
                                        title={titleText}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.isPk && <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                                            {isColUnique && <KeyRound className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                                            {col.isFk && <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                            {isDependent && <FunctionSquare className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                                            <span>{col.name}</span>
                                        </div>
                                    </th>
                                );
                            })}
                            <th className="px-2 py-1.5 border-b border-gray-200 w-8"></th>
                        </tr>
                    </thead>
                    
                    {!table.isMinimized && (
                        <tbody className="bg-white">
                            {table.rows.map((row, idx) => (
                                <tr key={row.id} className="group hover:bg-blue-50/30">
                                    <td className="px-2 py-1 border-b border-gray-100 text-center text-gray-300 select-none">{idx + 1}</td>
                                    {getVisibleColumns(table).map(col => {
                                        const isColUnique = table.uniqueKeys?.some(uq => uq.columnIds?.includes(col.id));
                                        return (
                                            <td key={col.id} className={`p-0 border-b border-gray-100 border-l border-gray-50 ${col.attributeType === 'dependent' ? 'bg-orange-50/10' : ''}`}>
                                                <input 
                                                    type="text" 
                                                    value={row[col.id] || ''}
                                                    onChange={(e) => updateRowValue(table.id, row.id, col.id, e.target.value)}
                                                    className="w-full h-full px-2 py-1 bg-transparent border-none outline-none focus:ring-inset focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder-gray-200 leading-tight text-xs"
                                                    placeholder="..."
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="p-0 border-b border-gray-100 text-center">
                                        <button onClick={() => deleteRow(table.id, row.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </div>
    );
};
