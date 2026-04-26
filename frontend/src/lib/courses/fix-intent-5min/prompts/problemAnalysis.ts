import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

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

export function buildProblemAnalysisValidationPrompt(
  representative: SelectedIntent | null,
  analysis: string,
): { instructions: string; input: string } {
  const intent = representative?.row.intent ?? '(미지정)';
  const userMessage = representative?.row.userMessage ?? '(없음)';
  const assistantSummary = summarizeAssistant(
    representative?.row.assistantContent,
  );

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 의 "문제 상황 분석" 본문을 판정합니다. **매우 관대한 기조**로, 본문에 "무언가 의미 있는 내용" 이 조금이라도 담겼다면 통과시킵니다.

[본문 구조]
본문은 다음 중 하나 이상으로 구성됩니다.
1. **자유 문장** — 학습자가 직접 쓴 문장.
2. **채팅 로그 표** — 탭으로 구분된 행/열 (Session ID / Created At / Intent / User: Message / Assistant: Contents).

[발견된 오분류 케이스 — 참고용]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 기준 — 아래 중 하나라도 만족하면 pass]
A. **채팅 로그 표가 붙여넣어져 있다** — 탭 구분된 행이 한 줄이라도 있으면 통과. (자유 문장이 없어도 OK)
B. **자유 문장에 이슈 관련 의미 있는 단어가 하나라도 있다** — 아래 같은 표현 중 어느 하나라도 등장하면 통과.
   - "인텐트", "오분류", "잘못 매칭", "미스매칭", "불일치", "부정확", "엉뚱", "이상한 답", "의도와 다름", "분류 오류"
   - 유저 질문의 핵심 주제 단어 ("${userMessage}" 속 명사) 언급
   - 현재 라벨명 ("${intent}") 언급
   - 한 줄짜리 진단도 OK: "인텐트 오분류 되었음", "엉뚱한 답변 나옴", "잘못 분류됨" 등
C. **A + B 조합** — 로그 + 진단 한 줄. 당연히 통과.

[탈락 기준 — 아래 경우에만 fail]
- 본문이 완전히 비었거나 공백만 있음
- 자음/모음 나열, 무의미한 키보드 입력 ("ㅇㅇ", "ㅋㅋ", "ㅁㄴㅇ", "asdf" 등) **만** 있고 로그도 없음
- 이슈와 완전히 무관한 내용 ("오늘 점심 뭐 먹지") **만** 있고 로그도 없음

[통과 예시 — 모두 pass]
- "인텐트 오분류 되었음" ✓ (한 줄 진단)
- "엉뚱한 답변 나옴" ✓
- "잘못 매칭됐어요" ✓
- "{유저 주제} 질문인데 {현재 라벨}로 분류됨" ✓
- 채팅 로그 표만 덩그러니 붙여넣음 ✓ (로그 자체가 증거)
- "문제 상황:\n[로그]" ✓

[탈락 예시 — 모두 fail]
- "" (빈 내용) → 내용 없음
- "   " (공백만) → 내용 없음
- "ㅁㄴㅇ" / "ㅋㅋ" / "asdf" (로그도 없음) → 무의미
- "오늘 점심 뭐 먹지" (로그도 없음) → 완전 무관

[출력 규약]
오직 다음 JSON 한 줄만 출력하세요. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

[힌트 가이드 — 예시 문구 없이 방향만 제시]
- 완전히 빔 → "발견한 이슈를 짧게라도 적어주세요."
- 자음/모음/키보드 누르기만 → "이슈 내용을 한 줄이라도 적어주세요."
- 무관한 내용 → "지금 기록 중인 이슈와 다른 주제 같아요. 방금 발견한 케이스에 대한 내용을 써주세요."

hint 는 반드시 존댓말, 한 문장, 40자 내외. 구체 예시 문구("예: ...")는 절대 넣지 마세요.`;

  const input = `작성자가 쓴 "문제 상황 분석" 본문 (영역 사이 \`\`\`):

\`\`\`
${analysis}
\`\`\`

위 내용이 위 규칙으로 통과 가능한지 판정해 JSON 으로만 답하세요.`;

  return { instructions, input };
}
