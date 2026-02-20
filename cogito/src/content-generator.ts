/**
 * Content Generator.
 * Calls vLLM (Qwen3-32B-AWQ) to generate educational content
 * from lesson_learned entries + related papers + code.
 */

import { Paper, fetchRepoFiles } from './paper-discovery.js';
import { LessonLearned, EnrichedContent, PaperRef, CodeRef } from './types.js';

const VLLM_URL = process.env.VLLM_URL || 'http://localhost:8000';
const VLLM_MODEL = process.env.VLLM_MODEL || 'Qwen/Qwen3-32B-AWQ';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VllmResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Extract JSON from an LLM response that may include think tags, code fences, or preamble.
 */
function extractJson<T = any>(raw: string): T {
  // Strip <think>...</think> blocks
  let text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Try extracting from markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // Try finding JSON object/array boundaries
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)
    ? firstBrace : firstBracket;
  if (start >= 0) {
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    // Find the matching close bracket
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === open) depth++;
      if (ch === close) { depth--; if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { break; }
      }}
    }
  }

  throw new Error('No valid JSON found in LLM response');
}

/**
 * Call vLLM chat completion endpoint.
 */
async function callLlm(messages: ChatMessage[], maxTokens = 4096): Promise<string> {
  const res = await fetch(`${VLLM_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VLLM_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vLLM error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as VllmResponse;
  return data.choices[0]?.message?.content || '';
}

/**
 * Generate educational content from a lesson + related papers + code.
 */
export async function generateContent(
  lesson: LessonLearned,
  papers: Paper[],
): Promise<EnrichedContent> {
  // Fetch actual code from official repos
  const repoFiles = new Map<string, Array<{ path: string; content: string }>>();
  for (const p of papers) {
    if (p.codeUrl) {
      try {
        console.log(`[ContentGen] Fetching code from ${p.codeUrl}...`);
        const files = await fetchRepoFiles(p.codeUrl, 3);
        if (files.length > 0) {
          repoFiles.set(p.arxivId, files);
          console.log(`[ContentGen] Got ${files.length} files from ${p.codeUrl}`);
        }
      } catch (err: any) {
        console.log(`[ContentGen] Failed to fetch code: ${err.message}`);
      }
    }
  }

  const paperContext = papers.map((p, i) => {
    const lines = [
      `Paper ${i + 1}: "${p.title}"`,
      `Authors: ${p.authors.join(', ')}`,
      `arXiv: ${p.arxivId} (${p.published.slice(0, 4)})`,
      `Abstract: ${p.abstract}`,
    ];
    if (p.codeUrl) {
      lines.push(`Official Code Repository: ${p.codeUrl}`);

      // Include actual code from the repo
      const files = repoFiles.get(p.arxivId);
      if (files && files.length > 0) {
        lines.push('');
        lines.push('--- Official Code (fetched from the repository) ---');
        for (const f of files) {
          lines.push(`\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``);
        }
        lines.push('--- End of Code ---');
      }
    } else {
      lines.push('No official code repository found for this paper.');
    }
    lines.push('');
    return lines.join('\n');
  }).join('\n');

  // Truncate context if too large (vLLM 32k context - leave room for system prompt + output)
  const MAX_CONTEXT_CHARS = 24000;
  let truncatedPaperContext = paperContext;
  if (truncatedPaperContext.length > MAX_CONTEXT_CHARS) {
    truncatedPaperContext = truncatedPaperContext.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... truncated for context window ...]';
    console.log(`[ContentGen] Truncated paper context from ${paperContext.length} to ${MAX_CONTEXT_CHARS} chars`);
  }

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        'You are an expert technical writer creating educational content.',
        'You combine practical engineering lessons with academic research to create',
        'articles that help developers understand both the theory and practice.',
        '',
        'IMPORTANT: All papers and official code repositories are provided below.',
        'Do NOT hallucinate or invent URLs. Only reference papers and repos given to you.',
        'When a paper has an "Official Code Repository" listed, reference specific',
        'files and functions from that repo to illustrate the concepts.',
        '',
        'Write in a clear, engaging style. Ground claims in specific papers or code.',
        'Include code examples where relevant.',
        '',
        'Output format: JSON with fields { title, summary, content, tags }',
        '- title: article title (concise)',
        '- summary: 2-3 sentences for the listing page',
        '- content: full article in markdown (1000-3000 words)',
        '- tags: array of relevant tags',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        '## Lesson Learned (from a developer)',
        '',
        `**Title:** ${lesson.title}`,
        `**Decision:** ${lesson.content}`,
        `**Tags:** ${lesson.tags}`,
        '',
        '## Related Academic Papers',
        '',
        truncatedPaperContext || 'No related papers found.',
        '',
        '## Task',
        '',
        'Write an educational article that:',
        '1. Explains the concept behind this design decision',
        '2. Connects it to the academic research (cite specific papers by title and authors)',
        '3. References the official code repositories — link to specific files/functions when possible',
        '4. Shows practical examples grounded in real paper implementations',
        '5. Discusses trade-offs and when to use alternatives',
        '6. Helps a developer understand both the theory (paper) and practice (official code)',
        '',
        'Return ONLY valid JSON.',
      ].join('\n'),
    },
  ];

  const raw = await callLlm(messages, 4096);

  // Parse JSON from LLM response — handle think tags, code fences, partial JSON
  let parsed: { title: string; summary: string; content: string; tags: string[] };
  try {
    parsed = extractJson(raw);
  } catch {
    // Fallback: use raw response as content
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    parsed = {
      title: `Deep Dive: ${lesson.title}`,
      summary: lesson.summary || lesson.content.slice(0, 200),
      content: cleaned || raw,
      tags: lesson.tags.split(',').map(t => t.trim()),
    };
  }

  const paperRefs: PaperRef[] = papers.map(p => ({
    arxivId: p.arxivId,
    title: p.title,
    authors: p.authors,
    abstract: p.abstract.slice(0, 300),
    year: parseInt(p.published.slice(0, 4)) || 2024,
    url: p.url,
  }));

  const codeRefs: CodeRef[] = papers
    .filter(p => p.codeUrl)
    .map(p => ({
      repo: p.codeUrl!,
      language: 'python', // Most ML papers use Python
      keyFiles: (repoFiles.get(p.arxivId) || []).map(f => f.path),
      description: `Official implementation of "${p.title}"`,
    }));

  return {
    title: parsed.title,
    summary: parsed.summary,
    content: parsed.content,
    lesson,
    papers: paperRefs,
    codeRefs,
    depth: Math.min((lesson.depth || 2) + 1, 5) as number,
    tags: [
      ...parsed.tags,
      'educational',
      'x402_gated',
      ...paperRefs.map(p => `arxiv:${p.arxivId}`),
    ],
  };
}

/**
 * Extract search keywords from a lesson for paper discovery.
 * First tries vLLM, falls back to simple tag/title extraction.
 */
export async function extractKeywords(lesson: LessonLearned): Promise<string[]> {
  // First try: use tags from the lesson (most reliable, no LLM needed)
  const tagKeywords = lesson.tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t && t !== 'lesson_learned' && !t.startsWith('file:'));

  if (tagKeywords.length >= 2) return tagKeywords.slice(0, 5);

  // Second try: extract meaningful words from title
  const stopWords = new Set(['the', 'a', 'an', 'is', 'was', 'are', 'for', 'to', 'of', 'in', 'on', 'with', 'and', 'or', 'not', 'this', 'that', 'it', 'by', 'from', 'as', 'at', 'be', 'we', 'our', 'i', 'my', 'chose', 'use', 'using', 'over', 'because', 'vs']);
  const titleWords = lesson.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const combined = [...tagKeywords, ...titleWords];
  if (combined.length >= 2) return [...new Set(combined)].slice(0, 5);

  // Third try: vLLM keyword extraction
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Extract 3-5 academic search keywords from this text. Return ONLY a JSON array of strings.',
      },
      {
        role: 'user',
        content: `${lesson.title}\n\n${lesson.content}`,
      },
    ];

    const raw = await callLlm(messages, 256);
    const keywords = extractJson<string[]>(raw);
    if (Array.isArray(keywords)) return keywords.slice(0, 5);
  } catch {}

  return combined.length > 0 ? combined : ['machine learning'];
}
