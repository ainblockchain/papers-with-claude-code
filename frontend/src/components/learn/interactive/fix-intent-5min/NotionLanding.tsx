'use client';

import { Plus, FileText } from 'lucide-react';

interface Props {
  onCreate: () => void;
}

const MOCK_EXISTING_TASKS = [
  { title: '[출결내규] 공결 세부 절차 미안내', status: 'Done', assignee: '담당자 A' },
  { title: '[학사일정] 중간고사 일정 누락', status: 'In progress', assignee: '담당자 B' },
  { title: '[수강신청] 정정 기간 답변 부정확', status: 'Done', assignee: '담당자 A' },
];

export function NotionLanding({ onCreate }: Props) {
  return (
    <div className="flex flex-col h-full w-full bg-white text-[#37352f] overflow-auto">
      <div className="px-12 pt-10 pb-4 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <FileText className="h-3.5 w-3.5" />
          <span>comcom / Agents & Intents</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">🤖 Agents & Intents</h1>
        <p className="text-sm text-gray-600 mb-8">
          궁금하냥 등 에이전트의 인텐트 이슈를 발굴하고 수정 작업을 추적하는 공간
        </p>

        <div className="border border-gray-200 rounded-md overflow-hidden mb-6">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
            <FileText className="h-3.5 w-3.5" />
            Tasks
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">제목</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EXISTING_TASKS.map((t) => (
                <tr key={t.title} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-[#37352f]">{t.title}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        t.status === 'Done'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{t.assignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />새로 만들기
        </button>
      </div>
    </div>
  );
}
