import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("etp_access_token");
  cookieStore.delete("etp_refresh_token");

  return NextResponse.json({ success: true });
}

export async function GET() {
  /*
   * Sécurité anti-prefetch Next.js :
   * Ne jamais déconnecter sur une requête GET pour éviter que le prefetch
   * automatique des liens Next.js ne détruise la session utilisateur.
   */
  return NextResponse.json(
    { error: "Méthode non autorisée pour la déconnexion" },
    { status: 405 }
  );
}