import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3402';

  try {
    const res = await fetch(`${agentUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reach agent' }, { status: 502 });
  }
}
