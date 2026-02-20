import { auth } from "@/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/auth"]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
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
    // Match all paths except static files, images, and API routes (except auth)
    "/((?!_next/static|_next/image|favicon.ico|public|maps|courses|mock|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)",
  ],
}
