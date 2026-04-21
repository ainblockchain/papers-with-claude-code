import type { IntentRow } from '@/lib/courses/fix-intent-5min/course-state';

export interface ChatLogRow extends IntentRow {
  isBroken: boolean;
}

export interface ChatLogSet {
  setId: string;
  title: string;
  rows: ChatLogRow[];
}

// TODO: replace with real data provided by the user. Placeholder only.
export const chatLogSets: ChatLogSet[] = [
  {
    setId: 'set-1',
    title: '세트 1',
    rows: [
      {
        sessionId: '7f731fe4-059e-0000-0000-000000000001',
        createdAt: '4월 8, 2026, 10:06 오전',
        intent: '출결내규',
        userMessage: '공결',
        assistantContent:
          '한양대학교의 출결 내규에 따르면, 총 수업시간의 3분의 2 이상을 출석해야 합니다.',
        isBroken: false,
      },
      {
        sessionId: '7f731fe4-059e-0000-0000-000000000002',
        createdAt: '4월 8, 2026, 10:12 오전',
        intent: '등록금_납부_방법',
        userMessage: '장학금 신청 언제까지야?',
        assistantContent:
          '등록금 납부는 해당 학기 정해진 기간 내에 진행되며, 납부 방법은 다음과 같습니다...',
        isBroken: true,
      },
      {
        sessionId: '7f731fe4-059e-0000-0000-000000000003',
        createdAt: '4월 8, 2026, 10:18 오전',
        intent: '학사일정',
        userMessage: '중간고사 언제야',
        assistantContent:
          '이번 학기 중간고사는 4월 21일부터 4월 27일까지 진행됩니다.',
        isBroken: false,
      },
    ],
  },
];
