import { NextResponse, type NextRequest } from "next/server";
import {
  SPOTIFY_AUTH_STATE_COOKIE,
  SPOTIFY_TOKEN_COOKIE,
} from "@/connectors/spotify/cookies";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/connectors?spotify=disconnected", request.url),
    303,
  );
  response.cookies.delete(SPOTIFY_TOKEN_COOKIE);
  response.cookies.delete(SPOTIFY_AUTH_STATE_COOKIE);

  return response;
}
