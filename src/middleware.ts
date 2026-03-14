import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api");
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isCronRoute = pathname.startsWith("/api/cron");

  // Pagine pubbliche di autenticazione
  const publicAuthPages = ["/login", "/forgot-password", "/reset-password"];
  const isPublicAuthPage = publicAuthPages.includes(pathname);

  // Allow auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Allow cron routes (protected internally by CRON_SECRET header or localhost)
  if (isCronRoute) {
    return NextResponse.next();
  }

  // Allow internal batch endpoints (temporary, localhost only)
  const isBatchRoute = pathname.startsWith("/api/internal/");
  if (isBatchRoute) {
    return NextResponse.next();
  }

  // Allow public API endpoints (video tracking, etc.)
  const isPublicRoute = pathname.startsWith("/api/public/");
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // In development, allow test routes without auth
  const isDevTestRoute = pathname.startsWith("/api/test");
  if (process.env.NODE_ENV === "development" && isDevTestRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from public auth pages
  if (isPublicAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow public auth pages
  if (isPublicAuthPage) {
    return NextResponse.next();
  }

  // Protect API routes
  if (isApiRoute && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
