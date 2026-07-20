import type {
  LocalReviewCard,
  LocalVocabularyCard,
  MasteryLevel,
  ReviewRating,
} from "./local-vocabulary-types";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MASTERY_LEVELS: MasteryLevel[] = ["new", "learning", "familiar", "strong", "mastered"];

interface NextSchedule {
  intervalDays: number;
  ease: number;
  nextDueAt: Date;
}

export interface DueTimelineBucket {
  id: "now" | "today" | "tomorrow" | "week" | "later";
  label: string;
  reviewCards: LocalReviewCard[];
}

export function getDueReviewCards(reviewCards: LocalReviewCard[], now = new Date()) {
  return reviewCards
    .filter((card) => new Date(card.nextDueAt).getTime() <= now.getTime())
    .sort((first, second) => {
      const dueDelta = new Date(first.nextDueAt).getTime() - new Date(second.nextDueAt).getTime();

      if (dueDelta !== 0) {
        return dueDelta;
      }

      const masteryDelta = masteryRank(first.masteryLevel) - masteryRank(second.masteryLevel);

      if (masteryDelta !== 0) {
        return masteryDelta;
      }

      return first.type.localeCompare(second.type);
    });
}

export function applyReviewRating(
  card: LocalReviewCard,
  rating: ReviewRating,
  reviewedAt = new Date(),
): LocalReviewCard {
  const next = calculateNextSchedule(card, rating, reviewedAt);
  const wasMiss = rating === "again";
  const successfulReviewDays = wasMiss
    ? (card.successfulReviewDays ?? [])
    : addSuccessfulReviewDay(card.successfulReviewDays ?? [], reviewedAt);
  const reviewedCard: LocalReviewCard = {
    ...card,
    reviewCount: card.reviewCount + 1,
    correctCount: card.correctCount + (wasMiss ? 0 : 1),
    incorrectCount: card.incorrectCount + (wasMiss ? 1 : 0),
    lapseCount: card.lapseCount + (wasMiss ? 1 : 0),
    intervalDays: next.intervalDays,
    ease: next.ease,
    lastReviewedAt: reviewedAt.toISOString(),
    successfulReviewDays,
    lastLapseAt: wasMiss ? reviewedAt.toISOString() : card.lastLapseAt,
    nextDueAt: next.nextDueAt.toISOString(),
    updatedAt: reviewedAt.toISOString(),
  };

  return {
    ...reviewedCard,
    masteryLevel: deriveMastery(reviewedCard),
  };
}

export function getVocabularyMastery(
  vocabularyCard: LocalVocabularyCard,
  reviewCards: LocalReviewCard[],
): MasteryLevel {
  const relatedCards = reviewCards.filter((card) => card.vocabularyCardId === vocabularyCard.id);

  if (relatedCards.length === 0) {
    return "new";
  }

  const lowestRank = Math.min(...relatedCards.map((card) => masteryRank(card.masteryLevel)));
  return rankToMastery(lowestRank);
}

export function getMasteryProgress(level: MasteryLevel) {
  const rank = masteryRank(level);
  const nextLevel = rankToMastery(Math.min(rank + 1, MASTERY_LEVELS.length - 1));

  return {
    level,
    nextLevel,
    percent: (rank / (MASTERY_LEVELS.length - 1)) * 100,
    isComplete: rank === MASTERY_LEVELS.length - 1,
  };
}

export function getMasteryDistribution(reviewCards: LocalReviewCard[]) {
  return MASTERY_LEVELS.map((level) => ({
    level,
    count: reviewCards.filter((card) => card.masteryLevel === level).length,
  }));
}

export function getNextDueCardForVocabulary(
  vocabularyCard: LocalVocabularyCard,
  reviewCards: LocalReviewCard[],
) {
  return reviewCards
    .filter((card) => card.vocabularyCardId === vocabularyCard.id)
    .sort(
      (first, second) =>
        new Date(first.nextDueAt).getTime() - new Date(second.nextDueAt).getTime(),
    )[0];
}

export function getDueTimelineBuckets(reviewCards: LocalReviewCard[], now = new Date()) {
  const buckets: DueTimelineBucket[] = [
    { id: "now", label: "Due now", reviewCards: [] },
    { id: "today", label: "Later today", reviewCards: [] },
    { id: "tomorrow", label: "Tomorrow", reviewCards: [] },
    { id: "week", label: "This week", reviewCards: [] },
    { id: "later", label: "Later", reviewCards: [] },
  ];
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const weekEnd = new Date(now.getTime() + 7 * DAY_MS);

  reviewCards.forEach((card) => {
    const dueTime = new Date(card.nextDueAt).getTime();

    if (dueTime <= now.getTime()) {
      buckets[0].reviewCards.push(card);
    } else if (dueTime <= todayEnd.getTime()) {
      buckets[1].reviewCards.push(card);
    } else if (dueTime <= tomorrowEnd.getTime()) {
      buckets[2].reviewCards.push(card);
    } else if (dueTime <= weekEnd.getTime()) {
      buckets[3].reviewCards.push(card);
    } else {
      buckets[4].reviewCards.push(card);
    }
  });

  return buckets;
}

export function didMasteryIncrease(previous: MasteryLevel, next: MasteryLevel) {
  return masteryRank(next) > masteryRank(previous) && masteryRank(next) >= masteryRank("familiar");
}

export function formatMastery(level: MasteryLevel) {
  return level[0]?.toUpperCase() + level.slice(1);
}

export function formatReviewCardType(type: LocalReviewCard["type"]) {
  if (type === "audio_to_en") {
    return "Audio";
  }

  return type === "jp_to_en" ? "JPN to ENG" : "ENG to JPN";
}

export function getDueCountForVocabulary(
  vocabularyCard: LocalVocabularyCard,
  reviewCards: LocalReviewCard[],
  now = new Date(),
) {
  return reviewCards.filter(
    (card) =>
      card.vocabularyCardId === vocabularyCard.id &&
      new Date(card.nextDueAt).getTime() <= now.getTime(),
  ).length;
}

function calculateNextSchedule(
  card: LocalReviewCard,
  rating: ReviewRating,
  reviewedAt: Date,
): NextSchedule {
  if (rating === "again") {
    return {
      intervalDays: 0,
      ease: Math.max(1.3, card.ease - 0.25),
      nextDueAt: reviewedAt,
    };
  }

  if (rating === "hard") {
    const intervalDays = Math.max(1, Math.round((card.intervalDays || 1) * 1.2));
    return {
      intervalDays,
      ease: Math.max(1.3, card.ease - 0.1),
      nextDueAt: new Date(reviewedAt.getTime() + intervalDays * DAY_MS),
    };
  }

  if (rating === "easy") {
    const ease = Math.min(3, card.ease + 0.15);
    const intervalDays = Math.max(7, Math.round((card.intervalDays || 2) * ease * 1.5));
    return {
      intervalDays,
      ease,
      nextDueAt: new Date(reviewedAt.getTime() + intervalDays * DAY_MS),
    };
  }

  const intervalDays = Math.max(3, Math.round((card.intervalDays || 1) * card.ease));
  return {
    intervalDays,
    ease: card.ease,
    nextDueAt: new Date(reviewedAt.getTime() + intervalDays * DAY_MS),
  };
}

export function recalculateReviewCardMastery(card: LocalReviewCard): LocalReviewCard {
  const successfulReviewDays = normalizeSuccessfulReviewDays(card);
  const normalizedCard = { ...card, successfulReviewDays };

  return {
    ...normalizedCard,
    masteryLevel: deriveMastery(normalizedCard),
  };
}

function deriveMastery(card: LocalReviewCard): MasteryLevel {
  if (card.reviewCount === 0) {
    return "new";
  }

  const successfulDays = successfulDaysAfterLastLapse(card);

  if (card.correctCount >= 10 && successfulDays >= 7 && card.intervalDays >= 60) {
    return "mastered";
  }

  if (card.correctCount >= 6 && successfulDays >= 4 && card.intervalDays >= 14) {
    return "strong";
  }

  if (card.correctCount >= 3 && successfulDays >= 2 && card.intervalDays >= 3) {
    return "familiar";
  }

  return "learning";
}

function addSuccessfulReviewDay(days: string[], reviewedAt: Date) {
  return Array.from(new Set([...days, getLocalDayKey(reviewedAt)])).sort().slice(-30);
}

function normalizeSuccessfulReviewDays(card: LocalReviewCard) {
  if (card.successfulReviewDays?.length) {
    return Array.from(new Set(card.successfulReviewDays)).sort().slice(-30);
  }

  if (card.correctCount > 0 && card.lastReviewedAt) {
    return [getLocalDayKey(new Date(card.lastReviewedAt))];
  }

  return [];
}

function successfulDaysAfterLastLapse(card: LocalReviewCard) {
  const successfulDays = normalizeSuccessfulReviewDays(card);

  if (!card.lastLapseAt) {
    return successfulDays.length;
  }

  const lapseDay = getLocalDayKey(new Date(card.lastLapseAt));
  return successfulDays.filter((day) => day > lapseDay).length;
}

function getLocalDayKey(value: Date) {
  return [
    value.getFullYear(),
    (value.getMonth() + 1).toString().padStart(2, "0"),
    value.getDate().toString().padStart(2, "0"),
  ].join("-");
}

export function masteryRank(level: MasteryLevel) {
  const ranks: Record<MasteryLevel, number> = {
    new: 0,
    learning: 1,
    familiar: 2,
    strong: 3,
    mastered: 4,
  };

  return ranks[level];
}

function rankToMastery(rank: number): MasteryLevel {
  const levels: MasteryLevel[] = ["new", "learning", "familiar", "strong", "mastered"];
  return levels[rank] ?? "new";
}

export function formatDueLabel(card: LocalReviewCard, now = new Date()) {
  const dueTime = new Date(card.nextDueAt).getTime();
  const deltaMs = dueTime - now.getTime();

  if (deltaMs <= 0) {
    return "Due now";
  }

  if (deltaMs < DAY_MS) {
    const hours = Math.max(1, Math.ceil(deltaMs / (60 * MINUTE_MS)));
    return `${hours}h`;
  }

  const days = Math.ceil(deltaMs / DAY_MS);
  return `${days}d`;
}
