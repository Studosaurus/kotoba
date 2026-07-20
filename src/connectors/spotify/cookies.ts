import { type ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { SpotifyTokenSet } from "./types";

export const SPOTIFY_TOKEN_COOKIE = "kotoba_spotify_tokens";
export const SPOTIFY_AUTH_STATE_COOKIE = "kotoba_spotify_state";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export const spotifyCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
} satisfies Partial<ResponseCookie>;

export function encodeTokenCookie(tokens: SpotifyTokenSet) {
  return Buffer.from(JSON.stringify(tokens), "utf8").toString("base64url");
}

export function decodeTokenCookie(value?: string): SpotifyTokenSet | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SpotifyTokenSet;
  } catch {
    return null;
  }
}
