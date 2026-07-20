import type { EntityId, ISODateTime, Provenance } from "@/shared/types/common";

export type LearnerEventType =
  | "vocabulary.captured"
  | "study.reviewed"
  | "media.listened"
  | "profile.updated";

export interface LearnerEvent<TPayload = unknown> {
  id: EntityId;
  learnerId: EntityId;
  type: LearnerEventType;
  payload: TPayload;
  provenance: Provenance;
  occurredAt: ISODateTime;
}

export interface LearnerProfile {
  id: EntityId;
  displayName?: string;
  timezone?: string;
  createdAt: ISODateTime;
}

export interface LearnerModelSnapshot {
  learnerId: EntityId;
  vocabularyCount: number;
  reviewCount: number;
  listeningMinutes: number;
  generatedAt: ISODateTime;
}

