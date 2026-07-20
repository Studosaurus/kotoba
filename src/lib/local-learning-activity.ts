const LEARNING_ACTIVITY_KEY = "kotoba:learning-activity";

export interface DailyLearningActivity {
  studyReviews: number;
  updatedAt: string;
}

export type LearningActivityHistory = Record<string, DailyLearningActivity>;

export type DailyAchievementRating =
  | "not-started"
  | "active"
  | "quarter-goal"
  | "half-goal"
  | "three-quarter-goal"
  | "goal-met"
  | "strong"
  | "exceptional";

export function loadLearningActivityHistory(): LearningActivityHistory {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(LEARNING_ACTIVITY_KEY) ?? "{}",
    ) as LearningActivityHistory;
  } catch {
    return {};
  }
}

export function recordStudyReview(reviewedAt = new Date()) {
  if (typeof window === "undefined") {
    return;
  }

  const history = loadLearningActivityHistory();
  const dayKey = getLocalDayKey(reviewedAt);

  saveLearningActivityHistory({
    ...history,
    [dayKey]: {
      studyReviews: (history[dayKey]?.studyReviews ?? 0) + 1,
      updatedAt: reviewedAt.toISOString(),
    },
  });
}

export function preserveKnownStudyDays(reviewedAtValues: Array<string | undefined>) {
  if (typeof window === "undefined") {
    return;
  }

  const history = loadLearningActivityHistory();
  let didChange = false;
  const nextHistory = { ...history };

  reviewedAtValues.forEach((reviewedAtValue) => {
    if (!reviewedAtValue) {
      return;
    }

    const reviewedAt = new Date(reviewedAtValue);

    if (Number.isNaN(reviewedAt.getTime())) {
      return;
    }

    const dayKey = getLocalDayKey(reviewedAt);

    if (!nextHistory[dayKey]) {
      nextHistory[dayKey] = {
        studyReviews: 1,
        updatedAt: reviewedAt.toISOString(),
      };
      didChange = true;
    }
  });

  if (didChange) {
    saveLearningActivityHistory(nextHistory);
  }
}

export function getLocalDayKey(value: Date) {
  return [
    value.getFullYear(),
    (value.getMonth() + 1).toString().padStart(2, "0"),
    value.getDate().toString().padStart(2, "0"),
  ].join("-");
}

export function getLearningStreak({
  history,
  listeningByDay,
  now = new Date(),
}: {
  history: LearningActivityHistory;
  listeningByDay: Record<string, { listenedMs: number }>;
  now?: Date;
}) {
  const todayKey = getLocalDayKey(now);
  const isActive = (dayKey: string) =>
    (listeningByDay[dayKey]?.listenedMs ?? 0) > 0 ||
    (history[dayKey]?.studyReviews ?? 0) > 0;
  const isActiveToday = isActive(todayKey);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!isActiveToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let count = 0;

  while (count < 3_650 && isActive(getLocalDayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    count,
    isActiveToday,
    todayStudyReviews: history[todayKey]?.studyReviews ?? 0,
  };
}

export function getDailyAchievementRating({
  listenedMs,
  goalMinutes,
  studyReviews,
}: {
  listenedMs: number;
  goalMinutes: number;
  studyReviews: number;
}): DailyAchievementRating {
  const hasActivity = listenedMs > 0 || studyReviews > 0;

  if (!hasActivity) {
    return "not-started";
  }

  const goalMs = goalMinutes * 60_000;
  const progress = goalMs > 0 ? listenedMs / goalMs : 0;

  if (progress >= 1.5) {
    return "exceptional";
  }

  if (progress >= 1.25) {
    return "strong";
  }

  if (progress >= 1) {
    return "goal-met";
  }

  if (progress >= 0.75) {
    return "three-quarter-goal";
  }

  if (progress >= 0.5) {
    return "half-goal";
  }

  if (progress >= 0.25) {
    return "quarter-goal";
  }

  return "active";
}

function saveLearningActivityHistory(history: LearningActivityHistory) {
  window.localStorage.setItem(LEARNING_ACTIVITY_KEY, JSON.stringify(history));
}
