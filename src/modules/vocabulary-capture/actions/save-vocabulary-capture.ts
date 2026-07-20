"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { VocabularyAnalysis } from "../types";
import { hasValidationErrors, validateVocabularyAnalysis } from "../utils/validation";

export interface SaveVocabularyCaptureResult {
  vocabularyItemId: string;
  studyItemId: string;
}

export async function saveVocabularyCapture(
  analysis: VocabularyAnalysis,
): Promise<SaveVocabularyCaptureResult> {
  const validationErrors = validateVocabularyAnalysis(analysis);

  if (hasValidationErrors(validationErrors)) {
    throw new Error("Complete the required fields before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sign in before saving vocabulary.");
  }

  const now = new Date().toISOString();
  const provenance = {
    source: "ai",
    sourceId: "mock-vocabulary-analysis",
    confidence: { label: analysis.confidence },
    capturedAt: now,
  } satisfies Json;

  const { data: vocabularyItem, error: vocabularyError } = await supabase
    .from("vocabulary_items")
    .insert({
      user_id: user.id,
      original_phrase: analysis.originalPhrase,
      normalized_form: analysis.normalizedForm,
      reading_kana: analysis.readingKana,
      concise_meaning: analysis.conciseMeaning,
      natural_translation: analysis.naturalTranslation,
      grammar_explanation: analysis.grammarExplanation,
      example_sentence: analysis.exampleSentence,
      example_sentence_reading: analysis.exampleSentenceReading,
      example_sentence_translation: analysis.exampleSentenceTranslation,
      jlpt_estimate: analysis.jlptEstimate,
      suggested_tags: analysis.suggestedTags,
      confidence: analysis.confidence,
      source_context: (analysis.sourceContext ?? {}) as Json,
      provenance,
    })
    .select("id")
    .single();

  if (vocabularyError) {
    throw new Error(`Could not save vocabulary: ${vocabularyError.message}`);
  }

  const { error: eventError } = await supabase.from("learner_events").insert({
    user_id: user.id,
    event_type: "vocabulary.captured",
    payload: {
      vocabularyItemId: vocabularyItem.id,
      originalPhrase: analysis.originalPhrase,
    },
    provenance,
  });

  if (eventError) {
    throw new Error(`Could not record learner event: ${eventError.message}`);
  }

  const { data: studyItem, error: studyError } = await supabase
    .from("study_items")
    .insert({
      user_id: user.id,
      kind: "vocabulary",
      source_entity_id: vocabularyItem.id,
      status: "due",
      due_at: now,
      provenance,
    })
    .select("id")
    .single();

  if (studyError) {
    throw new Error(`Could not create study item: ${studyError.message}`);
  }

  return {
    vocabularyItemId: vocabularyItem.id,
    studyItemId: studyItem.id,
  };
}
