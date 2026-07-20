import type { LearningModule } from "@/domains/modules/types";

export const mediaModule: LearningModule = {
  id: "media",
  name: "Media",
  description: "Connector-neutral listening context, playback metadata, goals, and statistics.",
  enabledByDefault: true,
  routes: [{ label: "Media", href: "/modules/media" }],
};

