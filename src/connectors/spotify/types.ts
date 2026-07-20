import type { PlaybackState } from "@/domains/media/types";

export interface SpotifyTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

export interface SpotifyConnectionState {
  connected: boolean;
  needsConfiguration?: boolean;
  playback?: PlaybackState;
  error?: string;
}

export interface SpotifyCurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  item: SpotifyTrackItem | SpotifyEpisodeItem | null;
}

interface SpotifyExternalUrls {
  spotify?: string;
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  type: "track";
  duration_ms?: number;
  external_urls?: SpotifyExternalUrls;
  album?: {
    name?: string;
  };
  artists?: Array<{
    name: string;
  }>;
}

interface SpotifyEpisodeItem {
  id: string;
  name: string;
  type: "episode";
  duration_ms?: number;
  external_urls?: SpotifyExternalUrls;
  show?: {
    name?: string;
  };
}
