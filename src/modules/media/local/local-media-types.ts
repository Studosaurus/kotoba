export interface PodcastSource {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  feedUrl: string;
  source: "curated" | "user";
}

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  podcastTitle: string;
  title: string;
  description?: string;
  audioUrl: string;
  durationMs?: number;
  imageUrl?: string;
  publishedAt?: string;
  feedUrl: string;
}

export interface CurrentEpisodePlayback {
  podcastId: string;
  podcastTitle: string;
  episodeId: string;
  episodeTitle: string;
  artworkUrl?: string;
  audioUrl: string;
  feedUrl: string;
  durationMs?: number;
  positionMs: number;
  isPlaying: boolean;
  playbackRate: number;
  queue?: PodcastEpisode[];
  queueIndex?: number;
  updatedAt: string;
}

export interface EpisodePlaybackProgress {
  episodeId: string;
  podcastId: string;
  positionMs: number;
  durationMs?: number;
  listenedAt?: string;
  updatedAt: string;
}

export interface MediaUserSettings {
  isOldestFirst: boolean;
  playbackRate: number;
  goals: ListeningGoals;
}

export interface ListeningGoals {
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
}

export interface ListeningStatsEntry {
  listenedMs: number;
  updatedAt: string;
}

export interface ListeningStats {
  totalMs: number;
  byDay: Record<string, ListeningStatsEntry>;
  byWeek: Record<string, ListeningStatsEntry>;
  byMonth: Record<string, ListeningStatsEntry>;
  byPodcast: Record<string, ListeningStatsEntry>;
  byEpisode: Record<string, ListeningStatsEntry>;
}
