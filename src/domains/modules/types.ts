export type ModuleId = "vocabulary-capture" | "media";

export interface LearningModule {
  id: ModuleId;
  name: string;
  description: string;
  enabledByDefault: boolean;
  routes: ModuleRoute[];
}

export interface ModuleRoute {
  label: string;
  href: string;
}

