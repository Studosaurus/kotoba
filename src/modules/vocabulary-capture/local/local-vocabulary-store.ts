import type { VocabularyAnalysis } from "../types";
import type {
  LocalAudioClip,
  LocalReviewCard,
  LocalVocabularyCard,
  LocalVocabularyDeck,
  ReviewCardType,
} from "./local-vocabulary-types";
import { recalculateReviewCardMastery } from "./local-study-scheduler";

const LEGACY_CAPTURE_KEY = "kotoba:vocabulary-captures";
const LEGACY_CARD_KEY = "kotoba:vocabulary-cards";
const LOCAL_DECK_KEY = "kotoba:vocabulary-deck";
const BASE_REVIEW_CARD_TYPES: ReviewCardType[] = ["jp_to_en", "en_to_jp"];

export function createLocalVocabularyCard(
  analysis: VocabularyAnalysis,
  audioClip?: LocalAudioClip | null,
): LocalVocabularyCard {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    analysis,
    audioClip: audioClip ?? undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function createReviewCardsForVocabulary(
  vocabularyCard: LocalVocabularyCard,
): LocalReviewCard[] {
  const cardTypes: ReviewCardType[] = vocabularyCard.audioClip
    ? [...BASE_REVIEW_CARD_TYPES, "audio_to_en"]
    : BASE_REVIEW_CARD_TYPES;

  return cardTypes.map((type) =>
    createReviewCard(vocabularyCard.id, type, vocabularyCard.createdAt),
  );
}

export function loadLocalVocabularyDeck(): LocalVocabularyDeck {
  if (typeof window === "undefined") {
    return { vocabularyCards: [], reviewCards: [] };
  }

  try {
    const rawDeck = window.localStorage.getItem(LOCAL_DECK_KEY);

    if (rawDeck) {
      return ensureReviewCards(JSON.parse(rawDeck) as LocalVocabularyDeck);
    }

    return migrateLegacyStorage();
  } catch {
    return { vocabularyCards: [], reviewCards: [] };
  }
}

export function saveLocalVocabularyDeck(deck: LocalVocabularyDeck) {
  window.localStorage.setItem(
    LOCAL_DECK_KEY,
    JSON.stringify({
      vocabularyCards: deck.vocabularyCards.slice(0, 200),
      reviewCards: deck.reviewCards.slice(0, 400),
    } satisfies LocalVocabularyDeck),
  );
}

function createReviewCard(
  vocabularyCardId: string,
  type: ReviewCardType,
  createdAt: string,
): LocalReviewCard {
  return {
    id: crypto.randomUUID(),
    vocabularyCardId,
    type,
    masteryLevel: "new",
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    intervalDays: 0,
    ease: 2.5,
    lapseCount: 0,
    recentOutcomes: [],
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    createdAt,
    updatedAt: createdAt,
    successfulReviewDays: [],
    nextDueAt: createdAt,
  };
}

function ensureReviewCards(deck: LocalVocabularyDeck): LocalVocabularyDeck {
  const reviewCards = (deck.reviewCards ?? []).map(recalculateReviewCardMastery);

  deck.vocabularyCards.forEach((vocabularyCard) => {
    const existingTypes = new Set(
      reviewCards
        .filter((reviewCard) => reviewCard.vocabularyCardId === vocabularyCard.id)
        .map((reviewCard) => reviewCard.type),
    );

    createReviewCardsForVocabulary(vocabularyCard).forEach((reviewCard) => {
      if (!existingTypes.has(reviewCard.type)) {
        reviewCards.push(reviewCard);
      }
    });
  });

  const nextDeck = { vocabularyCards: deck.vocabularyCards, reviewCards };
  saveLocalVocabularyDeck(nextDeck);

  return nextDeck;
}

function migrateLegacyStorage(): LocalVocabularyDeck {
  const rawCards = window.localStorage.getItem(LEGACY_CARD_KEY);

  if (rawCards) {
    const legacyCards = JSON.parse(rawCards) as Array<LegacyScheduledCard | VocabularyAnalysis>;
    const deck = createDeckFromLegacyItems(legacyCards);
    saveLocalVocabularyDeck(deck);
    return deck;
  }

  const rawCaptures = window.localStorage.getItem(LEGACY_CAPTURE_KEY);

  if (!rawCaptures) {
    return { vocabularyCards: [], reviewCards: [] };
  }

  const analyses = JSON.parse(rawCaptures) as VocabularyAnalysis[];
  const deck = createDeckFromLegacyItems(analyses);
  saveLocalVocabularyDeck(deck);

  return deck;
}

function createDeckFromLegacyItems(
  items: Array<LegacyScheduledCard | VocabularyAnalysis>,
): LocalVocabularyDeck {
  const vocabularyCards = items.map((item) => {
    if ("analysis" in item) {
      return {
        id: item.id,
        analysis: item.analysis,
        audioClip: item.audioClip,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      } satisfies LocalVocabularyCard;
    }

    return createLocalVocabularyCard(item);
  });

  const reviewCards = vocabularyCards.flatMap((vocabularyCard) => {
    const legacyItem = items.find((item) => "analysis" in item && item.id === vocabularyCard.id);
    const cards = createReviewCardsForVocabulary(vocabularyCard);

    if (!legacyItem || !("analysis" in legacyItem)) {
      return cards;
    }

    return cards.map((reviewCard) => ({
      ...reviewCard,
      masteryLevel: legacyItem.masteryLevel ?? reviewCard.masteryLevel,
      reviewCount: legacyItem.reviewCount ?? reviewCard.reviewCount,
      correctCount: legacyItem.correctCount ?? reviewCard.correctCount,
      incorrectCount: legacyItem.incorrectCount ?? reviewCard.incorrectCount,
      intervalDays: legacyItem.intervalDays ?? reviewCard.intervalDays,
      ease: legacyItem.ease ?? reviewCard.ease,
      lastReviewedAt: legacyItem.lastReviewedAt,
      nextDueAt: legacyItem.nextDueAt ?? reviewCard.nextDueAt,
    }));
  });

  return { vocabularyCards, reviewCards };
}

interface LegacyScheduledCard {
  id: string;
  analysis: VocabularyAnalysis;
  masteryLevel?: LocalReviewCard["masteryLevel"];
  reviewCount?: number;
  correctCount?: number;
  incorrectCount?: number;
  intervalDays?: number;
  ease?: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  nextDueAt?: string;
  audioClip?: LocalAudioClip;
}
