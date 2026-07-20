import type { ExternalReference } from "@/domains/connectors/types";
import type { ISODateTime } from "@/shared/types/common";

export interface MediaSource {
  id: string;
  name: string;
  externalReference?: ExternalReference;
}

export interface MediaItem {
  id: string;
  sourceId: string;
  title: string;
  collectionTitle?: string;
  durationMs?: number;
  externalReference?: ExternalReference;
}

export interface PlaybackState {
  item: MediaItem;
  positionMs: number;
  observedAt: ISODateTime;
  isPlaying: boolean;
}

