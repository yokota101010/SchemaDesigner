import React, { useState } from 'react';
import { Settings, X, Plus, KeyRound, Trash2, LinkIcon } from '../Icons';
import { OrderBySettings } from './table-editor/OrderBySettings';
import { ColumnRow } from './table-editor/ColumnRow';
import { DetailEditPopup, DetailEditConfig } from './table-editor/DetailEditPopup';
import { Table, UniqueKey, Relationship, OrderBy, Column } from '../../types';

interface TableEditorModalProps {
    editingTable: Table | null;
    tables: Table[];
    initiateDeleteTable: (tableId: string) => void;
    updateTableName: (tableId: string, name: string) => void;
    updateTableOrderBy: (tableId: string, orderBy: OrderBy) => void;
    addColumn: (tableId: string) => void;
    updateColumn: (tableId: string, columnId: string, field: keyof Column, value: any) => void;
    deleteColumn: (tableId: string, columnId: string) => void;
    moveColumn: (tableId: string, colId: string, direction: 'up' | 'down') => void;
    relationships: Relationship[];
    deleteRelationship: (relationshipId: string) => void;
    addFkRelationship: (tableId: string) => void;
    updateFkRelationshipParent: (relationshipId: string, parentTableId: string) => void;
    toggleFkMapping: (relationshipId: string, childColId: string, isChecked: boolean) => void;
    updateFkMappingParentCol: (relationshipId: string, childColId: string, parentColId: string) => void;
    addUniqueKey: (tableId: string) => void;
    deleteUniqueKey: (tableId: string, uqId: string) => void;
    toggleUniqueKeyMapping: (tableId: string, uqId: string, columnId: string, isChecked: boolean) => void;
    onComplete: () => void;
    onCancel: () => void;
}

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
    editingTable, tables,
    initiateDeleteTable, updateTableName, updateTableOrderBy, addColumn, updateColumn,
    deleteColumn, moveColumn,
    relationships, deleteRelationship,
    addFkRelationship, updateFkRelationshipParent,
    toggleFkMapping, updateFkMappingParentCol,
    addUniqueKey, deleteUniqueKey, toggleUniqueKeyMapping,
    onComplete, onCancel
}) => {
    const [detailEditConfig, setDetailEditConfig] = useState<DetailEditConfig | null>(null);

    if (!editingTable) return null;

    // 自テーブルが「子テーブル（to）」となる外部キー制約（リレーション）を抽出
    const tableRels = relationships ? relationships.filter(r => r.to === editingTable.id) : [];
    
    // ユニークキー制約のリストを取得
    const tableUqs = editingTable.uniqueKeys || [];

    // カラムの中に「導出項目」が1つでも存在するか判定
    const hasDependentColumn = editingTable.columns.some(c => c.attributeType === 'dependent');

    // 動的にテーブルの最小幅を計算 (基本列幅[導出あり1020px / なし840px] ＋ 1列のFKごとに192px追加 ＋ 1列のUQごとに96px追加)
    const baseWidth = hasDependentColumn ? 1020 : 840;
    const tableMinWidth = baseWidth + (tableRels.length * 192) + (tableUqs.length * 96);

    const handleSaveDetail = (value: string) => {
        if (detailEditConfig) {
            updateColumn(editingTable.id, detailEditConfig.columnId, detailEditConfig.field, value);
            setDetailEditConfig(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden text-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-600" />
                            テーブル定義編集
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => initiateDeleteTable(editingTable.id)} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                            削除
                        </button>
                        <button 
                            onClick={onCancel} 
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                            title="編集をキャンセルして閉じる"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">テーブル名</label>
                        <input
                            type="text"
                            value={editingTable.name}
                            onChange={(e) => updateTableName(editingTable.id, e.target.value)}
                            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm"
                        />
                    </div>

                    <OrderBySettings 
                        editingTable={editingTable}
                        tableUqs={tableUqs}
                        updateTableOrderBy={updateTableOrderBy}
                    />

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-700">カラム定義</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => addUniqueKey(editingTable.id)}
                                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    UQを追加
                                </button>
                                <button
                                    onClick={() => addFkRelationship(editingTable.id)}
                                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    FKを追加
                                </button>
                                <button
                                    onClick={() => addColumn(editingTable.id)}
                                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    カラムを追加
                                </button>
                            </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded overflow-x-auto">
                            <table 
                                className="w-full text-sm text-left border-collapse"
                                style={{ minWidth: `${tableMinWidth}px`, tableLayout: 'fixed' }}
                            >
                                <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-center" style={{ width: '60px', minWidth: '60px' }}>順序</th>
                                        <th className="px-3 py-2 text-center" style={{ width: '45px', minWidth: '45px' }}>PK</th>
                                        <th className="px-3 py-2" style={{ width: '180px', minWidth: '180px' }}>カラム名</th>
                                        <th className="px-3 py-2" style={{ width: '130px', minWidth: '130px' }}>データ型</th>
                                        <th className="px-3 py-2" style={{ width: '110px', minWidth: '110px' }}>区分</th>
                                        <th className="px-3 py-2" style={{ width: '160px', minWidth: '160px' }}>説明 (AIへの指示)</th>
                                        {hasDependentColumn && (
                                            <th className="px-3 py-2" style={{ width: '180px', minWidth: '180px' }}>詳細設定 (導出)</th>
                                        )}
                                        
                                        {/* 動的FK列をレンダリング */}
                                        {tableRels.map((rel, index) => {
                                            return (
                                                <th key={rel.id} className="px-3 py-2 border-l border-gray-200 bg-blue-50/50" style={{ width: '192px', minWidth: '192px' }}>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-blue-700 font-bold flex items-center gap-1">
                                                                <LinkIcon className="w-3 h-3 text-blue-500" />
                                                                FK {index + 1}
                                                            </span>
                                                            <button
                                                                onClick={() => deleteRelationship(rel.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                                                title="この外部キー制約を削除"
                                                            >
                                                                 <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <select
                                                            value={rel.from || ''}
                                                            onChange={(e) => updateFkRelationshipParent(rel.id, e.target.value)}
                                                            className="w-full bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-normal cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="">親テーブルを選択...</option>
                                                            {tables.filter(t => t.id !== editingTable.id).map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </th>
                                            );
                                        })}

                                        {/* 動的UQ列をレンダリング */}
                                        {tableUqs.map((uq, index) => {
                                            return (
                                                <th key={uq.id} className="px-3 py-2 border-l border-gray-200 bg-purple-50/50" style={{ width: '96px', minWidth: '96px' }}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-purple-700 font-bold flex items-center gap-1">
                                                            <KeyRound className="w-3.5 h-3.5 text-purple-500" />
                                                            UQ {index + 1}
                                                        </span>
                                                        <button
                                                            onClick={() => deleteUniqueKey(editingTable.id, uq.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                                            title="このユニークキー制約を削除"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </th>
                                            );
                                        })}

                                        <th className="px-3 py-2 text-center" style={{ width: '50px', minWidth: '50px' }}>表示</th>
                                        <th className="px-3 py-2" style={{ width: '40px', minWidth: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {editingTable.columns.map((col, colIdx) => {
                                        const isFirst = colIdx === 0;
                                        const isLast = colIdx === editingTable.columns.length - 1;

                                        return (
                                            <ColumnRow 
                                                key={col.id}
                                                col={col}
                                                colIdx={colIdx}
                                                editingTable={editingTable}
                                                tables={tables}
                                                tableRels={tableRels}
                                                tableUqs={tableUqs}
                                                hasDependentColumn={hasDependentColumn}
                                                moveColumn={moveColumn}
                                                updateColumn={updateColumn}
                                                deleteColumn={deleteColumn}
                                                toggleFkMapping={toggleFkMapping}
                                                updateFkMappingParentCol={updateFkMappingParentCol}
                                                toggleUniqueKeyMapping={toggleUniqueKeyMapping}
                                                setDetailEditConfig={setDetailEditConfig}
                                                isFirst={isFirst}
                                                isLast={isLast}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2.5">
                    <button 
                        onClick={onCancel} 
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors shadow-sm text-sm cursor-pointer animate-in fade-in duration-100"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={onComplete} 
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm text-sm cursor-pointer"
                    >
                        完了
                    </button>
                </div>
            </div>
            
            <DetailEditPopup 
                detailEditConfig={detailEditConfig}
                onClose={() => setDetailEditConfig(null)}
                onSave={handleSaveDetail}
            />
        </div>
    );
};
