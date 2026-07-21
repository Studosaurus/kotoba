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
  loadEpisodePlaybackProgress,
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
  prepareForMicrophoneCapture(): void;
  recoverFromMicrophoneCapture(): void;
  seek(positionMs: number): void;
  setPlaybackRate(rate: number): void;
}

const MediaPlayerContext = createContext<MediaPlayerContextValue | null>(null);

interface MicrophoneRecoverySnapshot {
  episodeId: string;
  positionMs: number;
  playbackRate: number;
}

export function MediaPlayerProvider({ children }: Readonly<{ children: ReactNode }>) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackedPositionMsRef = useRef<number | null>(null);
  const lastTrackedAtMsRef = useRef<number | null>(null);
  const playbackRef = useRef<CurrentEpisodePlayback | null>(null);
  const isChangingEpisodeRef = useRef(false);
  const isSeekingRef = useRef(false);
  const pendingSeekPositionMsRef = useRef<number | null>(null);
  const seekRetryCountRef = useRef(0);
  const completedEpisodeIdRef = useRef<string | null>(null);
  const microphoneRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const microphoneRecoverySnapshotRef = useRef<MicrophoneRecoverySnapshot | null>(null);
  const pendingLoadPositionMsRef = useRef<number | null>(null);
  const playAfterRecoveryRef = useRef(false);
  const [playback, setPlayback] = useState<CurrentEpisodePlayback | null>(() =>
    loadCurrentEpisodePlayback(),
  );
  const [isExpanded, setExpanded] = useState(false);
  const [audioElementGeneration, setAudioElementGeneration] = useState(0);
  const audioUrl = playback?.audioUrl;
  const isPlaying = playback?.isPlaying;
  const playbackRate = playback?.playbackRate;

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(
    () => () => {
      if (microphoneRecoveryTimeoutRef.current) {
        clearTimeout(microphoneRecoveryTimeoutRef.current);
      }
    },
    [],
  );

  const updatePlayback = useCallback((updater: (playback: CurrentEpisodePlayback) => CurrentEpisodePlayback) => {
    setPlayback((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      playbackRef.current = next;
      saveCurrentEpisodePlayback(next);
      return next;
    });
  }, []);

  const playEpisode = useCallback((episode: PodcastEpisode, queue: PodcastEpisode[] = [episode]) => {
    const queueIndex = Math.max(0, queue.findIndex((queuedEpisode) => queuedEpisode.id === episode.id));
    const mediaSettings = loadMediaUserSettings();
    const resumePositionMs = getEpisodeResumePositionMs(episode);
    const nextPlayback: CurrentEpisodePlayback = {
      podcastId: episode.podcastId,
      podcastTitle: episode.podcastTitle,
      episodeId: episode.id,
      episodeTitle: episode.title,
      artworkUrl: episode.imageUrl,
      audioUrl: episode.audioUrl,
      feedUrl: episode.feedUrl,
      durationMs: episode.durationMs,
      positionMs: resumePositionMs,
      isPlaying: true,
      playbackRate: mediaSettings.playbackRate,
      queue,
      queueIndex,
      updatedAt: new Date().toISOString(),
    };

    completedEpisodeIdRef.current = null;
    isChangingEpisodeRef.current = true;
    pendingLoadPositionMsRef.current = resumePositionMs;
    loadEpisodeAudio(audioRef.current, nextPlayback);
    lastTrackedPositionMsRef.current = resumePositionMs;
    lastTrackedAtMsRef.current = Date.now();
    playbackRef.current = nextPlayback;
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
      playbackRate: playbackRef.current?.playbackRate ?? 1,
      queue,
      queueIndex,
      updatedAt: new Date().toISOString(),
    };

    isChangingEpisodeRef.current = true;
    loadEpisodeAudio(audioRef.current, nextPlayback);
    lastTrackedPositionMsRef.current = 0;
    lastTrackedAtMsRef.current = Date.now();
    playbackRef.current = nextPlayback;
    setPlayback(nextPlayback);
    saveCurrentEpisodePlayback(nextPlayback);
  }, []);

  const playNextEpisode = useCallback(() => {
    const currentPlayback = playbackRef.current;

    if (!currentPlayback) {
      return;
    }

    const queue = currentPlayback.queue ?? [];
    const currentIndex =
      currentPlayback.queueIndex ??
      queue.findIndex((episode) => episode.id === currentPlayback.episodeId);
    const nextEpisode = queue[currentIndex + 1];

    if (!nextEpisode) {
      isChangingEpisodeRef.current = false;
      updatePlayback((current) => ({
        ...current,
        isPlaying: false,
        positionMs: current.durationMs ?? current.positionMs,
      }));
      return;
    }

    playQueuedEpisode(nextEpisode, queue, currentIndex + 1);
  }, [playQueuedEpisode, updatePlayback]);

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

    const recoverySnapshot = microphoneRecoverySnapshotRef.current;

    if (recoverySnapshot?.episodeId === playback.episodeId) {
      playAfterRecoveryRef.current = true;
      isSeekingRef.current = true;
      pendingSeekPositionMsRef.current = recoverySnapshot.positionMs;
      seekRetryCountRef.current = 0;
      requestNativeSeek(audio, recoverySnapshot.positionMs);
      if (microphoneRecoveryTimeoutRef.current) {
        clearTimeout(microphoneRecoveryTimeoutRef.current);
      }
      microphoneRecoveryTimeoutRef.current = setTimeout(() => {
        microphoneRecoveryTimeoutRef.current = null;
        isSeekingRef.current = false;
        pendingSeekPositionMsRef.current = null;
        playAfterRecoveryRef.current = false;
      }, 3_000);
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

  const prepareForMicrophoneCapture = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    const positionMs = Math.floor(audio.currentTime * 1000);
    const currentPlayback = playbackRef.current;

    if (currentPlayback) {
      microphoneRecoverySnapshotRef.current = {
        episodeId: currentPlayback.episodeId,
        positionMs,
        playbackRate: currentPlayback.playbackRate,
      };
    }

    updatePlayback((current) => ({
      ...current,
      isPlaying: false,
      positionMs,
      updatedAt: new Date().toISOString(),
    }));
  }, [updatePlayback]);

  const recoverFromMicrophoneCapture = useCallback(() => {
    const audio = audioRef.current;
    const currentPlayback = playbackRef.current;
    const recoverySnapshot = microphoneRecoverySnapshotRef.current;

    if (!audio || !currentPlayback || !recoverySnapshot) {
      return;
    }

    audio.pause();
    lastTrackedPositionMsRef.current = recoverySnapshot.positionMs;
    lastTrackedAtMsRef.current = Date.now();
    updatePlayback((current) => ({
      ...current,
      isPlaying: false,
      positionMs: recoverySnapshot.positionMs,
      playbackRate: recoverySnapshot.playbackRate,
    }));

    if (microphoneRecoveryTimeoutRef.current) {
      clearTimeout(microphoneRecoveryTimeoutRef.current);
    }

    audioRef.current = null;
    setAudioElementGeneration((generation) => generation + 1);
  }, [updatePlayback]);

  const seek = useCallback(
    (positionMs: number) => {
      const audio = audioRef.current;
      const currentPlayback = playbackRef.current;
      const durationMs = currentPlayback?.durationMs;
      const targetPositionMs = Math.max(
        0,
        durationMs ? Math.min(positionMs, durationMs) : positionMs,
      );

      if (audio) {
        isSeekingRef.current = true;
        pendingSeekPositionMsRef.current = targetPositionMs;
        seekRetryCountRef.current = 0;
        requestNativeSeek(audio, targetPositionMs);
      }

      lastTrackedPositionMsRef.current = targetPositionMs;
      lastTrackedAtMsRef.current = Date.now();
      updatePlayback((current) => ({
        ...current,
        positionMs: targetPositionMs,
        updatedAt: new Date().toISOString(),
      }));
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
      pendingLoadPositionMsRef.current = playback?.positionMs ?? 0;
      audio.src = audioUrl;
      audio.load();
      lastTrackedPositionMsRef.current = playback?.positionMs ?? 0;
      lastTrackedAtMsRef.current = Date.now();
    }

    audio.playbackRate = playbackRate ?? 1;

    if (isPlaying) {
      void audio.play().catch(() => {
        updatePlayback((current) => ({ ...current, isPlaying: false }));
      });
    }
  }, [
    audioElementGeneration,
    audioUrl,
    isPlaying,
    playback?.positionMs,
    playbackRate,
    updatePlayback,
  ]);

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
      prepareForMicrophoneCapture,
      recoverFromMicrophoneCapture,
      seek,
      setPlaybackRate,
    }),
    [
      isExpanded,
      pause,
      playback,
      playEpisode,
      playNextEpisode,
      playPreviousEpisode,
      prepareForMicrophoneCapture,
      recoverFromMicrophoneCapture,
      seek,
      setPlaybackRate,
      togglePlay,
    ],
  );

  return (
    <MediaPlayerContext.Provider value={value}>
      {children}
      <audio
        key={audioElementGeneration}
        ref={audioRef}
        onLoadedMetadata={(event) => {
          const durationMs = Math.floor(event.currentTarget.duration * 1000);

          if (Number.isFinite(durationMs)) {
            updatePlayback((current) => ({ ...current, durationMs }));
          }

          const recoverySnapshot = microphoneRecoverySnapshotRef.current;
          const requestedPositionMs =
            recoverySnapshot &&
            recoverySnapshot.episodeId === playbackRef.current?.episodeId
              ? recoverySnapshot.positionMs
              : pendingLoadPositionMsRef.current;

          pendingLoadPositionMsRef.current = null;

          if (requestedPositionMs && requestedPositionMs > 0) {
            const targetPositionMs = Number.isFinite(durationMs)
              ? Math.min(requestedPositionMs, durationMs)
              : requestedPositionMs;

            isSeekingRef.current = true;
            pendingSeekPositionMsRef.current = targetPositionMs;
            seekRetryCountRef.current = 0;
            requestNativeSeek(event.currentTarget, targetPositionMs);

            if (microphoneRecoveryTimeoutRef.current) {
              clearTimeout(microphoneRecoveryTimeoutRef.current);
            }
            microphoneRecoveryTimeoutRef.current = setTimeout(() => {
              microphoneRecoveryTimeoutRef.current = null;
              isSeekingRef.current = false;
              pendingSeekPositionMsRef.current = null;
            }, 3_000);
          } else if (
            recoverySnapshot?.episodeId === playbackRef.current?.episodeId
          ) {
            microphoneRecoverySnapshotRef.current = null;
          }
        }}
        onPause={() => {
          if (!isChangingEpisodeRef.current) {
            updatePlayback((current) => ({ ...current, isPlaying: false }));
          }
        }}
        onPlay={() => {
          isChangingEpisodeRef.current = false;
          lastTrackedPositionMsRef.current = Math.floor(
            (audioRef.current?.currentTime ?? 0) * 1000,
          );
          lastTrackedAtMsRef.current = Date.now();
          updatePlayback((current) => ({ ...current, isPlaying: true }));
        }}
        onSeeking={() => {
          isSeekingRef.current = true;
        }}
        onSeeked={(event) => {
          const confirmedPositionMs = Math.floor(event.currentTarget.currentTime * 1000);
          const currentPlayback = playbackRef.current;
          const requestedPositionMs = pendingSeekPositionMsRef.current;

          if (
            requestedPositionMs !== null &&
            Math.abs(confirmedPositionMs - requestedPositionMs) > 1_500 &&
            seekRetryCountRef.current < 2
          ) {
            seekRetryCountRef.current += 1;
            isSeekingRef.current = true;
            requestNativeSeek(event.currentTarget, requestedPositionMs);
            return;
          }

          isSeekingRef.current = false;
          pendingSeekPositionMsRef.current = null;
          seekRetryCountRef.current = 0;
          if (microphoneRecoveryTimeoutRef.current) {
            clearTimeout(microphoneRecoveryTimeoutRef.current);
            microphoneRecoveryTimeoutRef.current = null;
          }

          const didRestoreMicrophoneSnapshot =
            microphoneRecoverySnapshotRef.current?.episodeId === currentPlayback?.episodeId;

          if (didRestoreMicrophoneSnapshot) {
            microphoneRecoverySnapshotRef.current = null;
          }
          lastTrackedPositionMsRef.current = confirmedPositionMs;
          lastTrackedAtMsRef.current = Date.now();
          updatePlayback((current) => ({
            ...current,
            positionMs: confirmedPositionMs,
            updatedAt: new Date().toISOString(),
          }));
          if (currentPlayback) {
            saveEpisodePlaybackProgress({
              episodeId: currentPlayback.episodeId,
              podcastId: currentPlayback.podcastId,
              positionMs: confirmedPositionMs,
              durationMs: currentPlayback.durationMs,
              updatedAt: new Date().toISOString(),
            });
          }

          if (didRestoreMicrophoneSnapshot && playAfterRecoveryRef.current) {
            playAfterRecoveryRef.current = false;
            void event.currentTarget.play();
          }
        }}
        onTimeUpdate={(event) => {
          if (isChangingEpisodeRef.current || isSeekingRef.current) {
            return;
          }

          const positionMs = Math.floor(event.currentTarget.currentTime * 1000);
          updatePlayback((current) => ({
            ...current,
            positionMs,
            updatedAt: new Date().toISOString(),
          }));
          if (playback) {
            const previousPositionMs = lastTrackedPositionMsRef.current;
            const previousTrackedAtMs = lastTrackedAtMsRef.current;
            const trackedAtMs = Date.now();
            const mediaDeltaMs =
              previousPositionMs !== null ? positionMs - previousPositionMs : 0;
            const wallClockDeltaMs =
              previousTrackedAtMs !== null ? trackedAtMs - previousTrackedAtMs : 0;
            const adjustedListeningMs = mediaDeltaMs / Math.max(playback.playbackRate, 0.1);
            const isPlausiblePlaybackInterval =
              playback.isPlaying &&
              mediaDeltaMs > 0 &&
              wallClockDeltaMs > 0 &&
              adjustedListeningMs <= wallClockDeltaMs * 1.5 + 2_000;

            if (isPlausiblePlaybackInterval) {
              addListeningTime({
                playback,
                listenedMs: Math.min(adjustedListeningMs, wallClockDeltaMs + 2_000),
              });
            }

            lastTrackedPositionMsRef.current = positionMs;
            lastTrackedAtMsRef.current = trackedAtMs;
            saveEpisodePlaybackProgress({
              episodeId: playback.episodeId,
              podcastId: playback.podcastId,
              positionMs,
              durationMs: playback.durationMs,
              updatedAt: new Date().toISOString(),
            });
          }
        }}
        onEnded={() => {
          const completedPlayback = playbackRef.current;

          if (
            !completedPlayback ||
            completedEpisodeIdRef.current === completedPlayback.episodeId
          ) {
            return;
          }

          completedEpisodeIdRef.current = completedPlayback.episodeId;
          isChangingEpisodeRef.current = true;
          saveEpisodePlaybackProgress({
            episodeId: completedPlayback.episodeId,
            podcastId: completedPlayback.podcastId,
            positionMs: completedPlayback.durationMs ?? completedPlayback.positionMs,
            durationMs: completedPlayback.durationMs,
            updatedAt: new Date().toISOString(),
          });
          playNextEpisode();
        }}
      />
    </MediaPlayerContext.Provider>
  );
}

function loadEpisodeAudio(
  audio: HTMLAudioElement | null,
  playback: CurrentEpisodePlayback,
) {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.src = playback.audioUrl;
  audio.load();
  audio.currentTime = playback.positionMs / 1000;
  audio.playbackRate = playback.playbackRate;
}

function getEpisodeResumePositionMs(episode: PodcastEpisode) {
  const progress = loadEpisodePlaybackProgress()[episode.id];

  if (!progress || progress.listenedAt) {
    return 0;
  }

  const durationMs = progress.durationMs ?? episode.durationMs;

  if (durationMs && progress.positionMs / durationMs >= 0.9) {
    return 0;
  }

  return Math.max(0, progress.positionMs);
}

function requestNativeSeek(audio: HTMLAudioElement, positionMs: number) {
  const positionSeconds = positionMs / 1000;
  const seekableAudio = audio as HTMLAudioElement & { fastSeek?: (time: number) => void };

  if (typeof seekableAudio.fastSeek === "function") {
    seekableAudio.fastSeek(positionSeconds);
    return;
  }

  audio.currentTime = positionSeconds;
}

export function useMediaPlayer() {
  const context = useContext(MediaPlayerContext);

  if (!context) {
    throw new Error("useMediaPlayer must be used inside MediaPlayerProvider.");
  }

  return context;
}
