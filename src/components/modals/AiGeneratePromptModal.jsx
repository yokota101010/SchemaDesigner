import React from 'react';
import { X, Workflow } from '../Icons';
import { AI_MODAL_TIPS, AI_MODAL_PLACEHOLDER } from '../../../skills/rdb-mock-data-generator/aiPromptTemplates';

export const AiGeneratePromptModal = ({
    showModal,
    setShowModal,
    promptText,
    setPromptText,
    onGenerate
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200 overflow-hidden text-sm">
                <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        <Workflow className="w-4 h-4 text-indigo-600" />
                        AIサンプルデータ生成の指示
                    </h2>
                    <button 
                        onClick={() => setShowModal(false)} 
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                        title="閉じる"
                    >
                        <X className="w-4.5 h-4.5 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-5">
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                        現在のインスタンスデータに対して、追加・削除・修正の指示を記述できます。<br />
                        <span className="text-indigo-600 font-semibold">{AI_MODAL_TIPS.title}</span> <span dangerouslySetInnerHTML={{ __html: AI_MODAL_TIPS.body }} />
                    </p>
                    
                    <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-xs resize-none leading-relaxed"
                        placeholder={AI_MODAL_PLACEHOLDER}
                    />
                </div>
                
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 text-xs">
                    <button 
                        onClick={() => setShowModal(false)}
                        className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={onGenerate}
                        className="px-3.5 py-2 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                    >
                        生成開始
                    </button>
                </div>
            </div>
        </div>
    );
};

