"use client";

import { Cable, Clipboard, Loader2, Mic, Music2, RotateCcw, Send, X } from "lucide-react";
import { useId } from "react";
import type { PlaybackState } from "@/domains/media/types";

interface CaptureInputProps {
  value: string;
  disabled: boolean;
  isAnalyzing: boolean;
  isRecording: boolean;
  connectorState: CaptureConnectorState;
  playback: PlaybackState | null;
  error?: string;
  onChange(value: string): void;
  onSubmit(): void;
  onClear(): void;
  onRecordStart(): void;
}

export interface CaptureConnectorState {
  connected?: boolean;
  needsConfiguration?: boolean;
}

export function CaptureInput({
  value,
  disabled,
  isAnalyzing,
  isRecording,
  connectorState,
  playback,
  error,
  onChange,
  onSubmit,
  onClear,
  onRecordStart,
}: CaptureInputProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-[#101113] shadow-[0_24px_80px_rgb(0_0_0/0.35)]">
      <CaptureSourceHeader connectorState={connectorState} playback={playback} />

      <div className="px-5 pb-4 pt-4">
        <label htmlFor={inputId} className="sr-only">
          Japanese text
        </label>
        <textarea
          id={inputId}
          value={value}
          disabled={disabled}
          rows={5}
          lang="ja"
          inputMode="text"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Enter text"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }

            event.preventDefault();
            onSubmit();
          }}
          className="min-h-[11rem] w-full resize-none bg-transparent text-4xl leading-tight text-[#f8f9fb] outline-none placeholder:text-[#6f737d] disabled:cursor-not-allowed disabled:opacity-70"
        />

        {error ? (
          <p id={errorId} className="mt-3 text-sm font-medium text-[#ff9aa8]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.readText?.().then((text) => {
                if (text) {
                  onChange(text);
                }
              }).catch(() => undefined);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-base font-medium text-[#e8eaed] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
          >
            <Clipboard className="h-5 w-5" aria-hidden="true" />
            Paste
          </button>

          <div className="flex items-center gap-3">
            {value ? (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#e8eaed] outline-none hover:bg-[#1c1e23] focus:ring-4 focus:ring-[#8ab4f8]/25 disabled:opacity-50"
                aria-label="Clear text"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#e8eaed] outline-none hover:bg-[#1c1e23] focus:ring-4 focus:ring-[#8ab4f8]/25 disabled:opacity-40"
              aria-label="Translate text"
            >
              {isAnalyzing ? (
                <Loader2
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onRecordStart}
              disabled={disabled}
              className="inline-flex h-16 w-16 touch-none select-none items-center justify-center rounded-full bg-[#a8c7fa] text-[#062e6f] outline-none transition active:scale-95 focus:ring-4 focus:ring-[#a8c7fa]/35 disabled:opacity-60 data-[recording=true]:scale-110 data-[recording=true]:bg-[#ffb1c0] motion-reduce:transition-none"
              data-recording={isRecording}
              aria-label={isRecording ? "Recording Japanese speech" : "Record Japanese speech"}
            >
              {isRecording ? (
                <RotateCcw className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Mic className="h-7 w-7" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CaptureSourceHeader({
  connectorState,
  playback,
}: {
  connectorState: CaptureConnectorState;
  playback: PlaybackState | null;
}) {
  if (!connectorState.connected && !connectorState.needsConfiguration) {
    return (
      <div className="px-5 pt-4">
        <div className="rounded-2xl bg-[#17191d] px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#f8f9fb]">
            <Cable className="h-4 w-4 text-[#9aa0a6]" aria-hidden="true" />
            Select a source podcast
          </p>
          <p className="mt-0.5 text-xs text-[#9aa0a6]">
            Open Podcasts to choose an episode before capturing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4">
      <div className="rounded-2xl bg-[#17191d] px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#f8f9fb]">
          <Music2 className="h-4 w-4 text-[#a8c7fa]" aria-hidden="true" />
          {playback
            ? `${playback.item.id.startsWith("rss:") ? "Podcast source" : "Spotify"} active`
            : "Select a source podcast"}
        </p>
        {playback ? (
          <p className="mt-0.5 truncate text-xs text-[#bdc1c6]">
            {playback.item.collectionTitle ?? "Spotify"} / {playback.item.title} at{" "}
            {formatTimestamp(playback.positionMs)}
          </p>
        ) : connectorState.connected ? (
          null
        ) : (
          <p className="mt-0.5 text-xs text-[#bdc1c6]">
            Open Podcasts to choose an episode before capturing.
          </p>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(positionMs: number) {
  const totalSeconds = Math.floor(positionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
