import React from 'react';
import { Code, X } from '../Icons';

interface SqlModalProps {
    showSqlModal: boolean;
    setShowSqlModal: (show: boolean) => void;
    generatedSql: string;
}

export const SqlModal: React.FC<SqlModalProps> = ({ showSqlModal, setShowSqlModal, generatedSql }) => {
    if (!showSqlModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col text-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <Code className="w-5 h-5 text-slate-800" />
                        生成されたSQL
                    </h2>
                    <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="flex-1 p-6 bg-white overflow-y-auto">
                    <textarea
                        className="w-full h-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none resize-none font-mono text-sm leading-relaxed"
                        value={generatedSql}
                        readOnly
                    />
                </div>
            </div>
        </div>
    );
};
