// Temp smoke test for Azure OpenAI wiring.
// Run from the frontend directory:
//   node --env-file=.env scripts/test-azure-openai.mjs
// Delete when the validate route is live.

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

const missing = Object.entries({
  AZURE_OPENAI_ENDPOINT: endpoint,
  AZURE_OPENAI_API_KEY: apiKey,
  AZURE_OPENAI_DEPLOYMENT: deployment,
}).filter(([, v]) => !v);
if (missing.length) {
  console.error('Missing env vars:', missing.map(([k]) => k).join(', '));
  process.exit(1);
}

// Endpoint may already include `?api-version=...`; only append if not.
let url = endpoint;
if (!/[?&]api-version=/.test(url)) {
  url += (url.includes('?') ? '&' : '?') + `api-version=${apiVersion}`;
}

console.log('POST', url);
console.log('deployment:', deployment);

const started = Date.now();
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  },
  body: JSON.stringify({
    model: deployment,
    input: 'Reply with the single word: pong',
  }),
});

const elapsed = Date.now() - started;
console.log('status:', res.status, `(${elapsed}ms)`);

const text = await res.text();
try {
  const json = JSON.parse(text);
  console.log('body:', JSON.stringify(json, null, 2));

  // Responses API shape: look for the assistant's text output.
  const out = json?.output
    ?.flatMap((o) => o?.content ?? [])
    ?.map((c) => c?.text)
    ?.filter(Boolean)
    ?.join('\n');
  if (out) {
    console.log('\n--- assistant text ---');
    console.log(out);
  }
} catch {
  console.log('body (raw):', text);
}

if (!res.ok) process.exit(2);
