import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

function summarizeAssistant(raw: string | undefined, maxChars = 220): string {
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

export function buildSheetIntentValidationPrompt(
  representative: SelectedIntent | null,
  intentName: string,
  leadSentence: string,
  promptText: string,
  attempt: number,
): { instructions: string; input: string } {
  const intent = representative?.row.intent ?? '(미지정)';
  const userMessage = representative?.row.userMessage ?? '(없음)';
  const assistantSummary = summarizeAssistant(
    representative?.row.assistantContent,
  );
  const ESCALATE_AT = 3;
  const escalate = attempt >= ESCALATE_AT;

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 한양대 인텐트 관리 시트(학사 탭)에 새로 등록한 인텐트 행의 품질을 판정합니다. **관대한 기조** — 주제와 맥락이 맞고, Prompt 가 해당 상황을 합리적으로 안내하는 방향이면 통과.

[발견된 오분류 케이스]
- 현재 잘못 매칭된 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 기존 답변 요지: ${assistantSummary}

[통과 기준 — ① + ② 모두 필수]
① **Intent name** 이 유저 원문의 주제와 연결됨
   - 통과 예: "시험결시", "병결", "시험불참", "결시사유", "시험못봄", "병결처리" — 시험 못 본 상황을 지칭하면 모두 OK
   - 탈락 예: "학사일정", "장학금", "학식", "아무말" — 주제 무관
② **Prompt** 가 해당 주제에 맞는 안내 방향을 담고 있음 (내용이 반드시 완벽할 필요 없음, 방향만 맞으면 됨)
   - 통과 예: "한양대 시험 결시 시 병결 증빙 제출·담당 교수 연락·학과 사무실 문의 절차를 안내" 같은 **영역 서술**
   - 탈락 예: "그냥 잘 답해줘", 한 두 단어, 주제와 다른 안내 (등록금 / 장학금 이야기 등)

대표 Sentence 는 참고값일 뿐 판정 대상 아님 (단 빈 문자열이면 프롬프트 작성 성실도 의심).

[탈락 조건]
- ① 또는 ② 중 하나라도 빠짐
- Prompt 가 15자 미만 / "그냥 알려줘" 같은 성의 없음
- 완전히 무관한 내용
- Intent name 에 시스템 관용어가 아닌 랜덤 문자열 ("asdf", "1234")

[출력 규약]
오직 다음 JSON 한 줄만 출력. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

[힌트 규칙]
- 존댓말, 한 문장, 50자 내외. 구체 예시 문구("예: ...")는 넣지 않습니다.
${
  escalate
    ? `- 이번이 ${ESCALATE_AT} 번째 이상 실패입니다. **구체적** 힌트로 방향 알려주세요.
  - Intent name 문제: "유저가 시험을 못 본 상황을 한 단어로 나타낼 인텐트 이름이 필요해요."
  - Prompt 문제: "시험 결시/병결 처리 절차(증빙·교수 연락·학과 문의 등)를 안내하는 방향으로 써주세요."`
    : `- 이번이 1~${ESCALATE_AT - 1} 번째 실패입니다. **추상적** 힌트만 주세요.
  - ① 문제: "유저 원문이 어떤 상황인지 떠올리고 그에 맞는 이름을 지어주세요."
  - ② 문제: "Prompt 가 해당 상황을 설명하고 있는지 다시 봐주세요."
  - 둘 다 약함: "주제와 Prompt 방향이 같이 드러나도록 보완해주세요."`
}`;

  const input = `작성자가 학사 탭에 추가한 새 인텐트 행:

- Intent: ${intentName}
- 대표 Sentence: ${leadSentence}
- Prompt: ${promptText}

판정해 JSON 으로만 답하세요. (attempt=${attempt}${escalate ? ', escalated' : ''})`;

  return { instructions, input };
}
