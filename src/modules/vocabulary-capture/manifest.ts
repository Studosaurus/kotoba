import type { LearningModule } from "@/domains/modules/types";

export const vocabularyCaptureModule: LearningModule = {
  id: "vocabulary-capture",
  name: "Vocabulary Capture",
  description: "Low-friction capture for words and phrases encountered during real study.",
  enabledByDefault: true,
  routes: [{ label: "Capture", href: "/modules/vocabulary-capture" }],
};

