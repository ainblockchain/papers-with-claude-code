import { NextRequest, NextResponse } from 'next/server';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';
import { buildChatbotTopicPrompt } from '@/lib/courses/fix-intent-5min/prompts/chatbot';
import {
  callAzureResponses,
  parseJsonLeniently,
} from '@/lib/server/azure-openai';

interface Body {
  question?: string;
  context?: {
    representativeIntent?: SelectedIntent | null;
  };
}

/**
 * Stage-4 Dev chatbot gate. Returns `onTopic` = true iff the learner's
 * question is related to the exam-absence / 시험 결시 topic they just
 * fixed. Called by ChatbotTestPage before it decides which canned reply
 * to render.
 *
 * Failures and unparseable LLM outputs degrade to onTopic=false, which
 * surfaces the "wrong topic — try the Stage 1 utterance" reply and lets
 * the learner keep typing. No 5xx bubbling up.
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

  const { question, context } = body;
  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json(
      { ok: false, error: 'invalid_params' },
      { status: 400 },
    );
  }

  try {
    const { instructions, input } = buildChatbotTopicPrompt(
      context?.representativeIntent ?? null,
      question.trim(),
    );
    const { text } = await callAzureResponses({ instructions, input });
    const parsed = parseJsonLeniently(text) as { onTopic?: unknown } | null;
    if (!parsed || typeof parsed.onTopic !== 'boolean') {
      console.error('[validate-chatbot] unparseable LLM response', { text });
      return NextResponse.json({ ok: true, onTopic: false });
    }
    return NextResponse.json({ ok: true, onTopic: parsed.onTopic });
  } catch (err) {
    console.error('[validate-chatbot] call failed', err);
    return NextResponse.json({ ok: true, onTopic: false });
  }
}
