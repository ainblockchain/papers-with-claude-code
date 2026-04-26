'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  correct: boolean;
  message?: string;
  onClose: () => void;
}

// Metabase palette (matches DashboardView skin)
const MB_GREEN = '#84BB4C';
const MB_RED = '#ED6E6E';
const MB_BRAND = '#509EE3';

export function FeedbackModal({ correct, message, onClose }: Props) {
  const defaultMsg = correct
    ? '잘못 매칭된 인텐트를 정확히 찾아냈습니다.'
    : '다시 살펴보고 문제가 있는 행을 찾아보세요.';
  // Enter anywhere dismisses the modal — saves the user a trip to the
  // 확인 button when they're mid-flow and just want to keep going.
  // Escape mirrors it as a familiar escape hatch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(7,23,34,0.4)] font-[family:var(--font-lato),Arial,sans-serif]">
      <div className="w-[420px] rounded-[8px] border border-[#DCDFE0] bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col items-center text-center">
          {correct ? (
            <CheckCircle2 className="mb-3 h-12 w-12" style={{ color: MB_GREEN }} />
          ) : (
            <XCircle className="mb-3 h-12 w-12" style={{ color: MB_RED }} />
          )}
          <div className="mb-1 text-xl font-bold text-[rgba(7,23,34,0.84)]">
            {correct ? '맞습니다!' : '틀렸습니다'}
          </div>
          <p className="mb-5 text-sm text-[rgba(7,23,34,0.62)]">{message ?? defaultMsg}</p>
          <button
            autoFocus
            onClick={onClose}
            className="rounded-[6px] px-6 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: MB_BRAND }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3E8BCC')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = MB_BRAND)}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
