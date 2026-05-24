import React from 'react';
import { AlertTriangle, HelpCircle } from '../Icons';

export const ConfirmModal = ({ confirmation, setConfirmation, handleConfirmAction }) => {
    if (!confirmation) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${confirmation.isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {confirmation.isDanger ? <AlertTriangle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{confirmation.title}</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{confirmation.message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button 
                        onClick={() => setConfirmation(null)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={handleConfirmAction}
                        className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition-colors ${confirmation.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        実行
                    </button>
                </div>
            </div>
        </div>
    );
};
