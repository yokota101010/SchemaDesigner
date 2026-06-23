import React, { useState, useEffect } from 'react';
import { X } from '../../Icons';

export interface DetailEditConfig {
    columnId: string;
    columnName: string;
    field: 'derivation' | 'description';
    title: string;
    value: string;
}

interface DetailEditPopupProps {
    detailEditConfig: DetailEditConfig | null;
    onClose: () => void;
    onSave: (value: string) => void;
}

export const DetailEditPopup: React.FC<DetailEditPopupProps> = ({ detailEditConfig, onClose, onSave }) => {
    const [tempValue, setTempValue] = useState<string>('');

    useEffect(() => {
        if (detailEditConfig) {
            setTempValue(detailEditConfig.value || '');
        } else {
            setTempValue('');
        }
    }, [detailEditConfig]);

    if (!detailEditConfig) return null;

    const handleSave = () => {
        onSave(tempValue);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div 
                className="bg-white rounded-lg shadow-2xl w-[500px] max-w-full flex flex-col border border-gray-200 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-gray-800">
                        {detailEditConfig.title} の編集 <span className="text-xs font-normal text-gray-500">({detailEditConfig.columnName})</span>
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* 本文 */}
                <div className="p-4 flex flex-col gap-2">
                    <textarea
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="w-full h-40 p-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs font-sans resize-y"
                        placeholder={`${detailEditConfig.title}を入力してください...`}
                        autoFocus
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSave();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
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
                        onClick={onClose}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    );
};
