import { NextRequest, NextResponse } from 'next/server';
import type {
  NotionFieldId,
  SelectedIntent,
} from '@/lib/courses/fix-intent-5min/course-state';
import { buildTitleValidationPrompt } from '@/lib/courses/fix-intent-5min/prompts/title';
import { buildProblemAnalysisValidationPrompt } from '@/lib/courses/fix-intent-5min/prompts/problemAnalysis';
import { buildSolutionDirectionValidationPrompt } from '@/lib/courses/fix-intent-5min/prompts/solutionDirection';

// Convert a small subset of HTML (what our rich BlockField emits) to a
// readable plain-text representation — tables collapse to tab-separated
// rows so the LLM can still see the tabular chat log without being
// distracted by tag noise.
function htmlToReadableText(src: string): string {
  if (!src) return '';
  let s = src;
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  s = s.replace(/<(p|div|li|h[1-6])[^>]*>/gi, '');
  s = s.replace(/<\/tr>/gi, '\n');
  s = s.replace(/<tr[^>]*>/gi, '');
  s = s.replace(/<(td|th)[^>]*>/gi, '\t');
  s = s.replace(/<\/(td|th)>/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s.replace(/\n{3,}/g, '\n\n').trim();
}
import {
  callAzureResponses,
  parseJsonLeniently,
} from '@/lib/server/azure-openai';

interface Body {
  fieldId?: NotionFieldId;
  value?: string;
  context?: {
    representativeIntent?: SelectedIntent | null;
    username?: string | null;
    attempt?: number;
  };
}

/**
 * Validation endpoint for free-input fields in the fix-intent-5min course.
 * - 'title' → Azure OpenAI (Responses API) with the title-validation prompt.
 * - Other free-input fields → pass-through stub until their prompts land.
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const { fieldId, value, context } = body;
  if (!fieldId || typeof value !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'fieldId and value are required' },
      { status: 400 },
    );
  }

  if (fieldId === 'title') {
    try {
      const { instructions, input } = buildTitleValidationPrompt(
        context?.representativeIntent ?? null,
        value,
      );
      const { text } = await callAzureResponses({ instructions, input });
      const parsed = parseJsonLeniently(text) as
        | { pass?: unknown; hint?: unknown }
        | null;
      if (!parsed || typeof parsed.pass !== 'boolean') {
        console.error('[validate/title] unparseable LLM response', { text });
        return NextResponse.json({
          ok: true,
          pass: false,
          hint: '검증 서버가 판정을 전달하지 못했어요. 잠시 후 다시 시도해주세요.',
        });
      }
      return NextResponse.json({
        ok: true,
        pass: parsed.pass,
        hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      });
    } catch (err) {
      console.error('[validate/title] call failed', err);
      return NextResponse.json({
        ok: true,
        pass: false,
        hint: '검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.',
      });
    }
  }

  if (fieldId === 'problemAnalysis') {
    try {
      // The rich BlockField submits HTML (free text + pasted <table>).
      // Flatten to readable text so the LLM judges on content, not markup.
      const readable = htmlToReadableText(value);
      const { instructions, input } = buildProblemAnalysisValidationPrompt(
        context?.representativeIntent ?? null,
        readable,
      );
      const { text } = await callAzureResponses({ instructions, input });
      const parsed = parseJsonLeniently(text) as
        | { pass?: unknown; hint?: unknown }
        | null;
      if (!parsed || typeof parsed.pass !== 'boolean') {
        console.error('[validate/problemAnalysis] unparseable LLM response', {
          text,
        });
        return NextResponse.json({
          ok: true,
          pass: false,
          hint: '검증 서버가 판정을 전달하지 못했어요. 잠시 후 다시 시도해주세요.',
        });
      }
      return NextResponse.json({
        ok: true,
        pass: parsed.pass,
        hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      });
    } catch (err) {
      console.error('[validate/problemAnalysis] call failed', err);
      return NextResponse.json({
        ok: true,
        pass: false,
        hint: '검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.',
      });
    }
  }

  if (fieldId === 'solutionDirection') {
    try {
      const { instructions, input } = buildSolutionDirectionValidationPrompt(
        context?.representativeIntent ?? null,
        value,
        Math.max(1, context?.attempt ?? 1),
      );
      const { text } = await callAzureResponses({ instructions, input });
      const parsed = parseJsonLeniently(text) as
        | { pass?: unknown; hint?: unknown }
        | null;
      if (!parsed || typeof parsed.pass !== 'boolean') {
        console.error(
          '[validate/solutionDirection] unparseable LLM response',
          { text },
        );
        return NextResponse.json({
          ok: true,
          pass: false,
          hint: '검증 서버가 판정을 전달하지 못했어요. 잠시 후 다시 시도해주세요.',
        });
      }
      return NextResponse.json({
        ok: true,
        pass: parsed.pass,
        hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      });
    } catch (err) {
      console.error('[validate/solutionDirection] call failed', err);
      return NextResponse.json({
        ok: true,
        pass: false,
        hint: '검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.',
      });
    }
  }

  // Free-input fields other than the wired prompts still stub-pass
  // (workContent, result).
  return NextResponse.json({ ok: true, pass: true });
}
