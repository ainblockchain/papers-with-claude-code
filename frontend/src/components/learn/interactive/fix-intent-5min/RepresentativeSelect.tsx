'use client';

import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

interface Props {
  selected: SelectedIntent[];
  onPick: (intent: SelectedIntent) => void;
}

export function RepresentativeSelect({ selected, onPick }: Props) {
  return (
    <div className="flex flex-col h-full w-full bg-[#0f0f1a] text-gray-100 overflow-auto">
      <div className="px-6 py-4 border-b border-gray-800 bg-[#16162a]">
        <div className="text-lg font-semibold text-white">대표 인텐트 선택</div>
        <div className="text-xs text-gray-500 mt-1">
          찾아낸 인텐트 중 노션 Task로 기록할 대표 1개를 선택하세요.
        </div>
      </div>
      <div className="flex-1 p-6 space-y-3">
        {selected.map((item) => (
          <button
            key={item.setId}
            onClick={() => onPick(item)}
            className="w-full text-left p-4 bg-[#16162a] border border-gray-700 rounded-lg hover:border-[#059669] hover:bg-[#1a1a2e] transition-colors"
          >
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              {item.setId}
            </div>
            <div className="text-sm font-semibold text-white mb-1">{item.row.intent}</div>
            <div className="text-xs text-gray-400">
              <span className="text-gray-500">User:</span> {item.row.userMessage}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
