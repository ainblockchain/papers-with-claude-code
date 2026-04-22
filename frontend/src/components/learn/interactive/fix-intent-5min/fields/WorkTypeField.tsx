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
  ring,
}: {
  workTypeKey: WorkTypeKey;
  ring?: boolean;
}) {
  const wt = WORK_TYPES.find((w) => w.key === workTypeKey);
  if (!wt) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-[12px] leading-[18px] ${
        ring ? 'ring-2 ring-[#FF9D00]/60 ring-offset-1' : ''
      }`}
      style={{ background: wt.bg, color: wt.text }}
    >
      {wt.label}
    </span>
  );
}

// Small Notion-style drag handle ⋮⋮ drawn with two dot-columns; purely
// decorative here, there's no actual reordering in the simulation.
function DragHandle() {
  return (
    <span
      aria-hidden="true"
      className="grid grid-cols-2 gap-[2px] text-[rgba(55,53,47,0.28)]"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="h-[2px] w-[2px] rounded-full bg-current" />
      ))}
    </span>
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
  const [search, setSearch] = useState('');

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

  if (filled) {
    return (
      <div className="flex items-start gap-3 py-1.5">
        {label ? (
          <div className="w-28 shrink-0 pt-1 text-sm text-gray-500">{label}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {parseSelection(value).length > 0 ? (
            parseSelection(value).map((k) => (
              <TagChip key={k} workTypeKey={k} />
            ))
          ) : (
            <span className="text-sm text-gray-300 italic">비어 있음</span>
          )}
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex items-start gap-3 py-1.5">
        {label ? (
          <div className="w-28 shrink-0 pt-1 text-sm text-gray-500">{label}</div>
        ) : null}
        <div className="pt-1 text-sm text-gray-300 italic">비어 있음</div>
      </div>
    );
  }

  // Active — Notion-style multi-select popover anchored to the parent
  // PropertyChip (which must set position: relative). In-cell shows just
  // the current draft chips; all real selection UI lives in the popover.
  const filtered = WORK_TYPES.filter((w) =>
    w.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <>
      {/* In-cell display of the running draft. */}
      <div className="flex flex-wrap items-center gap-1">
        {draft.size === 0 ? (
          <span className="text-[13px] italic text-[rgba(55,53,47,0.35)]">
            옵션 선택 중…
          </span>
        ) : (
          WORK_TYPES.filter((w) => draft.has(w.key)).map((w) => (
            <TagChip key={w.key} workTypeKey={w.key} />
          ))
        )}
      </div>

      {/* Popover. Anchored to the nearest positioned ancestor — the wrapper
          <div className="relative"> around the Work Type PropertyChip in
          NotionTaskPage.

          Enter is captured at the popover level and routed to submit, so
          pressing Enter while focus is on an option button does NOT trigger
          that button's click (which would just toggle the tag). Space still
          toggles via the browser's default button activation. */}
      <div
        className="absolute left-0 top-full z-20 mt-1 w-[320px] rounded-md border border-[rgba(55,53,47,0.16)] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled && draft.size > 0) handleSubmit();
          }
        }}
      >
        <div className="border-b border-[rgba(55,53,47,0.08)] px-3 py-2">
          <input
            autoFocus
            type="text"
            placeholder="옵션 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-[13px] text-[#37352f] outline-none placeholder:text-[rgba(55,53,47,0.35)]"
          />
        </div>
        <div className="px-3 pt-2 pb-1 text-[11px] text-[rgba(55,53,47,0.5)]">
          옵션 선택 또는 생성
        </div>
        <div className="max-h-[260px] overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-[rgba(55,53,47,0.5)]">
              일치하는 옵션이 없어요.
            </div>
          ) : (
            filtered.map((wt) => (
              <button
                key={wt.key}
                type="button"
                onClick={() => toggle(wt.key)}
                disabled={disabled}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-[rgba(55,53,47,0.04)]"
              >
                <DragHandle />
                <TagChip workTypeKey={wt.key} ring={draft.has(wt.key)} />
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[rgba(55,53,47,0.08)] px-3 py-2">
          <span className="text-[11px] text-[rgba(55,53,47,0.45)]">
            {draft.size > 0 ? `${draft.size}개 선택됨` : '아직 선택 없음'}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={draft.size === 0 || disabled}
            className="rounded bg-[#FF9D00] px-2 py-1 text-xs text-white disabled:opacity-30"
          >
            {disabled ? '검증 중…' : '엔터'}
          </button>
        </div>
      </div>
    </>
  );
}
