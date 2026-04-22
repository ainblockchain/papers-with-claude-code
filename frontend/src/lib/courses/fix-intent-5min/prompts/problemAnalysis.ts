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

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 의 "문제 상황 분석" 본문 품질을 판정합니다. 현장에서 실무적으로 유용한 최소 분량·관련성을 기준으로 유하게 통과시킵니다. 너무 엄격하게 굴지 마세요.

[발견된 오분류 케이스]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 — 셋 중 둘 이상 만족하면 OK]
1) 대상 케이스의 주제 또는 맥락이 본문에서 드러남 (예: "${intent}", "${userMessage}" 중 핵심 단어, 또는 그 주변 주제어)
2) 관찰된 문제에 대한 서술이 있음 (예: "인텐트가 잘못 매칭", "답변이 엉뚱함", "공결 절차 안내 없이 일반 규정만 나옴" 등 평가 문구)
3) 채팅 로그 텍스트가 일부라도 붙여넣어져 있음 (유저 발화 또는 Assistant 응답 일부가 문자열로 포함)

길이 기준은 최소 20자 이상. 너무 짧고 무의미하면 탈락이지만, 짧아도 위 요소가 분명하면 통과. 3번 (채팅 로그 붙여넣기) 가 있으면 거의 확실히 통과.

[탈락]
- 대상 케이스와 무관한 서술 (다른 주제 이슈, 일기 형식, 무관 문장 등)
- "좋아요", "ㅇㅇ" 같은 한두 단어 응답
- 완전히 빈 내용

[출력 규약]
오직 다음 JSON 한 줄만 출력하세요. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

hint 가이드:
- 대상 언급 부족 → "문제가 된 인텐트나 유저 질문을 함께 언급해주세요."
- 문제 서술 부족 → "어떤 점이 문제였는지(예: 매칭 오류, 답변 부족) 짧게 덧붙여주세요."
- 너무 짧음 → "조금 더 자세히, 채팅 로그를 복사해서 붙여넣으면 PM이 검색하기 편해요."
- 무관한 내용 → "이번에 발견한 이슈와 직접 연결되는 내용을 써주세요."`;

  const input = `작성자가 쓴 "문제 상황 분석" 본문 (영역 사이 \`\`\`):

\`\`\`
${analysis}
\`\`\`

위 내용이 위 규칙으로 통과 가능한지 판정해 JSON 으로만 답하세요.`;

  return { instructions, input };
}
