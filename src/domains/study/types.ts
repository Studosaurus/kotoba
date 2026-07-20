import type { EntityId, ISODateTime, Provenance } from "@/shared/types/common";

export type StudyItemKind = "vocabulary";

export interface StudyItem {
  id: EntityId;
  learnerId: EntityId;
  kind: StudyItemKind;
  sourceEntityId: EntityId;
  provenance: Provenance;
  createdAt: ISODateTime;
}

export interface ReviewResult {
  studyItemId: EntityId;
  learnerId: EntityId;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: ISODateTime;
}

export interface StudyEngine {
  description: string;
  createStudyItem(candidate: Omit<StudyItem, "id" | "createdAt">): Promise<StudyItem>;
  recordReview(result: ReviewResult): Promise<void>;
}

