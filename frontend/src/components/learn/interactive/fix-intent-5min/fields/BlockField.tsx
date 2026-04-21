'use client';

import { useState } from 'react';

interface Props {
  heading: string;
  active: boolean;
  filled: boolean;
  disabled?: boolean;
  value: string | null;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

export function BlockField({
  heading,
  active,
  filled,
  disabled,
  value,
  placeholder,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState('');

  return (
    <div className="px-12 py-4">
      <h2 className="text-xl font-semibold text-[#37352f] mb-2">{heading}</h2>
      {filled ? (
        <div className="text-sm text-[#37352f] whitespace-pre-wrap">{value}</div>
      ) : !active ? (
        <div className="text-sm text-gray-300 italic">
          {placeholder ?? '이 스테이지에서 작성합니다.'}
        </div>
      ) : (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft.trim()) {
                onSubmit(draft.trim());
              }
            }}
            placeholder={placeholder}
            rows={5}
            className="w-full bg-white border border-[#FF9D00] rounded px-3 py-2 text-sm text-[#37352f] outline-none focus:ring-2 focus:ring-[#FF9D00]/40 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <div className="text-[11px] text-gray-400">
              {disabled ? '검증 중…' : 'Cmd/Ctrl + Enter로 제출'}
            </div>
            <button
              onClick={() => !disabled && draft.trim() && onSubmit(draft.trim())}
              disabled={!draft.trim() || disabled}
              className="px-3 py-1 bg-[#FF9D00] disabled:opacity-30 text-white rounded text-xs"
            >
              {disabled ? '검증 중…' : '제출'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
