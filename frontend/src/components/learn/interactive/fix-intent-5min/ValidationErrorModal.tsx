'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Soft "검증 서버 일시 오류" modal — shown when the LLM validation
 * endpoint returns a transient error (Azure 5xx after retries, JSON
 * parse failure, network blip). Crucially distinct from the red
 * FeedbackModal: amber palette + "try again" framing avoids implying
 * the learner's input was wrong, since it may have been perfectly
 * correct. Submitting via this modal does NOT count against
 * `fieldAttempts` — the parent skips the increment on `server-error`.
 *
 * Keyboard: Enter retries (primary), Escape closes (secondary). Mirrors
 * QuestModal's z-30 backdrop pattern so it stacks over the same surfaces.
 */
export function ValidationErrorModal({ onRetry, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onRetry();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry, onClose]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(7,23,34,0.55)] font-[family:var(--font-lato),Arial,sans-serif]">
      <div className="w-[440px] overflow-hidden rounded-[12px] border border-[#DCDFE0] bg-white shadow-[0px_8px_32px_0px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col items-center px-8 py-7 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(217,119,6,0.12)]">
            <AlertTriangle
              size={30}
              className="text-[#D97706]"
              strokeWidth={2}
            />
          </div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#D97706]">
            검증 서버 일시 오류
          </div>
          <p className="mb-6 text-[16px] font-semibold leading-relaxed text-[rgba(7,23,34,0.84)]">
            지금은 입력을 검증할 수 없어요. 잠시 후 다시 시도해 주세요.
          </p>
          <div className="flex w-full flex-col gap-2">
            <button
              autoFocus
              onClick={onRetry}
              className="w-full rounded-[6px] bg-[#FF9D00] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#E68A00]"
            >
              다시 시도
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-[6px] px-6 py-2 text-sm font-medium text-[rgba(7,23,34,0.6)] transition-colors hover:bg-[rgba(7,23,34,0.04)]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
