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

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 제목의 적절성을 판정합니다. 실무 제목은 5~15자 정도로 짧아도 괜찮으니, 길이보다 '의미 결합'과 '맥락 연결'을 봅니다.

[발견된 오분류 케이스]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 기준 — ① + ② 모두 필요]
① **2어절 이상**으로 의미 단위가 맺혀 있을 것. 액션이 추상어("수정"/"오류"/"버그")여도 무방.
② 제목이 아래 **대상 A·B·C 중 적어도 하나** 를 지목할 것:
   - A. 현재 잘못 매칭된 라벨 그 자체: "${intent}" (또는 그 주변어)
   - B. 유저 원문 "${userMessage}" 의 실제 주제 (예: 시험, 결시, 병결, 시험 못봄, 시험 불참 등)
   - C. 특정 인텐트명을 지목하지 않는 **일반형** 지칭: "인텐트 오분류", "인텐트 수정", "라벨 오류" 등

[중요 — 엉뚱한 다른 인텐트명 지목은 탈락]
제목에 **이 케이스와 무관한 다른 특정 인텐트명**(예: 재수강, 장학금, 수강신청, 교환학생, 학자금_대출, 동아리 등 이번 broken row 라벨도 아니고 유저 주제도 아닌 기존 시스템 인텐트명)이 붙으면 **탈락**. "재수강 인텐트 오분류" 처럼 일반형 뒤에 다른 인텐트명이 붙은 형태도 탈락 — 실제로는 재수강과 무관한 케이스이기 때문입니다. 일반형 C 로 통과하려면 특정 인텐트명 없이 순수 일반형이어야 함.

[통과 예]
- "${intent} 오분류", "${intent} 잘못 잡힘"  ← A
- "시험 결시 오분류", "병결 질문 오류", "시험 못봄 인텐트"  ← B
- "인텐트 오분류", "인텐트 수정 필요", "라벨 오류"  ← C (순수 일반형)

[탈락 예]
- 단일 단어/추상어 단독: "오분류", "수정", "인텐트", "${intent}" 만
- **다른 인텐트명 지목**: "재수강 인텐트 오분류", "장학금 오분류", "수강신청 수정" (이번 케이스는 재수강/장학금/수강신청과 무관)
- 완전 무관: "장학금 신청", "오늘 저녁 메뉴"
- 무의미: "ㅁㄴㅇㄹ", "asdf", "test 123"
- 회피성: "모르겠어요"

[출력 — 반드시 아래 JSON 한 줄만, 다른 텍스트·마크다운·코드펜스 금지]
{"pass": true, "hint": ""}
또는
{"pass": false, "hint": "한 문장 한국어 피드백"}

규칙:
- pass=true 이면 hint는 빈 문자열.
- pass=false 이면 hint는 담백한 안내체 한 문장. 완성된 정답 제목 예시를 직접 제공하지 말고, 무엇이 빠졌는지와 방향만 짚으세요.
- 다른 인텐트명 지목으로 탈락한 경우: "이번 케이스와 무관한 다른 인텐트명이에요. 현재 라벨이나 유저 질문 주제를 기준으로 써주세요." 톤.`;

  const input = `제목: "${title}"`;

  return { instructions, input };
}
