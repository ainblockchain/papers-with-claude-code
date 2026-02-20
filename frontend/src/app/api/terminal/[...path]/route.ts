import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_TERMINAL_API_URL || "http://localhost:31000";

/**
 * Proxy all /api/terminal/* requests to the K8s web-terminal backend.
 * This avoids mixed-content (HTTPS→HTTP) blocking in production.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const subPath = path.join("/");
  const targetUrl = `${BACKEND_URL}/api/${subPath}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Backend unreachable: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PUT = proxy;
export const PATCH = proxy;
