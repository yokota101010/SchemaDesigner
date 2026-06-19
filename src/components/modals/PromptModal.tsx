import React from 'react';
import { FileText, X } from '../Icons';

interface PromptModalProps {
    showPromptModal: boolean;
    setShowPromptModal: (show: boolean) => void;
    aiInstructions: string;
    setAiInstructions: (val: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ showPromptModal, setShowPromptModal, aiInstructions, setAiInstructions }) => {
    if (!showPromptModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        AIへのアプリ生成指示書
                    </h2>
                    <button onClick={() => setShowPromptModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="flex-1 p-6 bg-white overflow-y-auto">
                    <p className="text-gray-500 mb-4 text-xs">
                        このスキーマ定義を元にAIにアプリケーションを生成させるための、追加の要件や指示をここに記述してください。<br/>
                        この内容はJSONエクスポート時にも含まれます。
                    </p>
                    <textarea
                        className="w-full h-[60vh] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed"
                        placeholder="例: ReactとFirebaseを使用して在庫管理システムを作成してください..."
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                    />
                </div>
                
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button onClick={() => setShowPromptModal(false)} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                        閉じる（保存）
                    </button>
                </div>
            </div>
        </div>
    );
};
