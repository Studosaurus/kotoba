import type { LearningModule } from "./types";
import { mediaModule } from "@/modules/media/manifest";
import { vocabularyCaptureModule } from "@/modules/vocabulary-capture/manifest";

// First-party modules are registered explicitly to keep MVP boundaries simple and reviewable.
const registeredModules: LearningModule[] = [vocabularyCaptureModule, mediaModule];

export function getRegisteredModules() {
  return registeredModules;
}

export function getModuleById(moduleId: LearningModule["id"]) {
  return registeredModules.find((module) => module.id === moduleId) ?? null;
}

