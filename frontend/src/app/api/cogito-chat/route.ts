import { NextRequest, NextResponse } from 'next/server';
import {
  buildBaseRouteConfig,
  createWrappedHandler,
} from '../x402/_lib/x402-nextjs';

const COGITO_URL = process.env.NEXT_PUBLIC_COGITO_URL || 'https://cogito.ainetwork.ai';

// GET — proxy the A2A agent card (avoids browser CORS)
export async function GET() {
  try {
    const res = await fetch(`${COGITO_URL}/.well-known/agent-card.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status },
      );
    }
    const card = await res.json();
    return NextResponse.json(card);
  } catch (err) {
    console.error('[cogito-chat] Agent card fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch agent card' },
      { status: 502 },
    );
  }
}

async function handleCogitoChat(req: NextRequest): Promise<NextResponse> {
  let body: { message?: string; contextId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { message, contextId } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'message is required' },
      { status: 400 },
    );
  }

  // Send via A2A protocol (JSON-RPC message/send)
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rpcId = `rpc-${Date.now()}`;

  try {
    const a2aRes = await fetch(`${COGITO_URL}/api/a2a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'message/send',
        id: rpcId,
        params: {
          message: {
            messageId,
            role: 'user',
            parts: [{ type: 'text', text: message }],
          },
          ...(contextId && { configuration: { contextId } }),
        },
      }),
    });

    if (!a2aRes.ok) {
      console.error('[cogito-chat] A2A endpoint returned', a2aRes.status);
      return NextResponse.json({
        reply: 'Cogito is temporarily unavailable. Please try again later.',
      });
    }

    const rpcData = await a2aRes.json();

    // Handle JSON-RPC error
    if (rpcData.error) {
      console.error('[cogito-chat] A2A RPC error:', rpcData.error);
      return NextResponse.json({
        reply: `Cogito error: ${rpcData.error.message || 'Unknown error'}`,
      });
    }

    // Extract text from A2A response parts
    const result = rpcData.result;
    const textParts = (result?.parts || [])
      .filter((p: { kind?: string; type?: string }) => p.kind === 'text' || p.type === 'text')
      .map((p: { text?: string }) => p.text || '')
      .join('\n');

    return NextResponse.json({
      reply: textParts || 'No response from Cogito.',
      contextId: result?.contextId,
      messageId: result?.messageId,
    });
  } catch (err) {
    console.error('[cogito-chat] Error forwarding to Cogito:', err);
    return NextResponse.json({
      reply: 'Cogito is temporarily unavailable. Please try again later.',
    });
  }
}

// x402-gated handler — payment required to talk to Cogito (Base chain)
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const baseHandler = createWrappedHandler(
  handleCogitoChat,
  buildBaseRouteConfig({
    description: 'Chat with Cogito Knowledge Agent',
    resource: `${baseUrl}/api/cogito-chat`,
  }),
);

export async function POST(req: NextRequest) {
  return baseHandler(req);
}
