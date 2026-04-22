import { NextRequest, NextResponse } from 'next/server';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';
import { buildSheetIntentValidationPrompt } from '@/lib/courses/fix-intent-5min/prompts/sheetIntent';
import { buildSheetTriggersValidationPrompt } from '@/lib/courses/fix-intent-5min/prompts/sheetTriggers';
import {
  callAzureResponses,
  parseJsonLeniently,
} from '@/lib/server/azure-openai';

interface Body {
  action?: 'intent' | 'triggers';
  payload?: {
    intentName?: string;
    leadSentence?: string;
    prompt?: string;
    triggers?: string[];
  };
  context?: {
    representativeIntent?: SelectedIntent | null;
    attempt?: number;
  };
}

/**
 * Validation endpoint for the Stage 3 sheet-edit page.
 * - action 'intent'   → LLM judges the new intent row in the 학사 tab
 * - action 'triggers' → LLM judges trigger-sentence rows in the
 *   intent_trigger_sentence tab (count + semantic relevance)
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

  const { action, payload, context } = body;
  const attempt = Math.max(1, context?.attempt ?? 1);
  const representative = context?.representativeIntent ?? null;

  if (action === 'intent') {
    const intentName = (payload?.intentName ?? '').trim();
    const leadSentence = (payload?.leadSentence ?? '').trim();
    const promptText = (payload?.prompt ?? '').trim();
    try {
      const { instructions, input } = buildSheetIntentValidationPrompt(
        representative,
        intentName,
        leadSentence,
        promptText,
        attempt,
      );
      const { text } = await callAzureResponses({ instructions, input });
      const parsed = parseJsonLeniently(text) as
        | { pass?: unknown; hint?: unknown }
        | null;
      if (!parsed || typeof parsed.pass !== 'boolean') {
        console.error('[validate-sheet/intent] unparseable LLM response', {
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
      console.error('[validate-sheet/intent] call failed', err);
      return NextResponse.json({
        ok: true,
        pass: false,
        hint: '검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.',
      });
    }
  }

  if (action === 'triggers') {
    const intentName = (payload?.intentName ?? '').trim();
    const triggers = (payload?.triggers ?? [])
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    try {
      const { instructions, input } = buildSheetTriggersValidationPrompt(
        representative,
        intentName,
        triggers,
        attempt,
      );
      const { text } = await callAzureResponses({ instructions, input });
      const parsed = parseJsonLeniently(text) as
        | { pass?: unknown; hint?: unknown }
        | null;
      if (!parsed || typeof parsed.pass !== 'boolean') {
        console.error('[validate-sheet/triggers] unparseable LLM response', {
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
      console.error('[validate-sheet/triggers] call failed', err);
      return NextResponse.json({
        ok: true,
        pass: false,
        hint: '검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.',
      });
    }
  }

  return NextResponse.json(
    { ok: false, error: 'unknown_action' },
    { status: 400 },
  );
}
