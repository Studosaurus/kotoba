"use client";

import {
  ArrowDownUp,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pause,
  Play,
  Plus,
  Rewind,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  FastForward,
  Flame,
  Library,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RssPodcastFeed } from "@/connectors/rss/types";
import {
  getDailyAchievementRating,
  getLearningStreak,
  loadLearningActivityHistory,
  type DailyAchievementRating,
} from "@/lib/local-learning-activity";
import { useMediaPlayer } from "./media-player-provider";
import type { PodcastEpisode, PodcastSource } from "../local/local-media-types";
import {
  getCurrentListeningPeriodTotals,
  loadEpisodePlaybackProgress,
  loadListeningStats,
  loadMediaUserSettings,
  loadPodcastSources,
  saveMediaUserSettings,
  saveUserPodcast,
} from "../local/local-media-store";

type MediaView =
  | { name: "library" }
  | PodcastView
  | { name: "player"; previous?: PodcastView };

type PodcastView = {
  name: "podcast";
  podcast: PodcastSource;
  feed?: RssPodcastFeed;
  error?: string;
  isLoading: boolean;
};

const PLAYBACK_SPEED_OPTIONS = [0.8, 0.85, 0.9, 0.95, 1];

export function PodcastMediaExperience({
  isEmbedded = false,
  onCollapse,
  onBrowseShows,
  onOpenCurrentShow,
  initialView = "library",
  initialPodcastId,
}: {
  isEmbedded?: boolean;
  onCollapse?: () => void;
  onBrowseShows?: () => void;
  onOpenCurrentShow?: () => void;
  initialView?: "library" | "player";
  initialPodcastId?: string;
}) {
  const router = useRouter();
  const player = useMediaPlayer();
  const [podcasts, setPodcasts] = useState<PodcastSource[]>(() => loadPodcastSources());
  const [view, setView] = useState<MediaView>(() =>
    initialView === "player" ? { name: "player" } : { name: "library" },
  );
  const [feedUrl, setFeedUrl] = useState("");
  const [query, setQuery] = useState("");
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [isOldestFirst, setIsOldestFirst] = useState(() => loadMediaUserSettings().isOldestFirst);
  const [mediaSettings, setMediaSettings] = useState(() => loadMediaUserSettings());
  const [statsVersion, setStatsVersion] = useState(0);
  const playerHasPreviousView = view.name === "player" && Boolean(view.previous);
  const filteredPodcasts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return podcasts;
    }

    return podcasts.filter((podcast) =>
      [podcast.title, podcast.description, podcast.feedUrl]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [podcasts, query]);

  useEffect(() => {
    const podcastsMissingArtwork = podcasts.filter((podcast) => !podcast.imageUrl).slice(0, 8);

    if (podcastsMissingArtwork.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.all(
      podcastsMissingArtwork.map(async (podcast) => {
        const result = await fetchPodcastFeed(podcast.feedUrl);
        return result.ok ? { podcast, feed: result.feed } : null;
      }),
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      const metadataById = new Map(
        results
          .filter((result): result is { podcast: PodcastSource; feed: RssPodcastFeed } => Boolean(result))
          .map((result) => [result.podcast.id, result.feed]),
      );

      if (metadataById.size === 0) {
        return;
      }

      setPodcasts((currentPodcasts) => {
        let didChange = false;
        const nextPodcasts = currentPodcasts.map((podcast) => {
          const feed = metadataById.get(podcast.id);

          if (!feed) {
            return podcast;
          }

          const nextPodcast = {
            ...podcast,
            title: feed.title || podcast.title,
            description: feed.description || podcast.description,
            imageUrl: feed.imageUrl || podcast.imageUrl,
          };

          if (
            nextPodcast.title !== podcast.title ||
            nextPodcast.description !== podcast.description ||
            nextPodcast.imageUrl !== podcast.imageUrl
          ) {
            didChange = true;
          }

          return nextPodcast;
        });

        return didChange ? nextPodcasts : currentPodcasts;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [podcasts]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setStatsVersion((version) => version + 1), 5000);
    let midnightTimeoutId: number;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      midnightTimeoutId = window.setTimeout(() => {
        setStatsVersion((version) => version + 1);
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 100);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        setStatsVersion((version) => version + 1);
      }
    };

    scheduleMidnightRefresh();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(midnightTimeoutId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const openPodcast = async (podcast: PodcastSource) => {
    setView({ name: "podcast", podcast, isLoading: true });

    const result = await fetchPodcastFeed(podcast.feedUrl);

    if (result.ok) {
      const hydratedPodcast = {
        ...podcast,
        title: result.feed.title,
        description: result.feed.description ?? podcast.description,
        imageUrl: result.feed.imageUrl ?? podcast.imageUrl,
      };

      setPodcasts((currentPodcasts) =>
        currentPodcasts.map((currentPodcast) =>
          currentPodcast.id === podcast.id ? hydratedPodcast : currentPodcast,
        ),
      );
      setView({ name: "podcast", podcast: hydratedPodcast, feed: result.feed, isLoading: false });
    } else {
      setView({ name: "podcast", podcast, error: result.error, isLoading: false });
    }
  };

  useEffect(() => {
    if (initialView !== "player" || !player.playback?.feedUrl || view.name !== "player" || playerHasPreviousView) {
      return;
    }

    const source =
      podcasts.find((podcast) => podcast.id === player.playback?.podcastId) ?? {
        id: player.playback.podcastId,
        title: player.playback.podcastTitle,
        imageUrl: player.playback.artworkUrl,
        feedUrl: player.playback.feedUrl,
        source: "user" as const,
      };

    let isCancelled = false;

    void fetchPodcastFeed(player.playback.feedUrl).then((result) => {
      if (isCancelled || !result.ok) {
        return;
      }

      setView({
        name: "player",
        previous: {
          name: "podcast",
          podcast: {
            ...source,
            title: result.feed.title || source.title,
            description: result.feed.description ?? source.description,
            imageUrl: result.feed.imageUrl ?? source.imageUrl,
          },
          feed: result.feed,
          isLoading: false,
        },
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [initialView, player.playback, podcasts, view.name, playerHasPreviousView]);

  useEffect(() => {
    if (!initialPodcastId || view.name !== "library") {
      return;
    }

    const podcast = podcasts.find((item) => item.id === initialPodcastId);

    if (podcast) {
      void Promise.resolve().then(() => openPodcast(podcast));
    }
  }, [initialPodcastId, podcasts, view.name]);

  const addPodcast = async () => {
    const trimmedFeedUrl = feedUrl.trim();

    if (!trimmedFeedUrl) {
      return;
    }

    const result = await fetchPodcastFeed(trimmedFeedUrl);

    if (!result.ok) {
      setView({
        name: "podcast",
        podcast: {
          id: crypto.randomUUID(),
          title: "Could not load podcast",
          feedUrl: trimmedFeedUrl,
          source: "user",
        },
        error: result.error,
        isLoading: false,
      });
      return;
    }

    const podcast: PodcastSource = {
      id: crypto.randomUUID(),
      title: result.feed.title,
      description: result.feed.description,
      imageUrl: result.feed.imageUrl,
      feedUrl: trimmedFeedUrl,
      source: "user",
    };

    saveUserPodcast(podcast);
    setPodcasts(loadPodcastSources());
    setFeedUrl("");
    setView({ name: "podcast", podcast, feed: result.feed, isLoading: false });
  };

  const playEpisode = (episode: PodcastEpisode, queue?: PodcastEpisode[]) => {
    player.playEpisode(episode, queue);
    player.setExpanded(true);
  };

  const captureCurrentPlayback = () => {
    player.pause();
    onCollapse?.();
    router.push("/modules/vocabulary-capture");
  };

  if (view.name === "player") {
    return (
      <section className={getPlayerShellClassName(isEmbedded)}>
        <div className="mx-auto max-w-xl">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (onBrowseShows) {
                  onBrowseShows();
                  return;
                }

                if (view.previous) {
                  setView(view.previous);
                  return;
                }

                setView({ name: "library" });
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-[#f2f3f5] outline-none focus:ring-4 focus:ring-white/20"
              aria-label="Browse shows"
            >
              <Library className="h-5 w-5" aria-hidden="true" />
            </button>
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-[#f2f3f5] outline-none focus:ring-4 focus:ring-white/20"
                aria-label="Collapse player"
              >
                <ChevronDown className="h-6 w-6" aria-hidden="true" />
              </button>
            ) : (
              <div className="h-11 w-11" />
            )}
          </header>
          <FullPlayer onCapture={captureCurrentPlayback} onOpenShow={onOpenCurrentShow} />
        </div>
      </section>
    );
  }

  if (view.name === "podcast") {
    return (
      <section className={getMediaShellClassName(isEmbedded)}>
        <div className="mx-auto max-w-xl space-y-5">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView({ name: "library" })}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
              aria-label="Back to podcasts"
            >
              <ArrowLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <h1 className="truncate text-xl font-semibold text-[#dfe2ea]">{view.podcast.title}</h1>
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
                aria-label="Collapse player"
              >
                <ChevronDown className="h-6 w-6" aria-hidden="true" />
              </button>
            ) : (
              <div className="h-12 w-12" />
            )}
          </header>

          {view.isLoading ? (
            <section className="rounded-[1.5rem] bg-[#17191d] p-5 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#a8c7fa] motion-reduce:animate-none" />
              <p className="mt-3 text-sm text-[#bdc1c6]">Loading episodes</p>
            </section>
          ) : view.error ? (
            <section className="rounded-[1.5rem] bg-[#3a1f26] p-5 text-sm text-[#ffb1c0]">
              {view.error}
            </section>
          ) : (
            <>
              <PodcastHeader
                podcast={view.podcast}
                feed={view.feed}
                episodeQuery={episodeQuery}
                onEpisodeQueryChange={setEpisodeQuery}
              />
              <EpisodeList
                podcast={view.podcast}
                feed={view.feed}
                episodeQuery={episodeQuery}
                isOldestFirst={isOldestFirst}
                onToggleOrder={() => {
                  setIsOldestFirst((value) => {
                    const nextValue = !value;
                    saveMediaUserSettings({
                      ...loadMediaUserSettings(),
                      isOldestFirst: nextValue,
                    });
                    setMediaSettings(loadMediaUserSettings());
                    return nextValue;
                  });
                }}
                onPlay={playEpisode}
              />
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={getMediaShellClassName(isEmbedded)}>
      <div className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (onCollapse) {
                onCollapse();
              } else {
                router.push("/modules/vocabulary-capture");
              }
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
            aria-label="Back to capture"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-semibold text-[#dfe2ea]">Podcasts</h1>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
              aria-label="Collapse player"
            >
              <ChevronDown className="h-6 w-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="h-12 w-12" />
          )}
        </header>

        <ListeningSummary
          mediaSettings={mediaSettings}
          statsVersion={statsVersion}
          onGoalsChange={(goals) => {
            const nextSettings = { ...loadMediaUserSettings(), goals };
            saveMediaUserSettings(nextSettings);
            setMediaSettings(nextSettings);
          }}
        />

        <section>
          <h2 className="mb-3 text-3xl font-bold text-[#f8f9fb]">Recently Updated</h2>
          <div className="grid grid-cols-2 items-start gap-x-5 gap-y-6">
            {filteredPodcasts.map((podcast) => (
              <button
                key={`${podcast.source}:${podcast.id}`}
                type="button"
                onClick={() => void openPodcast(podcast)}
                className="grid min-w-0 auto-rows-min text-left outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
              >
                <PodcastArtwork title={podcast.title} imageUrl={podcast.imageUrl} large />
                <div className="mt-2 min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#f8f9fb]">
                    {podcast.title}
                  </p>
                  {podcast.description ? (
                    <p className="mt-1 line-clamp-1 text-sm text-[#9aa0a6]">
                      {podcast.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#9aa0a6]">
                    {podcast.source === "curated" ? "Default" : "Added"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] bg-[#17191d] p-4">
          <label className="flex h-12 items-center gap-2 rounded-xl bg-[#202329] px-3 text-[#bdc1c6]">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Search podcasts</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search podcasts"
              className="min-w-0 flex-1 bg-transparent text-base text-[#f8f9fb] outline-none placeholder:text-[#6f737d]"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <input
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="Add RSS URL"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              className="min-h-11 min-w-0 flex-1 rounded-full bg-[#202329] px-4 text-sm text-[#f8f9fb] outline-none placeholder:text-[#6f737d] focus:ring-4 focus:ring-[#8ab4f8]/20"
            />
            <button
              type="button"
              onClick={() => void addPodcast()}
              disabled={!feedUrl.trim()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function PodcastHeader({
  podcast,
  feed,
  episodeQuery,
  onEpisodeQueryChange,
}: {
  podcast: PodcastSource;
  feed?: RssPodcastFeed;
  episodeQuery: string;
  onEpisodeQueryChange(value: string): void;
}) {
  const latestEpisode = sortEpisodes(feed?.episodes ?? [], false)[0];

  return (
    <section className="-mx-4 -mt-5 bg-[linear-gradient(180deg,#6f5a49_0%,#302a27_52%,#202124_100%)] px-4 pb-5 pt-5">
      <label className="flex h-14 items-center gap-3 rounded-md bg-white/12 px-3 text-[#f8f9fb] backdrop-blur">
        <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="sr-only">Search within this show</span>
        <input
          value={episodeQuery}
          onChange={(event) => onEpisodeQueryChange(event.target.value)}
          placeholder="Search within this show"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/70"
        />
      </label>

      <div className="mt-7 flex items-end gap-5">
        <div className="w-32 shrink-0">
          <PodcastArtwork title={feed?.title ?? podcast.title} imageUrl={feed?.imageUrl ?? podcast.imageUrl} hero />
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h2 className="text-3xl font-bold leading-tight text-[#f8f9fb]">{feed?.title ?? podcast.title}</h2>
          {feed?.description ?? podcast.description ? (
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-5 text-white/75">
              {feed?.description ?? podcast.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-sm font-semibold text-white/75">
        <span>{feed?.episodes.length ?? 0} episodes</span>
        {latestEpisode?.publishedAt ? <span>Updated {formatDateLabel(latestEpisode.publishedAt)}</span> : null}
      </div>
    </section>
  );
}

function FullPlayer({
  onCapture,
  onOpenShow,
}: {
  onCapture(): void;
  onOpenShow?: () => void;
}) {
  const player = useMediaPlayer();
  const playback = player.playback;

  if (!playback) {
    return null;
  }

  const durationMs = playback.durationMs ?? 1;

  return (
    <section className="pt-6">
      {playback.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={playback.artworkUrl}
          alt=""
          className="mx-auto aspect-square w-56 max-w-[62vw] rounded-xl object-cover shadow-[0_20px_70px_rgb(0_0_0/0.45)]"
        />
      ) : null}
      <p className="mt-8 text-sm text-[#f8f1b8]/80">{formatDateLabel(playback.updatedAt)}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-white">{playback.episodeTitle}</h2>
          {onOpenShow ? (
            <button
              type="button"
              onClick={onOpenShow}
              className="mt-1 text-left text-lg text-white/75 underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              {playback.podcastTitle}
            </button>
          ) : (
            <p className="mt-1 text-lg text-white/75">{playback.podcastTitle}</p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#202329] text-[#f8f9fb]"
          aria-label="Episode options"
        >
          ...
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(durationMs, playback.positionMs, 1)}
        value={playback.positionMs}
        onInput={(event) => player.seek(Number(event.currentTarget.value))}
        className="mt-5 w-full accent-[#f8f1b8]"
        aria-label="Episode progress"
      />
      <div className="mt-1 flex justify-between text-sm text-[#9aa0a6]">
        <span>{formatTimestamp(playback.positionMs)}</span>
        <span>-{formatTimestamp(Math.max(0, durationMs - playback.positionMs))}</span>
      </div>
      <div className="mt-5 grid grid-cols-5 items-center gap-2">
        <button
          type="button"
          onClick={player.playPreviousEpisode}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Previous episode"
        >
          <SkipBack className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => player.seek(Math.max(0, playback.positionMs - 10_000))}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Skip back 10 seconds"
        >
          <span className="relative inline-flex items-center justify-center">
            <Rewind className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -bottom-2 text-[10px] font-bold">10</span>
          </span>
        </button>
        <button
          type="button"
          onClick={player.togglePlay}
          className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#f8f9fb] text-[#101113] outline-none focus:ring-4 focus:ring-[#f8f9fb]/30"
          aria-label={playback.isPlaying ? "Pause episode" : "Play episode"}
        >
          {playback.isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
        <button
          type="button"
          onClick={() => player.seek(playback.positionMs + 10_000)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Skip forward 10 seconds"
        >
          <span className="relative inline-flex items-center justify-center">
            <FastForward className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -bottom-2 text-[10px] font-bold">10</span>
          </span>
        </button>
        <button
          type="button"
          onClick={player.playNextEpisode}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Next episode"
        >
          <SkipForward className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <select
          value={playback.playbackRate}
          onChange={(event) => player.setPlaybackRate(Number(event.target.value))}
          className="h-11 rounded-full bg-[#202329] px-3 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Playback speed"
        >
          {PLAYBACK_SPEED_OPTIONS.map((rate) => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onCapture}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Capture
        </button>
      </div>
    </section>
  );
}

function EpisodeList({
  podcast,
  feed,
  episodeQuery,
  isOldestFirst,
  onToggleOrder,
  onPlay,
}: {
  podcast: PodcastSource;
  feed?: RssPodcastFeed;
  episodeQuery: string;
  isOldestFirst: boolean;
  onToggleOrder(): void;
  onPlay(episode: PodcastEpisode, queue: PodcastEpisode[]): void;
}) {
  const player = useMediaPlayer();
  const normalizedQuery = episodeQuery.trim().toLowerCase();
  const episodes = sortEpisodes(feed?.episodes ?? [], isOldestFirst).filter((episode) => {
    if (!normalizedQuery) {
      return true;
    }

    return [episode.title, episode.description]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const playableEpisodes = episodes.map((episode) => toPlayableEpisode(episode, podcast, feed));
  const progressByEpisode = loadEpisodePlaybackProgress();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 border-b border-[#2b2f36] pb-4">
        <div>
          <h2 className="text-2xl font-bold text-[#f8f9fb]">Episodes</h2>
          <p className="mt-1 text-sm text-[#9aa0a6]">
            {isOldestFirst ? "Oldest episodes" : "Newest episodes"} / {episodes.length} shown
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleOrder}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[#17191d] px-3 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
        >
          <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
          {isOldestFirst ? "Oldest" : "Newest"}
        </button>
      </div>
      {episodes.map((episode, episodeIndex) => {
        const isCurrentEpisode = player.playback?.episodeId === episode.id;
        const savedProgress = progressByEpisode[episode.id];
        const currentPositionMs =
          isCurrentEpisode && player.playback
            ? player.playback.positionMs
            : (savedProgress?.positionMs ?? 0);
        const currentDurationMs =
          episode.durationMs ??
          (isCurrentEpisode ? player.playback?.durationMs : undefined) ??
          savedProgress?.durationMs;
        const progress = currentDurationMs
          ? Math.min(1, currentPositionMs / currentDurationMs)
          : 0;
        const isListened = Boolean(savedProgress?.listenedAt) || progress >= 0.9;
        const episodeNumber = getEpisodeNumber(episode.title);
        const playableEpisode = playableEpisodes[episodeIndex];
        const artworkUrl = playableEpisode.imageUrl;

        return (
          <article key={episode.id} className="border-b border-[#2b2f36] py-4">
            <div className="flex items-start gap-3">
              <PodcastArtwork title={episode.title} imageUrl={artworkUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-6 text-[#f8f9fb]">{episode.title}</h3>
                    {episode.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#bdc1c6]">{episode.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onPlay(playableEpisode, playableEpisodes)
                    }
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f8f9fb] text-[#101113] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
                    aria-label={`Play ${episode.title}`}
                  >
                    <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#9aa0a6]">
                  {episodeNumber ? <span className="font-semibold text-[#f8f9fb]">Ep{episodeNumber}</span> : null}
                  {episode.publishedAt ? <span>{new Date(episode.publishedAt).toLocaleDateString()}</span> : null}
                  {episode.durationMs ? <span>{formatTimestamp(episode.durationMs)}</span> : null}
                  {isListened ? (
                    <span className="inline-flex items-center gap-1 text-[#9be7a8]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Listened
                    </span>
                  ) : null}
                </div>
                {isCurrentEpisode || savedProgress ? (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#2b2f36]">
                      <div className="h-full rounded-full bg-[#a8c7fa]" style={{ width: `${progress * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-[#a8c7fa]">
                      {isListened ? "Listened" : `${Math.round(progress * 100)}% listened`}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ListeningSummary({
  mediaSettings,
  statsVersion,
  onGoalsChange,
}: {
  mediaSettings: ReturnType<typeof loadMediaUserSettings>;
  statsVersion: number;
  onGoalsChange(goals: ReturnType<typeof loadMediaUserSettings>["goals"]): void;
}) {
  void statsVersion;
  const [isExpanded, setIsExpanded] = useState(false);
  const stats = loadListeningStats();
  const learningActivity = loadLearningActivityHistory();
  const { todayMs, weekMs, monthMs } = getCurrentListeningPeriodTotals(stats);
  const streak = getLearningStreak({
    history: learningActivity,
    listeningByDay: stats.byDay,
  });
  const dailyRating = getDailyAchievementRating({
    listenedMs: todayMs,
    goalMinutes: mediaSettings.goals.dailyMinutes,
    studyReviews: streak.todayStudyReviews,
  });

  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#f8f9fb]">Listening</h2>
          <p className="mt-1 text-xs text-[#9aa0a6]">Local podcast progress</p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#202329] px-3 text-xs font-semibold text-[#a8c7fa] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Less" : "Stats"}
          <ChevronDown
            className={`h-4 w-4 transition motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#202329] p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#f8f9fb]">
            <Flame className="h-4 w-4 text-[#f8c471]" aria-hidden="true" />
            {streak.count} day{streak.count === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#9aa0a6]">
            {streak.isActiveToday ? "Streak active today" : "Study or listen today"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#202329] p-3">
          <p className={`text-sm font-semibold ${getRatingTextColor(dailyRating)}`}>
            {formatDailyRating(dailyRating)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#9aa0a6]">Today&apos;s rating</p>
        </div>
      </div>
      <div className="mt-4">
        <GoalProgress
          label="Daily goal"
          valueMs={todayMs}
          goalMinutes={mediaSettings.goals.dailyMinutes}
          onChange={(dailyMinutes) => onGoalsChange({ ...mediaSettings.goals, dailyMinutes })}
        />
      </div>
      {isExpanded ? (
        <div className="mt-4 space-y-4 border-t border-[#2b2f36] pt-4">
          <div className="grid grid-cols-3 gap-2">
            <ListeningStat label="Today" value={todayMs} />
            <ListeningStat label="Week" value={weekMs} />
            <ListeningStat label="Month" value={monthMs} />
          </div>
          <div className="space-y-3">
            <GoalProgress
              label="Weekly goal"
              valueMs={weekMs}
              goalMinutes={mediaSettings.goals.weeklyMinutes}
              onChange={(weeklyMinutes) =>
                onGoalsChange({ ...mediaSettings.goals, weeklyMinutes })
              }
            />
            <GoalProgress
              label="Monthly goal"
              valueMs={monthMs}
              goalMinutes={mediaSettings.goals.monthlyMinutes}
              onChange={(monthlyMinutes) =>
                onGoalsChange({ ...mediaSettings.goals, monthlyMinutes })
              }
            />
          </div>
          <p className="text-xs font-semibold text-[#9aa0a6]">
            Total listened:{" "}
            <span className="text-[#a8c7fa]">{formatListeningDuration(stats.totalMs)}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}

function formatDailyRating(rating: DailyAchievementRating) {
  const labels: Record<DailyAchievementRating, string> = {
    "not-started": "Not started",
    active: "Active",
    "quarter-goal": "25% reached",
    "half-goal": "Halfway",
    "three-quarter-goal": "75% reached",
    "goal-met": "Goal met",
    strong: "Strong",
    exceptional: "Exceptional",
  };

  return labels[rating];
}

function getRatingTextColor(rating: DailyAchievementRating) {
  if (rating === "exceptional") {
    return "text-[#f8c471]";
  }

  if (rating === "strong" || rating === "goal-met") {
    return "text-[#9be7a8]";
  }

  if (
    rating === "active" ||
    rating === "quarter-goal" ||
    rating === "half-goal" ||
    rating === "three-quarter-goal"
  ) {
    return "text-[#a8c7fa]";
  }

  return "text-[#9aa0a6]";
}

function ListeningStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#202329] p-3">
      <p className="text-sm font-semibold text-[#f8f9fb]">{formatListeningDuration(value)}</p>
      <p className="mt-1 text-xs font-semibold text-[#9aa0a6]">{label}</p>
    </div>
  );
}

function GoalProgress({
  label,
  valueMs,
  goalMinutes,
  onChange,
}: {
  label: string;
  valueMs: number;
  goalMinutes: number;
  onChange(goalMinutes: number): void;
}) {
  const goalMs = goalMinutes * 60_000;
  const progress = goalMs > 0 ? valueMs / goalMs : 0;
  const progressPercent = Math.round(progress * 100);
  const overGoalMs = Math.max(0, valueMs - goalMs);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold text-[#bdc1c6]">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={5}
            step={5}
            value={goalMinutes}
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
            onChange={(event) => onChange(Math.max(5, Number(event.target.value) || 5))}
            className="h-8 w-16 rounded-full bg-[#202329] px-2 text-right text-xs font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
            aria-label={`${label} in minutes`}
          />
          <span className="text-xs text-[#9aa0a6]">min</span>
        </div>
      </div>
      <p
        className={`mt-1 text-xs ${progress >= 1 ? "font-semibold text-[#9be7a8]" : "text-[#9aa0a6]"}`}
      >
        {formatListeningDuration(valueMs)} listened · {progressPercent}%
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#2b2f36]">
        <div
          className={`h-full rounded-full ${progress >= 1 ? "bg-[#9be7a8]" : "bg-[#a8c7fa]"}`}
          style={{ width: `${Math.min(1, progress) * 100}%` }}
        />
      </div>
      {overGoalMs > 0 ? (
        <p className="mt-1 text-right text-xs font-semibold text-[#9be7a8]">
          +{formatListeningDuration(overGoalMs)} beyond goal
        </p>
      ) : null}
    </div>
  );
}

function PodcastArtwork({
  title,
  imageUrl,
  large = false,
  hero = false,
}: {
  title: string;
  imageUrl?: string;
  large?: boolean;
  hero?: boolean;
}) {
  const size = hero ? "aspect-square w-full" : large ? "aspect-square w-full" : "h-16 w-16";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={`${size} shrink-0 rounded-lg object-cover shadow-[0_12px_32px_rgb(0_0_0/0.35)]`}
      />
    );
  }

  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-[#202329] text-xl font-bold text-[#a8c7fa]`}>
      {title.slice(0, 1)}
    </div>
  );
}

function getMediaShellClassName(isEmbedded: boolean) {
  return isEmbedded
    ? "h-full overflow-y-auto bg-[#202124] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#f8f9fb]"
    : "fixed inset-0 z-50 overflow-y-auto bg-[#202124] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#f8f9fb]";
}

function getPlayerShellClassName(isEmbedded: boolean) {
  const base =
    "overflow-y-auto bg-[radial-gradient(circle_at_top,#80694f_0%,#3d3326_42%,#101113_100%)] px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] text-[#f8f9fb]";

  return isEmbedded ? `h-full ${base}` : `fixed inset-0 z-50 ${base}`;
}

function sortEpisodes(episodes: RssPodcastFeed["episodes"], isOldestFirst: boolean) {
  return [...episodes].sort((first, second) => {
    const firstNumber = getEpisodeNumber(first.title);
    const secondNumber = getEpisodeNumber(second.title);

    if (firstNumber !== null && secondNumber !== null && firstNumber !== secondNumber) {
      return isOldestFirst ? firstNumber - secondNumber : secondNumber - firstNumber;
    }

    const firstTime = first.publishedAt ? new Date(first.publishedAt).getTime() : 0;
    const secondTime = second.publishedAt ? new Date(second.publishedAt).getTime() : 0;

    if (firstTime !== secondTime) {
      return isOldestFirst ? firstTime - secondTime : secondTime - firstTime;
    }

    return first.title.localeCompare(second.title);
  });
}

function toPlayableEpisode(
  episode: RssPodcastFeed["episodes"][number],
  podcast: PodcastSource,
  feed?: RssPodcastFeed,
): PodcastEpisode {
  return {
    id: episode.id,
    podcastId: podcast.id,
    podcastTitle: feed?.title ?? podcast.title,
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioUrl,
    durationMs: episode.durationMs,
    imageUrl: episode.imageUrl ?? feed?.imageUrl ?? podcast.imageUrl,
    publishedAt: episode.publishedAt,
    feedUrl: podcast.feedUrl,
  };
}

function getEpisodeNumber(title: string) {
  const match = title.match(/(?:#|ep(?:isode)?\.?\s*)(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function fetchPodcastFeed(feedUrl: string): Promise<
  | { ok: true; feed: RssPodcastFeed }
  | { ok: false; error: string }
> {
  try {
    const response = await fetch(`/api/connectors/rss/feed?url=${encodeURIComponent(feedUrl)}`);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      return { ok: false, error: payload.error ?? "Could not load podcast feed." };
    }

    return { ok: true, feed: (await response.json()) as RssPodcastFeed };
  } catch {
    return { ok: false, error: "Could not load podcast feed." };
  }
}

function formatTimestamp(positionMs: number) {
  const totalSeconds = Math.floor(positionMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatListeningDuration(valueMs: number) {
  const totalMinutes = Math.floor(valueMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}
