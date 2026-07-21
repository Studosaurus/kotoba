"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Library,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@/domains/media/types";
import { saveMicrophonePermissionState } from "@/lib/local-permission-settings";
import {
  preserveKnownStudyDays,
  recordStudyReview,
} from "@/lib/local-learning-activity";
import { useMediaPlayer } from "@/modules/media/components/media-player-provider";
import type { CurrentEpisodePlayback } from "@/modules/media/local/local-media-types";
import type {
  VocabularyAnalysis,
  VocabularyCaptureStatus,
  VocabularySourceContext,
} from "../types";
import {
  enrichVocabularyAnalysisSafely,
  quickAnalyzeVocabularySafely,
} from "../actions/analyze-vocabulary";
import { applyReviewRating, getDueReviewCards } from "../local/local-study-scheduler";
import {
  createReviewCardsForVocabulary,
  createLocalVocabularyCard,
  loadLocalVocabularyDeck,
  saveLocalVocabularyDeck,
} from "../local/local-vocabulary-store";
import type {
  LocalAudioClip,
  LocalReviewCard,
  LocalVocabularyCard,
  LocalVocabularyDeck,
  ReviewRating,
} from "../local/local-vocabulary-types";
import { hasValidationErrors, validateVocabularyAnalysis } from "../utils/validation";
import type { VocabularyValidationErrors } from "../utils/validation";
import { CaptureInput } from "./capture-input";
import { EditableAnalysisCard } from "./editable-analysis-card";
import { SavedCardsView } from "./saved-cards-view";
import { StudyQueueView } from "./study-queue-view";
import { ViewTabs, type VocabularyView } from "./view-tabs";

const SAVE_LATENCY_MS = 450;
const SPEECH_SILENCE_TIMEOUT_MS = 1000;

interface CurrentPlaybackResponse {
  connected?: boolean;
  needsConfiguration?: boolean;
  playback?: PlaybackState;
  error?: string;
}

export function VocabularyCaptureExperience() {
  const {
    playback: mediaPlayback,
    prepareForMicrophoneCapture,
    recoverFromMicrophoneCapture,
  } = useMediaPlayer();
  const [phrase, setPhrase] = useState("");
  const [analysis, setAnalysis] = useState<VocabularyAnalysis | null>(null);
  const [status, setStatus] = useState<VocabularyCaptureStatus>("empty");
  const [inputError, setInputError] = useState<string>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [enrichmentError, setEnrichmentError] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<VocabularyValidationErrors>({});
  const [deck, setDeck] = useState<LocalVocabularyDeck>(() => loadLocalVocabularyDeck());
  const [activeView, setActiveView] = useState<VocabularyView>("capture");
  const [lastSavedPhrase, setLastSavedPhrase] = useState<string>();
  const [duplicateMatch, setDuplicateMatch] = useState<{ id: string; phrase: string }>();
  const [savedCardToOpen, setSavedCardToOpen] = useState<string>();
  const [unseenSavedCount, setUnseenSavedCount] = useState(0);
  const [isEnriching, setIsEnriching] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [connectorState, setConnectorState] = useState<CurrentPlaybackResponse>({});
  const [pendingAudioClip, setPendingAudioClip] = useState<LocalAudioClip | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionEndedPromiseRef = useRef<Promise<void> | null>(null);
  const resolveRecognitionEndedRef = useRef<(() => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStartedAtRef = useRef<number>(0);
  const audioClipPromiseRef = useRef<Promise<LocalAudioClip | null> | null>(null);
  const activeAnalysisIdRef = useRef<string | null>(null);
  const savedAnalysisTargetsRef = useRef<Record<string, string>>({});
  const completedEnrichmentsRef = useRef<Record<string, VocabularyAnalysis>>({});
  const inFlightEnrichmentIdsRef = useRef(new Set<string>());
  const transcriptRef = useRef("");
  const shouldAnalyzeOnSpeechEndRef = useRef(false);
  const hasFinalizedSpeechRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnalyzing = status === "analyzing";
  const isSaving = status === "saving";
  const dueCount = getDueReviewCards(deck.reviewCards).length;
  const activeMediaPlayback = mediaPlayback ? playbackStateFromEpisode(mediaPlayback) : playback;

  const refreshConnectorState = useCallback(async () => {
    const state = await getCurrentPlaybackState();

    setConnectorState(state);
    setPlayback(state.playback ?? null);

    return state.playback ?? null;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshConnectorState);
  }, [refreshConnectorState]);

  useEffect(() => {
    preserveKnownStudyDays(deck.reviewCards.map((card) => card.lastReviewedAt));
  }, [deck.reviewCards]);

  const updateDeck = (nextDeck: LocalVocabularyDeck) => {
    setDeck(nextDeck);
    saveLocalVocabularyDeck(nextDeck);
  };

  const updateSavedCardAnalysis = (cardId: string, nextAnalysis: VocabularyAnalysis) => {
    setDeck((currentDeck) => {
      const nextDeck = {
        ...currentDeck,
        vocabularyCards: currentDeck.vocabularyCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                analysis: nextAnalysis,
                updatedAt: new Date().toISOString(),
              }
            : card,
        ),
      };

      saveLocalVocabularyDeck(nextDeck);
      return nextDeck;
    });
  };

  const changeActiveView = (nextView: VocabularyView) => {
    if (nextView === "saved") {
      setUnseenSavedCount(0);
    } else {
      setSavedCardToOpen(undefined);
    }

    setActiveView(nextView);
  };

  const analyzePhrase = async (overridePhrase?: string) => {
    const trimmedPhrase = (overridePhrase ?? phrase).trim();

    if (!trimmedPhrase) {
      setInputError("Enter Japanese text.");
      return;
    }

    setPhrase(trimmedPhrase);
    setLastSavedPhrase(undefined);
    setDuplicateMatch(undefined);
    setInputError(undefined);
    setAnalysisError(undefined);
    setEnrichmentError(undefined);
    setValidationErrors({});
    setStatus("analyzing");
    setIsEnriching(false);
    const analysisId = crypto.randomUUID();
    activeAnalysisIdRef.current = analysisId;
    const activePlayback = mediaPlayback
      ? playbackStateFromEpisode(mediaPlayback)
      : await refreshConnectorState();

    const result = await quickAnalyzeVocabularySafely(trimmedPhrase);

    if (result.ok) {
      const nextAnalysis = activePlayback
        ? {
            ...result.analysis,
            sourceContext: createSourceContextFromPlayback(activePlayback),
          }
        : result.analysis;

      setAnalysis(nextAnalysis);
      setPhrase(result.analysis.originalPhrase);
      setStatus("ready");
      setIsEnriching(true);
      inFlightEnrichmentIdsRef.current.add(analysisId);
      void enrichAnalysisInBackground(analysisId, nextAnalysis);
    } else {
      setStatus("analysis-error");
      setAnalysisError(result.error);
    }
  };

  const enrichAnalysisInBackground = async (
    analysisId: string,
    quickAnalysis: VocabularyAnalysis,
  ) => {
    const result = await enrichVocabularyAnalysisSafely(quickAnalysis);
    inFlightEnrichmentIdsRef.current.delete(analysisId);

    if (!result.ok) {
      delete savedAnalysisTargetsRef.current[analysisId];
      delete completedEnrichmentsRef.current[analysisId];

      if (activeAnalysisIdRef.current === analysisId) {
        setEnrichmentError(result.error);
        setIsEnriching(false);
      }

      return;
    }

    completedEnrichmentsRef.current[analysisId] = result.analysis;

    if (activeAnalysisIdRef.current === analysisId) {
      setAnalysis(result.analysis);
      setEnrichmentError(undefined);
      setIsEnriching(false);
      return;
    }

    const savedCardId = savedAnalysisTargetsRef.current[analysisId];

    if (savedCardId) {
      updateSavedCardAnalysis(savedCardId, result.analysis);
      delete savedAnalysisTargetsRef.current[analysisId];
      delete completedEnrichmentsRef.current[analysisId];
    } else {
      delete completedEnrichmentsRef.current[analysisId];
    }
  };

  const saveAnalysis = async () => {
    if (!analysis) {
      return;
    }

    const nextErrors = validateVocabularyAnalysis(analysis);
    setValidationErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      setStatus("ready");
      return;
    }

    const existingCard = findDuplicateVocabularyCard(analysis, deck.vocabularyCards);

    if (existingCard) {
      setDuplicateMatch({
        id: existingCard.id,
        phrase: existingCard.analysis.normalizedForm || existingCard.analysis.originalPhrase,
      });
      setStatus("ready");
      return;
    }

    setStatus("saving");
    await new Promise((resolve) => setTimeout(resolve, SAVE_LATENCY_MS));
    const currentAnalysisId = activeAnalysisIdRef.current;
    const completedEnrichment = currentAnalysisId
      ? completedEnrichmentsRef.current[currentAnalysisId]
      : undefined;
    const analysisToSave = completedEnrichment ?? analysis;
    const savedPhrase = analysisToSave.originalPhrase;
    const vocabularyCard = createLocalVocabularyCard(analysisToSave, pendingAudioClip);

    if (currentAnalysisId) {
      if (completedEnrichment) {
        delete completedEnrichmentsRef.current[currentAnalysisId];
      } else if (inFlightEnrichmentIdsRef.current.has(currentAnalysisId)) {
        savedAnalysisTargetsRef.current[currentAnalysisId] = vocabularyCard.id;
      }
    }

    activeAnalysisIdRef.current = null;

    setDeck((currentDeck) => {
      const nextDeck = {
        vocabularyCards: [vocabularyCard, ...currentDeck.vocabularyCards],
        reviewCards: [
          ...createReviewCardsForVocabulary(vocabularyCard),
          ...currentDeck.reviewCards,
        ],
      };

      saveLocalVocabularyDeck(nextDeck);
      return nextDeck;
    });
    setLastSavedPhrase(savedPhrase);
    setDuplicateMatch(undefined);
    setUnseenSavedCount((count) => count + 1);
    setPhrase("");
    setAnalysis(null);
    setIsEnriching(false);
    setEnrichmentError(undefined);
    setValidationErrors({});
    setStatus("empty");
    setPendingAudioClip(null);
    setActiveView("capture");
  };

  const deleteCard = (cardId: string) => {
    updateDeck({
      vocabularyCards: deck.vocabularyCards.filter((card) => card.id !== cardId),
      reviewCards: deck.reviewCards.filter((card) => card.vocabularyCardId !== cardId),
    });
  };

  const updateCardAudioClip = (cardId: string, audioClip: LocalAudioClip) => {
    const updatedVocabularyCards = deck.vocabularyCards.map((card) =>
      card.id === cardId
        ? { ...card, audioClip, updatedAt: new Date().toISOString() }
        : card,
    );
    const updatedCard = updatedVocabularyCards.find((card) => card.id === cardId);
    const hasAudioReviewCard = deck.reviewCards.some(
      (card) => card.vocabularyCardId === cardId && card.type === "audio_to_en",
    );
    const nextReviewCards =
      updatedCard && !hasAudioReviewCard
        ? [
            ...createReviewCardsForVocabulary(updatedCard).filter(
              (card) => card.type === "audio_to_en",
            ),
            ...deck.reviewCards,
          ]
        : deck.reviewCards;

    updateDeck({
      vocabularyCards: updatedVocabularyCards,
      reviewCards: nextReviewCards,
    });
  };

  const updateCardSourceContext = (
    cardId: string,
    sourceContext: VocabularySourceContext | undefined,
  ) => {
    updateDeck({
      ...deck,
      vocabularyCards: deck.vocabularyCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              analysis: {
                ...card.analysis,
                sourceContext,
              },
              updatedAt: new Date().toISOString(),
            }
          : card,
      ),
    });
  };

  const reviewCard = (reviewCardId: string, rating: ReviewRating) => {
    let reviewedCard: LocalReviewCard | null = null;
    const reviewedAt = new Date();

    updateDeck({
      ...deck,
      reviewCards: deck.reviewCards.map((card) => {
        if (card.id !== reviewCardId) {
          return card;
        }

        reviewedCard = applyReviewRating(card, rating, reviewedAt);
        return reviewedCard;
      }),
    });
    recordStudyReview(reviewedAt);

    return reviewedCard;
  };

  const retryCardDetails = async (cardId: string) => {
    const card = deck.vocabularyCards.find((item) => item.id === cardId);

    if (!card) {
      return "Could not find this saved word.";
    }

    const result = await enrichVocabularyAnalysisSafely(card.analysis);

    if (!result.ok) {
      return result.error;
    }

    updateSavedCardAnalysis(cardId, result.analysis);
    return undefined;
  };

  const recoverAfterCaptureTeardown = async (
    stopRecorderPromise: Promise<LocalAudioClip | null>,
  ) => {
    const [audioClip] = await Promise.all([
      stopRecorderPromise,
      waitForTeardown(recognitionEndedPromiseRef.current, 1_500),
    ]);

    recoverFromMicrophoneCapture();
    return audioClip;
  };

  const resetCapture = () => {
    activeAnalysisIdRef.current = null;
    clearSilenceTimer(silenceTimerRef);
    recognitionRef.current?.abort();
    void recoverAfterCaptureTeardown(
      stopAudioClipCapture({
        mediaRecorderRef,
        mediaStreamRef,
        audioClipPromiseRef,
      }),
    );
    recognitionRef.current = null;
    shouldAnalyzeOnSpeechEndRef.current = false;
    hasFinalizedSpeechRef.current = false;
    transcriptRef.current = "";
    setPendingAudioClip(null);
    setLastSavedPhrase(undefined);
    setDuplicateMatch(undefined);
    setPhrase("");
    setAnalysis(null);
    setInputError(undefined);
    setAnalysisError(undefined);
    setValidationErrors({});
    setStatus("empty");
  };

  const startRecording = async () => {
    if (isAnalyzing || isSaving) {
      return;
    }

    if (recognitionRef.current) {
      finishRecording();
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      saveMicrophonePermissionState("unavailable");
      setInputError("Speech recognition is not available in this browser. Type or paste instead.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;
    recognitionEndedPromiseRef.current = new Promise((resolve) => {
      resolveRecognitionEndedRef.current = resolve;
    });
    transcriptRef.current = "";
    shouldAnalyzeOnSpeechEndRef.current = false;
    hasFinalizedSpeechRef.current = false;

    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = collectTranscript(event.results);

      if (transcript && transcript !== transcriptRef.current) {
        transcriptRef.current = transcript;
        setPhrase(transcript);
        setInputError(undefined);
        scheduleSilenceStop();
      }

      if (hasFinalResult(event.results)) {
        scheduleSilenceStop(450);
      }
    };

    recognition.onerror = (event) => {
      shouldAnalyzeOnSpeechEndRef.current = false;
      hasFinalizedSpeechRef.current = true;
      clearSilenceTimer(silenceTimerRef);
      void recoverAfterCaptureTeardown(
        stopAudioClipCapture({
          mediaRecorderRef,
          mediaStreamRef,
          audioClipPromiseRef,
        }),
      );
      setIsRecording(false);
      recognitionRef.current = null;
      saveMicrophonePermissionState(event.error === "not-allowed" ? "denied" : "unknown");
      setInputError(getSpeechRecognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      resolveRecognitionEndedRef.current?.();
      resolveRecognitionEndedRef.current = null;
      finalizeSpeechCapture();
    };

    try {
      setPhrase("");
      setAnalysis(null);
      setPendingAudioClip(null);
      setLastSavedPhrase(undefined);
      setAnalysisError(undefined);
      setInputError(undefined);
      setValidationErrors({});
      setStatus("empty");
      setIsRecording(true);
      prepareForMicrophoneCapture();
      await startAudioClipCapture({
        mediaRecorderRef,
        mediaStreamRef,
        audioChunksRef,
        audioStartedAtRef,
        audioClipPromiseRef,
      });
      recognition.start();
      saveMicrophonePermissionState("granted");
      scheduleSilenceStop(4000);
    } catch {
      resolveRecognitionEndedRef.current?.();
      resolveRecognitionEndedRef.current = null;
      void recoverAfterCaptureTeardown(
        stopAudioClipCapture({
          mediaRecorderRef,
          mediaStreamRef,
          audioClipPromiseRef,
        }),
      );
      recognitionRef.current = null;
      setIsRecording(false);
      saveMicrophonePermissionState("denied");
      setInputError("Could not start speech recognition. Try typing or pasting instead.");
    }
  };

  const finishRecording = () => {
    clearSilenceTimer(silenceTimerRef);

    if (!recognitionRef.current) {
      setIsRecording(false);
      return;
    }

    shouldAnalyzeOnSpeechEndRef.current = true;
    finalizeSpeechCapture();
  };

  const scheduleSilenceStop = (timeoutMs = SPEECH_SILENCE_TIMEOUT_MS) => {
    clearSilenceTimer(silenceTimerRef);
    silenceTimerRef.current = setTimeout(() => {
      finishRecording();
    }, timeoutMs);
  };

  const finalizeSpeechCapture = async () => {
    if (hasFinalizedSpeechRef.current) {
      return;
    }

    hasFinalizedSpeechRef.current = true;
    clearSilenceTimer(silenceTimerRef);

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsRecording(false);

    try {
      recognition?.stop();
    } catch {
      recognition?.abort();
    }

    const transcript = transcriptRef.current.trim();
    const audioClip = await recoverAfterCaptureTeardown(
      stopAudioClipCapture({
        mediaRecorderRef,
        mediaStreamRef,
        audioClipPromiseRef,
      }),
    );
    shouldAnalyzeOnSpeechEndRef.current = false;

    if (!transcript) {
      setPendingAudioClip(null);
      setInputError("I did not catch any Japanese. Tap the mic and try again.");
      return;
    }

    setPendingAudioClip(audioClip);
    void analyzePhrase(transcript);
  };

  return (
    <div
      data-vocabulary-scroll-container
      className="fixed inset-0 z-50 overflow-y-auto bg-[#202124] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] text-[#f8f9fb]"
    >
      <div className="mx-auto max-w-xl space-y-3">
        <header className="flex items-center justify-between">
          <Link
            href="/modules/media"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#17191d] text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
            aria-label="Browse shows"
          >
            <Library className="h-5 w-5" aria-hidden="true" />
            {mediaPlayback ? (
              <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-[#9be7a8]" />
            ) : null}
          </Link>
          <h1 className="text-xl font-semibold text-[#dfe2ea]">Kotoba</h1>
          <Link
            href="/settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#17191d] text-[#a8c7fa] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
        </header>

        <ViewTabs
          activeView={activeView}
          savedCount={unseenSavedCount}
          dueCount={dueCount}
          onChange={changeActiveView}
        />

        {activeView === "capture" ? (
          <>
            <CaptureInput
              value={phrase}
              disabled={isAnalyzing || isSaving}
              isAnalyzing={isAnalyzing}
              isRecording={isRecording}
              connectorState={mediaPlayback ? { connected: true } : connectorState}
              playback={activeMediaPlayback}
              error={inputError}
              onChange={(value) => {
                setPhrase(value);
                setLastSavedPhrase(undefined);
                setInputError(undefined);
              }}
              onSubmit={() => void analyzePhrase()}
              onClear={resetCapture}
              onRecordStart={startRecording}
            />

            {isAnalyzing ? <AnalyzingState /> : null}

            {status === "analysis-error" ? (
              <FailureState message={analysisError ?? "Try again."} onRetry={() => void analyzePhrase()} />
            ) : null}

            {lastSavedPhrase ? <SuccessState phrase={lastSavedPhrase} /> : null}

            {duplicateMatch ? (
              <DuplicateState
                phrase={duplicateMatch.phrase}
                onOpen={() => {
                  setSavedCardToOpen(duplicateMatch.id);
                  changeActiveView("saved");
                }}
              />
            ) : null}

            {analysis && status !== "analysis-error" ? (
              <EditableAnalysisCard
                analysis={analysis}
                errors={validationErrors}
                isEnriching={isEnriching}
                enrichmentError={enrichmentError}
                isSaving={isSaving}
                onChange={(nextAnalysis) => {
                  setAnalysis(nextAnalysis);
                  setDuplicateMatch(undefined);
                  setValidationErrors({});
                }}
                onSave={saveAnalysis}
              />
            ) : null}
          </>
        ) : null}

        {activeView === "saved" ? (
          <SavedCardsView
            vocabularyCards={deck.vocabularyCards}
            reviewCards={deck.reviewCards}
            initialSelectedCardId={savedCardToOpen}
            onDelete={deleteCard}
            onUpdateAudioClip={updateCardAudioClip}
            onUpdateSourceContext={updateCardSourceContext}
            onRetryDetails={retryCardDetails}
            onStudy={() => changeActiveView("study")}
          />
        ) : null}

        {activeView === "study" ? (
          <StudyQueueView
            vocabularyCards={deck.vocabularyCards}
            reviewCards={deck.reviewCards}
            onReview={reviewCard}
            onCapture={() => changeActiveView("capture")}
          />
        ) : null}
      </div>
    </div>
  );
}

async function getCurrentPlaybackState(): Promise<CurrentPlaybackResponse> {
  try {
    const response = await fetch("/api/media/current-playback", { cache: "no-store" });

    if (!response.ok) {
      return { connected: false, error: "Could not refresh connector status." };
    }

    return (await response.json()) as CurrentPlaybackResponse;
  } catch {
    return { connected: false, error: "Could not refresh connector status." };
  }
}

function createSourceContextFromPlayback(playback: PlaybackState) {
  return {
    sourceName: playback.item.collectionTitle ?? "Spotify",
    mediaItemTitle: playback.item.title,
    timestampLabel: formatTimestamp(playback.positionMs),
    capturedAtLabel: new Date(playback.observedAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    provenance: "active_episode" as const,
  };
}

function playbackStateFromEpisode(playback: CurrentEpisodePlayback): PlaybackState {
  return {
    item: {
      id: `rss:${playback.episodeId}`,
      sourceId: playback.podcastId,
      title: playback.episodeTitle,
      collectionTitle: playback.podcastTitle,
      durationMs: playback.durationMs,
    },
    positionMs: playback.positionMs,
    observedAt: playback.updatedAt,
    isPlaying: playback.isPlaying,
  };
}

function formatTimestamp(positionMs: number) {
  const totalSeconds = Math.floor(positionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function startAudioClipCapture({
  mediaRecorderRef,
  mediaStreamRef,
  audioChunksRef,
  audioStartedAtRef,
  audioClipPromiseRef,
}: {
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  mediaStreamRef: MutableRefObject<MediaStream | null>;
  audioChunksRef: MutableRefObject<Blob[]>;
  audioStartedAtRef: MutableRefObject<number>;
  audioClipPromiseRef: MutableRefObject<Promise<LocalAudioClip | null> | null>;
}) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    saveMicrophonePermissionState("unavailable");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    audioChunksRef.current = [];
    audioStartedAtRef.current = Date.now();
    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    audioClipPromiseRef.current = new Promise((resolve) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current;
        const mimeType = recorder.mimeType || chunks[0]?.type || "audio/webm";

        stopMediaStream(stream);

        if (chunks.length === 0) {
          resolve(null);
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve({
            dataUrl: String(reader.result),
            mimeType,
            durationMs: Math.max(0, Date.now() - audioStartedAtRef.current),
            createdAt: new Date().toISOString(),
          });
        };

        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
    });

    recorder.start();
    saveMicrophonePermissionState("granted");
  } catch {
    saveMicrophonePermissionState("denied");
    audioClipPromiseRef.current = Promise.resolve(null);
  }
}

async function stopAudioClipCapture({
  mediaRecorderRef,
  mediaStreamRef,
  audioClipPromiseRef,
}: {
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  mediaStreamRef: MutableRefObject<MediaStream | null>;
  audioClipPromiseRef: MutableRefObject<Promise<LocalAudioClip | null> | null>;
}) {
  const recorder = mediaRecorderRef.current;
  const clipPromise = audioClipPromiseRef.current;

  mediaRecorderRef.current = null;
  mediaStreamRef.current = null;
  audioClipPromiseRef.current = null;

  if (!recorder || !clipPromise) {
    return null;
  }

  if (recorder.state !== "inactive") {
    recorder.stop();
  }

  return clipPromise;
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function clearSilenceTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

async function waitForTeardown(promise: Promise<void> | null, timeoutMs: number) {
  if (!promise) {
    return;
  }

  await Promise.race([
    promise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function collectTranscript(results: SpeechRecognitionResultList) {
  let transcript = "";

  for (let index = 0; index < results.length; index += 1) {
    transcript += results[index]?.[0]?.transcript ?? "";
  }

  return transcript.trim();
}

function hasFinalResult(results: SpeechRecognitionResultList) {
  for (let index = 0; index < results.length; index += 1) {
    if (results[index]?.isFinal) {
      return true;
    }
  }

  return false;
}

function getSpeechRecognitionErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone or speech recognition permission was blocked.";
  }

  if (error === "no-speech") {
    return "I did not hear speech. Tap the mic and try again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found.";
  }

  if (error === "network") {
    return "Speech recognition needs a network connection.";
  }

  return "Speech recognition stopped. Try again or type the phrase.";
}

function AnalyzingState() {
  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4" aria-live="polite">
      <div className="h-2 overflow-hidden rounded-full bg-[#2b2f36]">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#a8c7fa] motion-reduce:animate-none" />
      </div>
    </section>
  );
}

function FailureState({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <section
      className="rounded-[1.5rem] border border-[#ff9aa8]/30 bg-[#3a1f26] p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[#ff9aa8]" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium text-[#f8f9fb]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-10 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function SuccessState({ phrase }: { phrase: string }) {
  return (
    <section
      className="rounded-[1.5rem] border border-[#8ab4f8]/20 bg-[#163154] p-4"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#a8c7fa]" aria-hidden="true" />
        <p className="min-w-0 text-sm font-medium text-[#f8f9fb]">
          Saved: <span lang="ja">{phrase}</span>
        </p>
      </div>
    </section>
  );
}

function DuplicateState({ phrase, onOpen }: { phrase: string; onOpen(): void }) {
  return (
    <section
      className="rounded-[1.5rem] border border-[#f8c471]/30 bg-[#3b3020] p-4"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-[#f8c471]" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium text-[#f8f9fb]">
          Already saved: <span lang="ja">{phrase}</span>
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="min-h-10 shrink-0 rounded-full bg-[#f8c471] px-4 text-sm font-semibold text-[#382b00] outline-none focus:ring-4 focus:ring-[#f8c471]/25"
        >
          View
        </button>
      </div>
    </section>
  );
}

function findDuplicateVocabularyCard(
  analysis: VocabularyAnalysis,
  vocabularyCards: LocalVocabularyCard[],
) {
  const normalizedForm = normalizeJapaneseForDuplicate(analysis.normalizedForm);
  const candidates = japaneseDuplicateCandidates(analysis);

  return vocabularyCards.find((card) => {
    const existingNormalizedForm = normalizeJapaneseForDuplicate(card.analysis.normalizedForm);
    const meaningsOverlap = vocabularyMeaningsOverlap(analysis, card.analysis);

    if (
      normalizedForm &&
      normalizedForm === existingNormalizedForm &&
      (/\p{Script=Han}/u.test(normalizedForm) || meaningsOverlap)
    ) {
      return true;
    }

    const existingCandidates = new Set(japaneseDuplicateCandidates(card.analysis));
    return meaningsOverlap && candidates.some((candidate) => existingCandidates.has(candidate));
  });
}

function japaneseDuplicateCandidates(analysis: VocabularyAnalysis) {
  return Array.from(
    new Set(
      [analysis.originalPhrase, analysis.normalizedForm, analysis.readingKana]
        .map(normalizeJapaneseForDuplicate)
        .filter(Boolean),
    ),
  );
}

function normalizeJapaneseForDuplicate(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function vocabularyMeaningsOverlap(first: VocabularyAnalysis, second: VocabularyAnalysis) {
  const firstWords = new Set(
    normalizeMeaningForDuplicate(`${first.conciseMeaning} ${first.naturalTranslation}`),
  );
  const secondWords = normalizeMeaningForDuplicate(
    `${second.conciseMeaning} ${second.naturalTranslation}`,
  );

  return secondWords.some((word) => firstWords.has(word));
}

function normalizeMeaningForDuplicate(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !duplicateMeaningStopWords.has(word));
}

const duplicateMeaningStopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "about",
]);
