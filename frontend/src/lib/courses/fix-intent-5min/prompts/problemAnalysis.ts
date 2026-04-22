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

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 의 "문제 상황 분석" 본문을 판정합니다. **관대한 기조**이되, "무엇이 왜 문제인지" 를 학습자가 본인 말로 썼는지 는 꼭 봅니다. 채팅 로그만 붙여넣고 평가가 없으면 통과시키지 않습니다.

[본문 구조 — 판정 대상 구분]
본문은 두 부분으로 이루어집니다.
1. **자유 문장 부분** — 학습자가 직접 쓴 문장들. 판정의 핵심 대상.
2. **채팅 로그 표 부분** — 탭으로 구분된 행/열 (Session ID / Created At / Intent / User: Message / Assistant: Contents). 탭이 여러 개 포함되거나 줄 전체가 탭으로 시작하면 표 행으로 간주. **표 부분은 참고 자료일 뿐, 통과 근거가 되지 않습니다.**

[발견된 오분류 케이스]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 기준 — 자유 문장 부분에서 ① + ② 모두 만족해야 pass]
① **대상 주제 언급** — 자유 문장에 인텐트 이름("${intent}"), 유저 질문 핵심 단어("${userMessage}" 속 명사), 또는 명백한 주변어가 한 번이라도 등장.
② **문제점 구체화** — 자유 문장이 "무엇이 어떻게 문제인지" 를 드러냄.
   - 구체적 표현 (통과): "잘못 매칭", "오분류", "엉뚱한 답변", "질문 의도와 다른 답", "재수강 아닌데 재수강으로 잡힘", "시험 질문인데 재수강 답변"
   - **모호한 한 단어 (탈락)**: "문제임", "이상함", "오류", "버그", "뭔가 잘못됨", "틀림" — 뭐가 어떻게 문제인지 설명 없음. 이런 표현만으로는 ② 불충족.

채팅 로그 붙여넣기는 가점 (좋은 습관) 이지만, ① + ② 없이 로그만으로는 탈락.

[모범 답안 — 반드시 pass]
"""
시험 못 보면 어떻게 되는지 유저가 물었는데, 재수강 인텐트로 잘못 매칭되었다.
[표 로그]
"""
자유 문장에 주제("시험", "재수강") + 구체적 문제("잘못 매칭") 모두 있음.

[추가 통과 예시]
- "재수강 인텐트로 잘못 매칭됨" ✓
- "시험 못보면 → 엉뚱한 답변" ✓
- "재수강 아닌데 재수강으로 잡힘" ✓
- "시험 관련 질문인데 재수강으로 분류. 의도 안 맞음." ✓

[탈락 예시 — 모두 fail]
- "문제임" + 표 로그 → 자유 문장 구체성 없음 (② 불충족)
- "오류" + 표 로그 → 구체성 없음
- "이상함" + 표 → 구체성 없음
- 표 로그만 덩그러니 → 자유 문장 없음
- "" (빈 내용) → 내용 없음
- "ㅇㅇ", "ㅋㅋ" → 무의미
- "오늘 점심 뭐 먹지" → 완전 무관

[출력 규약]
오직 다음 JSON 한 줄만 출력하세요. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

[힌트 가이드 — 예시 문구 없이 방향만 제시]
- 자유 문장 없이 로그만 → "왜 문제인지 짧게라도 설명해주세요."
- 자유 문장이 모호한 한 단어 ('문제임'/'오류'/'이상함' 등) → "무엇이 어떻게 문제인지 한 마디 덧붙여주세요."
- 주제만 언급하고 문제 지적 없음 → "이 케이스가 왜 문제인지 한 마디 덧붙여주세요."
- 완전히 빔 → "발견한 이슈를 짧게라도 적어주세요."
- 무관한 내용 → "지금 기록 중인 이슈와 다른 주제 같아요. 방금 발견한 케이스에 대한 내용을 써주세요."

hint 는 반드시 존댓말, 한 문장, 40자 내외. 구체 예시 문구("예: ...")는 절대 넣지 마세요.`;

  const input = `작성자가 쓴 "문제 상황 분석" 본문 (영역 사이 \`\`\`):

\`\`\`
${analysis}
\`\`\`

위 내용이 위 규칙으로 통과 가능한지 판정해 JSON 으로만 답하세요.`;

  return { instructions, input };
}
