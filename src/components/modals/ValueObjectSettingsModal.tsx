import React, { useState } from 'react';
import { X, Plus, Trash2, Settings } from '../Icons';
import { DATA_TYPES } from '../../constants';
import { ValueObjectPreset, ValueObjectPropertyPreset, Table } from '../../types';

interface ValueObjectSettingsModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    valueObjects: ValueObjectPreset[];
    tables: Table[];
    onSave: (valueObjects: ValueObjectPreset[]) => void;
}

export const ValueObjectSettingsModal: React.FC<ValueObjectSettingsModalProps> = ({
    showModal,
    setShowModal,
    valueObjects,
    tables,
    onSave
}) => {
    const [tempVOs, setTempVOs] = useState<ValueObjectPreset[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    // モーダルが開かれた時にステートを初期化
    React.useEffect(() => {
        if (showModal) {
            setTempVOs(JSON.parse(JSON.stringify(valueObjects)));
            setSelectedIndex(0);
        }
    }, [showModal, valueObjects]);

    if (!showModal) return null;

    const currentVO = tempVOs[selectedIndex];

    // 新しいカスタムVOを追加
    const handleAddVO = () => {
        let nameBase = 'CustomVO';
        let counter = 1;
        let name = `${nameBase}${counter}`;
        while (tempVOs.some(vo => vo.name === name)) {
            counter++;
            name = `${nameBase}${counter}`;
        }

        const newVO: ValueObjectPreset = {
            name,
            properties: [
                { name: 'property1', type: 'VARCHAR(255)', description: 'プロパティ説明' }
            ]
        };
        setTempVOs([...tempVOs, newVO]);
        setSelectedIndex(tempVOs.length); // 追加したものを選択
    };

    // VOを削除
    const handleDeleteVO = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newVOs = tempVOs.filter((_, idx) => idx !== index);
        setTempVOs(newVOs);
        // インデックス調整
        if (selectedIndex >= newVOs.length) {
            setSelectedIndex(Math.max(0, newVOs.length - 1));
        } else if (selectedIndex === index) {
            setSelectedIndex(Math.max(0, index - 1));
        }
    };

    // VOの名前を変更
    const handleRenameVO = (newName: string) => {
        if (!currentVO) return;
        const cleanName = newName.replace(/\s+/g, '');
        const updated = tempVOs.map((vo, idx) => 
            idx === selectedIndex ? { ...vo, name: cleanName } : vo
        );
        setTempVOs(updated);
    };

    // VOのビジネスルールを変更
    const handleUpdateDescription = (newDesc: string) => {
        if (!currentVO) return;
        const updated = tempVOs.map((vo, idx) => 
            idx === selectedIndex ? { ...vo, description: newDesc } : vo
        );
        setTempVOs(updated);
    };

    // プロパティを追加
    const handleAddProperty = () => {
        if (!currentVO) return;
        const newProp: ValueObjectPropertyPreset = {
            name: `prop_${Date.now()}`,
            type: 'VARCHAR(255)',
            description: ''
        };
        const updated = tempVOs.map((vo, idx) => {
            if (idx === selectedIndex) {
                return {
                    ...vo,
                    properties: [...vo.properties, newProp]
                };
            }
            return vo;
        });
        setTempVOs(updated);
    };

    // プロパティを更新
    const handleUpdateProperty = (propIdx: number, field: keyof ValueObjectPropertyPreset, value: string) => {
        if (!currentVO) return;
        const updatedProps = currentVO.properties.map((p, idx) => 
            idx === propIdx ? { ...p, [field]: value } : p
        );
        const updated = tempVOs.map((vo, idx) => 
            idx === selectedIndex ? { ...vo, properties: updatedProps } : vo
        );
        setTempVOs(updated);
    };

    // プロパティを削除
    const handleDeleteProperty = (propIdx: number) => {
        if (!currentVO) return;
        if (currentVO.properties.length <= 1) {
            alert('値オブジェクトには少なくとも1つのプロパティが必要です。');
            return;
        }
        const updatedProps = currentVO.properties.filter((_, idx) => idx !== propIdx);
        const updated = tempVOs.map((vo, idx) => 
            idx === selectedIndex ? { ...vo, properties: updatedProps } : vo
        );
        setTempVOs(updated);
    };

    // 保存実行
    const handleSave = () => {
        // 重複チェック
        const names = tempVOs.map(vo => vo.name);
        const hasDuplicates = names.some((name, idx) => names.indexOf(name) !== idx);
        if (hasDuplicates) {
            alert('値オブジェクト名が重複しています。ユニークな名前にしてください。');
            return;
        }

        // 空欄チェック
        for (const vo of tempVOs) {
            if (!vo.name.trim()) {
                alert('値オブジェクト名は空にできません。');
                return;
            }
            for (const prop of vo.properties) {
                if (!prop.name.trim()) {
                    alert('プロパティ名は空にできません。');
                    return;
                }
            }
        }

        onSave(tempVOs);
        setShowModal(false);
    };



    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[70vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden text-sm">
                
                {/* ヘッダー */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-blue-600" />
                        値オブジェクト（ドメイン型）の定義
                    </h2>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* メインエリア */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* 左側ペイン: VOリスト */}
                    <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50/50">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500">登録済みオブジェクト</span>
                            <button
                                onClick={handleAddVO}
                                className="flex items-center gap-0.5 text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 px-2 py-1 rounded transition-colors font-semibold"
                            >
                                <Plus className="w-3 h-3" />
                                追加
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                            {tempVOs.map((vo, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={vo.name + idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`px-3 py-2 rounded flex items-center justify-between cursor-pointer transition-colors text-xs ${
                                            isSelected 
                                            ? 'bg-blue-600 text-white font-semibold' 
                                            : 'hover:bg-gray-100 text-gray-700 bg-white border border-gray-200/50'
                                        }`}
                                    >
                                        <span className="truncate">{vo.name}</span>
                                        <button
                                            onClick={(e) => handleDeleteVO(idx, e)}
                                            className={`p-0.5 rounded hover:bg-red-500 hover:text-white transition-colors ${isSelected ? 'text-white/80' : 'text-gray-400'}`}
                                            title="削除"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 右側ペイン: 詳細編集 */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden p-6">
                        {currentVO ? (
                            <div className="flex-1 flex flex-col overflow-hidden gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <label className="text-xs font-bold text-gray-600">値オブジェクト名</label>
                                        <input
                                            type="text"
                                            value={currentVO.name}
                                            onChange={(e) => handleRenameVO(e.target.value)}
                                            className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs disabled:bg-gray-100 disabled:text-gray-500 font-bold"
                                            placeholder="Money"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddProperty}
                                        className="mt-5 flex items-center gap-1 text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded transition-colors font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        プロパティ追加
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-gray-600">ビジネスルール・制約条件（AI生成用）</label>
                                    <textarea
                                        value={currentVO.description || ''}
                                        onChange={(e) => handleUpdateDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs disabled:bg-gray-100 disabled:text-gray-500 font-sans resize-none"
                                        placeholder="例：金額(amount)は0以上の正の数であること。"
                                    />
                                </div>

                                <div className="flex-1 border border-gray-200 rounded overflow-hidden flex flex-col">
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-2 w-1/3">プロパティ名 (英名)</th>
                                                    <th className="px-4 py-2 w-1/4">物理データ型</th>
                                                    <th className="px-4 py-2">説明</th>
                                                    <th className="px-4 py-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {currentVO.properties.map((prop, propIdx) => (
                                                    <tr key={propIdx} className="hover:bg-gray-50/50">
                                                        <td className="px-4 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={prop.name}
                                                                onChange={(e) => handleUpdateProperty(propIdx, 'name', e.target.value)}
                                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1 font-mono text-xs disabled:text-gray-500"
                                                                placeholder="amount"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-1.5">
                                                            <select
                                                                value={prop.type}
                                                                onChange={(e) => handleUpdateProperty(propIdx, 'type', e.target.value)}
                                                                className="w-full bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                                            >
                                                                <optgroup label="基本データ型">
                                                                    {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                                </optgroup>
                                                                <optgroup label="マスタ参照 (外部キー)">
                                                                    {tables.filter(t => t.viewPane === 'sub' && t.columns.filter(c => c.isPk).length === 1).map(t => (
                                                                        <option key={t.id} value={`FK:${t.id}`}>FK: {t.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={prop.description}
                                                                onChange={(e) => handleUpdateProperty(propIdx, 'description', e.target.value)}
                                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 outline-none py-1 text-xs disabled:text-gray-500"
                                                                placeholder="プロパティの説明"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-1.5 text-center">
                                                            <button
                                                                onClick={() => handleDeleteProperty(propIdx)}
                                                                className="text-gray-400 hover:text-red-500 p-1"
                                                                title="プロパティ削除"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                値オブジェクトが選択されていないか、定義がありません。
                            </div>
                        )}
                    </div>

                </div>

                {/* フッター */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2.5">
                    <button 
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors shadow-sm text-sm cursor-pointer"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors shadow-sm text-sm cursor-pointer"
                    >
                        保存
                    </button>
                </div>

            </div>
        </div>
    );
};
