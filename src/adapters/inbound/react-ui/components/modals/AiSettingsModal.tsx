import React, { useState, useEffect, useCallback } from 'react';
import { Settings, X, Key, Trash2, Eye, EyeOff, Icon, RefreshCw } from '../Icons';
import { GeminiAiClient } from '../../../../outbound/GeminiAiClient';

interface AiSettingsModalProps {
    showModal: boolean;
    setShowModal: (show: boolean) => void;
}

const DEFAULT_PRESET_MODELS = [
    { value: 'gemini-3.6-flash', label: 'gemini-3.6-flash (Gemini 3.6 Flash - 最先端・推奨)' },
    { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Gemini 3.1 Flash-Lite - 高速軽量)' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Gemini 2.5 Flash)' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Gemini 2.0 Flash)' },
];

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({ showModal, setShowModal }) => {
    const [apiKey, setApiKey] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('gemini-3.6-flash');
    const [customModel, setCustomModel] = useState<string>('');
    const [isCustom, setIsCustom] = useState<boolean>(false);
    const [showKey, setShowKey] = useState<boolean>(false);
    const [isSaved, setIsSaved] = useState<boolean>(false);

    const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>(DEFAULT_PRESET_MODELS);
    const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
    const [fetchStatusMsg, setFetchStatusMsg] = useState<string>('');

    const loadModels = useCallback(async (keyToUse: string, isManual = false) => {
        if (!keyToUse || !keyToUse.trim()) {
            if (isManual) alert("APIキーを入力してください。");
            return;
        }

        setIsFetchingModels(true);
        setFetchStatusMsg('Google APIから最新モデルを取得中...');

        try {
            const client = new GeminiAiClient();
            const fetched = await client.fetchAvailableModels(keyToUse.trim());
            if (fetched && fetched.length > 0) {
                setModelOptions(fetched);
                setFetchStatusMsg(`最新 ${fetched.length} 件のモデルを取得しました`);
            } else {
                setFetchStatusMsg('取得可能なモデルが見つかりませんでした');
            }
        } catch (err: any) {
            console.error("Failed to fetch Gemini models:", err);
            const errMsg = err.message || '取得エラー';
            setFetchStatusMsg(`自動取得失敗: ${errMsg}`);
            if (isManual) {
                alert(`モデル一覧の最新化に失敗しました:\n${errMsg}`);
            }
        } finally {
            setIsFetchingModels(false);
        }
    }, []);

    useEffect(() => {
        if (showModal) {
            const savedKey = localStorage.getItem('schema-designer-gemini-apikey') || '';
            const savedModel = localStorage.getItem('schema-designer-gemini-model') || 'gemini-3.6-flash';
            setApiKey(savedKey);

            setIsSaved(!!savedKey);
            setFetchStatusMsg('');

            const isPreset = DEFAULT_PRESET_MODELS.some(m => m.value === savedModel);
            if (isPreset) {
                setSelectedModel(savedModel);
                setIsCustom(false);
                setCustomModel('');
            } else {
                setSelectedModel('custom');
                setIsCustom(true);
                setCustomModel(savedModel);
            }

            // モーダルオープン時に保存済みAPIキーがあれば自動最新化を実行
            if (savedKey) {
                loadModels(savedKey, false);
            }
        }
    }, [showModal, loadModels]);

    if (!showModal) return null;

    const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedModel(val);
        if (val === 'custom') {
            setIsCustom(true);
        } else {
            setIsCustom(false);
        }
    };

    const handleSave = () => {
        const finalModel = isCustom ? customModel.trim() : selectedModel;
        if (!apiKey.trim()) {
            alert("APIキーを入力してください。");
            return;
        }
        if (isCustom && !finalModel) {
            alert("カスタムモデル名を入力してください。");
            return;
        }

        localStorage.setItem('schema-designer-gemini-apikey', apiKey.trim());
        localStorage.setItem('schema-designer-gemini-model', finalModel);
        setIsSaved(true);
        setShowModal(false);
        alert("設定を保存しました。");
    };

    const handleDelete = () => {
        if (confirm("保存されている設定（APIキーとモデル）を削除しますか？")) {
            localStorage.removeItem('schema-designer-gemini-apikey');
            localStorage.removeItem('schema-designer-gemini-model');
            setApiKey('');
            setSelectedModel('gemini-3.6-flash');
            setCustomModel('');
            setIsCustom(false);
            setIsSaved(false);
            alert("設定を削除しました。");
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
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                <Icon name="robot" className="w-3.5 h-3.5 text-blue-500" />
                                使用モデル
                            </label>
                            <button
                                type="button"
                                onClick={() => loadModels(apiKey, true)}
                                disabled={isFetchingModels || !apiKey.trim()}
                                className="text-[11px] text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                                title="Google APIから最新モデル一覧を取得・同期"
                            >
                                <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                                {isFetchingModels ? '最新化中...' : '最新モデルを取得'}
                            </button>
                        </div>
                        <select
                            value={selectedModel}
                            onChange={handleModelSelectChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs bg-white transition-shadow cursor-pointer"
                        >
                            {modelOptions.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                            <option value="custom">✏️ カスタムモデル名を直接入力</option>
                        </select>

                        {fetchStatusMsg && (
                            <span className={`text-[11px] font-medium ${fetchStatusMsg.includes('失敗') || fetchStatusMsg.includes('エラー') ? 'text-red-500' : 'text-gray-500'}`}>
                                {fetchStatusMsg}
                            </span>
                        )}

                        {isCustom && (
                            <input
                                type="text"
                                value={customModel}
                                onChange={(e) => setCustomModel(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-xs transition-shadow"
                                placeholder="例: gemini-2.0-flash-lite またはカスタムモデルID"
                            />
                        )}
                    </div>

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
