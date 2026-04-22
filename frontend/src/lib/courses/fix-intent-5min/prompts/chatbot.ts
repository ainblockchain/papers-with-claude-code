import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

// Builds the prompt that decides whether the Stage-4 chatbot test
// message is on-topic for the intent the learner just fixed
// (시험 결시 / 병결 처리). Intentionally lenient — typos, casual
// wording, and close paraphrases should all pass.
export function buildChatbotTopicPrompt(
  rep: SelectedIntent | null,
  question: string,
): { instructions: string; input: string } {
  const brokenUser = rep?.row.userMessage ?? '(없음)';
  const brokenIntent = rep?.row.intent ?? '(없음)';

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 방금 인텐트 오분류를 수정한 뒤, Dev 챗봇에 질문을 직접 던져 테스트하고 있어요. 그 질문이 이번에 수정한 인텐트 주제와 관련 있는지 **관대하게** 판정하세요.

[이번 수정 대상 케이스]
- 오분류됐던 원래 라벨: ${brokenIntent}
- 오분류 원인이 된 유저 발화: "${brokenUser}"
- 수정 주제: "시험에 결시했을 때의 처리" 전반 (병결 증빙, 담당 교수 통보, 대체시험 규정 등)

[통과 — 다음 중 하나라도 느슨하게 맞으면 onTopic=true]
- 시험을 못 봄 / 빠짐 / 결석 / 결시
- 병결 / 공결 / 병가 / 아파서 시험 / 진단서 / 응시 불가
- 시험 결시 후 처리 / 대체 시험 / 성적 처리 / 추가 시험
- Stage 1 원문 발화 그대로 ("시험 못보면 어떻게 되는거야" 등)
- 오탈자·구어체·줄임말·이모지 모두 허용
  (예: "시엄", "못봤어요", "못 봤는데요", "시험 빠졌는데 어떡해?")

[탈락 — onTopic=false]
- 완전 무관 주제 (장학금, 도서관, 기숙사, 학식, 교환학생, 날씨 등)
- 무의미 문자열 ("asdf", "ㅁㄴㅇㄹ", "test")
- 회피성·짧은 의미없는 발화 ("응", "아니요", "모르겠어요")

[출력 — 반드시 아래 JSON 한 줄만, 다른 텍스트·마크다운·코드펜스 금지]
{"onTopic": true}
또는
{"onTopic": false}`;

  const input = `사용자 질문: "${question}"`;

  return { instructions, input };
}
