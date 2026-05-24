import React from 'react';
import { Settings, X, Plus, Key, KeyRound, ArrowRightCircle, LinkIcon, Eye, EyeOff, Trash2 } from '../Icons';
import { DATA_TYPES, ATTRIBUTE_TYPES } from '../../constants';

export const TableEditorModal = ({
    editingTable, tables, setEditingTableId, autoUpdateRelationshipType,
    initiateDeleteTable, updateTableName, addColumn, updateColumn,
    updateColumnReference, deleteColumn
}) => {
    if (!editingTable) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden text-sm">
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
                        <button onClick={() => {
                            autoUpdateRelationshipType(tables);
                            setEditingTableId(null);
                        }} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
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
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-700">カラム定義</h3>
                            <button onClick={() => addColumn(editingTable.id)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                                <Plus className="w-4 h-4" />
                                追加
                            </button>
                        </div>
                        <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full table-fixed text-sm text-left">
                                <thead className="bg-gray-100 text-gray-600 font-semibold">
                                    <tr>
                                        <th className="px-3 py-2 w-10 text-center">PK</th>
                                        <th className="px-3 py-2">カラム名</th>
                                        <th className="px-3 py-2 w-32">データ型</th>
                                        <th className="px-3 py-2 w-10 text-center">UQ</th>
                                        <th className="px-3 py-2 w-32">区分</th>
                                        <th className="px-3 py-2 w-64">詳細設定 (FK/導出)</th>
                                        <th className="px-3 py-2 w-10 text-center">FK</th>
                                        <th className="px-3 py-2 w-10 text-center">表示</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {editingTable.columns.map(col => {
                                        const isMandatory = col.isPk || col.isUnique || col.isFk;
                                        const isVisible = col.isVisible !== false;

                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50 group">
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => updateColumn(editingTable.id, col.id, 'isPk', !col.isPk)}
                                                        className={`p-1 rounded transition-colors ${col.isPk ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={col.name}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1"
                                                        placeholder="column_name"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <select
                                                        value={col.type}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'type', e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                                    >
                                                        {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => updateColumn(editingTable.id, col.id, 'isUnique', !col.isUnique)}
                                                        className={`p-1 rounded transition-colors ${col.isUnique ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                        title="Unique Key"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <select
                                                        value={col.attributeType || 'independent'}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'attributeType', e.target.value)}
                                                        className={`w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer ${col.attributeType === 'dependent' ? 'bg-orange-50 text-orange-800' : 'bg-white'}`}
                                                    >
                                                        {ATTRIBUTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="flex flex-col gap-1.5">
                                                        {col.attributeType === 'dependent' && (
                                                            <input
                                                                type="text"
                                                                value={col.derivation || ''}
                                                                onChange={(e) => updateColumn(editingTable.id, col.id, 'derivation', e.target.value)}
                                                                className="w-full bg-white border border-orange-200 bg-orange-50/30 rounded px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
                                                                placeholder="例: Table.Col via FK"
                                                            />
                                                        )}

                                                        <div className="relative">
                                                            <div className={`flex gap-1 items-center ${col.isFk ? '' : 'invisible pointer-events-none'}`}>
                                                                {/* We render this even when isFk is false to reserve the exact height of the select elements */}
                                                                <ArrowRightCircle className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                                                <select
                                                                    value={col.reference?.tableId || ''}
                                                                    onChange={(e) => updateColumnReference(editingTable.id, col.id, 'tableId', e.target.value)}
                                                                    className="flex-1 w-0 bg-white border border-gray-200 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-ellipsis"
                                                                    tabIndex={col.isFk ? 0 : -1}
                                                                >
                                                                    <option value="">Table...</option>
                                                                    {tables.filter(t => t.id !== editingTable.id).map(t => (
                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                                <select
                                                                    value={col.reference?.columnId || ''}
                                                                    onChange={(e) => updateColumnReference(editingTable.id, col.id, 'columnId', e.target.value)}
                                                                    className="flex-1 w-0 bg-white border border-gray-200 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-ellipsis"
                                                                    disabled={!col.reference?.tableId}
                                                                    tabIndex={col.isFk ? 0 : -1}
                                                                >
                                                                    <option value="">Col...</option>
                                                                    {(() => {
                                                                        const targetTable = tables.find(t => t.id === col.reference?.tableId);
                                                                        return targetTable?.columns.map(c => (
                                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                                        ));
                                                                    })()}
                                                                </select>
                                                            </div>

                                                            {!col.isFk && col.attributeType !== 'dependent' && (
                                                                <div className="absolute inset-0 flex items-center">
                                                                    <span className="text-gray-300 text-xs">-</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => updateColumn(editingTable.id, col.id, 'isFk', !col.isFk)}
                                                        className={`p-1 rounded transition-colors ${col.isFk ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                    </button>
                                                </td>

                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => !isMandatory && updateColumn(editingTable.id, col.id, 'isVisible', !isVisible)}
                                                        className={`p-1 rounded transition-colors ${isMandatory
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : isVisible ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 hover:bg-gray-100'
                                                            }`}
                                                        disabled={isMandatory}
                                                        title={isMandatory ? "キー項目は常に表示されます" : isVisible ? "非表示にする" : "表示する"}
                                                    >
                                                        {isVisible || isMandatory ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                </td>

                                                <td className="px-3 py-1.5 text-center">
                                                    <button onClick={() => deleteColumn(editingTable.id, col.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={() => {
                        autoUpdateRelationshipType(tables);
                        setEditingTableId(null);
                    }} className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm text-sm">
                        完了
                    </button>
                </div>
            </div>
        </div>
    );
};
