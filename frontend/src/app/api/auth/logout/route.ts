import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete("etp_access_token");
  cookieStore.delete("etp_refresh_token");

  const loginUrl = new URL("/login", request.nextUrl);
  return NextResponse.redirect(loginUrl, { status: 303 });
}