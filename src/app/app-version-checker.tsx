"use client";

import { useEffect } from "react";

const APP_VERSION_KEY = "kotoba:app-version";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function AppVersionChecker() {
  useEffect(() => {
    let isMounted = true;

    const checkForUpdate = async () => {
      try {
        const response = await fetch("/api/app-version", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { version?: string };
        const nextVersion = payload.version;

        if (!nextVersion) {
          return;
        }

        const currentVersion = window.localStorage.getItem(APP_VERSION_KEY);

        if (!currentVersion) {
          window.localStorage.setItem(APP_VERSION_KEY, nextVersion);
          return;
        }

        if (currentVersion !== nextVersion) {
          window.localStorage.setItem(APP_VERSION_KEY, nextVersion);
          window.location.reload();
        }
      } catch {
        // Update checks are best-effort. The app should continue working offline or on flaky mobile networks.
      }
    };

    void checkForUpdate();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkForUpdate();
      }
    }, CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted) {
        void checkForUpdate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
