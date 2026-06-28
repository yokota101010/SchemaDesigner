import React, { useState, useEffect } from 'react';
import { Layers, Plus, X, Trash2, GripHorizontal, Database } from '../Icons';
import { Table, Aggregate, AggregateData } from '../../domain/models';

interface AggregateModalProps {
    showAggregateModal: boolean;
    setShowAggregateModal: (show: boolean) => void;
    onCancel: () => void;
    tables: Table[];
    aggregates: Aggregate[];
    aggregateData: AggregateData;
    aggregateTableOrder: string[];
    setAggregateTableOrder: (order: string[]) => void;
    addAggregate: () => void;
    updateAggregateName: (id: string, name: string) => void;
    deleteAggregate: (id: string) => void;
    assignTableToAggregate: (tableId: string, aggregateId: string, role: 'R' | 'M', tables: Table[]) => void;
    removeTableFromAggregate: (tableId: string) => void;
    alignTablesByAggregate: (tables: Table[]) => void;
    moveTableOrder: (dragIndex: number, hoverIndex: number) => void;
}

export const AggregateModal: React.FC<AggregateModalProps> = ({
    showAggregateModal, setShowAggregateModal, onCancel,
    tables, aggregates, aggregateData, aggregateTableOrder, setAggregateTableOrder,
    addAggregate, updateAggregateName, deleteAggregate,
    assignTableToAggregate, removeTableFromAggregate,
    alignTablesByAggregate, moveTableOrder
}) => {
    const [displayOrder, setDisplayOrder] = useState<string[]>([]);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // tables と displayOrder (aggregateTableOrder) を同期・フォールバック
    useEffect(() => {
        const tableIds = tables.map(t => t.id);
        let newOrder = aggregateTableOrder.filter(id => tableIds.includes(id));
        const missingIds = tableIds.filter(id => !newOrder.includes(id));
        if (missingIds.length > 0) {
            newOrder = [...newOrder, ...missingIds];
        }

        if (JSON.stringify(newOrder) !== JSON.stringify(aggregateTableOrder)) {
            setAggregateTableOrder(newOrder);
        }
        setDisplayOrder(newOrder);
    }, [tables, aggregateTableOrder, setAggregateTableOrder]);

    if (!showAggregateModal) return null;

    const orderedTables = displayOrder
        .map(id => tables.find(t => t.id === id))
        .filter((t): t is Table => !!t);

    // ドラッグ＆ドロップハンドラ
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        // Firefox対策
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;
        moveTableOrder(draggedIdx, index);
        setDraggedIdx(index);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col text-sm">
                
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                            <Layers className="w-5 h-5 text-indigo-600" />
                            集約定義
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            集約（トランザクション境界）を定義し、各テーブルを「集約ルート(R)」または「集約メンバー(M)」に割り当てます。
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 bg-white flex flex-col gap-6">
                    {/* 上部: 集約マスタ管理 */}
                    <div className="border border-gray-150 rounded-lg p-4 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-700 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                集約マスター管理
                            </span>
                            <button
                                onClick={addAggregate}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm text-xs font-semibold"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                集約追加
                            </button>
                        </div>
                        {aggregates.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">定義された集約がありません。「集約追加」ボタンから作成してください。</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1">
                                {aggregates.map(agg => {
                                    const tableCount = Object.values(aggregateData).filter(item => item?.aggregateId === agg.id).length;
                                    return (
                                        <div key={agg.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm group">
                                            <input
                                                type="text"
                                                value={agg.name}
                                                onChange={(e) => updateAggregateName(agg.id, e.target.value)}
                                                className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 outline-none rounded font-bold text-gray-700 text-xs w-28 transition-all"
                                                placeholder="集約名"
                                            />
                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold ml-1" title="所属テーブル数">
                                                {tableCount}
                                            </span>
                                            <button
                                                onClick={() => deleteAggregate(agg.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1"
                                                title="この集約を削除"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 下部: テーブルの割り当てと並べ替え */}
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-700 flex items-center gap-1.5">
                                <Database className="w-4 h-4 text-slate-500" />
                                テーブル割り当て & 並べ替え
                            </span>
                            {tables.length > 0 && (
                                <button
                                    onClick={() => alignTablesByAggregate(tables)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:text-gray-800 shadow-sm transition-colors text-xs font-semibold"
                                    title="現在割り当てられている集約順にリストを一括整列します"
                                >
                                    <span>🧹 集約ごとに整列</span>
                                </button>
                            )}
                        </div>

                        {tables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                <Database className="w-12 h-12 mb-2 opacity-20" />
                                <p>テーブルが定義されていません。まずはメイン画面でテーブルを作成してください。</p>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col flex-1">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                                                <th className="p-3 w-12 text-center"></th>
                                                <th className="p-3 w-64">テーブル名</th>
                                                <th className="p-3 w-64">所属する集約</th>
                                                <th className="p-3 text-center w-48">ロール（役割）</th>
                                            </tr>
                                        </thead>
                                    </table>
                                </div>
                                <div className="overflow-y-auto flex-1 max-h-[350px]">
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <tbody>
                                            {orderedTables.map((table, idx) => {
                                                const currentAssignment = aggregateData[table.id];
                                                const hasAggregate = !!currentAssignment;

                                                return (
                                                    <tr
                                                        key={table.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, idx)}
                                                        onDragOver={(e) => handleDragOver(e, idx)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${draggedIdx === idx ? 'opacity-40 bg-indigo-50/30' : ''}`}
                                                    >
                                                        {/* ドラッグハンドル */}
                                                        <td className="p-3 w-12 text-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                                                            <GripHorizontal className="w-4 h-4 mx-auto" />
                                                        </td>
                                                        {/* テーブル名 */}
                                                        <td className="p-3 font-semibold text-gray-700 w-64">
                                                            {table.name}
                                                        </td>
                                                        {/* 所属集約 */}
                                                        <td className="p-3 w-64">
                                                            <select
                                                                value={currentAssignment?.aggregateId || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val !== "") {
                                                                        // 新しい集約に所属させる、または別の集約に変更する場合は、デフォルトで 'M' (Member) として割り当てる
                                                                        assignTableToAggregate(table.id, val, 'M', tables);
                                                                    } else {
                                                                        // 未所属にする
                                                                        removeTableFromAggregate(table.id);
                                                                    }
                                                                }}
                                                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-gray-700 transition-all shadow-sm"
                                                            >
                                                                <option value="">(未所属)</option>
                                                                {aggregates.map(agg => (
                                                                    <option key={agg.id} value={agg.id}>{agg.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        {/* ロールトグル */}
                                                        <td className="p-3 text-center w-48">
                                                            <div className="inline-flex rounded-md shadow-sm" role="group">
                                                                <button
                                                                    type="button"
                                                                    disabled={!hasAggregate}
                                                                    onClick={() => {
                                                                        if (hasAggregate && currentAssignment.role !== 'R') {
                                                                            assignTableToAggregate(table.id, currentAssignment.aggregateId, 'R', tables);
                                                                        }
                                                                    }}
                                                                    className={`px-4 py-1.5 text-xs font-bold rounded-l-md border transition-all ${
                                                                        !hasAggregate
                                                                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                                                                            : currentAssignment.role === 'R'
                                                                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 z-10'
                                                                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'
                                                                    }`}
                                                                >
                                                                    R (Root)
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={!hasAggregate}
                                                                    onClick={() => {
                                                                        if (hasAggregate && currentAssignment.role !== 'M') {
                                                                            assignTableToAggregate(table.id, currentAssignment.aggregateId, 'M', tables);
                                                                        }
                                                                    }}
                                                                    className={`px-4 py-1.5 text-xs font-bold rounded-r-md border-t border-b border-r transition-all ${
                                                                        !hasAggregate
                                                                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                                                                            : currentAssignment.role === 'M'
                                                                                ? 'bg-pink-100 text-pink-700 border-pink-300 z-10'
                                                                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600'
                                                                    }`}
                                                                >
                                                                    M (Member)
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* フッター */}
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end items-center">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-xs mr-2"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => setShowAggregateModal(false)}
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-xs"
                    >
                        完了
                    </button>
                </div>
            </div>
        </div>
    );
};
