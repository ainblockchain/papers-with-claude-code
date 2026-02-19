import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerAddress, topicPath, entryId } = body;

    if (!ownerAddress || !topicPath || !entryId) {
      return NextResponse.json(
        { ok: false, error: 'ownerAddress, topicPath, and entryId are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    ain.knowledge.setupAinX402Client();
    const result = await ain.knowledge.access(ownerAddress, topicPath, entryId);

    return NextResponse.json({
      ok: true,
      data: {
        content: result.content,
        paid: result.paid,
        receipt: result.receipt || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to access entry' },
      { status: 500 }
    );
  }
}
