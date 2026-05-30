import React, { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
  "データモデルの構造を読み込んでいます...",
  "テーブル間のリレーションシップ（結合関係）を解析中...",
  "複合主キーおよび複合外部キーの整合性を計算中...",
  "リアリスティックなサンプルデータを構成しています...",
  "データ型の整合性を検証中...",
  "もうまもなく、サンプルデータが充填されます..."
];

export const AiLoadingModal = ({ showModal }) => {
    const [statusIndex, setStatusIndex] = useState(0);

    useEffect(() => {
        if (!showModal) return;

        setStatusIndex(0);
        const interval = setInterval(() => {
            setStatusIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
        }, 1800);

        return () => clearInterval(interval);
    }, [showModal]);

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
                {/* リッチなローディングアニメーション */}
                <div className="relative w-16 h-16 mb-6">
                    {/* 背景のアニメーションリング */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-50 animate-ping opacity-75" style={{ animationDuration: '2s' }}></div>
                    {/* メインの高速回転スピナー */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    {/* 中央のドット */}
                    <div className="absolute inset-[18px] bg-blue-600 rounded-full animate-pulse"></div>
                </div>

                <h3 className="text-base font-bold text-gray-800 mb-2 select-none">
                    AIサンプルデータ生成中
                </h3>
                
                {/* サイクル表示されるステータスメッセージ */}
                <p className="text-xs text-blue-600 font-medium h-4 transition-all duration-300 animate-pulse select-none">
                    {STATUS_MESSAGES[statusIndex]}
                </p>
                
                <p className="text-[10px] text-gray-400 mt-6 select-none leading-relaxed">
                    Gemini AIがリレーショナル整合性を保証した<br />
                    高品質なデモレコードを作成しています。
                </p>
            </div>
        </div>
    );
};
