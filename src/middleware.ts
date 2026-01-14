import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isInngestRoute = req.nextUrl.pathname.startsWith("/api/inngest");

  // Allow auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Allow Inngest routes (needed for dev server)
  if (isInngestRoute) {
    return NextResponse.next();
  }

  // In development, allow test routes without auth
  const isDevTestRoute = req.nextUrl.pathname.startsWith("/api/test");
  if (process.env.NODE_ENV === "development" && isDevTestRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow login page
  if (isLoginPage) {
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
