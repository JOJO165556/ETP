import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Pages d'authentification : redirigent vers l'espace si une session existe. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/* Pages accessibles sans session (dont la page de sortie vers un site externe). */
const PUBLIC_ROUTES = [...AUTH_PAGES, "/leave"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  /*
   * Les routes /api/* sont exclues de la protection : certaines sont appelées
   * avant tout cookie de session (connexion, inscription, déconnexion). C'est
   * le backend qui applique l'authentification sur chaque endpoint.
   */
  const isApiRoute = pathname.startsWith("/api/");

  const accessToken =
    request.cookies.get("etp_access_token")?.value ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  /* Session ouverte sur une page d'authentification : retour à l'espace. */
  if (!isApiRoute && isAuthPage && accessToken) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  /* Visiteur sans session sur une page protégée : connexion avec retour. */
  if (!isApiRoute && !isPublicRoute && !accessToken && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* Injection du jeton pour les appels proxy vers le backend FastAPI. */
  const requestHeaders = new Headers(request.headers);
  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
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
