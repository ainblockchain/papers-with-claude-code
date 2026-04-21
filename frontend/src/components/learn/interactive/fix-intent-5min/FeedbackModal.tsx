'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  correct: boolean;
  message?: string;
  onClose: () => void;
}

export function FeedbackModal({ correct, message, onClose }: Props) {
  const defaultMsg = correct
    ? '잘못 매칭된 인텐트를 정확히 찾아냈습니다.'
    : '다시 살펴보고 문제가 있는 행을 찾아보세요.';
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-2xl w-[420px] p-6">
        <div className="flex flex-col items-center text-center">
          {correct ? (
            <CheckCircle2 className="h-12 w-12 text-[#10B981] mb-3" />
          ) : (
            <XCircle className="h-12 w-12 text-red-400 mb-3" />
          )}
          <div className="text-xl font-bold text-white mb-1">
            {correct ? '맞습니다!' : '틀렸습니다'}
          </div>
          <p className="text-sm text-gray-400 mb-5">{message ?? defaultMsg}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
