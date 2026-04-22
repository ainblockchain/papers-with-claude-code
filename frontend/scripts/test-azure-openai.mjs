// Temp validation-prompt smoke test for Stage 1 "title" field.
// Run:  node --env-file=.env scripts/test-azure-openai.mjs
// Delete once the validate route is stable.

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

if (!endpoint || !apiKey || !deployment) {
  console.error('Missing env (AZURE_OPENAI_ENDPOINT / API_KEY / DEPLOYMENT)');
  process.exit(1);
}

let url = endpoint;
if (!/[?&]api-version=/.test(url)) {
  url += (url.includes('?') ? '&' : '?') + 'api-version=' + (apiVersion ?? '');
}

// Representative intent mirrors Stage 1's static broken row (재수강 오분류).
const REP = {
  intent: '재수강',
  userMessage: '시험 못보면 어떻게 되는거야',
  assistantSummary:
    '건강 악화로 시험을 못 본 경우 병결 사유 증빙 서류(진단서 등)를 담당 교수 및 학과에 제출하고, 대체 시험이나 학사 규정을 안내하는 답변.',
};

// Keep in sync with src/lib/courses/fix-intent-5min/prompts/title.ts.
// (Duplicated on purpose — this script is a throwaway.)
const INSTRUCTIONS = `당신은 AI 에이전트 운영팀 시니어입니다. 주니어가 발견한 인텐트 오분류 이슈에 대한 Notion Task 제목의 적절성을 판정합니다. 실무 제목은 5~15자 정도로 짧아도 괜찮으니, 길이보다 '의미 결합'과 '맥락 연결'을 봅니다. 경계 케이스는 유하게 통과시킵니다.

[발견된 오분류 케이스]
- 현재 라벨: ${REP.intent}
- 유저 원문: "${REP.userMessage}"
- 답변 요지: ${REP.assistantSummary}

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

const CASES = [
  { title: '재수강 오분류', expect: true },
  { title: '재수강 → 병결 재분류', expect: true },
  { title: '시험 결시 인텐트 분리', expect: true },
  { title: '재수강 수정', expect: true },
  { title: '결시 인텐트', expect: true },
  { title: '인텐트 오분류', expect: true },
  { title: '병결 문의 인텐트 재분류', expect: true },

  { title: '재수강', expect: false },
  { title: '인텐트', expect: false },
  { title: '수정', expect: false },
  { title: 'asdf', expect: false },
  { title: 'ㅁㄴㅇㄹ', expect: false },
  { title: '오늘 저녁 메뉴', expect: false },
  { title: '장학금 신청 프로세스 개선', expect: false },
  { title: '모르겠어요', expect: false },
];

function parseJsonLeniently(s) {
  const stripped = s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function judge(title) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      model: deployment,
      instructions: INSTRUCTIONS,
      input: `제목: "${title}"`,
      max_output_tokens: 300,
    }),
  });
  const raw = await res.json();
  if (!res.ok) {
    return { ok: false, status: res.status, error: raw };
  }
  const text = Array.isArray(raw.output)
    ? raw.output
        .flatMap((o) => (Array.isArray(o.content) ? o.content : []))
        .map((c) => c?.text)
        .filter(Boolean)
        .join('\n')
    : '';
  const parsed = parseJsonLeniently(text);
  return { ok: true, text, parsed, usage: raw.usage };
}

let passedExpected = 0;
let failedExpected = 0;
for (const { title, expect } of CASES) {
  const t0 = Date.now();
  const r = await judge(title);
  const ms = Date.now() - t0;
  if (!r.ok) {
    console.log(`❌ "${title}"  HTTP ${r.status}`);
    continue;
  }
  const pass = r.parsed?.pass;
  const match = pass === expect;
  if (match) passedExpected++;
  else failedExpected++;
  const mark = match ? '✅' : '⚠️ ';
  const passStr = pass === true ? 'PASS' : pass === false ? 'FAIL' : '??';
  const hint = r.parsed?.hint ? `  — ${r.parsed.hint}` : '';
  console.log(
    `${mark} expect=${expect ? 'PASS' : 'FAIL'}  got=${passStr}  "${title}"  (${ms}ms, ${r.usage?.total_tokens ?? '?'} tok)${hint}`,
  );
  if (pass === undefined) console.log('   raw:', r.text?.slice(0, 200));
}
console.log(
  `\n${passedExpected}/${CASES.length} matched. ${failedExpected} diverged.`,
);
