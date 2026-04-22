// Static intent catalog used by BOTH
//   - Stage 1's "인텐트 목록 확인" modal (read-only surfacing when the
//     learner lands on the Work Type field)
//   - Stage 3's Google-Sheets clone (editable, the learner tweaks rows)
// so they read the exact same table throughout the course.
//
// The catalog deliberately omits anything about 공결/결시/시험 못 봄.
// This is a *simulated* world where "시험 결시" is genuinely a new
// topic — that's what lets "New Intent + Add Triggering Sentence"
// read as the correct fix when the learner submits Work Type.

export type IntentCategory = '일반' | '재무' | '학사' | '국제';

export interface IntentRow {
  category: IntentCategory;
  intent: string;
  representativeSentence: string;
  prompt: string;
  createdAt: string;
  note?: string;
}

export interface TriggerSentence {
  intent: string;
  sentence: string;
  column1?: string;
}

// ---------------------------------------------------------------------------
// INTENT_CATALOG — 4 categories × 2 rows
// ---------------------------------------------------------------------------

export const INTENT_CATALOG: IntentRow[] = [
  // ─── 일반 ────────────────────────────────────────────────────────────
  {
    category: '일반',
    intent: '학과 취업정보 문의',
    representativeSentence: '어느 학과가 대학졸업 이후 취직이 잘돼?',
    prompt: `"취업이 잘되는 학과"에 대한 질문은
대학별·학과별로 취업률, 업종 분포, 진학·자격증 여부 등
여러 요소를 함께 고려해 보는 것이 좋습니다.

한양대학교의 경우 졸업생 취업 현황과 관련한
공식 통계 및 자료를 매년 공개하고 있으며,
취업 및 진로 관련 공식 정보는 커리어개발팀 홈페이지에서 확인할 수 있습니다.

커리어개발팀:
https://cdp.hanyang.ac.kr/

또한, 학과별 진로 방향이나 주요 취업 분야는
각 학과 안내 페이지에 더 자세히 소개되어 있는 경우가 많습니다.

궁금한 특정 학과가 있다면
학과 이름을 말씀해 주시면 안내해 드릴게요!`,
    createdAt: '2026-03-10T01:15:45Z',
  },
  {
    category: '일반',
    intent: '학생식당 메뉴',
    representativeSentence: '오늘 학식 메뉴 뭐야?',
    prompt: `한양대학교 서울캠퍼스의 학생식당 메뉴는 매일 아래 경로에서 확인할 수 있습니다.

**학생식당 위치**
- 제1학생식당(학생회관 지하 1층)
- 제2학생식당(생활과학관 지하 1층)
- 교직원식당(신본관 지하 1층) — 재학생도 이용 가능

**메뉴 확인**
- HY-in 포털 → 생활편의 → 학생식당 메뉴
- 또는 [복지회 홈페이지](https://welfare.hanyang.ac.kr/) '식단 안내'

에리카캠퍼스의 경우 학생생활관(기숙사) 식당과 제1학생식당 운영 일정·메뉴는
[에리카 복지회 홈페이지](https://erica-welfare.hanyang.ac.kr/)에서 확인하실 수 있어요.

특정 요일·특정 식당 메뉴가 궁금하시면 말씀해 주세요!`,
    createdAt: '2026-03-15T08:02:11Z',
  },

  // ─── 재무 ────────────────────────────────────────────────────────────
  {
    category: '재무',
    intent: '등록금 납부 기간',
    representativeSentence: '등록금 납부 기간',
    prompt: `**[등록금 납부 기간 안내]**

**1. 재학생 등록금 납부 기간**

2026년 1학기 재학생 등록은 2월 25일 ~ 3월 3일 입니다. 추가등록기간은 3월 10일 ~ 3월 13일 입니다.

매학기 학기 개시월 10일전 무렵으로 예상하시면 됩니다. (1학기는 2월 20일 전후 ~ 2월 27일 전후, 2학기는 8월 20일 전후 ~ 8월 27일 전후) 정해진 등록기간 외에는 등록이 불가하기 때문에 일정을 미리 확인하시기 바랍니다. (1학기 재학생 등록안내는 1월 중, 2학기는 7월 중 한양대학교 재학생 등록안내 공지(주요알림) 됨)

---

**2. 2026학년도 신/편입생 등록금 납부 기간**

신/편입생의 등록금 납부 기간은 캠퍼스 및 대학/대학원별로 상이하니, 합격자 유의사항 등을 확인하시기 바랍니다.

**유의사항:**

- 기간 내에 납부하지 않을 경우 합격이 취소됩니다.
- 전자문서 등록 후 최종등록금을 지정된 기간 내에 등록하지 않았을 경우 등록할 의사가 없는 것으로 간주하여 별도의 통보 없이 등록포기자로 처리됩니다.
- 신한은행 이외의 타 금융기관에서도 무통장 입금(타행환 입금)으로 등록 가능하나 별도의 타행 송금 수수료가 부과됩니다. (단, 전액장학생("0"원)은 신한은행에서만 등록이 가능)`,
    createdAt: '2026-03-10T01:15:45Z',
  },
  {
    category: '재무',
    intent: '장학금 신청 방법',
    representativeSentence: '장학금 어떻게 신청해요?',
    prompt: `한양대학교 장학금 신청은 **교내 장학금**과 **교외(국가) 장학금**으로 나뉩니다.

**1. 교내 장학금**
- HY-in 포털 로그인
- [등록·장학] → [장학 신청] 메뉴 선택
- 장학 종류를 확인 후 신청 기간 내 제출

주요 교내 장학금: 성적우수장학, 가계곤란장학, 교내근로장학, 학과특성장학 등

**2. 국가 장학금**
- 한국장학재단 홈페이지(www.kosaf.go.kr)에서 신청
- 신청 기간: 1학기는 전년도 11월 ~ 당해 3월, 2학기는 5월 ~ 9월 (재단 공지 기준)
- 학자금대출, 근로장학, 다자녀 국가장학 등 다양한 프로그램 운영

**3. 문의**
- 서울캠퍼스 장학복지팀: 02-2220-1024
- 에리카캠퍼스 학생지원팀: 031-400-5061

원하시는 장학금 종류를 알려주시면 더 자세히 안내해 드릴게요.`,
    createdAt: '2026-03-05T09:40:22Z',
  },

  // ─── 학사 ────────────────────────────────────────────────────────────
  {
    category: '학사',
    intent: 'P/F 과목 수강제한',
    representativeSentence: 'P/F 과목 몇 학점까지 들을 수 있어요?',
    prompt: `서울캠퍼스의 경우, 학기 당 최대 1강좌만 수강 가능하나 사회봉사, 공과대학 실용공학연구는 수강강좌 수 제한에서 제외됩니다.
※ P/F과목 신청제한 제외 과목 : 교양필수 사랑의실천1(한양나눔), 사랑의실천2(스마트커뮤니케이션), 사랑의실천3(기업가정신), 사랑의실천4(미래실용인재) 등
자세한 내용은 아래 링크를 통해 확인하시길 바랍니다.
서울캠퍼스: https://portal.hanyang.ac.kr/sugang/sulg.do

에리카캠퍼스의 경우, 학기 당 최대 2강좌만 수강 가능하나 사회봉사 및 일부 교양필수 교과목은 수강강좌 수 제한에서 제외됩니다.
※ P/F과목 신청제한 제외 과목 : 소프트웨어의이해, IC-PBL과비전설계, IC-PBL과취창업을위한진로탐색, IC-PBL과역량계발, 취업진로세미나, AI리터러시, ESG와SDGs이해, LIONS융합특강 등
자세한 내용은 아래 링크를 통해 확인하시길 바랍니다.
에리카캠퍼스: https://erica.hanyang.ac.kr/web/ehaksa/p/f-`,
    createdAt: '2026-03-10T01:15:45Z',
  },
  {
    category: '학사',
    intent: '수강신청 기간',
    representativeSentence: '이번 학기 수강신청 언제 시작해요?',
    prompt: `수강신청은 **본 수강신청 기간** → **수강신청 확인 및 변경 기간** → **수업 시작 후 정정 기간** 순으로 진행됩니다.

**2026학년도 1학기 주요 일정 (서울캠퍼스 기준)**

- 본 수강신청: 2월 10일(화) ~ 2월 13일(금)
- 수강신청 확인 및 변경: 2월 17일(화) ~ 2월 20일(금)
- 개강: 3월 2일(월)
- 정정 기간: 3월 2일(월) ~ 3월 6일(금) — 이 기간에 폐강·수강 취소 처리

**학년별 수강신청 시작 시간**
본 수강신청은 학년별 시차제로 진행됩니다.
- 4학년/대학원: 첫날 오전 9시
- 3학년: 오전 10시
- 2학년: 오전 11시
- 1학년: 오후 2시
(연도·학기별로 변경될 수 있으므로 학사팀 공지 필수 확인)

**에리카캠퍼스**는 별도 일정으로 진행되므로 ERICA 학사 공지사항을 참고하세요.

수강 관련 포털: https://portal.hanyang.ac.kr/sugang/`,
    createdAt: '2026-02-05T14:21:09Z',
  },

  // ─── 국제 ────────────────────────────────────────────────────────────
  {
    category: '국제',
    intent: '교환학생',
    representativeSentence: '교환 유학이 뭐에요?',
    prompt: `파견교환학생 프로그램은 본교에 등록금을 납부하고, 교류협정을 체결한 해외 대학에 일정 기간동안 파견되어 수학하는 프로그램입니다. 파견 기간 중 이수한 학점은 귀국 후 본교 학점으로 인정받을 수 있습니다.
파견교환학생은 아래의 사항에 해당하는 대학으로만 파견이 가능합니다.
1. 본교와 자매결연을 체결한 해외 대학
2. 매 학기 자매결연 대학과의 학생교환 현황을 파악하여 그 수가 균형을 이루고 있는 해외 대학

보다 더 자세한 내용은 아래 홈페이지 내용을 참고해주세요.

서울캠퍼스 교환학생 안내: https://oia.hanyang.ac.kr/exchangeout
에리카캠퍼스 교환학생 안내: https://global.hanyang.ac.kr/s2/s2_1_1.php`,
    createdAt: '2026-03-10T01:15:45Z',
  },
  {
    category: '국제',
    intent: '복수학위',
    representativeSentence: '해외 대학 복수학위 제도 있어?',
    prompt: `한양대학교는 해외 자매결연 대학과 **복수학위(Dual Degree) 프로그램**을 운영하고 있습니다. 재학 중 본교와 해외 대학에서 각각 일정 기간 수학하여 두 학위를 동시에 취득할 수 있는 제도입니다.

**주요 유형**
- 학부 복수학위(2+2, 3+1 등 대학별 상이)
- 대학원 복수학위(일반 전공·MBA 등)

**신청 조건 (일반적)**
- 일정 학점 이수 및 평점 평균 기준 충족
- 어학 성적(TOEFL/IELTS 등) 기준 충족
- 전공에 따라 학과 내부 심사 별도

**확인 경로**
- 서울캠퍼스 국제처: https://oia.hanyang.ac.kr/
- 에리카캠퍼스 국제협력팀: https://global.hanyang.ac.kr/
- 각 단과대학·대학원 홈페이지 공지사항

복수학위는 파견 대학과 전공 조합에 따라 요건이 달라지므로, 관심 있는 대학·전공을 알려주시면 더 구체적으로 안내해 드릴게요.`,
    createdAt: '2026-02-28T10:48:33Z',
  },
];

// ---------------------------------------------------------------------------
// TRIGGER_SENTENCES — 3~5 per intent, matching the table shape the learner
// will see on Stage 3's `intent_trigger_sentence` tab (Intent, Sentence,
// Column1). Mixing formal and casual wordings so learners can see how one
// label catches different phrasings.
// ---------------------------------------------------------------------------

export const TRIGGER_SENTENCES: TriggerSentence[] = [
  // 학과 취업정보 문의
  { intent: '학과 취업정보 문의', sentence: '어느 학과가 대학졸업 이후 취직이 잘돼?' },
  { intent: '학과 취업정보 문의', sentence: '한양대에서 취업률 높은 학과 알려줘' },
  { intent: '학과 취업정보 문의', sentence: '공대 졸업생들은 주로 어디 취업해요?' },
  { intent: '학과 취업정보 문의', sentence: '문과도 취업 잘되는 과 있나요?' },

  // 학생식당 메뉴
  { intent: '학생식당 메뉴', sentence: '오늘 학식 뭐 나와?' },
  { intent: '학생식당 메뉴', sentence: '이번 주 학생회관 식당 메뉴 알려줘' },
  { intent: '학생식당 메뉴', sentence: '교직원 식당도 학생이 이용할 수 있어요?' },
  { intent: '학생식당 메뉴', sentence: '학식 몇 시부터 해요?' },

  // 등록금 납부 기간
  { intent: '등록금 납부 기간', sentence: '등록금 언제까지 내야 돼?' },
  { intent: '등록금 납부 기간', sentence: '이번 학기 등록 기간 알려줘' },
  { intent: '등록금 납부 기간', sentence: '신입생인데 등록금 납부 일정이 어떻게 되나요?' },
  { intent: '등록금 납부 기간', sentence: '추가 등록 기간도 있어요?' },
  { intent: '등록금 납부 기간', sentence: '등록금 기간 지나면 어떻게 되죠?' },

  // 장학금 신청 방법
  { intent: '장학금 신청 방법', sentence: '장학금 어떻게 신청해요?' },
  { intent: '장학금 신청 방법', sentence: '국가장학금이랑 교내장학금 차이가 뭐야?' },
  { intent: '장학금 신청 방법', sentence: '포털에서 장학금 신청 메뉴가 어디 있어요?' },
  { intent: '장학금 신청 방법', sentence: '성적우수장학은 따로 신청해야 하나요?' },

  // P/F 과목 수강제한
  { intent: 'P/F 과목 수강제한', sentence: 'P/F 과목 몇 학점까지 들을 수 있어요?' },
  { intent: 'P/F 과목 수강제한', sentence: '한 학기에 PF 수업 몇 개 까지 돼?' },
  { intent: 'P/F 과목 수강제한', sentence: 'pass/fail 과목 제한 기준 알려줘' },
  { intent: 'P/F 과목 수강제한', sentence: '사회봉사도 P/F 제한에 포함되나요?' },

  // 수강신청 기간
  { intent: '수강신청 기간', sentence: '이번 학기 수강신청 언제 시작해?' },
  { intent: '수강신청 기간', sentence: '수강신청 정정 기간은 며칠이야?' },
  { intent: '수강신청 기간', sentence: '학년별로 수강신청 시간 다르다고 들었어요' },
  { intent: '수강신청 기간', sentence: '수강신청 변경 기간에 과목 바꿀 수 있나요?' },

  // 교환학생
  { intent: '교환학생', sentence: '교환 유학이 뭐에요?' },
  { intent: '교환학생', sentence: '교환학생 지원 조건 좀 알려줘' },
  { intent: '교환학생', sentence: '교환학생으로 갔다 온 학점 인정되나요?' },
  { intent: '교환학생', sentence: '어느 나라로 갈 수 있어요?' },

  // 복수학위
  { intent: '복수학위', sentence: '해외 대학 복수학위 제도 있어?' },
  { intent: '복수학위', sentence: '복수학위 2+2 프로그램 자세히 알려주세요' },
  { intent: '복수학위', sentence: '대학원 복수학위 신청 조건은 어떻게 돼요?' },
  { intent: '복수학위', sentence: 'dual degree 신청하려면 어학 성적 얼마나 필요해?' },
];
