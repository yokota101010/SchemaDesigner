import React from 'react';
import { X, Workflow } from '../Icons';
import { AI_MODAL_TIPS } from '../../../../../utils/aiPromptTemplates';

interface AiGeneratePromptModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
    initialPromptText: string;
    setInitialPromptText: (text: string) => void;
    otherPromptText: string;
    setOtherPromptText: (text: string) => void;
    onGenerate: () => void;
}

export const AiGeneratePromptModal: React.FC<AiGeneratePromptModalProps> = ({
    showModal,
    setShowModal,
    initialPromptText,
    setInitialPromptText,
    otherPromptText,
    setOtherPromptText,
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
                
                <div className="p-5 flex flex-col gap-4">
                    <p className="text-xs text-gray-500 leading-relaxed">
                        現在のインスタンスデータに対して、初期値と生成ルールの指示を個別に設定できます。<br />
                        <span className="text-indigo-600 font-semibold">{AI_MODAL_TIPS.title}</span> <span dangerouslySetInnerHTML={{ __html: AI_MODAL_TIPS.body }} />
                    </p>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            ① 初期値・初期移行データの設定指示（自然言語）
                        </label>
                        <textarea
                            value={initialPromptText}
                            onChange={(e) => setInitialPromptText(e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-xs resize-none leading-relaxed"
                            placeholder="例：2026年4月の月次取引サマリ.月初資産残高は500000、月次取引サマリ.月初負債残高は1000000とする"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            ② その他の追加データ・生成ルール指示（自然言語）
                        </label>
                        <textarea
                            value={otherPromptText}
                            onChange={(e) => setOtherPromptText(e.target.value)}
                            className="w-full h-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-xs resize-none leading-relaxed"
                            placeholder="例：年月は2026年4月と2026年5月。収支取引明細は月毎に4件、振替取引は月毎に1件生成。"
                        />
                    </div>
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
