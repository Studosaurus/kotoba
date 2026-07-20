"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CurrentEpisodePlayback, PodcastEpisode } from "../local/local-media-types";
import {
  addListeningTime,
  loadCurrentEpisodePlayback,
  loadMediaUserSettings,
  saveEpisodePlaybackProgress,
  saveCurrentEpisodePlayback,
  saveMediaUserSettings,
} from "../local/local-media-store";

interface MediaPlayerContextValue {
  playback: CurrentEpisodePlayback | null;
  isExpanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  playEpisode(episode: PodcastEpisode, queue?: PodcastEpisode[]): void;
  playNextEpisode(): void;
  playPreviousEpisode(): void;
  togglePlay(): void;
  pause(): void;
  seek(positionMs: number): void;
  setPlaybackRate(rate: number): void;
}

const MediaPlayerContext = createContext<MediaPlayerContextValue | null>(null);

export function MediaPlayerProvider({ children }: Readonly<{ children: ReactNode }>) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackedPositionMsRef = useRef<number | null>(null);
  const [playback, setPlayback] = useState<CurrentEpisodePlayback | null>(() =>
    loadCurrentEpisodePlayback(),
  );
  const [isExpanded, setExpanded] = useState(false);
  const audioUrl = playback?.audioUrl;
  const isPlaying = playback?.isPlaying;
  const playbackRate = playback?.playbackRate;

  const updatePlayback = useCallback((updater: (playback: CurrentEpisodePlayback) => CurrentEpisodePlayback) => {
    setPlayback((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      saveCurrentEpisodePlayback(next);
      return next;
    });
  }, []);

  const playEpisode = useCallback((episode: PodcastEpisode, queue: PodcastEpisode[] = [episode]) => {
    const queueIndex = Math.max(0, queue.findIndex((queuedEpisode) => queuedEpisode.id === episode.id));
    const mediaSettings = loadMediaUserSettings();
    const nextPlayback: CurrentEpisodePlayback = {
      podcastId: episode.podcastId,
      podcastTitle: episode.podcastTitle,
      episodeId: episode.id,
      episodeTitle: episode.title,
      artworkUrl: episode.imageUrl,
      audioUrl: episode.audioUrl,
      feedUrl: episode.feedUrl,
      durationMs: episode.durationMs,
      positionMs: 0,
      isPlaying: true,
      playbackRate: mediaSettings.playbackRate,
      queue,
      queueIndex,
      updatedAt: new Date().toISOString(),
    };

    setPlayback(nextPlayback);
    saveCurrentEpisodePlayback(nextPlayback);
  }, []);

  const playQueuedEpisode = useCallback((episode: PodcastEpisode, queue: PodcastEpisode[], queueIndex: number) => {
    const nextPlayback: CurrentEpisodePlayback = {
      podcastId: episode.podcastId,
      podcastTitle: episode.podcastTitle,
      episodeId: episode.id,
      episodeTitle: episode.title,
      artworkUrl: episode.imageUrl,
      audioUrl: episode.audioUrl,
      feedUrl: episode.feedUrl,
      durationMs: episode.durationMs,
      positionMs: 0,
      isPlaying: true,
      playbackRate: playback?.playbackRate ?? 1,
      queue,
      queueIndex,
      updatedAt: new Date().toISOString(),
    };

    setPlayback(nextPlayback);
    saveCurrentEpisodePlayback(nextPlayback);
  }, [playback?.playbackRate]);

  const playNextEpisode = useCallback(() => {
    if (!playback) {
      return;
    }

    const queue = playback.queue ?? [];
    const currentIndex = playback.queueIndex ?? queue.findIndex((episode) => episode.id === playback.episodeId);
    const nextEpisode = queue[currentIndex + 1];

    if (!nextEpisode) {
      updatePlayback((current) => ({ ...current, isPlaying: false, positionMs: current.durationMs ?? current.positionMs }));
      return;
    }

    playQueuedEpisode(nextEpisode, queue, currentIndex + 1);
  }, [playQueuedEpisode, playback, updatePlayback]);

  const playPreviousEpisode = useCallback(() => {
    if (!playback?.queue?.length) {
      return;
    }

    const queue = playback.queue;
    const currentIndex = playback.queueIndex ?? queue.findIndex((episode) => episode.id === playback.episodeId);
    const previousEpisode = queue[currentIndex - 1];

    if (!previousEpisode) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      updatePlayback((current) => ({ ...current, positionMs: 0 }));
      return;
    }

    playQueuedEpisode(previousEpisode, queue, currentIndex - 1);
  }, [playQueuedEpisode, playback, updatePlayback]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !playback) {
      return;
    }

    if (audio.paused) {
      void audio.play();
      updatePlayback((current) => ({ ...current, isPlaying: true }));
    } else {
      audio.pause();
      updatePlayback((current) => ({ ...current, isPlaying: false }));
    }
  }, [playback, updatePlayback]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    updatePlayback((current) => ({ ...current, isPlaying: false }));
  }, [updatePlayback]);

  const seek = useCallback(
    (positionMs: number) => {
      const audio = audioRef.current;

      if (audio) {
        audio.currentTime = positionMs / 1000;
      }

      updatePlayback((current) => ({ ...current, positionMs }));
    },
    [updatePlayback],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }

      saveMediaUserSettings({
        ...loadMediaUserSettings(),
        playbackRate: rate,
      });
      updatePlayback((current) => ({ ...current, playbackRate: rate }));
    },
    [updatePlayback],
  );

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) {
      return;
    }

    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.currentTime = (playback?.positionMs ?? 0) / 1000;
      lastTrackedPositionMsRef.current = playback?.positionMs ?? 0;
    }

    audio.playbackRate = playbackRate ?? 1;

    if (isPlaying) {
      void audio.play().catch(() => {
        updatePlayback((current) => ({ ...current, isPlaying: false }));
      });
    }
  }, [audioUrl, isPlaying, playback?.positionMs, playbackRate, updatePlayback]);

  const value = useMemo(
    () => ({
      playback,
      isExpanded,
      setExpanded,
      playEpisode,
      playNextEpisode,
      playPreviousEpisode,
      togglePlay,
      pause,
      seek,
      setPlaybackRate,
    }),
    [isExpanded, playEpisode, playNextEpisode, playPreviousEpisode, playback, pause, seek, setPlaybackRate, togglePlay],
  );

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onLoadedMetadata={(event) => {
          const durationMs = Math.floor(event.currentTarget.duration * 1000);

          if (Number.isFinite(durationMs)) {
            updatePlayback((current) => ({ ...current, durationMs }));
          }
        }}
        onPause={() => updatePlayback((current) => ({ ...current, isPlaying: false }))}
        onPlay={() => updatePlayback((current) => ({ ...current, isPlaying: true }))}
        onTimeUpdate={(event) => {
          const positionMs = Math.floor(event.currentTarget.currentTime * 1000);
          updatePlayback((current) => ({
            ...current,
            positionMs,
            updatedAt: new Date().toISOString(),
          }));
          if (playback) {
            const previousPositionMs = lastTrackedPositionMsRef.current;
            const listenedDeltaMs =
              previousPositionMs !== null ? positionMs - previousPositionMs : 0;

            if (playback.isPlaying && listenedDeltaMs > 0 && listenedDeltaMs <= 5_000) {
              addListeningTime({
                playback,
                listenedMs: listenedDeltaMs,
              });
            }

            lastTrackedPositionMsRef.current = positionMs;
            saveEpisodePlaybackProgress({
              episodeId: playback.episodeId,
              podcastId: playback.podcastId,
              positionMs,
              durationMs: playback.durationMs,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
        onEnded={playNextEpisode}
      />
    </MediaPlayerContext.Provider>
  );
}

export function useMediaPlayer() {
  const context = useContext(MediaPlayerContext);

  if (!context) {
    throw new Error("useMediaPlayer must be used inside MediaPlayerProvider.");
  }

  return context;
}
