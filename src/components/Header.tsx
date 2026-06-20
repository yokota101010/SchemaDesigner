import React from 'react';
import { Database, FilePlus, FileUp, FileDown, FileText, Grid, Plus, Code, BookOpen, Settings, Workflow } from './Icons';

interface HeaderProps {
    projectName: string;
    setProjectName: (name: string) => void;
    handleNewProject: () => void;
    handleImportClick: () => void;
    handleExportJSON: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setShowPromptModal: (show: boolean) => void;
    setShowCrudModal: (show: boolean) => void;
    addTable: () => void;
    generateSQL: () => void;
    setShowHelpModal: (show: boolean) => void;
    onAiGenerateData: () => void;
    onOpenAiSettings: () => void;
    onOpenValueObjectSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    projectName, setProjectName, handleNewProject, handleImportClick, handleExportJSON, fileInputRef, handleFileChange,
    setShowPromptModal, setShowCrudModal, addTable, generateSQL, setShowHelpModal,
    onAiGenerateData, onOpenAiSettings, onOpenValueObjectSettings
}) => {
    return (
        <div className="bg-white border-b border-gray-200 px-3 py-2 shadow-sm flex items-center justify-between z-20 h-12">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h1 className="text-base font-bold text-gray-800 hidden md:block">DB Architect</h1>
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                    <button 
                        onClick={handleNewProject} 
                        className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors"
                        title="新規作成"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>
                    
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>

                    <input 
                        type="text" 
                        value={projectName} 
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-xs font-medium w-32 lg:w-40 text-gray-700 outline-none px-1"
                        placeholder="Project Name"
                    />

                    <div className="h-4 w-px bg-gray-300 mx-1"></div>

                    <button 
                        onClick={handleImportClick}
                        className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors"
                        title="JSON読込 (ローカル)"
                    >
                        <FileUp className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleExportJSON}
                        className="p-1.5 hover:bg-white rounded text-gray-600 transition-colors"
                        title="JSON保存 (ローカル)"
                    >
                        <FileDown className="w-4 h-4" />
                    </button>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                    />
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {/* 値オブジェクト設定 */}
                <button 
                    onClick={onOpenValueObjectSettings} 
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 hover:text-gray-800 shadow-sm transition-colors cursor-pointer text-xs font-semibold" 
                    title="値オブジェクト定義"
                >
                    <Workflow className="w-3.5 h-3.5 text-gray-500" />
                    <span>値オブジェクト設定</span>
                </button>

                {/* 区切り縦線 */}
                <div className="h-5 w-px bg-gray-200 mx-1"></div>

                {/* AIデータ生成セット (APIキー設定 + AIサンプル生成) */}
                <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200 rounded-lg p-0.5">
                    <button 
                        onClick={onOpenAiSettings} 
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 hover:text-gray-800 shadow-sm transition-colors cursor-pointer text-xs font-semibold" 
                        title="AI・APIキー設定"
                    >
                        <Settings className="w-3.5 h-3.5 text-gray-500" />
                        <span className="hidden sm:inline">APIキー設定</span>
                    </button>

                    <button 
                        onClick={onAiGenerateData} 
                        className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded hover:from-violet-700 hover:to-indigo-700 shadow-sm transition-all text-xs font-semibold cursor-pointer animate-in fade-in duration-200"
                        title="AIでサンプルデータ自動生成"
                    >
                        <Workflow className="w-3.5 h-3.5" />
                        <span>AIサンプル生成</span>
                    </button>
                </div>

                {/* 区切り縦線 */}
                <div className="h-5 w-px bg-gray-200 mx-1"></div>

                <button onClick={() => setShowPromptModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm transition-colors text-xs font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">指示書</span>
                </button>
                
                <button onClick={() => setShowCrudModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm transition-colors text-xs font-medium">
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">CRUD</span>
                </button>
                
                <button onClick={addTable} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm transition-colors text-xs font-medium">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">追加</span>
                </button>
                <button onClick={generateSQL} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-900 shadow-sm transition-colors text-xs font-medium">
                    <Code className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">SQL</span>
                </button>
                <button onClick={() => setShowHelpModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 shadow-sm transition-colors text-xs font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">マニュアル</span>
                </button>
            </div>
        </div>
    );
};
