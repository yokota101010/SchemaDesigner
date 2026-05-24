import React from 'react';
import { BookOpen, X } from '../Icons';

export const HelpModal = ({ showHelpModal, setShowHelpModal }) => {
    if (!showHelpModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        使い方
                    </h2>
                    <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 p-6 bg-white overflow-y-auto">
                    <p>このツールはローカルブラウザ上で動作するスキーマ設計ツールです。</p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                        <li>テーブルをドラッグ＆ドロップで配置できます。</li>
                        <li>追加ボタンから新しいテーブルを作成できます。</li>
                        <li>設定ボタンからテーブルのカラムやリレーションを編集できます。</li>
                        <li>ローカルストレージに自動的に保存されます。</li>
                        <li>SQL生成ボタンからDDLとデータインサート文を出力できます。</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
