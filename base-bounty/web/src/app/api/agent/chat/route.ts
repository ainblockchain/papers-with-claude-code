import { NextRequest, NextResponse } from 'next/server';

// In-memory chat queue — messages are displayed in the chatbox
// and can be consumed by the agent when it's running
const chatMessages: { message: string; timestamp: number }[] = [];

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message field is required' }, { status: 400 });
    }

    chatMessages.push({ message, timestamp: Date.now() });
    // Keep last 50 messages
    if (chatMessages.length > 50) chatMessages.splice(0, chatMessages.length - 50);

    return NextResponse.json({ queued: true, position: chatMessages.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ messages: chatMessages });
}
