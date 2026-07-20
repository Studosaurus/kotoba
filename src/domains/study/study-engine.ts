import type { StudyEngine } from "./types";

export function createStudyEngine(): StudyEngine {
  return {
    description: "Vocabulary-first unified study foundation.",
    async createStudyItem() {
      throw new Error("Study item creation is not implemented yet.");
    },
    async recordReview() {
      throw new Error("Review recording is not implemented yet.");
    },
  };
}

