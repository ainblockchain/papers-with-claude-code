export const dynamic = 'force-dynamic';

export async function GET() {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3402';

  try {
    const response = await fetch(`${agentUrl}/stream`, {
      headers: { Accept: 'text/event-stream' },
    });

    if (!response.ok || !response.body) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ message: 'Agent not reachable' })}\n\n`,
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: 'Failed to connect to agent' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
    );
  }
}
