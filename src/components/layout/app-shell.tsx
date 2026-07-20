import type { ReactNode } from "react";
import { GlobalMiniPlayer } from "@/modules/media/components/global-mini-player";
import { MediaPlayerProvider } from "@/modules/media/components/media-player-provider";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MediaPlayerProvider>
      <div className="min-h-screen bg-[#202124] text-[#f8f9fb]">
        <main className="mx-auto max-w-5xl px-4 py-6 pb-40 md:py-10">{children}</main>
      </div>
      <GlobalMiniPlayer />
    </MediaPlayerProvider>
  );
}
