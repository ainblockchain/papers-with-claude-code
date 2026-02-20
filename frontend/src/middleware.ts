import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Only these routes are accessible without login
const PUBLIC_EXACT = ["/"]
const PUBLIC_PREFIX = ["/login", "/api/auth", "/explore"]

export default auth((req) => {
  const { pathname } = req.nextUrl

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
