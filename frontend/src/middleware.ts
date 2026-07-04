import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessibles sans authentification
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  // Lecture du token depuis le cookie (posé côté serveur à la connexion)
  const accessToken =
    request.cookies.get("etp_access_token")?.value ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  // Utilisateur déjà authentifié tentant d'accéder à une page auth
  if (isPublicRoute && accessToken) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  // Utilisateur non authentifié tentant d'accéder à une route protégée
  if (!isPublicRoute && !accessToken && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Injection automatique du token dans les requêtes proxy (vers FastAPI)
  const requestHeaders = new Headers(request.headers);
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Appliqué sur toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - assets publics (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
