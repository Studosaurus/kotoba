import { NextResponse, type NextRequest } from "next/server";
import { buildSpotifyAuthorizeUrl, hasSpotifyConfig } from "@/connectors/spotify/api";
import {
  SPOTIFY_AUTH_STATE_COOKIE,
  spotifyCookieOptions,
} from "@/connectors/spotify/cookies";

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!hasSpotifyConfig()) {
    return NextResponse.redirect(new URL("/connectors?spotify=missing-config", origin));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(origin, state));
  response.cookies.set(SPOTIFY_AUTH_STATE_COOKIE, state, {
    ...spotifyCookieOptions,
    maxAge: 60 * 10,
  });

  return response;
}
