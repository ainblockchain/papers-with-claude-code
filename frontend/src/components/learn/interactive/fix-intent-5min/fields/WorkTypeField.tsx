'use client';

import { useState } from 'react';
import {
  WORK_TYPES,
  type WorkTypeKey,
} from '@/data/courses/fix-intent-5min/work-types';

interface Props {
  label: string;
  active: boolean;
  filled: boolean;
  disabled?: boolean;
  value: string | null;
  onSubmit: (value: string) => void;
}

function parseSelection(value: string | null): WorkTypeKey[] {
  if (!value) return [];
  const valid = new Set<string>(WORK_TYPES.map((w) => w.key));
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is WorkTypeKey => valid.has(s));
}

function TagChip({
  workTypeKey,
  faded,
  onClick,
  ring,
}: {
  workTypeKey: WorkTypeKey;
  faded?: boolean;
  onClick?: () => void;
  ring?: boolean;
}) {
  const wt = WORK_TYPES.find((w) => w.key === workTypeKey);
  if (!wt) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] transition-opacity ${
        faded ? 'opacity-50 hover:opacity-80' : 'opacity-100'
      } ${ring ? 'ring-2 ring-[#FF9D00]/60 ring-offset-1' : ''}`}
      style={{ background: wt.bg, color: wt.text }}
    >
      {wt.label}
    </button>
  );
}

export function WorkTypeField({
  label,
  active,
  filled,
  disabled,
  value,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState<Set<WorkTypeKey>>(new Set());

  const toggle = (key: WorkTypeKey) => {
    if (disabled) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = () => {
    if (disabled || draft.size === 0) return;
    // Preserve canonical WORK_TYPES display order in the serialized value.
    const ordered = WORK_TYPES.filter((w) => draft.has(w.key)).map((w) => w.key);
    onSubmit(ordered.join(','));
  };

  return (
    <div className="flex items-start gap-4 py-1.5">
      <div className="w-28 shrink-0 pt-1 text-sm text-gray-500">{label}</div>
      {filled ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {parseSelection(value).length > 0 ? (
            parseSelection(value).map((k) => (
              <TagChip key={k} workTypeKey={k} />
            ))
          ) : (
            <span className="text-sm text-gray-300 italic">비어 있음</span>
          )}
        </div>
      ) : !active ? (
        <div className="pt-1 text-sm text-gray-300 italic">비어 있음</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {WORK_TYPES.map((wt) => (
            <TagChip
              key={wt.key}
              workTypeKey={wt.key}
              faded={!draft.has(wt.key)}
              ring={draft.has(wt.key)}
              onClick={() => toggle(wt.key)}
            />
          ))}
          <button
            onClick={handleSubmit}
            disabled={draft.size === 0 || disabled}
            className="rounded bg-[#FF9D00] px-2 py-1 text-xs text-white disabled:opacity-30"
          >
            {disabled ? '검증 중…' : '엔터'}
          </button>
        </div>
      )}
    </div>
  );
}
