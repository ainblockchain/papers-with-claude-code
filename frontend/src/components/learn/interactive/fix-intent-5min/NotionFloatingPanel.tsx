'use client';

import { ChevronsRight, FileText, Maximize2, MoreHorizontal } from 'lucide-react';

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  progress: { filled: number; total: number };
  children: React.ReactNode;
}

export function NotionFloatingPanel({
  open,
  onOpen,
  onClose,
  progress,
  children,
}: Props) {
  const ratio = progress.total > 0 ? progress.filled / progress.total : 0;
  const complete = progress.filled >= progress.total && progress.total > 0;

  if (open) {
    return (
      <div
        className="absolute inset-y-0 right-0 z-10 flex w-[560px] max-w-[calc(100%-1rem)] flex-col overflow-hidden border-l border-[rgba(55,53,47,0.09)] bg-white shadow-[-4px_0_24px_rgba(15,15,15,0.08)] animate-in fade-in slide-in-from-right-8 duration-200"
        role="dialog"
        aria-label="Notion Task"
      >
        <header className="flex shrink-0 items-center justify-between px-3 py-2">
          <div className="flex items-center gap-0.5">
            <button
              onClick={onClose}
              aria-label="닫기"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[rgba(55,53,47,0.5)] transition-colors hover:bg-[rgba(55,53,47,0.08)] hover:text-[#37352f]"
            >
              <ChevronsRight size={18} strokeWidth={1.75} />
            </button>
            <button
              aria-label="페이지로 열기"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[rgba(55,53,47,0.5)] transition-colors hover:bg-[rgba(55,53,47,0.08)] hover:text-[#37352f]"
            >
              <Maximize2 size={14} />
            </button>
          </div>
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

  // Closed: thin right-edge tab, Notion-style re-open affordance.
  return (
    <button
      onClick={onOpen}
      aria-label="Notion Task 열기"
      className="group absolute top-1/2 right-0 z-10 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-md border border-r-0 border-[rgba(55,53,47,0.09)] bg-white px-2 py-4 shadow-[-2px_0_10px_rgba(15,15,15,0.06)] transition-colors hover:bg-[rgba(55,53,47,0.04)]"
    >
      <FileText size={16} className="text-[#37352f]" />
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          complete
            ? 'bg-[#E7F3EE] text-[#0F7B6C]'
            : 'bg-[#F1F1EF] text-[rgba(55,53,47,0.65)]'
        }`}
        style={{
          animation: !complete && ratio > 0 ? 'heart-pulse 1.8s ease-in-out infinite' : undefined,
        }}
      >
        {progress.filled}/{progress.total}
      </span>
    </button>
  );
}
