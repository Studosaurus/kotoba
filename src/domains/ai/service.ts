import type { AIService } from "./types";

export function createAIService(): AIService {
  return {
    async analyze() {
      throw new Error("AI provider integration and prompts are not implemented yet.");
    },
  };
}

