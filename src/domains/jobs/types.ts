import type { ISODateTime } from "@/shared/types/common";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface BackgroundJob<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  status: JobStatus;
  queuedAt: ISODateTime;
}

export interface JobRunner {
  enqueue<TPayload>(type: string, payload: TPayload): Promise<BackgroundJob<TPayload>>;
}

