'use client';

import { Target } from 'lucide-react';

interface Props {
  stageLabel: string;
  message: string;
}

// Persistent single-row mission indicator rendered at the top of the
// interactive course panel. Replaces the previous "QuestModal that
// disappears on confirm" pattern so learners can always glance up to
// re-read what to do next. See mission-copy.ts for the copy source.
//
// Palette is the Notion-tag orange/brown (bg-[#FFF8EF], text-[#C4704F])
// — intentionally distinct from QuestModal's Metabase blue so the two
// serve visually separate roles: bar = passive ambient guide,
// QuestModal = transition / gate moments.
export function MissionBar({ stageLabel, message }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative shrink-0 border-b border-[#FDE6CE] bg-[#FFF8EF]"
    >
      <style>{`
        @keyframes mission-bar-pulse {
          0%   { box-shadow: inset 0 0 0 0 rgba(255,157,0,0.00); background-color: #FFF8EF; }
          25%  { box-shadow: inset 0 0 0 2px rgba(255,157,0,0.35); background-color: #FFEFD6; }
          100% { box-shadow: inset 0 0 0 0 rgba(255,157,0,0.00); background-color: #FFF8EF; }
        }
        .mission-bar-pulse-once {
          animation: mission-bar-pulse 1.6s ease-out;
        }
      `}</style>
      {/* Key on message so React remounts the row whenever copy changes,
          which restarts the one-shot CSS pulse without needing a state+
          effect pair (cleaner + no cascading-render lint hit). */}
      <div
        key={message}
        className="mission-bar-pulse-once flex min-w-0 items-center gap-2.5 px-4 py-2"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(255,157,0,0.18)]">
          <Target size={12} strokeWidth={2.4} className="text-[#C4704F]" />
        </span>
        <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#C4704F]">
          {stageLabel}
        </span>
        <span aria-hidden="true" className="h-3 w-px shrink-0 bg-[#F3C5A2]" />
        <span
          className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#3B2A1F]"
          title={message}
        >
          {message}
        </span>
      </div>
    </div>
  );
}
