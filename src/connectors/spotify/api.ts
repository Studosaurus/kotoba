import { serverEnv } from "@/config/server-env";
import type { PlaybackState } from "@/domains/media/types";
import type {
  SpotifyCurrentlyPlayingResponse,
  SpotifyTokenSet,
} from "./types";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = ["user-read-currently-playing", "user-read-playback-state"];

export function hasSpotifyConfig() {
  return Boolean(serverEnv.SPOTIFY_CLIENT_ID && serverEnv.SPOTIFY_CLIENT_SECRET);
}

export function buildSpotifyAuthorizeUrl(origin: string, state: string) {
  if (!serverEnv.SPOTIFY_CLIENT_ID) {
    throw new Error("Spotify client ID is not configured.");
  }

  const authorizeUrl = new URL("/authorize", SPOTIFY_ACCOUNTS_URL);
  authorizeUrl.searchParams.set("client_id", serverEnv.SPOTIFY_CLIENT_ID);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", getSpotifyRedirectUri(origin));
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", state);

  return authorizeUrl;
}

export async function exchangeSpotifyCode(origin: string, code: string) {
  const payload = await requestSpotifyTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: getSpotifyRedirectUri(origin),
  });

  return createTokenSet(payload);
}

export async function refreshSpotifyTokens(tokens: SpotifyTokenSet) {
  const payload = await requestSpotifyTokens({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });

  return createTokenSet({
    ...payload,
    refresh_token: payload.refresh_token ?? tokens.refreshToken,
  });
}

export async function getSpotifyCurrentlyPlaying(accessToken: string): Promise<PlaybackState | null> {
  const response = await fetch(`${SPOTIFY_API_URL}/me/player/currently-playing`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Spotify currently playing failed: ${response.status}`);
  }

  const payload = (await response.json()) as SpotifyCurrentlyPlayingResponse;

  if (!payload.item || payload.currently_playing_type === "ad") {
    return null;
  }

  const collectionTitle =
    payload.item.type === "episode"
      ? payload.item.show?.name
      : payload.item.artists?.map((artist) => artist.name).join(", ") || payload.item.album?.name;

  return {
    item: {
      id: `spotify:${payload.item.type}:${payload.item.id}`,
      sourceId: "spotify",
      title: payload.item.name,
      collectionTitle,
      durationMs: payload.item.duration_ms,
      externalReference: {
        connectorId: "spotify",
        externalId: payload.item.id,
        externalUrl: payload.item.external_urls?.spotify,
      },
    },
    positionMs: payload.progress_ms ?? 0,
    observedAt: new Date().toISOString(),
    isPlaying: payload.is_playing,
  };
}

export function shouldRefreshSpotifyToken(tokens: SpotifyTokenSet) {
  return tokens.expiresAt - Date.now() < 60_000;
}

function getSpotifyRedirectUri(origin: string) {
  return `${origin}/api/connectors/spotify/callback`;
}

async function requestSpotifyTokens(body: Record<string, string>) {
  if (!serverEnv.SPOTIFY_CLIENT_ID || !serverEnv.SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify credentials are not configured.");
  }

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${serverEnv.SPOTIFY_CLIENT_ID}:${serverEnv.SPOTIFY_CLIENT_SECRET}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Spotify token exchange failed: ${response.status}`);
  }

  return (await response.json()) as SpotifyTokenResponse;
}

function createTokenSet(payload: SpotifyTokenResponse): SpotifyTokenSet {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    scope: payload.scope,
  };
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token: string;
}
