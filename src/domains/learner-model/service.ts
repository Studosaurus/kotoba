import type { LearnerEvent, LearnerModelSnapshot } from "./types";

export interface LearnerModelService {
  recordEvent(event: LearnerEvent): Promise<void>;
  getSnapshot(learnerId: string): Promise<LearnerModelSnapshot>;
}

export function createLearnerModelService(): LearnerModelService {
  return {
    async recordEvent() {
      throw new Error("Learner Model persistence is not implemented yet.");
    },
    async getSnapshot(learnerId) {
      return {
        learnerId,
        vocabularyCount: 0,
        reviewCount: 0,
        listeningMinutes: 0,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

