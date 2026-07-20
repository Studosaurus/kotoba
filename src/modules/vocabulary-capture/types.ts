export type ConfidenceLevel = "low" | "medium" | "high";
export type VocabularySourceProvenance = "active_episode" | "manual";

export interface VocabularySourceContext {
  sourceName?: string;
  mediaItemTitle?: string;
  timestampLabel?: string;
  capturedAtLabel?: string;
  provenance?: VocabularySourceProvenance;
}

export interface VocabularyAnalysis {
  originalPhrase: string;
  normalizedForm: string;
  readingKana: string;
  conciseMeaning: string;
  naturalTranslation: string;
  grammarExplanation: string;
  exampleSentence: string;
  exampleSentenceReading: string;
  exampleSentenceTranslation: string;
  jlptEstimate: string;
  suggestedTags: string[];
  confidence: ConfidenceLevel;
  sourceContext?: VocabularySourceContext;
}

export interface VocabularyAnalysisRequest {
  phrase: string;
}

export interface VocabularyAnalysisService {
  analyze(request: VocabularyAnalysisRequest): Promise<VocabularyAnalysis>;
}

export type VocabularyCaptureStatus =
  | "empty"
  | "analyzing"
  | "ready"
  | "saving"
  | "saved"
  | "save-error"
  | "analysis-error";
