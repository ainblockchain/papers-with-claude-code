import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

// Strip the model's scaffolding "^^Thinking^^...^^/Thinking^^" blocks and
// trim the assistant reply down to something that fits a few hundred chars
// without exploding the prompt budget.
function summarizeAssistant(raw: string | undefined, maxChars = 300): string {
  if (!raw) return '(없음)';
  const cleaned = raw
    .replace(/\^\^Thinking\^\^[\s\S]*?\^\^\/Thinking\^\^/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '(없음)';
  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars)}…`
    : cleaned;
}

export function buildTitleValidationPrompt(
  representative: SelectedIntent | null,
  title: string,
): { instructions: string; input: string } {
  const intent = representative?.row.intent ?? '(미지정)';
  const userMessage = representative?.row.userMessage ?? '(없음)';
  const assistantSummary = summarizeAssistant(
    representative?.row.assistantContent,
  );

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 제목의 적절성을 판정합니다. 실무 제목은 5~15자 정도로 짧아도 괜찮으니, 길이보다 '의미 결합'과 '맥락 연결'을 봅니다. 경계 케이스는 유하게 통과시킵니다.

[발견된 오분류 케이스]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 — 유하게 적용]
- 최소 2어절 이상으로 의미 단위가 맺혀 있고,
- 제목이 이 케이스의 대상(재수강, 결시, 병결, 시험 결시/못보면, 인텐트 분류/라벨 등) 또는 그 주변 맥락을 적어도 하나 언급하면 통과. 액션이 추상어("수정", "오류", "버그")여도 대상이 분명하면 OK.
- 예: "재수강 오분류", "재수강 수정", "결시 인텐트", "인텐트 오분류" 모두 통과.

[탈락]
- 단일 단어 또는 단일 추상어 (예: "재수강", "오분류", "수정", "인텐트" 단독 입력)
- 완전 무관 주제 (예: "장학금 신청", "오늘 저녁 메뉴")
- 무의미 문자열 (예: "ㅁㄴㅇㄹ", "asdf", "test 123")
- 회피성 답변 (예: "모르겠어요")

[출력 — 반드시 아래 JSON 한 줄만, 다른 텍스트·마크다운·코드펜스 금지]
{"pass": true, "hint": ""}
또는
{"pass": false, "hint": "한 문장 한국어 피드백"}

규칙:
- pass=true 이면 hint는 빈 문자열.
- pass=false 이면 hint는 담백한 안내체 한 문장. 완성된 정답 제목 예시를 직접 제공하지 말고, 무엇이 빠졌는지와 방향만 짚으세요.`;

  const input = `제목: "${title}"`;

  return { instructions, input };
}
