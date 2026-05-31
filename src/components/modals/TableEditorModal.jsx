import React from 'react';
import { Settings, X, Plus, Key, KeyRound, Eye, EyeOff, Trash2, LinkIcon } from '../Icons';
import { DATA_TYPES, ATTRIBUTE_TYPES } from '../../constants';

export const TableEditorModal = ({
    editingTable, tables,
    initiateDeleteTable, updateTableName, addColumn, updateColumn,
    deleteColumn,
    relationships, deleteRelationship,
    addFkRelationship, updateFkRelationshipParent,
    toggleFkMapping, updateFkMappingParentCol,
    onComplete, onCancel
}) => {
    if (!editingTable) return null;

    // 自テーブルが「子テーブル（to）」となる外部キー制約（リレーション）を抽出
    const tableRels = relationships ? relationships.filter(r => r.to === editingTable.id) : [];

    // カラムの中に「導出項目」が1つでも存在するか判定
    const hasDependentColumn = editingTable.columns.some(c => c.attributeType === 'dependent');

    // 動的にテーブルの最小幅を計算 (基本列幅[導出あり960px / なし780px] ＋ 1列のFKごとに192px追加)
    const baseWidth = hasDependentColumn ? 960 : 780;
    const tableMinWidth = baseWidth + (tableRels.length * 192);

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
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-700">カラム定義</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => addFkRelationship(editingTable.id)}
                                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition-colors font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    FK列を追加
                                </button>
                                <button onClick={() => addColumn(editingTable.id)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                                    <Plus className="w-4 h-4" />
                                    追加
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
                                        <th className="px-3 py-2 text-center" style={{ width: '45px', minWidth: '45px' }}>PK</th>
                                        <th className="px-3 py-2" style={{ width: '180px', minWidth: '180px' }}>カラム名</th>
                                        <th className="px-3 py-2" style={{ width: '130px', minWidth: '130px' }}>データ型</th>
                                        <th className="px-3 py-2 text-center" style={{ width: '45px', minWidth: '45px' }}>UQ</th>
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

                                        <th className="px-3 py-2 text-center" style={{ width: '50px', minWidth: '50px' }}>表示</th>
                                        <th className="px-3 py-2" style={{ width: '40px', minWidth: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {editingTable.columns.map(col => {
                                        const isMandatory = col.isPk || col.isUnique || col.isFk;
                                        const isVisible = col.isVisible !== false;

                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50 group">
                                                {/* PK */}
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => updateColumn(editingTable.id, col.id, 'isPk', !col.isPk)}
                                                        className={`p-1 rounded transition-colors ${col.isPk ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </button>
                                                </td>

                                                {/* カラム名 */}
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={col.name}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1 font-mono text-xs"
                                                        placeholder="column_name"
                                                    />
                                                </td>

                                                {/* データ型 */}
                                                <td className="px-3 py-1.5">
                                                    <select
                                                        value={col.type}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'type', e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer text-xs"
                                                    >
                                                        {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </td>

                                                {/* UQ */}
                                                <td className="px-3 py-1.5 text-center">
                                                    <button
                                                        onClick={() => updateColumn(editingTable.id, col.id, 'isUnique', !col.isUnique)}
                                                        className={`p-1 rounded transition-colors ${col.isUnique ? 'text-purple-500 bg-purple-50' : 'text-gray-300 hover:text-gray-400'}`}
                                                        title="Unique Key"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                </td>

                                                {/* 区分 */}
                                                <td className="px-3 py-1.5">
                                                    <select
                                                        value={col.attributeType || 'independent'}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'attributeType', e.target.value)}
                                                        className={`w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer text-xs ${col.attributeType === 'dependent' ? 'bg-orange-50 text-orange-800' : 'bg-white'}`}
                                                    >
                                                        {ATTRIBUTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                    </select>
                                                </td>

                                                {/* 説明 */}
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="text"
                                                        value={col.description || ''}
                                                        onChange={(e) => updateColumn(editingTable.id, col.id, 'description', e.target.value)}
                                                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                        placeholder="例: 有効/無効、1〜50の範囲"
                                                    />
                                                </td>

                                                {/* 詳細設定 (導出) */}
                                                {hasDependentColumn && (
                                                    <td className="px-3 py-1.5">
                                                        {col.attributeType === 'dependent' ? (
                                                            <input
                                                                type="text"
                                                                value={col.derivation || ''}
                                                                onChange={(e) => updateColumn(editingTable.id, col.id, 'derivation', e.target.value)}
                                                                className="w-full bg-white border border-orange-200 bg-orange-50/30 rounded px-2 py-1 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
                                                                placeholder="例: Table.Col via FK"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">-</span>
                                                        )}
                                                    </td>
                                                )}

                                                {/* 動的FK列セルのレンダリング */}
                                                {tableRels.map(rel => {
                                                    const parentTable = tables.find(t => t.id === rel.from);
                                                    const mapping = rel.mappings?.find(m => m.childColId === col.id);
                                                    const isChecked = !!mapping;

                                                    return (
                                                        <td key={rel.id} className="px-3 py-1.5 border-l border-gray-200 bg-blue-50/10">
                                                            <div className="flex items-center gap-1.5 min-h-[28px]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    disabled={!rel.from}
                                                                    onChange={(e) => toggleFkMapping(rel.id, col.id, e.target.checked)}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100"
                                                                    title={!rel.from ? "最初にヘッダーで親テーブルを選択してください" : "このカラムを外部キー制約に含める"}
                                                                />
                                                                {isChecked && parentTable && (
                                                                    <select
                                                                        value={mapping.parentColId || ''}
                                                                        onChange={(e) => updateFkMappingParentCol(rel.id, col.id, e.target.value)}
                                                                        className="flex-1 w-0 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-ellipsis cursor-pointer animate-in fade-in zoom-in-95 duration-100"
                                                                    >
                                                                        <option value="">親列...</option>
                                                                        {parentTable.columns.map(pc => (
                                                                            <option key={pc.id} value={pc.id}>{pc.name}</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* 表示非表示スイッチ */}
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

                                                {/* 削除 */}
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
        </div>
    );
};
