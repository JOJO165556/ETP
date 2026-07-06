import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token) {
      return NextResponse.json({ error: "Token d'accès manquant" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Cookie HttpOnly sécurisé pour empêcher l'accès via JS (XSS)
    cookieStore.set({
      name: "etp_access_token",
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 semaine
    });

    if (refresh_token) {
      cookieStore.set({
        name: "etp_refresh_token",
        value: refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 jours
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
