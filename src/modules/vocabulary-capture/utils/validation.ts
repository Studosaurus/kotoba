import type { VocabularyAnalysis } from "../types";

export type VocabularyValidationErrors = Partial<Record<keyof VocabularyAnalysis, string>>;

export function validateVocabularyAnalysis(
  analysis: VocabularyAnalysis,
): VocabularyValidationErrors {
  const errors: VocabularyValidationErrors = {};

  if (!analysis.originalPhrase.trim()) {
    errors.originalPhrase = "Japanese phrase is required.";
  }

  if (!analysis.readingKana.trim()) {
    errors.readingKana = "Reading is required.";
  }

  if (!analysis.conciseMeaning.trim()) {
    errors.conciseMeaning = "Meaning is required.";
  }

  if (!analysis.naturalTranslation.trim()) {
    errors.naturalTranslation = "Natural translation is required.";
  }

  return errors;
}

export function hasValidationErrors(errors: VocabularyValidationErrors) {
  return Object.keys(errors).length > 0;
}

