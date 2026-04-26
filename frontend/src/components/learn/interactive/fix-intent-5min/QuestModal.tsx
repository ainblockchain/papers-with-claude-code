'use client';

import { useEffect } from 'react';
import { Target } from 'lucide-react';

interface Props {
  label?: string;
  body: string;
  onAccept: () => void;
  cta?: string;
}

export function QuestModal({
  label = 'QUEST',
  body,
  onAccept,
  cta = '확인',
}: Props) {
  // Enter anywhere confirms the quest — consistent with FeedbackModal.
  // Escape mirrors it as an escape hatch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAccept]);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(7,23,34,0.55)] font-[family:var(--font-lato),Arial,sans-serif]">
      <div className="w-[440px] overflow-hidden rounded-[12px] border border-[#DCDFE0] bg-white shadow-[0px_8px_32px_0px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col items-center px-8 py-7 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(80,158,227,0.12)]">
            <Target size={30} className="text-[#509EE3]" strokeWidth={2} />
          </div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#509EE3]">
            {label}
          </div>
          <p className="mb-6 text-[16px] font-semibold leading-relaxed text-[rgba(7,23,34,0.84)]">
            {body}
          </p>
          <button
            autoFocus
            onClick={onAccept}
            className="w-full rounded-[6px] bg-[#509EE3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3E8BCC]"
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}
