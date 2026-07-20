import { createStudyEngine } from "@/domains/study/study-engine";

export default function StudyPage() {
  const studyEngine = createStudyEngine();

  return (
    <section className="space-y-3">
      <p className="text-sm font-medium text-matcha-700">Unified Study</p>
      <h1 className="text-2xl font-semibold text-ink-950">Study Engine</h1>
      <p className="max-w-2xl text-ink-600">
        {studyEngine.description} Scheduling and review behavior will be implemented with the first
        vocabulary feature slice.
      </p>
    </section>
  );
}

