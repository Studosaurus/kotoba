"use client";

import { Cable, Loader2, Music2, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import type { SpotifyConnectionState } from "@/connectors/spotify/types";

interface SpotifyConnectorCardProps {
  name: string;
  description: string;
}

export function SpotifyConnectorCard({ name, description }: SpotifyConnectorCardProps) {
  const [state, setState] = useState<SpotifyConnectionState>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/media/current-playback", { cache: "no-store" })
      .then((response) => response.json() as Promise<SpotifyConnectionState>)
      .then((nextState) => {
        if (isMounted) {
          setState(nextState);
        }
      })
      .catch(() => {
        if (isMounted) {
          setState({ connected: false, error: "Could not check Spotify status." });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <article className="rounded-[1.5rem] bg-[#17191d] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-[#f8f9fb]">{name}</h2>
          <p className="mt-1 text-sm text-[#bdc1c6]">{description}</p>
        </div>
        <StatusPill state={state} isLoading={isLoading} />
      </div>

      {state.playback ? (
        <div className="mt-4 rounded-2xl bg-[#101113] p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#a8c7fa]">
            <Music2 className="h-4 w-4" aria-hidden="true" />
            Current playback
          </p>
          <p className="mt-2 font-medium text-[#f8f9fb]">{state.playback.item.title}</p>
          {state.playback.item.collectionTitle ? (
            <p className="mt-1 text-sm text-[#bdc1c6]">{state.playback.item.collectionTitle}</p>
          ) : null}
          <p className="mt-1 text-xs text-[#9aa0a6]">
            {state.playback.isPlaying ? "Playing" : "Paused"} at{" "}
            {formatTimestamp(state.playback.positionMs)}
          </p>
        </div>
      ) : null}

      {state.error ? <p className="mt-3 text-sm text-[#ffb1c0]">{state.error}</p> : null}

      <div className="mt-4">
        {state.connected ? (
          <form action="/api/connectors/spotify/disconnect" method="post">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
            >
              <Unplug className="h-4 w-4" aria-hidden="true" />
              Disconnect
            </button>
          </form>
        ) : (
          <a
            href="/api/connectors/spotify/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
          >
            <Cable className="h-4 w-4" aria-hidden="true" />
            Connect Spotify
          </a>
        )}
      </div>
    </article>
  );
}

function StatusPill({
  state,
  isLoading,
}: {
  state: SpotifyConnectionState;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#202329] px-3 py-1 text-xs font-semibold text-[#bdc1c6]">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        Checking
      </span>
    );
  }

  if (state.needsConfiguration) {
    return (
      <span className="rounded-full bg-[#3a1f26] px-3 py-1 text-xs font-semibold text-[#ffb1c0]">
        Needs config
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        state.connected ? "bg-[#17351f] text-[#9be7a8]" : "bg-[#202329] text-[#bdc1c6]"
      }`}
    >
      {state.connected ? "Connected" : "Not connected"}
    </span>
  );
}

function formatTimestamp(positionMs: number) {
  const totalSeconds = Math.floor(positionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
