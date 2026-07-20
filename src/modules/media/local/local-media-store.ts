import type {
  CurrentEpisodePlayback,
  EpisodePlaybackProgress,
  ListeningStats,
  MediaUserSettings,
  PodcastSource,
} from "./local-media-types";
import { curatedPodcasts } from "../services/curated-podcasts";

const USER_PODCASTS_KEY = "kotoba:user-podcasts";
const CURRENT_PLAYBACK_KEY = "kotoba:current-episode-playback";
const EPISODE_PROGRESS_KEY = "kotoba:episode-progress";
const MEDIA_SETTINGS_KEY = "kotoba:media-settings";
const LISTENING_STATS_KEY = "kotoba:listening-stats";

const DEFAULT_MEDIA_SETTINGS: MediaUserSettings = {
  isOldestFirst: false,
  playbackRate: 1,
  goals: {
    dailyMinutes: 15,
    weeklyMinutes: 120,
    monthlyMinutes: 480,
  },
};

const EMPTY_LISTENING_STATS: ListeningStats = {
  totalMs: 0,
  byDay: {},
  byWeek: {},
  byMonth: {},
  byPodcast: {},
  byEpisode: {},
};

export function loadPodcastSources() {
  if (typeof window === "undefined") {
    return curatedPodcasts;
  }

  try {
    const userPodcasts = JSON.parse(
      window.localStorage.getItem(USER_PODCASTS_KEY) ?? "[]",
    ) as PodcastSource[];

    return [...curatedPodcasts, ...userPodcasts];
  } catch {
    return curatedPodcasts;
  }
}

export function saveUserPodcast(source: PodcastSource) {
  const existing = loadPodcastSources().filter((podcast) => podcast.source === "user");
  const next = [source, ...existing.filter((podcast) => podcast.id !== source.id)].slice(0, 20);
  window.localStorage.setItem(USER_PODCASTS_KEY, JSON.stringify(next));
}

export function loadCurrentEpisodePlayback() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CURRENT_PLAYBACK_KEY);
    return raw ? (JSON.parse(raw) as CurrentEpisodePlayback) : null;
  } catch {
    return null;
  }
}

export function saveCurrentEpisodePlayback(playback: CurrentEpisodePlayback | null) {
  if (!playback) {
    window.localStorage.removeItem(CURRENT_PLAYBACK_KEY);
    return;
  }

  window.localStorage.setItem(CURRENT_PLAYBACK_KEY, JSON.stringify(playback));
}

export function loadEpisodePlaybackProgress() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(EPISODE_PROGRESS_KEY) ?? "{}",
    ) as Record<string, EpisodePlaybackProgress>;
  } catch {
    return {};
  }
}

export function saveEpisodePlaybackProgress(progress: EpisodePlaybackProgress) {
  const existing = loadEpisodePlaybackProgress();
  const listenedAt =
    progress.durationMs && progress.positionMs / progress.durationMs >= 0.9
      ? (existing[progress.episodeId]?.listenedAt ?? new Date().toISOString())
      : existing[progress.episodeId]?.listenedAt;

  window.localStorage.setItem(
    EPISODE_PROGRESS_KEY,
    JSON.stringify({
      ...existing,
      [progress.episodeId]: {
        ...progress,
        listenedAt,
      },
    }),
  );
}

export function loadMediaUserSettings(): MediaUserSettings {
  if (typeof window === "undefined") {
    return DEFAULT_MEDIA_SETTINGS;
  }

  try {
    const storedSettings = JSON.parse(
      window.localStorage.getItem(MEDIA_SETTINGS_KEY) ?? "{}",
    ) as Partial<MediaUserSettings>;

    return {
      ...DEFAULT_MEDIA_SETTINGS,
      ...storedSettings,
      goals: {
        ...DEFAULT_MEDIA_SETTINGS.goals,
        ...storedSettings.goals,
      },
    };
  } catch {
    return DEFAULT_MEDIA_SETTINGS;
  }
}

export function saveMediaUserSettings(settings: MediaUserSettings) {
  window.localStorage.setItem(MEDIA_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadListeningStats(): ListeningStats {
  if (typeof window === "undefined") {
    return EMPTY_LISTENING_STATS;
  }

  try {
    return {
      ...EMPTY_LISTENING_STATS,
      ...(JSON.parse(window.localStorage.getItem(LISTENING_STATS_KEY) ?? "{}") as Partial<ListeningStats>),
    };
  } catch {
    return EMPTY_LISTENING_STATS;
  }
}

export function addListeningTime({
  playback,
  listenedMs,
  listenedAt = new Date(),
}: {
  playback: CurrentEpisodePlayback;
  listenedMs: number;
  listenedAt?: Date;
}) {
  if (typeof window === "undefined" || listenedMs <= 0) {
    return;
  }

  const stats = loadListeningStats();
  const updatedAt = listenedAt.toISOString();
  const nextStats: ListeningStats = {
    ...stats,
    totalMs: stats.totalMs + listenedMs,
    byDay: addToStatsBucket(stats.byDay, getDayKey(listenedAt), listenedMs, updatedAt),
    byWeek: addToStatsBucket(stats.byWeek, getWeekKey(listenedAt), listenedMs, updatedAt),
    byMonth: addToStatsBucket(stats.byMonth, getMonthKey(listenedAt), listenedMs, updatedAt),
    byPodcast: addToStatsBucket(stats.byPodcast, playback.podcastId, listenedMs, updatedAt),
    byEpisode: addToStatsBucket(stats.byEpisode, playback.episodeId, listenedMs, updatedAt),
  };

  window.localStorage.setItem(LISTENING_STATS_KEY, JSON.stringify(nextStats));
}

function addToStatsBucket(
  bucket: ListeningStats["byDay"],
  key: string,
  listenedMs: number,
  updatedAt: string,
) {
  return {
    ...bucket,
    [key]: {
      listenedMs: (bucket[key]?.listenedMs ?? 0) + listenedMs,
      updatedAt,
    },
  };
}

export function getCurrentListeningPeriodKeys(now = new Date()) {
  return {
    day: getDayKey(now),
    week: getWeekKey(now),
    month: getMonthKey(now),
  };
}

function getDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getMonthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function getWeekKey(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${date.getUTCFullYear()}-W${week.toString().padStart(2, "0")}`;
}
