import { NextResponse, type NextRequest } from "next/server";
import {
  getSpotifyCurrentlyPlaying,
  hasSpotifyConfig,
  refreshSpotifyTokens,
  shouldRefreshSpotifyToken,
} from "@/connectors/spotify/api";
import {
  decodeTokenCookie,
  encodeTokenCookie,
  SPOTIFY_TOKEN_COOKIE,
  spotifyCookieOptions,
} from "@/connectors/spotify/cookies";
import type { SpotifyConnectionState } from "@/connectors/spotify/types";

export async function GET(request: NextRequest) {
  if (!hasSpotifyConfig()) {
    return NextResponse.json({
      connected: false,
      needsConfiguration: true,
      error: "Spotify credentials are not configured.",
    } satisfies SpotifyConnectionState);
  }

  const tokens = decodeTokenCookie(request.cookies.get(SPOTIFY_TOKEN_COOKIE)?.value);

  if (!tokens) {
    return NextResponse.json({ connected: false } satisfies SpotifyConnectionState);
  }

  try {
    const nextTokens = shouldRefreshSpotifyToken(tokens)
      ? await refreshSpotifyTokens(tokens)
      : tokens;
    const playback = await getSpotifyCurrentlyPlaying(nextTokens.accessToken);
    const response = NextResponse.json({
      connected: true,
      playback: playback ?? undefined,
    } satisfies SpotifyConnectionState);

    if (nextTokens !== tokens) {
      response.cookies.set(
        SPOTIFY_TOKEN_COOKIE,
        encodeTokenCookie(nextTokens),
        spotifyCookieOptions,
      );
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        connected: true,
        error: "Could not read Spotify playback.",
      } satisfies SpotifyConnectionState,
      { status: 502 },
    );
  }
}
