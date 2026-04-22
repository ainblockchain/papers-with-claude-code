// Sheet structure mirrors the authoritative Hanyang intent-guide courses:
// - tab1 `intent_trigger_sentence` holds trigger sentences
// - tab2~5 are per-category intent definitions
// The 학사 (tab4) sheet is the correct target for exam-absence cases.

export type SheetId =
  | 'intent_trigger_sentence'
  | '일반'
  | '재무'
  | '학사'
  | '국제';

export const SHEET_ORDER: SheetId[] = [
  'intent_trigger_sentence',
  '일반',
  '재무',
  '학사',
  '국제',
];

export const SHEET_DESCRIPTIONS: Record<SheetId, string> = {
  intent_trigger_sentence: '인텐트 매칭에 쓰이는 트리거 문장 모음',
  일반: '다른 카테고리에 들지 않는 일반 주제 (장학금·동아리 등)',
  재무: '등록금 납부·분납·학자금 대출 등 재무 관련',
  학사: '시험·휴학·복학·학사규정·학사일정 등 학사 관련',
  국제: '교환학생·외국인 유학생 등 국제 관련',
};

// The correct sheet for the 시험 결시/병결 scenario.
export const CORRECT_INTENT_SHEET_ID: SheetId = '학사';

export interface TriggerRow {
  id: string;
  intent: string;
  sentence: string;
}

export interface IntentRow {
  id: string;
  intent: string;
  leadSentence: string;
  prompt: string;
  createdAt: string; // ISO 8601 UTC, e.g. "2026-03-10T01:15:45Z"
  isPush: string;
}

export const INTENT_ROWS: Record<Exclude<SheetId, 'intent_trigger_sentence'>, IntentRow[]> = {
  일반: [
    {
      id: 'i-1',
      intent: '국가장학금',
      leadSentence: '국가장학금 신청하고 싶어요',
      prompt:
        '한국장학재단에서 신청하는 국가장학금의 종류(Ⅰ유형·Ⅱ유형)와 신청 기간·절차·필요 서류를 안내해주세요.',
      createdAt: '2026-02-15T09:22:10Z',
      isPush: 'Y',
    },
    {
      id: 'i-2',
      intent: '교내장학금',
      leadSentence: '성적 장학금은 어떻게 받아요',
      prompt:
        '한양대 교내 장학금(성적·가계곤란·근로 등) 종류별 자격 요건과 신청 방법을 안내해주세요.',
      createdAt: '2026-02-20T14:05:33Z',
      isPush: 'Y',
    },
    {
      id: 'i-3',
      intent: '동아리',
      leadSentence: '동아리 가입 방법 알려줘',
      prompt: '한양대 동아리 종류와 가입 절차, 모집 시기를 안내해주세요.',
      createdAt: '2026-02-25T11:48:02Z',
      isPush: 'Y',
    },
  ],
  재무: [
    {
      id: 'i-4',
      intent: '등록금_납부',
      leadSentence: '등록금 언제까지 내요',
      prompt:
        '한양대 등록금 납부 기간과 납부 방법(계좌이체·가상계좌·카드)을 안내해주세요.',
      createdAt: '2026-03-02T08:17:55Z',
      isPush: 'Y',
    },
    {
      id: 'i-5',
      intent: '등록금_분납',
      leadSentence: '등록금 나눠서 낼 수 있나요',
      prompt: '한양대 등록금 분할 납부(2회/3회) 신청 방법과 기간을 안내해주세요.',
      createdAt: '2026-03-04T16:40:12Z',
      isPush: 'Y',
    },
    {
      id: 'i-6',
      intent: '학자금_대출',
      leadSentence: '학자금 대출 신청하려면',
      prompt:
        '한국장학재단 학자금 대출(일반·든든학자금) 종류별 차이와 신청 절차를 안내해주세요.',
      createdAt: '2026-03-08T10:28:41Z',
      isPush: 'Y',
    },
  ],
  학사: [
    {
      id: 'i-7',
      intent: '재수강',
      leadSentence: '재수강 신청 어떻게 해요',
      prompt:
        '한양대 재수강 신청 기간과 대상 과목 조건(이수 성적 등)을 안내해주세요.',
      createdAt: '2026-03-10T01:15:45Z',
      isPush: 'Y',
    },
    {
      id: 'i-8',
      intent: '수강신청',
      leadSentence: '수강신청 언제예요',
      prompt:
        '한양대 수강신청 일정(예비·본·정정)과 포털 접속 방법을 안내해주세요.',
      createdAt: '2026-03-12T13:33:08Z',
      isPush: 'Y',
    },
    {
      id: 'i-9',
      intent: '출결내규',
      leadSentence: '공결 신청 방법',
      prompt:
        '한양대 출결 관련 내규와 공결·지각·결석 처리 절차를 안내해주세요.',
      createdAt: '2026-03-14T07:52:19Z',
      isPush: 'Y',
    },
    {
      id: 'i-10',
      intent: '학사일정',
      leadSentence: '이번 학기 학사일정',
      prompt:
        '한양대 학기별 주요 학사일정(개강·중간고사·기말고사·종강·방학)을 안내해주세요.',
      createdAt: '2026-03-16T19:04:57Z',
      isPush: 'Y',
    },
  ],
  국제: [
    {
      id: 'i-11',
      intent: '교환학생',
      leadSentence: '교환학생 어떻게 지원해요',
      prompt:
        '한양대 교환학생 프로그램 지원 자격·선발 절차·주요 파견 대학을 안내해주세요.',
      createdAt: '2026-03-18T22:17:30Z',
      isPush: 'Y',
    },
    {
      id: 'i-12',
      intent: '외국인유학생',
      leadSentence: '외국인 입학 요건',
      prompt:
        '한양대 외국인 유학생 입학 자격과 제출 서류(성적·어학 등)를 안내해주세요.',
      createdAt: '2026-03-20T05:29:44Z',
      isPush: 'Y',
    },
  ],
};

// 10 sample trigger sentences across existing intents.
export const TRIGGER_ROWS: TriggerRow[] = [
  { id: 't-1', intent: '국가장학금', sentence: '국가장학금 신청하고 싶어요' },
  { id: 't-2', intent: '국가장학금', sentence: '국가장학금 언제까지 신청해야 해' },
  { id: 't-3', intent: '동아리', sentence: '동아리 어떻게 들어가' },
  { id: 't-4', intent: '등록금_납부', sentence: '등록금 언제 내요' },
  { id: 't-5', intent: '등록금_분납', sentence: '등록금 분할 납부 되나요' },
  { id: 't-6', intent: '재수강', sentence: '재수강 신청 방법' },
  { id: 't-7', intent: '수강신청', sentence: '수강신청 언제부터야' },
  { id: 't-8', intent: '출결내규', sentence: '공결 신청하려면 어떻게' },
  { id: 't-9', intent: '교환학생', sentence: '교환학생 어디 갈 수 있어' },
  { id: 't-10', intent: '학사일정', sentence: '이번 학기 학사일정' },
];
