import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const ADMIN_ONLY_PATHS = ["/analytics", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = role === "tech_support" || role === "admin";

  if (pathname === "/login") {
    if (isLoggedIn) return NextResponse.redirect(new URL("/cases", request.url));
    return NextResponse.next();
  }

  // UC-015: every screen must redirect to Login first when unauthenticated.
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // UC-015 + tech_agent.role: Analytics / Automation Settings are admin-only.
  if (role !== "admin" && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/cases", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
