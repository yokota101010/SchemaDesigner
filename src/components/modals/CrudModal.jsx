import React from 'react';
import { Grid, Plus, X, Trash2, Database } from '../Icons';

export const CrudModal = ({ 
    showCrudModal, setShowCrudModal, 
    tables, crudFunctions, crudData, 
    addCrudFunction, updateCrudFunctionName, deleteCrudFunction, toggleCrudValue 
}) => {
    if (!showCrudModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col text-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                            <Grid className="w-5 h-5 text-green-600" />
                            CRUD図 (機能別権限マトリクス)
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">機能ごとに対する各テーブルへの操作権限（Create, Read, Update, Delete）を定義します</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={addCrudFunction} 
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm text-xs font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            機能追加
                        </button>
                        <button onClick={() => setShowCrudModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 bg-white">
                    {tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Database className="w-12 h-12 mb-2 opacity-20" />
                            <p>テーブルが定義されていません。まずはテーブルを作成してください。</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-lg overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                                        <th className="p-3 border-r border-gray-200 w-48 sticky left-0 bg-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            テーブル / 機能
                                        </th>
                                        {crudFunctions.map(func => (
                                            <th key={func.id} className="p-2 border-r border-gray-200 min-w-[160px] group relative">
                                                <div className="flex items-center justify-between gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={func.name}
                                                        onChange={(e) => updateCrudFunctionName(func.id, e.target.value)}
                                                        className="bg-transparent font-bold text-gray-800 w-full focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 outline-none"
                                                        placeholder="機能名"
                                                    />
                                                    <button 
                                                        onClick={() => deleteCrudFunction(func.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.map(table => (
                                        <tr key={table.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="p-3 border-r border-gray-200 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                {table.name}
                                            </td>
                                            {crudFunctions.map(func => {
                                                const ops = crudData[func.id]?.[table.id] || [];
                                                return (
                                                    <td key={`${func.id}-${table.id}`} className="p-2 border-r border-gray-200 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            {['C', 'R', 'U', 'D'].map(type => {
                                                                const isActive = ops.includes(type);
                                                                let activeClass = '';
                                                                if (isActive) {
                                                                    switch(type) {
                                                                        case 'C': activeClass = 'bg-blue-100 text-blue-700 border-blue-200 font-bold'; break;
                                                                        case 'R': activeClass = 'bg-green-100 text-green-700 border-green-200 font-bold'; break;
                                                                        case 'U': activeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200 font-bold'; break;
                                                                        case 'D': activeClass = 'bg-red-100 text-red-700 border-red-200 font-bold'; break;
                                                                    }
                                                                } else {
                                                                    activeClass = 'bg-gray-50 text-gray-300 border-gray-100 hover:bg-gray-100';
                                                                }
                                                                
                                                                return (
                                                                    <button 
                                                                        key={type}
                                                                        onClick={() => toggleCrudValue(func.id, table.id, type)}
                                                                        className={`w-7 h-7 rounded border flex items-center justify-center text-xs transition-colors ${activeClass}`}
                                                                    >
                                                                        {type}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    {crudFunctions.length === 0 && (
                                        <tr>
                                            <td colSpan={1} className="p-8 text-center text-gray-400 bg-gray-50 sticky left-0">
                                                機能がありません。「機能追加」ボタンを押してください。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button onClick={() => setShowCrudModal(false)} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        完了
                    </button>
                </div>
            </div>
        </div>
    );
};
