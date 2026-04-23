// Server-only utility for the Azure OpenAI Responses API.
// Never import this from client components.

interface ResponsesCallOptions {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  // How many times to retry on transient (5xx / 408 / 429 / network) errors
  // before giving up. Each attempt waits ~300ms → ~800ms → ~1300ms. Default
  // 2 retries (= up to 3 total calls) — covers short Azure blips AND the
  // ~1-second local DNS (ENOTFOUND) glitches we keep hitting in dev.
  retries?: number;
}

interface ResponsesCallResult {
  text: string;
  raw: unknown;
}

// Azure Responses occasionally throws short 5xx/429 blips that otherwise
// bubble up as "검증 서버에 일시적 오류가 있어요" UI. The set of codes we
// treat as worth retrying.
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function callAzureResponses({
  instructions,
  input,
  maxOutputTokens = 300,
  retries = 2,
}: ResponsesCallOptions): Promise<ResponsesCallResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      'Azure OpenAI env missing (AZURE_OPENAI_ENDPOINT / API_KEY / DEPLOYMENT)',
    );
  }

  // Endpoint may already include `?api-version=...`; only append if not.
  let url = endpoint;
  if (!/[?&]api-version=/.test(url)) {
    url += `${url.includes('?') ? '&' : '?'}api-version=${apiVersion ?? ''}`;
  }

  const body = JSON.stringify({
    model: deployment,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential-ish backoff: 300ms, 800ms, 1300ms
      await new Promise((resolve) =>
        setTimeout(resolve, 300 + attempt * 500),
      );
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body,
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const excerpt = JSON.stringify(raw).slice(0, 500);
        const err = new Error(`Azure OpenAI ${res.status}: ${excerpt}`);
        if (TRANSIENT_STATUSES.has(res.status) && attempt < retries) {
          lastErr = err;
          continue;
        }
        throw err;
      }
      return { text: extractResponseText(raw), raw };
    } catch (err) {
      // Network / fetch-layer failures — always retry until we exhaust budget.
      lastErr = err;
      if (attempt >= retries) throw err;
    }
  }
  throw lastErr ?? new Error('Azure OpenAI call failed with no error object');
}

function extractResponseText(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const output = (raw as { output?: unknown }).output;
  if (!Array.isArray(output)) return '';
  return output
    .flatMap((o) => {
      if (!o || typeof o !== 'object') return [];
      const content = (o as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((c) => {
      if (!c || typeof c !== 'object') return null;
      const t = (c as { text?: unknown }).text;
      return typeof t === 'string' ? t : null;
    })
    .filter((t): t is string => !!t)
    .join('\n');
}

/**
 * Parse a JSON object the LLM emitted, forgiving about:
 *  - ```json ... ``` fences
 *  - leading/trailing prose
 * Returns null if no JSON object can be recovered.
 */
export function parseJsonLeniently(s: string): unknown | null {
  const stripped = s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
