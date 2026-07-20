"use client";

import { ChevronDown, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { PodcastMediaExperience } from "./podcast-media-experience";
import { useMediaPlayer } from "./media-player-provider";

export function GlobalMiniPlayer() {
  const router = useRouter();
  const { playback, isExpanded, setExpanded, togglePlay, seek } = useMediaPlayer();

  const durationMs = playback?.durationMs ?? 0;
  const progress = playback && durationMs > 0 ? playback.positionMs / durationMs : 0;

  return (
    <>
      {isExpanded ? (
        <div className="fixed inset-0 z-[70] bg-[#202124] text-[#f8f9fb]">
          <PodcastMediaExperience
            isEmbedded
            initialView="player"
            onCollapse={() => {
              setExpanded(false);
              router.push("/modules/vocabulary-capture");
            }}
            onBrowseShows={() => {
              setExpanded(false);
              router.push("/modules/media");
            }}
            onOpenCurrentShow={() => {
              setExpanded(false);
              router.push(`/modules/media?podcast=${encodeURIComponent(playback?.podcastId ?? "")}`);
            }}
          />
        </div>
      ) : null}
      {!isExpanded ? (
        <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#2b2f36] bg-[#101113] px-3 pb-[env(safe-area-inset-bottom)] pt-2 text-[#f8f9fb]">
          <div className="mx-auto max-w-xl">
            {playback ? (
              <input
                type="range"
                min={0}
                max={Math.max(durationMs, 1)}
                value={Math.min(playback.positionMs, Math.max(durationMs, playback.positionMs))}
                onInput={(event) => seek(Number(event.currentTarget.value))}
                className="h-5 w-full accent-[#a8c7fa]"
                aria-label="Episode progress"
              />
            ) : (
              <div className="h-5" />
            )}
            <div className="flex min-h-14 items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!playback}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a8c7fa] text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
                aria-label={playback?.isPlaying ? "Pause episode" : "Play episode"}
              >
                {playback?.isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="min-w-0 flex-1 text-left outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
              >
                <p className="truncate text-sm font-semibold">{playback?.episodeTitle ?? "Browse podcasts"}</p>
                <p className="truncate text-xs text-[#bdc1c6]">
                  {playback
                    ? `${playback.podcastTitle} / ${formatTimestamp(playback.positionMs)}`
                    : "Choose a show and episode"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bdc1c6] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
                aria-label="Expand player"
              >
                <ChevronDown className="h-5 w-5 rotate-180 transition" />
              </button>
              {playback ? <span className="text-xs text-[#9aa0a6]">{Math.round(progress * 100)}%</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatTimestamp(positionMs: number) {
  const totalSeconds = Math.floor(positionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
