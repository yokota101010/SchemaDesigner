import React, { useState, useEffect } from 'react';
import { Settings, X, Key, Trash2, Eye, EyeOff } from '../Icons';

interface AiSettingsModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ showModal, setShowModal }) => {
    const [apiKey, setApiKey] = useState<string>('');
    const [showKey, setShowKey] = useState<boolean>(false);
    const [isSaved, setIsSaved] = useState<boolean>(false);

    useEffect(() => {
        if (showModal) {
            const savedKey = localStorage.getItem('schema-designer-gemini-apikey') || '';
            setApiKey(savedKey);
            setIsSaved(!!savedKey);
        }
    }, [showModal]);

    if (!showModal) return null;

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('schema-designer-gemini-apikey', apiKey.trim());
            setIsSaved(true);
            setShowModal(false);
            alert("APIキーを保存しました。");
        } else {
            alert("APIキーを入力してください。");
        }
    };

    const handleDelete = () => {
        if (confirm("保存されているAPIキーを削除しますか？")) {
            localStorage.removeItem('schema-designer-gemini-apikey');
            setApiKey('');
            setIsSaved(false);
            alert("APIキーを削除しました。");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                        AI設定 (Gemini API)
                    </h2>
                    <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-6 flex-1 flex flex-col gap-4">
                    <p className="text-gray-500 text-xs leading-relaxed">
                        テーブルのサンプルインスタンス（デモレコード）を自動生成するために、Google Gemini API を使用します。<br />
                        APIキーはローカルストレージ（ブラウザ）に安全に保存され、直接GoogleのAPIエンドポイントとの通信にのみ使用されます。
                    </p>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                            <Key className="w-3.5 h-3.5 text-blue-500" />
                            Google AI Studio API キー
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-xs transition-shadow"
                                placeholder="AIzaSy..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                title={showKey ? "非表示にする" : "表示する"}
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="text-[11px] text-gray-400">
                        APIキーをお持ちでない場合は、無料で取得できます：
                        <a 
                            href="https://aistudio.google.com/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline ml-1 font-medium inline-flex items-center gap-0.5"
                        >
                            Google AI Studio ➔
                        </a>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                        {isSaved && (
                            <button 
                                onClick={handleDelete}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-colors font-medium cursor-pointer"
                                title="キーを削除"
                            >
                                <Trash2 className="w-4 h-4" />
                                キーを削除
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2.5">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors text-xs cursor-pointer shadow-sm"
                        >
                            キャンセル
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors text-xs cursor-pointer shadow-sm"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
