import React from 'react';
import { Key, Eye, EyeOff, Trash2 } from '../../Icons';
import { DATA_TYPES, ATTRIBUTE_TYPES } from '../../../../../../constants';
import { Table, Column, Relationship, ValueObjectPreset } from '../../../../../../domain/models';

interface ColumnRowProps {
    col: Column;
    colIdx: number;
    editingTable: Table;
    tables: Table[];
    tableRels: Relationship[];
    tableUqs: any[];
    valueObjects: ValueObjectPreset[];
    hasDependentColumn: boolean;
    moveColumn: (tableId: string, colId: string, direction: 'up' | 'down') => void;
    updateColumn: (tableId: string, colId: string, field: keyof Column, value: any) => void;
    deleteColumn: (tableId: string, colId: string) => void;
    toggleFkMapping: (relId: string, childColId: string, isChecked: boolean) => void;
    updateFkMappingParentCol: (relId: string, childColId: string, parentColId: string) => void;
    toggleUniqueKeyMapping: (tableId: string, uqId: string, colId: string, isChecked: boolean) => void;
    setDetailEditConfig: (config: any) => void;
    isFirst: boolean;
    isLast: boolean;
}

export const ColumnRow: React.FC<ColumnRowProps> = ({
    col,
    colIdx,
    editingTable,
    tables,
    tableRels,
    tableUqs,
    valueObjects,
    hasDependentColumn,
    moveColumn,
    updateColumn,
    deleteColumn,
    toggleFkMapping,
    updateFkMappingParentCol,
    toggleUniqueKeyMapping,
    setDetailEditConfig,
    isFirst,
    isLast
}) => {
    const isColUnique = tableUqs.some(uq => uq.columnIds?.includes(col.id));
    const isMandatory = col.isPk || isColUnique || col.isFk;
    const isVisible = col.isVisible !== false;
    const isVoParent = editingTable.columns.some(c => c.parentColumnId === col.id);

    return (
        <tr className={`hover:bg-gray-50 group ${col.isVoProperty ? 'bg-slate-50/50' : ''}`}>
            {/* 順序 */}
            <td className="px-3 py-1.5 text-center">
                {!col.isVoProperty ? (
                    <div className="flex items-center justify-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => moveColumn(editingTable.id, col.id, 'up')}
                            disabled={isFirst}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors cursor-pointer text-[10px]"
                            title="上に移動"
                        >
                            ▲
                        </button>
                        <button
                            type="button"
                            onClick={() => moveColumn(editingTable.id, col.id, 'down')}
                            disabled={isLast}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors cursor-pointer text-[10px]"
                            title="下に移動"
                        >
                            ▼
                        </button>
                    </div>
                ) : (
                    <span className="text-gray-300">-</span>
                )}
            </td>

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
                {col.isVoProperty ? (
                    <div className="pl-4 font-mono text-xs text-gray-500 py-1 select-none">
                        └─ {col.voPropertyName}
                    </div>
                ) : (
                    <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(editingTable.id, col.id, 'name', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1 font-mono text-xs"
                        placeholder="column_name"
                    />
                )}
            </td>

            {/* データ型 */}
            <td className="px-3 py-1.5">
                {col.isVoProperty ? (
                    <span className="text-xs font-mono text-gray-400 pl-1">{col.type} <span className="text-[10px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded-sm">内部</span></span>
                ) : (
                    <select
                        value={col.type}
                        onChange={(e) => updateColumn(editingTable.id, col.id, 'type', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer text-xs font-sans"
                    >
                        <optgroup label="基本データ型">
                            {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        <optgroup label="値オブジェクト">
                            {valueObjects.map(vo => <option key={vo.name} value={vo.name}>{vo.name}</option>)}
                        </optgroup>
                        <optgroup label="マスタ参照 (外部キー)">
                            {tables.filter(t => t.viewPane === 'sub' && t.columns.filter(c => c.isPk).length === 1 && t.id !== editingTable.id).map(t => (
                                <option key={t.id} value={`FK:${t.id}`}>FK: {t.name}</option>
                            ))}
                        </optgroup>
                    </select>
                )}
            </td>

            {/* 区分 */}
            <td className="px-3 py-1.5 text-center">
                {isVoParent ? (
                    <span className="text-gray-300">-</span>
                ) : (
                    <select
                        value={col.attributeType || 'independent'}
                        onChange={(e) => updateColumn(editingTable.id, col.id, 'attributeType', e.target.value)}
                        className={`w-full border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none text-xs bg-white cursor-pointer ${col.attributeType === 'dependent' ? 'bg-orange-50 text-orange-800' : ''}`}
                    >
                        {ATTRIBUTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                )}
            </td>

            {/* 説明 */}
            <td className="px-3 py-1.5">
                <div className="relative flex items-center group/input">
                    <input
                        type="text"
                        value={col.description || ''}
                        disabled={col.isVoProperty}
                        onChange={(e) => updateColumn(editingTable.id, col.id, 'description', e.target.value)}
                        className={`w-full border border-gray-200 rounded pl-2 pr-7 py-1 focus:ring-1 focus:ring-blue-500 outline-none text-xs ${col.isVoProperty ? 'bg-gray-100/50 text-gray-400 cursor-not-allowed border-gray-100' : 'bg-white'}`}
                        placeholder={col.isVoProperty ? '' : "例: 有効/無効、1〜50の範囲"}
                    />
                    {!col.isVoProperty && (
                        <button
                            type="button"
                            onClick={() => setDetailEditConfig({
                                columnId: col.id,
                                columnName: col.name,
                                field: 'description',
                                title: '説明',
                                value: col.description || ''
                            })}
                            className="absolute right-1.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover/input:opacity-100 focus:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            title="詳細編集を開く"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    )}
                </div>
            </td>

            {/* 詳細設定 (導出) */}
            {hasDependentColumn && (
                <td className="px-3 py-1.5">
                    {col.attributeType === 'dependent' && !isVoParent ? (
                        <div className="relative flex items-center group/input">
                            <input
                                type="text"
                                value={col.derivation || ''}
                                onChange={(e) => updateColumn(editingTable.id, col.id, 'derivation', e.target.value)}
                                className="w-full bg-white border border-orange-200 bg-orange-50/30 rounded pl-2 pr-7 py-1 focus:ring-1 focus:ring-orange-500 outline-none text-xs"
                                placeholder="例: Table.Col via FK"
                            />
                            <button
                                type="button"
                                onClick={() => setDetailEditConfig({
                                    columnId: col.id,
                                    columnName: col.name,
                                    field: 'derivation',
                                    title: '詳細設定 (導出)',
                                    value: col.derivation || ''
                                })}
                                className="absolute right-1.5 text-gray-400 hover:text-orange-600 opacity-0 group-hover/input:opacity-100 focus:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                title="詳細編集を開く"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>
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
                    <td key={rel.id} className="px-3 py-1.5 border-l border-gray-200 bg-blue-50/10 text-center">
                        {isVoParent ? (
                            <span className="text-gray-300">-</span>
                        ) : (
                            <div className="flex items-center gap-1.5 min-h-[28px]">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!rel.from}
                                    onChange={(e) => toggleFkMapping(rel.id, col.id, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100"
                                    title={!rel.from ? "最初にヘッダーで親テーブルを選択してください" : "このカラムを外部キー制約に含める"}
                                />
                                {isChecked && parentTable && mapping && (
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
                        )}
                    </td>
                );
            })}

            {/* 動的UQ列セルのレンダリング */}
            {tableUqs.map(uq => {
                const isChecked = uq.columnIds?.includes(col.id);

                return (
                    <td key={uq.id} className="px-3 py-1.5 border-l border-gray-200 bg-purple-50/10 text-center">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleUniqueKeyMapping(editingTable.id, uq.id, col.id, e.target.checked)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                            title="このカラムをユニークキー制約に含める"
                        />
                    </td>
                );
            })}

            {/* 表示非表示スイッチ */}
            <td className="px-3 py-1.5 text-center">
                {isVoParent ? (
                    <span className="text-gray-300">-</span>
                ) : (
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
                )}
            </td>

            {/* 削除 */}
            <td className="px-3 py-1.5 text-center">
                {!col.isVoProperty ? (
                    <button onClick={() => deleteColumn(editingTable.id, col.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : (
                    <span className="text-gray-300">-</span>
                )}
            </td>
        </tr>
    );
};
