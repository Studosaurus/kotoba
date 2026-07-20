import type { BackgroundJob, JobRunner } from "./types";

export function createJobRunner(): JobRunner {
  return {
    async enqueue(type, payload) {
      return {
        id: crypto.randomUUID(),
        type,
        payload,
        status: "queued",
        queuedAt: new Date().toISOString(),
      } satisfies BackgroundJob<typeof payload>;
    },
  };
}

