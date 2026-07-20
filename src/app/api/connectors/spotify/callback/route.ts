import { NextResponse, type NextRequest } from "next/server";
import { exchangeSpotifyCode } from "@/connectors/spotify/api";
import {
  encodeTokenCookie,
  SPOTIFY_AUTH_STATE_COOKIE,
  SPOTIFY_TOKEN_COOKIE,
  spotifyCookieOptions,
} from "@/connectors/spotify/cookies";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(SPOTIFY_AUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/connectors?spotify=auth-failed", origin));
  }

  try {
    const tokens = await exchangeSpotifyCode(origin, code);
    const response = NextResponse.redirect(new URL("/connectors?spotify=connected", origin));

    response.cookies.set(SPOTIFY_TOKEN_COOKIE, encodeTokenCookie(tokens), spotifyCookieOptions);
    response.cookies.delete(SPOTIFY_AUTH_STATE_COOKIE);

    return response;
  } catch {
    return NextResponse.redirect(new URL("/connectors?spotify=auth-failed", origin));
  }
}
