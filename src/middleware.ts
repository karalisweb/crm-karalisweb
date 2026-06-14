import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Confronto a tempo (quasi) costante, senza dipendenze Node (edge-runtime safe).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api");

  // 1. Rotte di autenticazione NextAuth: sempre permesse.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 2. Health check: pubblico (serve a deploy/monitoring, NON espone dati).
  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  // 3. Endpoint pubblici (video tracking, unsubscribe, ecc.).
  if (pathname.startsWith("/api/public/")) {
    return NextResponse.next();
  }

  // 4. Cron + endpoint interni: FAIL-CLOSED su CRON_SECRET.
  //    Prima erano lasciati passare senza alcun controllo ("localhost only" mai
  //    implementato): chiunque poteva azzerare i workflow o bruciare quota AI.
  //    Ora servono `Authorization: Bearer <CRON_SECRET>` su OGNI ambiente.
  if (
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/internal/")
  ) {
    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 5. Test API: solo in sviluppo, altrove invisibile.
  if (pathname.startsWith("/api/test")) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pagine pubbliche di autenticazione.
  const publicAuthPages = ["/login", "/forgot-password", "/reset-password"];
  const isPublicAuthPage = publicAuthPages.includes(pathname);

  // Redirect degli utenti loggati lontano dalle pagine di auth.
  if (isPublicAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isPublicAuthPage) {
    return NextResponse.next();
  }

  // Protezione API (richiede sessione).
  if (isApiRoute && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protezione di tutte le altre rotte (pagine).
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$|.*\\.js$|.*\\.css$|.*\\.woff2?$).*)"],
};
