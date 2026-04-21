'use client';

import { useState } from 'react';

interface Props {
  active: boolean;
  filled: boolean;
  disabled?: boolean;
  value: string | null;
  placeholder?: string;
  onSubmit: (value: string) => void;
}

export function TitleField({ active, filled, disabled, value, placeholder, onSubmit }: Props) {
  const [draft, setDraft] = useState('');

  if (filled) {
    return (
      <h1 className="text-3xl font-bold text-[#37352f] mb-4 px-12 pt-10">{value}</h1>
    );
  }

  if (!active) {
    return (
      <h1 className="text-3xl font-bold text-gray-300 mb-4 px-12 pt-10">
        {placeholder ?? '제목 없음'}
      </h1>
    );
  }

  return (
    <div className="px-12 pt-10 mb-4">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' && draft.trim()) onSubmit(draft.trim());
        }}
        placeholder={placeholder ?? '제목을 입력하고 엔터'}
        className="w-full text-3xl font-bold text-[#37352f] bg-transparent border-b-2 border-[#FF9D00] outline-none placeholder:text-gray-300"
      />
      <div className="text-[11px] text-gray-400 mt-1">
        {disabled ? '검증 중…' : '엔터로 제출'}
      </div>
    </div>
  );
}
