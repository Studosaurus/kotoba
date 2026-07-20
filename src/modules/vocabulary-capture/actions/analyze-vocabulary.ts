"use server";

import { z } from "zod";
import { serverEnv } from "@/config/server-env";
import type { VocabularyAnalysis } from "../types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const QUICK_GRAMMAR_PLACEHOLDER = "Adding details...";
const QUICK_EXAMPLE_PLACEHOLDER = "例文を追加しています。";

const vocabularyAnalysisSchema = z.object({
  originalPhrase: z.string().min(1),
  normalizedForm: z.string().min(1),
  readingKana: z.string().min(1),
  conciseMeaning: z.string().min(1),
  naturalTranslation: z.string().min(1),
  grammarExplanation: z.string().min(1),
  exampleSentence: z.string().min(1),
  exampleSentenceReading: z.string().min(1),
  exampleSentenceTranslation: z.string().min(1),
  jlptEstimate: z.string().min(1),
  suggestedTags: z.array(z.string().min(1)).min(1).max(8),
  confidence: z.enum(["low", "medium", "high"]),
  sourceContext: z.object({
    sourceName: z.string(),
    mediaItemTitle: z.string(),
    timestampLabel: z.string(),
    capturedAtLabel: z.string(),
  }),
});

const quickVocabularyAnalysisSchema = z.object({
  originalPhrase: z.string().min(1),
  normalizedForm: z.string().min(1),
  readingKana: z.string().min(1),
  conciseMeaning: z.string().min(1),
  naturalTranslation: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
});

export async function analyzeVocabulary(phrase: string): Promise<VocabularyAnalysis> {
  const trimmedPhrase = phrase.trim();

  if (!trimmedPhrase) {
    throw new Error("Enter Japanese text.");
  }

  if (!serverEnv.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured yet.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: serverEnv.OPENAI_MODEL ?? DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are Kotoba, a Japanese learning assistant. Analyze the user's Japanese word, phrase, or sentence for an English-speaking learner. Return only structured JSON matching the schema. Keep explanations concise, practical, and learner-friendly. If the input is not Japanese, still explain what you can and set confidence low.",
        },
        {
          role: "user",
          content: trimmedPhrase,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "vocabulary_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "originalPhrase",
              "normalizedForm",
              "readingKana",
              "conciseMeaning",
              "naturalTranslation",
              "grammarExplanation",
              "exampleSentence",
              "exampleSentenceReading",
              "exampleSentenceTranslation",
              "jlptEstimate",
              "suggestedTags",
              "confidence",
              "sourceContext",
            ],
            properties: {
              originalPhrase: { type: "string" },
              normalizedForm: { type: "string" },
              readingKana: { type: "string" },
              conciseMeaning: { type: "string" },
              naturalTranslation: { type: "string" },
              grammarExplanation: { type: "string" },
              exampleSentence: { type: "string" },
              exampleSentenceReading: { type: "string" },
              exampleSentenceTranslation: { type: "string" },
              jlptEstimate: { type: "string" },
              suggestedTags: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: { type: "string" },
              },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              sourceContext: {
                type: "object",
                additionalProperties: false,
                required: ["sourceName", "mediaItemTitle", "timestampLabel", "capturedAtLabel"],
                properties: {
                  sourceName: { type: "string" },
                  mediaItemTitle: { type: "string" },
                  timestampLabel: { type: "string" },
                  capturedAtLabel: { type: "string" },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI analysis failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractResponseText(payload);

  if (!outputText) {
    throw new Error("OpenAI returned no structured analysis.");
  }

  const parsedJson = JSON.parse(outputText) as unknown;
  return vocabularyAnalysisSchema.parse(parsedJson);
}

export async function quickAnalyzeVocabulary(phrase: string): Promise<VocabularyAnalysis> {
  const trimmedPhrase = phrase.trim();

  if (!trimmedPhrase) {
    throw new Error("Enter Japanese text.");
  }

  if (!serverEnv.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured yet.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: serverEnv.OPENAI_MODEL ?? DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are Kotoba, a fast Japanese-to-English translation layer. Return only compact JSON. Prioritize speed and useful first-pass learner meaning. Do not include long explanations.",
        },
        {
          role: "user",
          content: trimmedPhrase,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "quick_vocabulary_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "originalPhrase",
              "normalizedForm",
              "readingKana",
              "conciseMeaning",
              "naturalTranslation",
              "confidence",
            ],
            properties: {
              originalPhrase: { type: "string" },
              normalizedForm: { type: "string" },
              readingKana: { type: "string" },
              conciseMeaning: { type: "string" },
              naturalTranslation: { type: "string" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI quick analysis failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractResponseText(payload);

  if (!outputText) {
    throw new Error("OpenAI returned no quick analysis.");
  }

  const quickAnalysis = quickVocabularyAnalysisSchema.parse(JSON.parse(outputText) as unknown);

  return {
    ...quickAnalysis,
    grammarExplanation: QUICK_GRAMMAR_PLACEHOLDER,
    exampleSentence: QUICK_EXAMPLE_PLACEHOLDER,
    exampleSentenceReading: "れいぶんをついかしています。",
    exampleSentenceTranslation: "Adding an example sentence...",
    jlptEstimate: "Estimating...",
    suggestedTags: ["needs-details"],
  };
}

export async function enrichVocabularyAnalysis(
  analysis: VocabularyAnalysis,
): Promise<VocabularyAnalysis> {
  const enrichedAnalysis = await analyzeVocabulary(analysis.originalPhrase);

  return {
    ...enrichedAnalysis,
    sourceContext: analysis.sourceContext,
  };
}

export type AnalyzeVocabularyResult =
  | { ok: true; analysis: VocabularyAnalysis }
  | { ok: false; error: string };

export async function analyzeVocabularySafely(phrase: string): Promise<AnalyzeVocabularyResult> {
  try {
    const analysis = await analyzeVocabulary(phrase);
    return { ok: true, analysis };
  } catch (error) {
    console.error("Vocabulary analysis failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: getUserFacingAnalysisError(error),
    };
  }
}

export async function quickAnalyzeVocabularySafely(
  phrase: string,
): Promise<AnalyzeVocabularyResult> {
  try {
    const analysis = await quickAnalyzeVocabulary(phrase);
    return { ok: true, analysis };
  } catch (error) {
    console.error("Quick vocabulary analysis failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: getUserFacingAnalysisError(error),
    };
  }
}

export async function enrichVocabularyAnalysisSafely(
  analysis: VocabularyAnalysis,
): Promise<AnalyzeVocabularyResult> {
  try {
    const enrichedAnalysis = await enrichVocabularyAnalysis(analysis);
    return { ok: true, analysis: enrichedAnalysis };
  } catch (error) {
    console.error("Vocabulary enrichment failed", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: "Could not add details yet. The quick translation is still available.",
    };
  }
}

function getUserFacingAnalysisError(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not analyze this phrase.";

  if (message.includes("insufficient_quota") || message.includes("exceeded your current quota")) {
    return "OpenAI quota is unavailable. Check billing or usage limits for the API key.";
  }

  if (message.includes("OpenAI API key is not configured")) {
    return "OpenAI API key is not configured yet.";
  }

  if (message.includes("401") || message.includes("invalid_api_key")) {
    return "OpenAI API key was rejected. Check the Vercel environment variable.";
  }

  if (message.includes("404") || message.includes("model_not_found")) {
    return "OpenAI model is unavailable for this API key. Check OPENAI_MODEL in Vercel.";
  }

  if (message.includes("400") && message.includes("model")) {
    return "OpenAI model setting is invalid. Check OPENAI_MODEL in Vercel.";
  }

  if (message.includes("429")) {
    return "OpenAI rate limit reached. Wait a moment and try again.";
  }

  if (message.includes("no structured analysis") || message.includes("Unexpected token")) {
    return "OpenAI returned an unexpected response. Try again.";
  }

  return "Could not analyze this phrase. Try again.";
}

interface OpenAIResponsePayload {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

function extractResponseText(payload: OpenAIResponsePayload) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => Boolean(text))
    .join("\n");
}
