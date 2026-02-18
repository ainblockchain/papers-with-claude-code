'use client';

import { useState, ReactNode } from 'react';

interface SectionCollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function SectionCollapsible({
  title,
  defaultOpen = false,
  children,
}: SectionCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 px-5 py-3.5 transition-colors"
      >
        <span className="text-white font-semibold text-sm">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="bg-gray-950 p-5 border-t border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}
