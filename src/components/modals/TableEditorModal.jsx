import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Key, KeyRound, Eye, EyeOff, Trash2, LinkIcon } from '../Icons';
import { DATA_TYPES, ATTRIBUTE_TYPES } from '../../constants';

export const TableEditorModal = ({
    editingTable, tables,
    initiateDeleteTable, updateTableName, updateTableOrderBy, addColumn, updateColumn,
    deleteColumn, moveColumn,
    relationships, deleteRelationship,
    addFkRelationship, updateFkRelationshipParent,
    toggleFkMapping, updateFkMappingParentCol,
    addUniqueKey, deleteUniqueKey, toggleUniqueKeyMapping,
    onComplete, onCancel
}) => {
    const [detailEditConfig, setDetailEditConfig] = useState(null);
    const [tempDetailValue, setTempDetailValue] = useState('');

    useEffect(() => {
        if (detailEditConfig) {
            setTempDetailValue(detailEditConfig.value);
        } else {
            setTempDetailValue('');
        }
    }, [detailEditConfig]);

    const handleSaveDetail = () => {
        if (detailEditConfig) {
            updateColumn(editingTable.id, detailEditConfig.columnId, detailEditConfig.field, tempDetailValue);
            setDetailEditConfig(null);
        }
    };

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

    // ソートキー候補リスト（PK / UK 制約グループ）を作成
    const sortOptions = [];

    // 1. 主キー (PK)
    const pkColumns = editingTable.columns.filter(c => c.isPk);
    if (pkColumns.length > 0) {
        sortOptions.push({
            id: 'pk',
            label: `(${pkColumns.map(c => c.name).join(', ')})`,
            badge: 'PK',
            type: 'pk'
        });
    }

    // 2. 各ユニークキー (UK)
    tableUqs.forEach((uq, idx) => {
        const uqCols = (uq.columnIds || [])
            .map(cid => editingTable.columns.find(c => c.id === cid))
            .filter(Boolean);
        
        if (uqCols.length > 0) {
            sortOptions.push({
                id: `uq_${uq.id}`,
                label: `(${uqCols.map(c => c.name).join(', ')})`,
                badge: `UK ${idx + 1}`,
                type: 'uq',
                uqId: uq.id
            });
        }
    });

    const currentOrderBy = editingTable.orderBy || { type: '', uqId: '', direction: 'ASC' };

    // 選択されている制約に対応する構成カラムを特定
    let selectedConstraintColumns = [];
    if (currentOrderBy.type === 'pk') {
        selectedConstraintColumns = pkColumns;
    } else if (currentOrderBy.type === 'uq' && currentOrderBy.uqId) {
        const targetUq = tableUqs.find(uq => uq.id === currentOrderBy.uqId);
        selectedConstraintColumns = targetUq ? (targetUq.columnIds || [])
            .map(cid => editingTable.columns.find(c => c.id === cid))
            .filter(Boolean) : [];
    }

    // sortedKeys の取得 (未定義なら初期値生成)
    let sortedKeys = currentOrderBy.keys || [];
    if (currentOrderBy.type && sortedKeys.length === 0 && selectedConstraintColumns.length > 0) {
        sortedKeys = selectedConstraintColumns.map(col => ({
            columnId: col.id,
            direction: currentOrderBy.directions?.[col.id] || currentOrderBy.direction || 'ASC'
        }));
    }

    // 順序の入れ替え
    const handleMoveKey = (index, direction) => {
        const newKeys = [...sortedKeys];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newKeys.length) return;
        
        const temp = newKeys[index];
        newKeys[index] = newKeys[targetIndex];
        newKeys[targetIndex] = temp;

        updateTableOrderBy(editingTable.id, {
            ...currentOrderBy,
            keys: newKeys
        });
    };

    // ソート方向の切り替え
    const handleDirectionChange = (columnId, direction) => {
        const newKeys = sortedKeys.map(k => 
            k.columnId === columnId ? { ...k, direction } : k
        );
        updateTableOrderBy(editingTable.id, {
            ...currentOrderBy,
            keys: newKeys
        });
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

                    <div className="mb-6 bg-slate-50 border border-slate-200 rounded p-4 max-w-2xl">
                        <label className="block text-sm font-bold text-slate-700 mb-2">レコードの評価順序 (ORDER BY)</label>
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                            時系列の繰り越しや累積などを正しく計算するために、このテーブル内のレコードを評価する論理的な並び順（主キーまたはユニークキー制約）を指定します。
                        </p>
                        
                        {sortOptions.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {sortOptions.map(option => {
                                        const isSelected = option.type === 'pk' 
                                            ? currentOrderBy.type === 'pk'
                                            : currentOrderBy.type === 'uq' && currentOrderBy.uqId === option.uqId;
                                        
                                        return (
                                            <label key={option.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded transition-colors shadow-sm">
                                                <input
                                                    type="radio"
                                                    name="order-by-column"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const cols = option.type === 'pk' ? pkColumns : (
                                                            (tableUqs.find(uq => uq.id === option.uqId)?.columnIds || [])
                                                                .map(cid => editingTable.columns.find(c => c.id === cid))
                                                                .filter(Boolean)
                                                        );
                                                        updateTableOrderBy(editingTable.id, { 
                                                            type: option.type,
                                                            uqId: option.uqId || '',
                                                            direction: 'ASC',
                                                            keys: cols.map(c => ({ columnId: c.id, direction: 'ASC' }))
                                                        });
                                                    }}
                                                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span className="font-mono">{option.label}</span>
                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm font-bold">
                                                    {option.badge}
                                                </span>
                                            </label>
                                        );
                                    })}
                                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded transition-colors shadow-sm">
                                        <input
                                            type="radio"
                                            name="order-by-column"
                                            checked={currentOrderBy.type === ''}
                                            onChange={() => updateTableOrderBy(editingTable.id, { ...currentOrderBy, type: '', uqId: '', keys: [] })}
                                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-slate-400">指定なし (デフォルト)</span>
                                    </label>
                                </div>
                                
                                {currentOrderBy.type && sortedKeys.length > 0 && (
                                    <div className="mt-3 border-t border-slate-200/60 pt-2 flex flex-col gap-1.5">
                                        <span className="text-[11px] text-slate-500 font-bold">
                                            評価順序 (上から順に適用されます):
                                        </span>
                                        <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded max-w-lg bg-white overflow-hidden shadow-sm">
                                            {sortedKeys.map((keyInfo, index) => {
                                                const col = editingTable.columns.find(c => c.id === keyInfo.columnId);
                                                if (!col) return null;

                                                return (
                                                    <div key={keyInfo.columnId} className="flex items-center justify-between px-3 py-1.5 text-xs gap-3 hover:bg-slate-50/50">
                                                        <div className="flex items-center gap-2 min-w-[120px] truncate">
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                #{index + 1}
                                                            </span>
                                                            <span className="font-mono text-slate-700 truncate" title={col.name}>{col.name}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {/* 昇順/降順トグルスイッチ (ボタン風) */}
                                                            <div className="flex border border-slate-200 rounded overflow-hidden h-6.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDirectionChange(col.id, 'ASC')}
                                                                    className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${keyInfo.direction === 'ASC' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                                                >
                                                                    ASC
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDirectionChange(col.id, 'DESC')}
                                                                    className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${keyInfo.direction === 'DESC' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                                                >
                                                                    DESC
                                                                </button>
                                                            </div>

                                                            {/* 順序変更ボタン */}
                                                            <div className="flex items-center border-l border-slate-100 pl-2 gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={index === 0}
                                                                    onClick={() => handleMoveKey(index, 'up')}
                                                                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors cursor-pointer"
                                                                    title="優先度を上げる"
                                                                >
                                                                    ▲
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={index === sortedKeys.length - 1}
                                                                    onClick={() => handleMoveKey(index, 'down')}
                                                                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors cursor-pointer"
                                                                    title="優先度を下げる"
                                                                >
                                                                    ▼
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                                ⚠️ このテーブルには、ソート基準に使用可能な主キー（PK）またはユニークキー（UK）のカラムが定義されていません。まずカラム定義でPKを設定するか、UQ（ユニークキー）を追加してください。
                            </div>
                        )}
                    </div>
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
                                        const isColUnique = tableUqs.some(uq => uq.columnIds?.includes(col.id));
                                        const isMandatory = col.isPk || isColUnique || col.isFk;
                                        const isVisible = col.isVisible !== false;
                                        const isFirst = colIdx === 0;
                                        const isLast = colIdx === editingTable.columns.length - 1;

                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50 group">
                                                {/* 順序 */}
                                                <td className="px-3 py-1.5 text-center">
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
                                                     <div className="relative flex items-center group/input">
                                                         <input
                                                             type="text"
                                                             value={col.description || ''}
                                                             onChange={(e) => updateColumn(editingTable.id, col.id, 'description', e.target.value)}
                                                             className="w-full bg-white border border-gray-200 rounded pl-2 pr-7 py-1 focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                             placeholder="例: 有効/無効、1〜50の範囲"
                                                         />
                                                         <button
                                                             type="button"
                                                             onClick={() => setDetailEditConfig({
                                                                 columnId: col.id,
                                                                 columnName: col.name,
                                                                 field: 'description',
                                                                 title: '説明 (AIへの指示)',
                                                                 value: col.description || ''
                                                             })}
                                                             className="absolute right-1.5 text-gray-400 hover:text-blue-500 opacity-0 group-hover/input:opacity-100 focus:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                                             title="詳細編集を開く"
                                                         >
                                                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                             </svg>
                                                         </button>
                                                     </div>
                                                 </td>

                                                {/* 詳細設定 (導出) */}
                                                 {hasDependentColumn && (
                                                     <td className="px-3 py-1.5">
                                                         {col.attributeType === 'dependent' ? (
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
            
            {/* 詳細編集ポップアップ */}
            {detailEditConfig && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div 
                        className="bg-white rounded-lg shadow-2xl w-[500px] max-w-full flex flex-col border border-gray-200 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ヘッダー */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-lg">
                            <h3 className="text-sm font-semibold text-gray-800">
                                ${detailEditConfig.title} の編集 <span className="text-xs font-normal text-gray-500">(${detailEditConfig.columnName})</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setDetailEditConfig(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* 本文 */}
                        <div className="p-4 flex flex-col gap-2">
                            <textarea
                                value={tempDetailValue}
                                onChange={(e) => setTempDetailValue(e.target.value)}
                                className="w-full h-40 p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs font-sans resize-y"
                                placeholder="${detailEditConfig.title}を入力してください..."
                                autoFocus
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveDetail();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDetailEditConfig(null);
                                    }
                                }}
                            />
                            {/* メモ */}
                            <div className="text-[10px] text-gray-400 flex flex-col gap-0.5 mt-1 leading-relaxed">
                                <div>※ Ctrl + Enter (または Cmd + Enter): 編集内容を確定（保存）してポップアップを閉じる</div>
                                <div>※ Esc キー: 編集内容を破棄（キャンセル）してポップアップを閉じる</div>
                            </div>
                        </div>

                        {/* フッター */}
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                            <button
                                type="button"
                                onClick={() => setDetailEditConfig(null)}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDetail}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
