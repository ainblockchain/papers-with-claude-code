'use client';

import { useState } from 'react';

interface Props {
  label: string;
  options: string[];
  active: boolean;
  filled: boolean;
  disabled?: boolean;
  value: string | null;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

export function DropdownField({
  label,
  options,
  active,
  filled,
  disabled,
  value,
  placeholder,
  onSubmit,
}: Props) {
  const [draft, setDraft] = useState<string>('');

  return (
    <div className="flex items-center gap-4 py-1.5">
      <div className="w-28 text-sm text-gray-500 shrink-0">{label}</div>
      {filled ? (
        <div className="text-sm text-[#37352f] px-2 py-1 bg-gray-100 rounded">
          {value}
        </div>
      ) : !active ? (
        <div className="text-sm text-gray-300 italic">{placeholder ?? '비어 있음'}</div>
      ) : (
        <>
          <select
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' && draft) onSubmit(draft);
            }}
            className="bg-white border border-[#FF9D00] rounded px-2 py-1 text-sm text-[#37352f] outline-none focus:ring-2 focus:ring-[#FF9D00]/40"
          >
            <option value="" disabled>
              {placeholder ?? '선택하세요'}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            onClick={() => !disabled && draft && onSubmit(draft)}
            disabled={!draft || disabled}
            className="px-2 py-1 bg-[#FF9D00] disabled:opacity-30 text-white rounded text-xs"
          >
            {disabled ? '검증 중…' : '엔터'}
          </button>
        </>
      )}
    </div>
  );
}
