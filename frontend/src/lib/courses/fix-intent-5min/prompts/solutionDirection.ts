import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';

function summarizeAssistant(raw: string | undefined, maxChars = 280): string {
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

export function buildSolutionDirectionValidationPrompt(
  representative: SelectedIntent | null,
  direction: string,
  attempt: number,
): { instructions: string; input: string } {
  const intent = representative?.row.intent ?? '(미지정)';
  const userMessage = representative?.row.userMessage ?? '(없음)';
  const assistantSummary = summarizeAssistant(
    representative?.row.assistantContent,
  );
  // After this many failed attempts, the hint reveals the full correct
  // direction (new intent for the topic + trigger sentence registration).
  const ESCALATE_AT = 3;
  const escalate = attempt >= ESCALATE_AT;

  const instructions = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 의 "해결 방향 정리" 본문을 판정합니다. 이 필드는 학습자가 선택한 Work Type(New Intent + Add Triggering Sentence) 을 **이 케이스에 어떻게 적용할지** 자연어로 설명하는 자리입니다.

[발견된 오분류 케이스]
- 현재 라벨: ${intent}
- 유저 원문: "${userMessage}"
- 답변 요지: ${assistantSummary}

[통과 기준 — ① + ② 모두 필수]
① **New Intent 방향**: 기존 인텐트 수정이 아니라 주제에 맞는 **새 인텐트를 만든다**는 의사 표시
   - 명확한 통과 표현: "신설", "신규 인텐트", "새 인텐트", "새로 만듦", "생성"
   - 문맥상 통과 표현: **"인텐트 추가", "알맞은 인텐트 추가", "인텐트 등록", "새로 등록"** — 한국어 실무에서 "추가/등록" 은 **"신규 추가(=신설)"** 의미로 관용적으로 쓰이므로 ① 로 인정
   - 대상 주제는 유저 원문 "${userMessage}" 의 핵심(결시/병결/시험 못봄 등) 또는 그 주변어. 명시 안 해도 OK — "인텐트 추가" 만으로도 ① 충족
② **Add Triggering Sentence 방향**: 유저 발화를 트리거 문장으로 등록·추가한다는 의사 표시
   - 통과 표현: "트리거 문장 추가", "트리거링 문장 추가", "트리거 등록", "유저 발화 등록", "매칭 패턴 추가", "트리거링 추가"

**① 만 있고 ② 가 없거나, ② 만 있고 ① 이 없으면 탈락.** 둘 다 한 문장 혹은 인접한 두 문장에 드러나면 됩니다 (한 본문 안에 모두 있으면 됨).

[탈락 사유]
- 잘못된 방향: "기존 ${intent} 인텐트 프롬프트 수정", "답변을 고치면 됨" → Update Intent 방향 (이번 케이스 오답)
- 다른 Work Type: "SQL 수정", "버그 리포트로 올림" → 방향 자체가 다름
- 모호: "수정 필요", "고쳐야 함", "변경"
- 주제 무관 / 빈 내용

[통과 예시 — 모두 pass]
- "시험 결시 인텐트를 새로 만들고, 유저 발화를 트리거 문장으로 추가"
- "기존 라벨과 별개로 병결 인텐트를 신설하고 '시험 못보면' 같은 표현을 트리거로 등록"
- "새 인텐트 생성 + 트리거 문장 추가"
- "결시 관련 인텐트 신설 및 매칭 패턴(트리거) 등록"
- **"트리거링 문장 추가를 통해 해결합니다. 알맞은 인텐트를 추가합니다."** → ②(트리거링 문장 추가) + ①(알맞은 인텐트 추가 = 신규 인텐트 추가 관용 표현) 모두 있음, **반드시 pass**
- "인텐트 추가하고 트리거 문장 등록" → ①+② 둘 다 있음, pass

[탈락 예시]
- "시험 결시 인텐트 신설" → ② 없음, 탈락
- "트리거 문장 추가" → ① 없음, 탈락
- "기존 잘못된 라벨의 프롬프트만 수정" → 잘못된 방향 (새 주제를 커버하는 인텐트가 아예 없는데 기존 라벨을 다듬는 건 핀포인트가 아님)
- "답변을 병결 안내로 교체" → 잘못된 방향
- "수정 필요" / "고쳐야 함" → 모호

[출력 규약]
오직 다음 JSON 한 줄만 출력하세요. 설명/주석/백틱 금지.
{ "pass": true|false, "hint": "탈락 시 한 문장 안내, 통과 시 빈 문자열" }

[힌트 규칙]
- 존댓말, 한 문장, 50자 내외.
- **구체 예시 문구("예: ...")는 절대 넣지 마세요.**
${
  escalate
    ? `- 이번이 ${ESCALATE_AT} 번째 이상 실패 시도입니다. **구체적 힌트** 를 주세요: 유저 원문의 주제를 다루는 새 인텐트를 만들고, 유저 발화를 트리거 문장으로 연결하는 두 갈래 방향을 함께 써야 한다는 점을 분명히 안내.
  - 탬플릿: "${userMessage || '해당 주제'} 를 다루는 새 인텐트를 만들고, 유저 발화를 트리거 문장으로 연결하는 두 갈래로 써주세요."`
    : `- 이번이 1~${ESCALATE_AT - 1} 번째 실패 시도입니다. **추상적 힌트** 를 주세요 — 구체적 답에 다가가지 말고 방향성만 제시.
  - ① 없음 (Update 방향/신규 의사 없음): "기존 수정이 아닌 다른 방향이 필요해요."
  - ② 없음 (트리거 연결 언급 없음): "유저 발화와 연결하는 고리가 필요해요."
  - 둘 다 없음: "해결 방향 두 갈래가 보이도록 써주세요."
  - 모호한 한 단어: "어떤 방향으로 해결할지 조금 더 구체적으로 써주세요."
  - 무관/빈 내용: "지금 이슈의 해결 방향을 짧게라도 적어주세요."`
}`;

  const input = `작성자가 쓴 "해결 방향 정리" 본문:

\`\`\`
${direction}
\`\`\`

판정해 JSON 으로만 답하세요. (attempt=${attempt}${escalate ? ', escalated' : ''})`;

  return { instructions, input };
}
