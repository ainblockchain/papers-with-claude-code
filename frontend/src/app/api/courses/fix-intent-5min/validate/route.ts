import { NextRequest, NextResponse } from 'next/server';

/**
 * Validation stub for "fix-intent-5min" interactive course free-input fields.
 * 1차: 하드코딩 pass. 2차: LLM 연결.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldId, value } = body ?? {};
    if (!fieldId || value == null) {
      return NextResponse.json(
        { ok: false, error: 'fieldId and value are required' },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, pass: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'validate failed' },
      { status: 500 },
    );
  }
}
