import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Only these routes are accessible without login
const PUBLIC_EXACT = ["/", "/community"]
const PUBLIC_PREFIX = ["/login", "/api/auth", "/api/courses", "/api/ain", "/api/knowledge", "/api/topics", "/api/explorations", "/api/frontier-map", "/api/x402", "/api/kite-mcp", "/explore"]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // CORS for x402 API routes — allow external agents to access payment endpoints
  if (pathname.startsWith("/api/x402")) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, Authorization",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-PAYMENT-RESPONSE",
      "Access-Control-Max-Age": "86400",
    }

    // Preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders })
    }

    // Actual request — pass through with CORS headers
    const response = NextResponse.next()
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value)
    }
    return response
  }

  // Allow exact public paths
  if (PUBLIC_EXACT.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow public prefix paths
  if (PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // In mock mode (no real session provider), allow all requests
  if (process.env.NEXT_PUBLIC_AUTH_MODE !== "real") {
    return NextResponse.next()
  }

  // Real auth mode: redirect unauthenticated users to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|maps|mock|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)",
  ],
}
