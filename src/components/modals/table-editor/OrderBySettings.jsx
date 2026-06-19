import React from 'react';

export const OrderBySettings = ({ editingTable, tableUqs, updateTableOrderBy }) => {
    // 1. 主キー (PK)
    const pkColumns = editingTable.columns.filter(c => c.isPk);
    
    // ソートキー候補リスト（PK / UK 制約グループ）を作成
    const sortOptions = [];
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
    );
};
