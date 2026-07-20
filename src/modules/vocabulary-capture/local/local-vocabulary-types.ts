import type { VocabularyAnalysis } from "../types";

export type MasteryLevel = "new" | "learning" | "familiar" | "strong" | "mastered";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewCardType = "jp_to_en" | "en_to_jp" | "audio_to_en";

export interface LocalAudioClip {
  dataUrl: string;
  mimeType: string;
  durationMs: number;
  createdAt: string;
}

export interface LocalVocabularyCard {
  id: string;
  analysis: VocabularyAnalysis;
  audioClip?: LocalAudioClip;
  createdAt: string;
  updatedAt: string;
}

export interface LocalReviewCard {
  id: string;
  vocabularyCardId: string;
  type: ReviewCardType;
  masteryLevel: MasteryLevel;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  intervalDays: number;
  ease: number;
  lapseCount: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  successfulReviewDays?: string[];
  lastLapseAt?: string;
  nextDueAt: string;
}

export interface LocalVocabularyDeck {
  vocabularyCards: LocalVocabularyCard[];
  reviewCards: LocalReviewCard[];
}
