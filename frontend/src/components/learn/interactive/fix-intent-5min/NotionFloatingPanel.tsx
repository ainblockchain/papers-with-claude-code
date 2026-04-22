'use client';

import { MoreHorizontal } from 'lucide-react';

interface Props {
  open: boolean;
  progress: { filled: number; total: number };
  children: React.ReactNode;
}

export function NotionFloatingPanel({ open, progress, children }: Props) {
  // Once "새로 만들기" is clicked the panel opens and stays open — there's no
  // close affordance and no peek tab. Rendering null in the closed state
  // keeps the Agents & Intents landing unobstructed.
  if (!open) return null;

  const ratio = progress.total > 0 ? progress.filled / progress.total : 0;
  const complete = progress.filled >= progress.total && progress.total > 0;

  return (
    <div
      className="absolute inset-y-0 right-0 z-10 flex w-[560px] max-w-[calc(100%-1rem)] flex-col overflow-hidden border-l border-[rgba(55,53,47,0.09)] bg-white shadow-[-4px_0_24px_rgba(15,15,15,0.08)] animate-in fade-in slide-in-from-right-8 duration-200"
      role="dialog"
      aria-label="Notion Task"
    >
      <header className="flex shrink-0 items-center justify-end px-3 py-2">
        <div className="flex items-center gap-1">
          <span
            className={`mr-1 text-[12px] font-medium ${
              complete ? 'text-[#0F7B6C]' : 'text-[rgba(55,53,47,0.5)]'
            }`}
            style={{
              animation: !complete && ratio > 0 ? 'heart-pulse 1.8s ease-in-out infinite' : undefined,
            }}
          >
            {progress.filled}/{progress.total}
          </span>
          <button
            aria-label="더보기"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[rgba(55,53,47,0.5)] transition-colors hover:bg-[rgba(55,53,47,0.08)] hover:text-[#37352f]"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto mb-scrollbar">{children}</div>
    </div>
  );
}
