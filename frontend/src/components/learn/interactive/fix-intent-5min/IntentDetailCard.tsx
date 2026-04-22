'use client';

import { useState } from 'react';
import { Minus, Plus, Target } from 'lucide-react';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

interface Props {
  intent: SelectedIntent;
}

// Two-row floating card surfacing the broken intent found in Stage 1. Top row
// summarises the find (label + intent + user message) on a single line; the
// lower row hosts the (often long) assistant response in a scrollable block
// so the learner can read it fully without breaking the card's silhouette.
// Collapsible via the top-right toggle — collapsed state hides the assistant
// response and returns to the compact one-line profile.
export function IntentDetailCard({ intent }: Props) {
  const { row } = intent;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
      <div className="pointer-events-auto flex w-full max-w-[840px] flex-col gap-2 rounded-2xl border border-[rgba(7,23,34,0.08)] bg-white px-5 py-3 shadow-[0_8px_24px_rgba(15,15,15,0.12)] font-[family:var(--font-lato),Arial,sans-serif]">
        {/* Top row — label · intent · user message · collapse toggle */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 text-[#509EE3]">
            <Target size={14} strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
              Found Intent
            </span>
          </div>
          <div className="h-4 w-px shrink-0 bg-[rgba(7,23,34,0.1)]" />
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-[rgba(7,23,34,0.45)]">
              Intent
            </span>
            <span className="text-[13px] font-semibold text-[rgba(7,23,34,0.84)]">
              {row.intent}
            </span>
          </div>
          <div className="h-4 w-px shrink-0 bg-[rgba(7,23,34,0.1)]" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="shrink-0 text-[11px] uppercase tracking-wide text-[rgba(7,23,34,0.45)]">
              User
            </span>
            <span className="truncate text-[13px] text-[rgba(7,23,34,0.72)]">
              “{row.userMessage}”
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? '답변 숨기기' : '답변 보기'}
            aria-expanded={expanded}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[rgba(7,23,34,0.5)] transition-colors hover:bg-[rgba(7,23,34,0.06)] hover:text-[rgba(7,23,34,0.8)]"
          >
            {expanded ? <Minus size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {expanded && (
          <>
            <div className="h-px bg-[rgba(7,23,34,0.08)]" />

            {/* Bottom row — assistant response, scrollable */}
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 shrink-0 text-[11px] uppercase tracking-wide text-[rgba(7,23,34,0.45)]">
                Assistant
              </span>
              <div
                className="mb-scrollbar max-h-[140px] min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap pr-1 text-[13px] leading-relaxed text-[rgba(7,23,34,0.7)]"
                tabIndex={0}
              >
                {row.assistantContent}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
