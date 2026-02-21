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
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { message } = body;
  if (!message || typeof message !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'message is required' },
      { status: 400 },
    );
  }

  // Try MCP publication_guide tool first for knowledge queries
  try {
    const mcpRes = await fetch(`${COGITO_URL}/api/mcp-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'publication_guide',
        params: { query: message },
      }),
    });

    if (mcpRes.ok) {
      const mcpData = await mcpRes.json();
      const reply =
        typeof mcpData === 'string'
          ? mcpData
          : mcpData.result || mcpData.content || mcpData.text || JSON.stringify(mcpData);

      // Extract tx hash from payment response header if present
      const txHash =
        mcpRes.headers.get('x-payment-tx-hash') ||
        undefined;

      return NextResponse.json({ reply, txHash });
    }
  } catch {
    // MCP call failed, fall through to general chat
  }

  // Fallback: general agent chat endpoint
  try {
    const chatRes = await fetch(`${COGITO_URL}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (chatRes.ok) {
      const chatData = await chatRes.json();
      const reply =
        typeof chatData === 'string'
          ? chatData
          : chatData.reply || chatData.response || chatData.content || JSON.stringify(chatData);

      return NextResponse.json({ reply });
    }

    return NextResponse.json(
      {
        reply: `I received your message: "${message}". The Cogito knowledge service is currently processing. Please try again shortly.`,
      },
    );
  } catch (err) {
    console.error('[cogito-chat] Error forwarding to Cogito:', err);
    return NextResponse.json(
      {
        reply: 'Cogito is temporarily unavailable. Please try again later.',
      },
    );
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
  'base',
);

export async function POST(req: NextRequest) {
  return baseHandler(req);
}
