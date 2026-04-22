// Server-only utility for the Azure OpenAI Responses API.
// Never import this from client components.

interface ResponsesCallOptions {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}

interface ResponsesCallResult {
  text: string;
  raw: unknown;
}

export async function callAzureResponses({
  instructions,
  input,
  maxOutputTokens = 300,
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

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model: deployment,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  });

  const raw: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const excerpt = JSON.stringify(raw).slice(0, 500);
    throw new Error(`Azure OpenAI ${res.status}: ${excerpt}`);
  }

  // Responses API output: output[].content[].text — flatten & join.
  const text = extractResponseText(raw);
  return { text, raw };
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
