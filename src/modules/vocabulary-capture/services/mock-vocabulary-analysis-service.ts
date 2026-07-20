import type {
  VocabularyAnalysis,
  VocabularyAnalysisRequest,
  VocabularyAnalysisService,
} from "../types";

const MOCK_LATENCY_MS = 850;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class MockVocabularyAnalysisService implements VocabularyAnalysisService {
  private failureAttempts = new Map<string, number>();

  async analyze(request: VocabularyAnalysisRequest): Promise<VocabularyAnalysis> {
    const phrase = request.phrase.trim();

    await wait(MOCK_LATENCY_MS);

    if (this.shouldFailOnce(phrase)) {
      throw new Error("Mock analysis failed. Try again.");
    }

    return createMockAnalysis(phrase);
  }

  private shouldFailOnce(phrase: string) {
    const lowerPhrase = phrase.toLowerCase();
    const shouldFail = lowerPhrase.includes("fail") || phrase.includes("失敗");

    if (!shouldFail) {
      return false;
    }

    const attempts = this.failureAttempts.get(phrase) ?? 0;
    this.failureAttempts.set(phrase, attempts + 1);

    return attempts === 0;
  }
}

export function createMockVocabularyAnalysisService() {
  return new MockVocabularyAnalysisService();
}

function createMockAnalysis(phrase: string): VocabularyAnalysis {
  if (phrase === "毎日二時間ぐらい日本語を聞いています。") {
    return {
      originalPhrase: phrase,
      normalizedForm: "毎日二時間ぐらい日本語を聞く",
      readingKana: "まいにち にじかんぐらい にほんごを きいています",
      conciseMeaning: "I listen to Japanese for about two hours every day.",
      naturalTranslation: "I listen to Japanese for around two hours every day.",
      grammarExplanation:
        "ぐらい marks an approximate amount. 聞いています uses the ている form to describe an ongoing or habitual action.",
      exampleSentence: "毎朝三十分ぐらい日本語のポッドキャストを聞いています。",
      exampleSentenceReading:
        "まいあさ さんじゅっぷんぐらい にほんごの ポッドキャストを きいています。",
      exampleSentenceTranslation:
        "Every morning, I listen to a Japanese podcast for about thirty minutes.",
      jlptEstimate: "N5-N4",
      suggestedTags: ["listening", "habit", "time", "ている", "ぐらい"],
      confidence: "high",
      sourceContext: {
        sourceName: "Mock media context",
        mediaItemTitle: "Japanese Listening Practice, Episode 12",
        timestampLabel: "14:32",
        capturedAtLabel: "Today",
      },
    };
  }

  return {
    originalPhrase: phrase,
    normalizedForm: phrase.replace(/[。！？!?]+$/u, ""),
    readingKana: "まいにち にじかんぐらい にほんごを きいています",
    conciseMeaning: "A phrase about listening to Japanese regularly.",
    naturalTranslation: "I listen to Japanese regularly for about two hours.",
    grammarExplanation:
      "This mock explanation highlights likely grammar and usage. A real implementation will use the Vocabulary Analysis service adapter.",
    exampleSentence: "毎日少しずつ日本語を勉強しています。",
    exampleSentenceReading: "まいにち すこしずつ にほんごを べんきょうしています。",
    exampleSentenceTranslation: "I study Japanese little by little every day.",
    jlptEstimate: "N5-N4",
    suggestedTags: ["listening", "daily", "phrase"],
    confidence: "medium",
    sourceContext: {
      sourceName: "No active media",
      capturedAtLabel: "Today",
    },
  };
}
