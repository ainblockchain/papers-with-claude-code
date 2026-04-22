import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

export function buildSheetTriggersValidationPrompt(
  representative: SelectedIntent | null,
  intentName: string,
  triggers: string[],
  attempt: number,
): { instructions: string; input: string } {
  const userMessage = representative?.row.userMessage ?? '(없음)';
  const ESCALATE_AT = 3;
  const escalate = attempt >= ESCALATE_AT;

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 intent_trigger_sentence 탭에 새로 등록한 트리거 문장들의 품질을 판정합니다. **관대한 기조** — 유저 원문의 의미와 연결되는 변형이면 통과. 표현 다양성이 좋을수록 매칭 정확도가 높아집니다.

[발견된 오분류 케이스]
- 새로 만든 Intent: ${intentName}
- 유저 원문: "${userMessage}"

[통과 기준 — 모두 만족]
① 트리거 문장 **2개 이상**
② 각 트리거가 유저 원문의 의미와 의미적으로 연결됨 — 질문형·평서형·축약형·동의어 변형 등 표현만 달라도 OK
   - 통과 예: "시험 못보면 어떻게 돼", "시험 못 치르면 어떻게 하나요", "병결 처리 어떻게 해요", "시험결시 시 조치"
   - 탈락 예: "안녕", "등록금 언제 내", "수강신청 방법" — 다른 주제

한두 개 트리거가 약간 애매해도 다수가 맥락 맞으면 통과 쪽으로. 모든 트리거가 무관하면 탈락.

[탈락 조건]
- 트리거 1개 이하
- 모든 트리거가 유저 원문과 무관
- 빈 문자열 / 1-2 글자 의미 없는 입력

[출력 규약]
오직 다음 JSON 한 줄만. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

[힌트 규칙]
- 존댓말, 한 문장, 50자 내외. 구체 예시 문구("예: ...") 금지.
${
  escalate
    ? `- ${ESCALATE_AT} 번째 이상 실패. **구체적** 힌트.
  - 수 부족: "트리거 문장을 2개 이상 추가해주세요."
  - 관련성 약함: "유저 원문 '${userMessage}' 와 비슷한 표현으로 트리거를 작성해주세요."
  - 둘 다: "유저 원문과 의미가 이어지는 다양한 표현을 2개 이상 써주세요."`
    : `- 1~${ESCALATE_AT - 1} 번째 실패. **추상적** 힌트.
  - 수 부족: "조금 더 다양한 표현을 추가해주세요."
  - 관련성 약함: "유저가 실제로 쓸 법한 표현인지 다시 확인해주세요."
  - 둘 다: "유저 원문을 떠올리면서 변형된 표현을 여러 개 써주세요."`
}`;

  const input = `작성자가 intent_trigger_sentence 탭에 추가한 트리거 문장들:

${triggers.map((t, i) => `${i + 1}. ${t}`).join('\n')}

(대상 Intent: ${intentName})

판정해 JSON 으로만 답하세요. (attempt=${attempt}${escalate ? ', escalated' : ''})`;

  return { instructions, input };
}
