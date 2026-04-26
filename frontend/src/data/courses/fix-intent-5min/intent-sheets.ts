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
}

export const INTENT_ROWS: Record<Exclude<SheetId, 'intent_trigger_sentence'>, IntentRow[]> = {
  일반: [
    {
      id: 'i-1',
      intent: '국가장학금',
      leadSentence: '국가장학금 신청하고 싶어요',
      prompt: `[국가장학금이란]
한국장학재단에서 소득 수준에 따라 지원하는 대표적인 장학금으로, Ⅰ유형(학생직접지원형)과 Ⅱ유형(대학연계지원형)이 있습니다.

[신청 기간]
매 학기 시작 1~2개월 전에 1·2차 신청이 열리며, 기간 내 미신청 시 구제신청이 가능합니다.

[신청 방법]
한국장학재단 홈페이지 또는 모바일 앱에서 공동/금융인증서·간편인증으로 로그인 후 신청합니다. 본인 및 가구원의 소득·재산 조사 동의가 필요합니다.

[관련 링크]
https://www.kosaf.go.kr/ko/scholarShipInfo.do`,
      createdAt: '2026-02-15T09:22:10Z',
    },
    {
      id: 'i-2',
      intent: '교내장학금',
      leadSentence: '성적 장학금은 어떻게 받아요',
      prompt: `[교내장학금 종류]
한양대 교내 장학금에는 성적 우수·가계곤란·근로·특별 장학 등이 있으며, 학기별로 공지에 따라 선발됩니다.

[자격 요건]
성적 우수 장학은 직전 학기 12학점 이상 이수 및 학과별 평점 기준을 충족해야 하고, 가계곤란 장학은 한국장학재단 소득분위 조사 결과를 활용합니다.

[신청 방법]
한양인 포털 > 장학 메뉴에서 학기별 공고를 확인하고 온라인으로 신청서를 제출합니다. 일부 장학은 증빙 서류 업로드가 추가로 필요합니다.`,
      createdAt: '2026-02-20T14:05:33Z',
    },
    {
      id: 'i-3',
      intent: '동아리',
      leadSentence: '동아리 가입 방법 알려줘',
      prompt: `[동아리 종류]
한양대에는 학술·봉사·종교·체육·취미교양·공연예술 6개 분과에 150여 개의 중앙동아리가 있으며, 그 외 단과대·학과 동아리도 별도로 운영됩니다.

[가입 절차]
매 학기 초 3월·9월에 동아리 홍보 박람회와 모집 공고가 진행되며, 각 동아리가 자체 심사 또는 면담을 거쳐 신입 부원을 선발합니다.

[문의]
학생회관 내 동아리연합회 사무실 또는 한양인 포털 > 학생활동 > 동아리 메뉴를 참고해주세요.`,
      createdAt: '2026-02-25T11:48:02Z',
    },
  ],
  재무: [
    {
      id: 'i-4',
      intent: '등록금_납부',
      leadSentence: '등록금 언제까지 내요',
      prompt: `[납부 기간]
매 학기 수강신청 이후 2~3주간 납부 기간이 지정되며, 기간 내 미납 시 제적 처리될 수 있으니 유의해주세요.

[납부 방법]
- 가상계좌: 한양인 포털 > 등록 > 고지서에서 개인 가상계좌 확인 후 이체
- 카드: 지정 카드사를 통한 무이자/유이자 할부 가능
- 은행 창구: 고지서 출력 후 지정 은행에서 납부

[관련 링크]
https://portal.hanyang.ac.kr`,
      createdAt: '2026-03-02T08:17:55Z',
    },
    {
      id: 'i-5',
      intent: '등록금_분납',
      leadSentence: '등록금 나눠서 낼 수 있나요',
      prompt: `[분할 납부 안내]
경제적 부담 완화를 위해 2회·3회·4회 분할 납부를 신청할 수 있습니다.

[신청 방법]
등록 기간 전 한양인 포털 > 등록 > 분할 납부 신청 메뉴에서 원하는 분할 횟수를 선택합니다. 신청 후에는 각 차수별 지정 기간에 맞춰 납부해야 하며, 1회라도 미납 시 분납 자격이 취소될 수 있습니다.

[유의 사항]
대학원생·외국인 유학생·휴복학생은 일부 조건이 다를 수 있으니 학사팀에 확인해주세요.`,
      createdAt: '2026-03-04T16:40:12Z',
    },
    {
      id: 'i-6',
      intent: '학자금_대출',
      leadSentence: '학자금 대출 신청하려면',
      prompt: `[학자금 대출 종류]
한국장학재단에서 두 가지 대출을 운영합니다.
- 취업 후 상환 학자금대출(든든학자금): 졸업 후 연소득 기준을 넘을 때부터 상환
- 일반 상환 학자금대출: 재학 중 이자만 납부하거나 원리금 분할 상환

[신청 자격]
학부·대학원 재학생이면 대부분 신청 가능하나, 직전 학기 12학점 이수·평점 C 이상 등 성적 요건을 충족해야 합니다.

[신청 방법]
한국장학재단 홈페이지에서 학기별 신청 기간에 온라인 접수합니다. 소득분위 산정 결과에 따라 대출 한도가 달라집니다.

[관련 링크]
https://www.kosaf.go.kr`,
      createdAt: '2026-03-08T10:28:41Z',
    },
  ],
  학사: [
    {
      id: 'i-7',
      intent: '재수강',
      leadSentence: '재수강 신청 어떻게 해요',
      prompt: `[재수강 대상]
직전 학기 이전에 이수한 과목 중 일정 등급 이하(학번별 상이, 통상 C+ 이하)를 받은 과목에 한해 재수강이 가능합니다.

[재수강 시 성적 제한]
재수강으로 취득 가능한 최고 학점은 A0로 제한되며, 이전 성적과 비교해 낮은 성적이 폐기됩니다. 재수강 기록은 성적증명서에 남습니다.

[신청 기간·방법]
일반 수강신청 기간 내에 수강신청 사이트에서 재수강 여부를 체크하여 신청합니다.

[관련 링크]
https://portal.hanyang.ac.kr/sugang/`,
      createdAt: '2026-03-10T01:15:45Z',
    },
    {
      id: 'i-8',
      intent: '수강신청',
      leadSentence: '수강신청 언제예요',
      prompt: `[수강신청 일정]
매 학기 수강신청은 다음 순서로 진행됩니다.
- 예비 수강신청: 본 수강신청 1~2주 전, 과목 담기 용도
- 본 수강신청: 학년별 지정 일자에 진행
- 수강 정정 기간: 개강 후 약 1주 이내

[접속 방법]
수강신청 사이트에 로그인 후 학기별 일정에 따라 신청합니다. 서버 부하 방지를 위해 시간대별 동시 접속 제한이 적용됩니다.

[관련 링크]
https://portal.hanyang.ac.kr/sugang/`,
      createdAt: '2026-03-12T13:33:08Z',
    },
    {
      id: 'i-9',
      intent: '출결내규',
      leadSentence: '공결 신청 방법',
      prompt: `[출석 인정 기준]
강의일수의 3분의 2 이상 출석한 경우에만 성적을 인정하며, 이에 미달 시 F 처리됩니다.

[공결 처리]
다음 사유는 공식 증빙 제출 시 출석으로 인정됩니다.
- 질병: 진단서·처방전 등 (사유 발생 후 빠른 시일 내 담당 교수에게 제출)
- 경조사: 본인·직계가족 경조사 증빙
- 학교 공식 행사 참석: 학과/본부 공문

[지각·결석]
통상 지각 3회를 결석 1회로 계산하며, 세부 기준은 담당 교수 재량입니다.`,
      createdAt: '2026-03-14T07:52:19Z',
    },
    {
      id: 'i-10',
      intent: '학사일정',
      leadSentence: '이번 학기 학사일정',
      prompt: `[학기 주요 일정]
- 3월/9월: 개강
- 4월/10월: 중간고사 (통상 8주차 전후)
- 6월/12월: 기말고사 (통상 15~16주차)
- 6월 말·12월 말: 종강 및 방학 시작

[학사일정 조회]
정확한 일자는 매 학기 초에 공지되는 학사 캘린더를 참고해주세요. 한양인 포털 메인 화면 및 학사팀 공지사항에서 확인할 수 있습니다.`,
      createdAt: '2026-03-16T19:04:57Z',
    },
  ],
  국제: [
    {
      id: 'i-11',
      intent: '교환학생',
      leadSentence: '교환학생 어떻게 지원해요',
      prompt: `[교환학생 프로그램]
한양대 국제처를 통해 전 세계 자매결연 대학에 교환학생으로 파견될 수 있습니다.

[지원 자격]
- 학부 2학기 이상 이수 (출발 시점 기준)
- 평점 평균 3.0 이상 (학교별로 3.3 이상을 요구하기도 함)
- 어학 성적: TOEFL iBT 80 / IELTS 6.0 / TOEIC 800 등 파견 대학별 요건 상이

[선발 절차]
국제처 홈페이지 지원서 제출 → 서류 심사 → 면접 → 최종 선발 → 파견 대학 배정

[관련 링크]
https://oia.hanyang.ac.kr`,
      createdAt: '2026-03-18T22:17:30Z',
    },
    {
      id: 'i-12',
      intent: '외국인유학생',
      leadSentence: '외국인 입학 요건',
      prompt: `[입학 자격]
부모 모두 외국 국적인 자 또는 외국에서 초·중·고 전 교육과정을 이수한 자가 해당됩니다.

[제출 서류]
- 고교 졸업·성적증명서 (아포스티유 또는 공증)
- 한국어: TOPIK 3급 이상 (일부 학과 4급 이상)
- 영어 학과 지원 시: TOEFL iBT 80 / IELTS 5.5 이상
- 재정 능력 증빙 (은행 잔고 증명 등)

[문의]
한양대 국제처 외국인 유학생팀에서 전형별 상세 요강을 안내받을 수 있습니다.`,
      createdAt: '2026-03-20T05:29:44Z',
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
