import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canAccess } from "@/lib/permissions";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ["/login"];
  const publicPrefixes = ["/roster/confirm/"];
  const isPublic = publicPaths.includes(pathname) || publicPrefixes.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Only enforce page-level permissions (API routes have their own auth guards)
  if (!pathname.startsWith("/api/")) {
    const role = req.auth?.user?.role;
    if (!canAccess(role, pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
