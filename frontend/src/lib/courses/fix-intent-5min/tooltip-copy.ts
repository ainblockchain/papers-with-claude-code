import type { GuidancePhase } from './tooltip-guidance';

// One tooltip sentence per quest/phase. Earlier iterations carried a
// `{soft, firm}` pair and swapped copy after the first dismiss; product
// preference is a single unified sentence per quest so the learner sees
// the same guidance no matter how many times the tooltip re-fires.
// Visual escalation (ring thickness in firm tone) still differentiates
// re-fires without changing the wording.
//
// Voice guide (aligned with the 궁금하냥 sibling courses best-intent-worker
// and fix-intent-hands-on):
// - Formal-casual `-주세요 / -하세요` register, no `-냥` cutesy endings.
// - Refers to real UI labels so copy stays honest when the learner looks
//   (e.g. "복사하러가기", "+ 인텐트 행 추가").
export const guidanceCopy: Record<GuidancePhase, string> = {
  dashboard: '문제가 있는 인텐트의 행을 클릭해 주세요',
  'notion-landing': '"새로 만들기" 버튼을 이용해 Task를 새로 만들어주세요',
  'notion-field-agent': 'Agent 필드를 눌러 알맞은 에이전트를 선택하세요',
  'notion-field-title': '제목 칸에 한 줄짜리 이슈 요약을 입력하세요',
  'notion-field-assignee': 'Assignee 드롭다운을 열어 본인을 선택하세요',
  'notion-field-status': '현재 작업의 Status 를 골라주세요',
  'notion-field-season': '지금 진행 중인 Season 을 드롭다운에서 고르세요',
  'notion-field-workType': 'Intent 카탈로그를 참고해 알맞은 수정 유형을 골라주세요 (복수 선택 가능)',
  'notion-field-problemAnalysis-copy':
    '아래 "발견한 이슈 복사하러가기" 버튼으로 발견한 이슈 로그를 가져와주세요',
  'notion-field-problemAnalysis-copy-modal':
    '"전체 복사" 버튼을 눌러 로그를 클립보드에 담아주세요',
  'notion-field-problemAnalysis-submit':
    '붙여넣은 내용을 확인하고 문제 상황 분석을 한 마디 적은 후 제출 버튼을 클릭해 주세요',
  'stage2-solutionDirection': '수정 방향을 한 줄 이상 입력하고 제출하세요',
  'sheet-add-intent-tab':
    '적절한 도메인 탭(일반 / 재무 / 학사 / 국제) 중 이 이슈가 속하는 탭을 골라주세요',
  'sheet-add-intent-row':
    '"+ 인텐트 행 추가" 버튼을 눌러 새 인텐트 행을 만드세요',
  'sheet-field-intent':
    '새 인텐트의 이름을 정해주세요 (예: 출결_공결_시험결석)',
  'sheet-field-leadSentence':
    '이 인텐트로 매칭될 대표 문장을 한 줄 적어주세요',
  'sheet-related-copy':
    '아래 Related Information 의 "복사" 버튼을 눌러 참고 자료를 클립보드에 담아주세요',
  'sheet-field-prompt-paste':
    'Prompt 칸을 클릭해 클립보드 내용을 붙여넣어 주세요',
  'sheet-run-intent-script': 'Custom Scripts 에서 "Update Intent Prompts (dev)" 를 실행하세요',
  'sheet-add-triggers': '인텐트 행 아래 트리거 문장을 두 개 이상 적어주세요',
  'sheet-run-trigger-script': 'Custom Scripts 에서 "Update Intent Triggers (dev)" 를 실행하세요',
  'chatbot-before': '아래 입력창에 Stage 1 에서 본 문제 발화를 입력하고 전송하세요',
  'chatbot-after': '하단 홈 버튼으로 Notion 에 돌아가 결과를 기록하세요',
  'stage4-status': '작업을 마쳤으니 Status 를 Done 으로 변경하세요',
  'stage4-result-load-work':
    '"작업 내역 불러오기" 버튼을 눌러 작업 내역을 자동으로 채워주세요',
  'stage4-result-load-capture':
    '"테스트 결과 불러오기" 버튼을 눌러 Dev 챗봇 응답 캡처를 붙여주세요',
  'stage4-result-submit':
    '결과에 후기를 한 줄 적고 제출 버튼을 눌러 코스를 마무리하세요',
};
