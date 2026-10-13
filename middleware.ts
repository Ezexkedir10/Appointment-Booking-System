import { NextResponse, type NextRequest } from "next/server"

/**
 * Cheap UX gate: send visitors without a session cookie to /login instead of showing an empty shell.
 * This is NOT the security boundary - every API route re-validates the session and role server-side.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("appointiq_session")) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/appointments/:path*", "/services/:path*", "/providers/:path*", "/clients/:path*", "/availability/:path*"],
}
