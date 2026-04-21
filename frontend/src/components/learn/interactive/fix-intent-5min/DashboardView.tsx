'use client';

import type { ChatLogRow } from '@/data/courses/fix-intent-5min/chat-log-sets';

interface Props {
  title: string;
  setOrder: number;
  totalSets: number;
  rows: ChatLogRow[];
  onRowClick: (row: ChatLogRow) => void;
}

export function DashboardView({ title, setOrder, totalSets, rows, onRowClick }: Props) {
  return (
    <div className="flex flex-col h-full w-full bg-[#0f0f1a] text-gray-100 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-800 bg-[#16162a]">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest">
          Metabase — All chats in table view
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-xs text-gray-500">
            {setOrder}/{totalSets}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          문제가 있는 인텐트의 행을 클릭하세요
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-[#1a1a2e] text-[10px] uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left border-b border-gray-700 font-medium">
                Session ID
              </th>
              <th className="px-4 py-2 text-left border-b border-gray-700 font-medium">
                Created At
              </th>
              <th className="px-4 py-2 text-left border-b border-gray-700 font-medium">
                Intent
              </th>
              <th className="px-4 py-2 text-left border-b border-gray-700 font-medium">
                User:Message
              </th>
              <th className="px-4 py-2 text-left border-b border-gray-700 font-medium">
                Assistant:Contents
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.sessionId}
                onClick={() => onRowClick(row)}
                className={`cursor-pointer transition-colors hover:bg-[#252545] ${
                  idx % 2 === 0 ? 'bg-[#0f0f1a]' : 'bg-[#131324]'
                }`}
              >
                <td className="px-4 py-3 border-b border-gray-800 font-mono text-xs text-gray-400 whitespace-nowrap">
                  {row.sessionId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 border-b border-gray-800 text-xs text-gray-400 whitespace-nowrap">
                  {row.createdAt}
                </td>
                <td className="px-4 py-3 border-b border-gray-800 font-medium text-white whitespace-nowrap">
                  {row.intent}
                </td>
                <td className="px-4 py-3 border-b border-gray-800 text-gray-200 whitespace-nowrap">
                  {row.userMessage}
                </td>
                <td className="px-4 py-3 border-b border-gray-800 text-gray-300 max-w-[320px] truncate">
                  {row.assistantContent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
