'use client';

import { useState } from 'react';
import { BookOpen, Check, Copy, Minus, Plus } from 'lucide-react';
import { EXAM_ABSENCE_INFO } from '@/data/courses/fix-intent-5min/related-info';

interface Props {
  defaultExpanded?: boolean;
  // Reports the "복사" button element up to the parent so a
  // GuidanceTooltip anchored on `sheet-related-copy` can point at it.
  // Fires with the element on mount and `null` on unmount (callback-ref).
  onCopyButtonEl?: (el: HTMLButtonElement | null) => void;
  // Fires once per successful clipboard write. The parent uses this to
  // flip a session flag that advances the Prompt-column guidance from
  // `sheet-related-copy` to `sheet-field-prompt-paste`.
  onCopy?: () => void;
}

// Floating card that surfaces reference material (fake Hanyang exam-absence
// info) during the intent-writing phase. Mirrors IntentDetailCard: rounded
// pill at page bottom, collapsible via top-right toggle. The disclaimer row
// makes clear this is learning fiction and real work involves real sources.
export function RelatedInfoCard({
  defaultExpanded = false,
  onCopyButtonEl,
  onCopy,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Exclude the (가상) disclaimer from the clipboard — we want the learner
    // to paste a clean reference into the Prompt field, not the teaching
    // meta-note about "this is fake info".
    const bullets = EXAM_ABSENCE_INFO.bullets
      .map((b) => `· ${b.title} — ${b.body}`)
      .join('\n');
    const payload = `${EXAM_ABSENCE_INFO.heading}\n\n${bullets}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API blocked — silent; user can still select text manually.
      // Still notify the parent so the guidance sequence advances even
      // when the clipboard API is sandboxed away (the UX intent is
      // "learner acknowledged the reference", not "clipboard holds X").
      onCopy?.();
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
      <div className="pointer-events-auto flex w-full max-w-[840px] flex-col gap-2 rounded-2xl border border-[rgba(7,23,34,0.08)] bg-white px-5 py-3 shadow-[0_8px_24px_rgba(15,15,15,0.12)] font-[family:var(--font-lato),Arial,sans-serif]">
        {/* Top row — label · summary · toggle */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 text-[#509EE3]">
            <BookOpen size={14} strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
              Related Information
            </span>
          </div>
          <span className="shrink-0 rounded bg-[#FFF1D6] px-1.5 py-0.5 text-[10px] font-semibold text-[#C4704F]">
            가상
          </span>
          <div className="h-4 w-px shrink-0 bg-[rgba(7,23,34,0.1)]" />
          <span className="truncate text-[13px] font-semibold text-[rgba(7,23,34,0.84)]">
            {EXAM_ABSENCE_INFO.heading}
          </span>
          <button
            type="button"
            ref={onCopyButtonEl}
            onClick={handleCopy}
            aria-label={copied ? '복사됨' : '복사하기'}
            className={`ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-colors ${
              copied
                ? 'border border-[#BFDBBF] bg-[#DBEDDB] text-[#448361]'
                : 'bg-[#FF9D00] text-white hover:bg-[#E68E00]'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : '복사'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? '참고 정보 숨기기' : '참고 정보 보기'}
            aria-expanded={expanded}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[rgba(7,23,34,0.5)] transition-colors hover:bg-[rgba(7,23,34,0.06)] hover:text-[rgba(7,23,34,0.8)]"
          >
            {expanded ? <Minus size={14} /> : <Plus size={14} />}
          </button>
        </div>

        {expanded && (
          <>
            <div className="h-px bg-[rgba(7,23,34,0.08)]" />

            {/* Body — bullet list, scrollable if tall */}
            <div
              className="mb-scrollbar max-h-[160px] overflow-y-auto pr-1"
              tabIndex={0}
            >
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-[rgba(7,23,34,0.75)]">
                {EXAM_ABSENCE_INFO.bullets.map((b) => (
                  <li key={b.title} className="flex gap-2">
                    <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[rgba(7,23,34,0.35)]" />
                    <span>
                      <b className="font-semibold text-[rgba(7,23,34,0.85)]">
                        {b.title}
                      </b>{' '}
                      — {b.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="border-t border-[rgba(7,23,34,0.06)] pt-1.5 text-[11px] italic text-[rgba(7,23,34,0.5)]">
              ※ {EXAM_ABSENCE_INFO.disclaimer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
