"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Mic, Send, Volume2, X } from "lucide-react";
import type { MutableRefObject } from "react";
import { useMemo, useRef, useState } from "react";
import {
  didMasteryIncrease,
  formatMastery,
  getDueReviewCards,
  getDueTimelineBuckets,
  getMasteryDistribution,
} from "../local/local-study-scheduler";
import type {
  LocalReviewCard,
  LocalVocabularyCard,
  ReviewCardType,
  ReviewRating,
} from "../local/local-vocabulary-types";

interface StudyQueueViewProps {
  vocabularyCards: LocalVocabularyCard[];
  reviewCards: LocalReviewCard[];
  onReview(reviewCardId: string, rating: ReviewRating): LocalReviewCard | null;
  onCapture(): void;
}

const SPEECH_SILENCE_TIMEOUT_MS = 1000;

interface AnswerResult {
  isCorrect: boolean;
  expectedAnswer: string;
}

interface LevelUpEvent {
  phrase: string;
  nextMastery: LocalReviewCard["masteryLevel"];
}

interface MultipleChoiceOption {
  id: string;
  value: string;
  kanaValue?: string;
}

export function StudyQueueView({
  vocabularyCards,
  reviewCards,
  onReview,
  onCapture,
}: StudyQueueViewProps) {
  const dueCards = useMemo(() => getDueReviewCards(reviewCards), [reviewCards]);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<string[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedInSession, setCompletedInSession] = useState(0);
  const [showReading, setShowReading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string>();
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [japaneseChoiceScript, setJapaneseChoiceScript] = useState<"kanji" | "hiragana">(
    "kanji",
  );
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const hasFinalizedSpeechRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeReviewCard = reviewCards.find((card) => card.id === sessionQueue[0]);
  const activeVocabularyCard = activeReviewCard
    ? vocabularyCards.find((card) => card.id === activeReviewCard.vocabularyCardId)
    : undefined;
  const usesMultipleChoice = activeReviewCard
    ? shouldUseMultipleChoice(activeReviewCard)
    : false;
  const multipleChoiceOptions = useMemo(
    () =>
      activeReviewCard && activeVocabularyCard && usesMultipleChoice
        ? buildMultipleChoiceOptions(activeReviewCard, activeVocabularyCard, vocabularyCards)
        : [],
    [activeReviewCard, activeVocabularyCard, usesMultipleChoice, vocabularyCards],
  );

  if (
    (!isSessionStarted && dueCards.length === 0) ||
    (isSessionStarted && (!activeReviewCard || !activeVocabularyCard))
  ) {
    return (
      <section className="rounded-[1.5rem] bg-[#17191d] p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-[#a8c7fa]" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold text-[#f8f9fb]">Queue clear</h2>
        <p className="mt-2 text-sm leading-6 text-[#bdc1c6]">
          No flashcards are due right now. Capture more phrases or come back later.
        </p>
        <button
          type="button"
          onClick={onCapture}
          className="mt-4 min-h-11 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          Capture
        </button>
      </section>
    );
  }

  if (!isSessionStarted) {
    const masteryDistribution = getMasteryDistribution(reviewCards);
    const timelineBuckets = getDueTimelineBuckets(reviewCards);

    return (
      <section className="space-y-4">
        <div className="rounded-[1.5rem] bg-[#17191d] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#a8c7fa]">Study queue</p>
              <h2 className="mt-2 text-4xl font-semibold text-[#f8f9fb]">{dueCards.length}</h2>
              <p className="mt-1 text-sm text-[#bdc1c6]">flashcards due</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const queue = buildSessionQueue(dueCards);
                setSessionQueue(queue);
                setSessionTotal(queue.length);
                setCompletedInSession(0);
                setIsSessionStarted(true);
              }}
              className="min-h-11 shrink-0 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
            >
              Start
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[#bdc1c6]">
            <Stat label="New" value={countByMastery(dueCards, "new")} />
            <Stat label="Learning" value={countByMastery(dueCards, "learning")} />
            <Stat label="Review" value={countReviewCards(dueCards)} />
          </div>
        </div>
        <MasterySummary distribution={masteryDistribution} />
        <DueTimeline buckets={timelineBuckets} vocabularyCards={vocabularyCards} />
      </section>
    );
  }

  if (!activeReviewCard || !activeVocabularyCard) {
    return null;
  }

  const progress = sessionTotal === 0 ? 0 : completedInSession / sessionTotal;
  const revealAnswer = () => {
    if (!answer.trim()) {
      setAnswerError("Enter or speak your answer first.");
      return;
    }

    stopAnswerRecording(false);
    setAnswerResult(checkAnswer(activeReviewCard, activeVocabularyCard, answer));
    setAnswerError(undefined);
    setIsRevealed(true);
  };

  const resetAnswer = () => {
    stopAnswerRecording(false);
    setAnswer("");
    setAnswerError(undefined);
    setAnswerResult(null);
  };

  const startAnswerRecording = () => {
    if (recognitionRef.current) {
      stopAnswerRecording(true);
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setAnswerError("Speech recognition is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognitionRef.current = recognition;
    transcriptRef.current = "";
    hasFinalizedSpeechRef.current = false;

    recognition.lang = activeReviewCard.type === "en_to_jp" ? "ja-JP" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = collectTranscript(event.results);

      if (transcript && transcript !== transcriptRef.current) {
        transcriptRef.current = transcript;
        setAnswer(transcript);
        setAnswerError(undefined);
        scheduleSilenceStop(silenceTimerRef, () => stopAnswerRecording(true));
      }

      if (hasFinalResult(event.results)) {
        scheduleSilenceStop(silenceTimerRef, () => stopAnswerRecording(true), 450);
      }
    };

    recognition.onerror = (event) => {
      hasFinalizedSpeechRef.current = true;
      clearSilenceTimer(silenceTimerRef);
      setIsRecordingAnswer(false);
      recognitionRef.current = null;
      setAnswerError(getSpeechRecognitionErrorMessage(event.error));
    };

    recognition.onend = () => {
      finalizeAnswerSpeech(true);
    };

    try {
      setAnswer("");
      setAnswerError(undefined);
      setIsRecordingAnswer(true);
      recognition.start();
      scheduleSilenceStop(silenceTimerRef, () => stopAnswerRecording(true), 4000);
    } catch {
      recognitionRef.current = null;
      setIsRecordingAnswer(false);
      setAnswerError("Could not start speech recognition. Type your answer instead.");
    }
  };

  const stopAnswerRecording = (shouldReveal: boolean) => {
    clearSilenceTimer(silenceTimerRef);
    finalizeAnswerSpeech(shouldReveal);
  };

  const finalizeAnswerSpeech = (shouldReveal: boolean) => {
    if (hasFinalizedSpeechRef.current) {
      return;
    }

    hasFinalizedSpeechRef.current = true;
    clearSilenceTimer(silenceTimerRef);

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setIsRecordingAnswer(false);

    try {
      recognition?.stop();
    } catch {
      recognition?.abort();
    }

    const transcript = transcriptRef.current.trim();

    if (transcript) {
      setAnswer(transcript);
      setAnswerError(undefined);

      if (shouldReveal) {
        setAnswerResult(checkAnswer(activeReviewCard, activeVocabularyCard, transcript));
        setIsRevealed(true);
      }

      return;
    }

    if (shouldReveal) {
      setAnswerError("I did not catch an answer. Try again or type it.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[1.5rem] bg-[#17191d] p-4">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold">
          <span className="text-[#a8c7fa]">{getCardTypeLabel(activeReviewCard.type)}</span>
          <span className="text-[#bdc1c6]">
            {Math.min(completedInSession + 1, sessionTotal)} / {sessionTotal}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#2b2f36]">
          <div
            className="h-full rounded-full bg-[#a8c7fa]"
            style={{ width: `${Math.max(4, progress * 100)}%` }}
          />
        </div>
      </div>

      {levelUpEvent ? <LevelUpCard event={levelUpEvent} /> : null}

      <FlashcardFront
        reviewCard={activeReviewCard}
        vocabularyCard={activeVocabularyCard}
        showReading={showReading}
        onToggleReading={() => setShowReading((value) => !value)}
      />

      {!isRevealed && usesMultipleChoice && multipleChoiceOptions.length === 4 ? (
        <MultipleChoiceAnswers
          options={multipleChoiceOptions}
          answerType={activeReviewCard.type}
          japaneseChoiceScript={japaneseChoiceScript}
          onJapaneseChoiceScriptChange={setJapaneseChoiceScript}
          onChoose={(selectedAnswer) => {
            setAnswer(selectedAnswer);
            setAnswerResult(checkAnswer(activeReviewCard, activeVocabularyCard, selectedAnswer));
            setAnswerError(undefined);
            setLevelUpEvent(null);
            setIsRevealed(true);
          }}
        />
      ) : !isRevealed ? (
        <AnswerInput
          value={answer}
          error={answerError}
          isRecording={isRecordingAnswer}
          reviewCard={activeReviewCard}
          onChange={(value) => {
            setAnswer(value);
            setAnswerError(undefined);
            setLevelUpEvent(null);
          }}
          onClear={resetAnswer}
          onRecord={startAnswerRecording}
          onSubmit={revealAnswer}
        />
      ) : (
        <div className="space-y-3">
          <YourAnswer answer={answer} type={activeReviewCard.type} />
          {answerResult ? <AnswerFeedback result={answerResult} /> : null}
          <FlashcardBack reviewCard={activeReviewCard} vocabularyCard={activeVocabularyCard} />
          <button
            type="button"
            onClick={() => {
              const reviewedCard = onReview(
                activeReviewCard.id,
                answerResult?.isCorrect ? "good" : "again",
              );

              if (
                answerResult?.isCorrect &&
                reviewedCard &&
                didMasteryIncrease(activeReviewCard.masteryLevel, reviewedCard.masteryLevel)
              ) {
                setLevelUpEvent({
                  phrase: activeVocabularyCard.analysis.originalPhrase,
                  nextMastery: reviewedCard.masteryLevel,
                });
              } else {
                setLevelUpEvent(null);
              }

              if (answerResult?.isCorrect) {
                setCompletedInSession((count) => count + 1);
                setSessionQueue((queue) => queue.slice(1));
              } else {
                setSessionQueue((queue) => reinsertMissedCard(queue));
              }
              setIsRevealed(false);
              setShowReading(false);
              setAnswer("");
              setAnswerError(undefined);
              setAnswerResult(null);
            }}
            className="h-14 w-full rounded-full bg-[#a8c7fa] text-base font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
          >
            {answerResult?.isCorrect ? "Continue" : "Try again later"}
          </button>
        </div>
      )}
    </section>
  );
}

function AnswerFeedback({ result }: { result: AnswerResult }) {
  return (
    <div
      className={`rounded-[1.5rem] border p-4 ${
        result.isCorrect
          ? "border-[#9be7a8]/30 bg-[#17351f]"
          : "border-[#ff9aa8]/30 bg-[#3a1f26]"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {result.isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#9be7a8]" aria-hidden="true" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff9aa8]" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[#f8f9fb]">
            {result.isCorrect ? "Correct" : "Not quite"}
          </p>
          {!result.isCorrect ? (
            <p className="mt-1 text-sm leading-6 text-[#bdc1c6]">
              Expected: <span className="text-[#f8f9fb]">{result.expectedAnswer}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MasterySummary({
  distribution,
}: {
  distribution: Array<{ level: LocalReviewCard["masteryLevel"]; count: number }>;
}) {
  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <h3 className="text-sm font-semibold text-[#f8f9fb]">Mastery</h3>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {distribution.map((item) => (
          <div key={item.level} className="rounded-xl bg-[#202329] px-2 py-2 text-center">
            <p className="text-base font-semibold text-[#f8f9fb]">{item.count}</p>
            <p className="truncate text-[10px] font-semibold uppercase text-[#9aa0a6]">
              {formatMastery(item.level)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DueTimeline({
  buckets,
  vocabularyCards,
}: {
  buckets: ReturnType<typeof getDueTimelineBuckets>;
  vocabularyCards: LocalVocabularyCard[];
}) {
  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <h3 className="text-sm font-semibold text-[#f8f9fb]">Review timeline</h3>
      <div className="mt-3 space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#202329] p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f8f9fb]">{bucket.label}</p>
              <p className="mt-1 truncate text-xs text-[#9aa0a6]">
                {formatBucketExamples(bucket.reviewCards, vocabularyCards)}
              </p>
            </div>
            <span className="rounded-full bg-[#101113] px-3 py-1 text-sm font-semibold text-[#a8c7fa]">
              {bucket.reviewCards.length}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LevelUpCard({ event }: { event: LevelUpEvent }) {
  return (
    <section className="rounded-[1.5rem] border border-[#a8c7fa]/40 bg-[#163154] p-4" role="status">
      <p className="text-xs font-bold uppercase tracking-wide text-[#a8c7fa]">Level up</p>
      <p className="mt-2 text-base font-semibold text-[#f8f9fb]">
        <span lang="ja">{event.phrase}</span> is now {formatMastery(event.nextMastery)}
      </p>
    </section>
  );
}

function MultipleChoiceAnswers({
  options,
  answerType,
  japaneseChoiceScript,
  onJapaneseChoiceScriptChange,
  onChoose,
}: {
  options: MultipleChoiceOption[];
  answerType: ReviewCardType;
  japaneseChoiceScript: "kanji" | "hiragana";
  onJapaneseChoiceScriptChange(value: "kanji" | "hiragana"): void;
  onChoose(value: string): void;
}) {
  const isJapaneseAnswer = answerType === "en_to_jp";

  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#bdc1c6]">Choose the best answer</p>
        {isJapaneseAnswer ? (
          <div className="flex rounded-full bg-[#101113] p-1" aria-label="Answer script">
            {(["kanji", "hiragana"] as const).map((script) => (
              <button
                key={script}
                type="button"
                onClick={() => onJapaneseChoiceScriptChange(script)}
                className="min-h-8 rounded-full px-3 text-xs font-semibold text-[#9aa0a6] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20 data-[active=true]:bg-[#30343b] data-[active=true]:text-[#a8c7fa]"
                data-active={japaneseChoiceScript === script}
                aria-pressed={japaneseChoiceScript === script}
              >
                {script === "kanji" ? "漢字" : "ひらがな"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChoose(option.value)}
            lang={answerType === "en_to_jp" ? "ja" : "en"}
            className="min-h-14 rounded-2xl border border-[#30343b] bg-[#202329] px-4 py-3 text-left text-lg font-semibold leading-snug text-[#f8f9fb] outline-none transition hover:border-[#8ab4f8] hover:bg-[#26354a] focus:ring-4 focus:ring-[#8ab4f8]/25 active:scale-[0.99] motion-reduce:transition-none"
          >
            {isJapaneseAnswer && japaneseChoiceScript === "hiragana"
              ? option.kanaValue || option.value
              : option.value}
          </button>
        ))}
      </div>
    </section>
  );
}

function AnswerInput({
  value,
  error,
  isRecording,
  reviewCard,
  onChange,
  onClear,
  onRecord,
  onSubmit,
}: {
  value: string;
  error?: string;
  isRecording: boolean;
  reviewCard: LocalReviewCard;
  onChange(value: string): void;
  onClear(): void;
  onRecord(): void;
  onSubmit(): void;
}) {
  const isJapaneseAnswer = reviewCard.type === "en_to_jp";

  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <label className="text-sm font-semibold text-[#bdc1c6]" htmlFor="study-answer">
        Your answer
      </label>
      <textarea
        id="study-answer"
        value={value}
        rows={3}
        lang={isJapaneseAnswer ? "ja" : "en"}
        inputMode="text"
        autoCapitalize={isJapaneseAnswer ? "none" : undefined}
        autoComplete={isJapaneseAnswer ? "off" : undefined}
        autoCorrect={isJapaneseAnswer ? "off" : undefined}
        spellCheck={!isJapaneseAnswer}
        placeholder={isJapaneseAnswer ? "日本語で答える" : "Answer in English"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "study-answer-error" : undefined}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
            return;
          }

          event.preventDefault();
          onSubmit();
        }}
        className="mt-3 min-h-28 w-full resize-none rounded-2xl bg-[#101113] px-4 py-3 text-2xl leading-snug text-[#f8f9fb] outline-none placeholder:text-[#6f737d] focus:ring-4 focus:ring-[#8ab4f8]/20"
      />
      {error ? (
        <p id="study-answer-error" className="mt-2 text-sm font-medium text-[#ff9aa8]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClear}
          disabled={!value && !isRecording}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[#e8eaed] outline-none hover:bg-[#202329] focus:ring-4 focus:ring-[#8ab4f8]/25 disabled:opacity-40"
          aria-label="Clear answer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRecord}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#2b2f36] text-[#a8c7fa] outline-none transition active:scale-95 focus:ring-4 focus:ring-[#a8c7fa]/25 data-[recording=true]:bg-[#ffb1c0] data-[recording=true]:text-[#3a1f26] motion-reduce:transition-none"
            data-recording={isRecording}
            aria-label={isRecording ? "Stop recording answer" : "Record answer"}
          >
            {isRecording ? (
              <LoaderCircle className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Mic className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="inline-flex h-14 items-center gap-2 rounded-full bg-[#a8c7fa] px-5 text-base font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30 disabled:opacity-50"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            Check
          </button>
        </div>
      </div>
    </section>
  );
}

function YourAnswer({ answer, type }: { answer: string; type: ReviewCardType }) {
  return (
    <div className="rounded-[1.5rem] bg-[#101113] p-4">
      <p className="text-sm font-semibold text-[#bdc1c6]">Your answer</p>
      <p lang={type === "en_to_jp" ? "ja" : "en"} className="mt-2 text-2xl leading-snug text-[#f8f9fb]">
        {answer}
      </p>
    </div>
  );
}

function FlashcardFront({
  reviewCard,
  vocabularyCard,
  showReading,
  onToggleReading,
}: {
  reviewCard: LocalReviewCard;
  vocabularyCard: LocalVocabularyCard;
  showReading: boolean;
  onToggleReading(): void;
}) {
  if (reviewCard.type === "audio_to_en") {
    return (
      <div className="rounded-[1.5rem] bg-[#101113] p-5">
        <p className="text-sm font-semibold text-[#bdc1c6]">Listen and recall in English</p>
        {vocabularyCard.audioClip ? (
          <div className="mt-5 rounded-2xl bg-[#17191d] p-4">
            <div className="mb-3 flex items-center gap-2 text-[#a8c7fa]">
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">Captured audio</span>
            </div>
            <audio
              controls
              src={vocabularyCard.audioClip.dataUrl}
              className="w-full"
              aria-label="Captured Japanese audio"
            />
          </div>
        ) : (
          <p className="mt-5 text-sm text-[#ffb1c0]">Audio clip is unavailable.</p>
        )}
      </div>
    );
  }

  if (reviewCard.type === "en_to_jp") {
    return (
      <div className="rounded-[1.5rem] bg-[#101113] p-5">
        <p className="text-sm font-semibold text-[#bdc1c6]">Recall in Japanese</p>
        <p className="mt-5 text-3xl font-semibold leading-tight text-[#a8c7fa]">
          {vocabularyCard.analysis.naturalTranslation}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleReading}
      className="w-full rounded-[1.5rem] bg-[#101113] p-5 text-left outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
    >
      <p className="text-sm font-semibold text-[#bdc1c6]">Recall in English</p>
      {showReading ? (
        <p className="mt-5 text-base text-[#a8c7fa]">{vocabularyCard.analysis.readingKana}</p>
      ) : null}
      <p lang="ja" className="mt-1 text-5xl leading-tight text-[#f8f9fb]">
        {vocabularyCard.analysis.originalPhrase}
      </p>
    </button>
  );
}

function FlashcardBack({
  reviewCard,
  vocabularyCard,
}: {
  reviewCard: LocalReviewCard;
  vocabularyCard: LocalVocabularyCard;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#17191d] p-4">
      {reviewCard.type === "en_to_jp" ? (
        <>
          <p className="text-sm font-semibold text-[#bdc1c6]">Japanese</p>
          <ReadingReveal
            phrase={vocabularyCard.analysis.originalPhrase}
            reading={vocabularyCard.analysis.readingKana}
            className="mt-2 text-4xl leading-tight text-[#f8f9fb]"
          />
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#bdc1c6]">English</p>
          <p className="mt-2 text-3xl font-semibold text-[#a8c7fa]">
            {vocabularyCard.analysis.naturalTranslation}
          </p>
          <p className="mt-3 text-sm text-[#bdc1c6]">{vocabularyCard.analysis.readingKana}</p>
        </>
      )}
      <p className="mt-4 text-base text-[#f8f9fb]">{vocabularyCard.analysis.conciseMeaning}</p>
      <div className="mt-4 border-t border-[#2b2f36] pt-4">
        <p className="text-sm leading-6 text-[#bdc1c6]">{vocabularyCard.analysis.grammarExplanation}</p>
        <p lang="ja" className="mt-3 text-base text-[#f8f9fb]">
          {vocabularyCard.analysis.exampleSentence}
        </p>
        <p className="mt-1 text-sm text-[#bdc1c6]">
          {vocabularyCard.analysis.exampleSentenceTranslation}
        </p>
      </div>
    </div>
  );
}

function ReadingReveal({
  phrase,
  reading,
  className,
}: {
  phrase: string;
  reading: string;
  className: string;
}) {
  const [showReading, setShowReading] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setShowReading((value) => !value)}
      className="block w-full text-left outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
      aria-label={showReading ? "Hide reading" : "Show reading"}
    >
      {showReading ? <p className="mb-1 text-sm text-[#a8c7fa]">{reading}</p> : null}
      <p lang="ja" className={className}>
        {phrase}
      </p>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#202329] p-3">
      <p className="text-lg text-[#f8f9fb]">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function countByMastery(cards: LocalReviewCard[], masteryLevel: LocalReviewCard["masteryLevel"]) {
  return cards.filter((card) => card.masteryLevel === masteryLevel).length;
}

function countReviewCards(cards: LocalReviewCard[]) {
  return cards.filter(
    (card) => card.masteryLevel !== "new" && card.masteryLevel !== "learning",
  ).length;
}

function formatBucketExamples(
  reviewCards: LocalReviewCard[],
  vocabularyCards: LocalVocabularyCard[],
) {
  if (reviewCards.length === 0) {
    return "No cards";
  }

  const examples = reviewCards
    .slice(0, 3)
    .map((reviewCard) =>
      vocabularyCards.find((card) => card.id === reviewCard.vocabularyCardId)?.analysis
        .originalPhrase,
    )
    .filter((phrase): phrase is string => Boolean(phrase));

  if (reviewCards.length > examples.length) {
    return `${examples.join(", ")} +${reviewCards.length - examples.length}`;
  }

  return examples.join(", ");
}

function getCardTypeLabel(type: ReviewCardType) {
  if (type === "audio_to_en") {
    return "Audio to English";
  }

  return type === "jp_to_en" ? "Japanese to English" : "English to Japanese";
}

function buildSessionQueue(cards: LocalReviewCard[]) {
  const remaining = shuffle(cards);
  const ordered: LocalReviewCard[] = [];

  while (remaining.length > 0) {
    const recentVocabularyIds = new Set(ordered.slice(-2).map((card) => card.vocabularyCardId));
    let nextIndex = remaining.findIndex((card) => !recentVocabularyIds.has(card.vocabularyCardId));

    if (nextIndex < 0) {
      nextIndex = remaining.findIndex(
        (card) => card.vocabularyCardId !== ordered.at(-1)?.vocabularyCardId,
      );
    }

    const [nextCard] = remaining.splice(Math.max(0, nextIndex), 1);
    if (nextCard) ordered.push(nextCard);
  }

  return ordered.map((card) => card.id);
}

function reinsertMissedCard(queue: string[]) {
  const [missedCardId, ...remaining] = queue;
  if (!missedCardId) return remaining;

  const insertionIndex = Math.min(randomInteger(3, 8), remaining.length);
  const nextQueue = [...remaining];
  nextQueue.splice(insertionIndex, 0, missedCardId);
  return nextQueue;
}

function buildMultipleChoiceOptions(
  reviewCard: LocalReviewCard,
  vocabularyCard: LocalVocabularyCard,
  vocabularyCards: LocalVocabularyCard[],
): MultipleChoiceOption[] {
  const answerKind = getVocabularyKind(vocabularyCard);
  const optionValue = (card: LocalVocabularyCard) =>
    reviewCard.type === "en_to_jp" ? getJapaneseAnswer(card) : getShortEnglishAnswer(card);
  const optionKanaValue = (card: LocalVocabularyCard) =>
    reviewCard.type === "en_to_jp" ? card.analysis.readingKana : undefined;
  const correctValue = optionValue(vocabularyCard);
  const currentTags = new Set(vocabularyCard.analysis.suggestedTags.map((tag) => tag.toLowerCase()));
  const rankedDeckCandidates = vocabularyCards
    .filter((card) => card.id !== vocabularyCard.id)
    .map((card) => ({
      card,
      kindMatch: getVocabularyKind(card) === answerKind ? 1 : 0,
      tagMatches: card.analysis.suggestedTags.filter((tag) => currentTags.has(tag.toLowerCase()))
        .length,
      random: Math.random(),
    }))
    .sort(
      (first, second) =>
        second.kindMatch - first.kindMatch ||
        second.tagMatches - first.tagMatches ||
        first.random - second.random,
    )
    .map(({ card }) => ({
      id: card.id,
      value: optionValue(card),
      kanaValue: optionKanaValue(card),
    }));
  const fallbackCandidates = [
    ...shuffle(beginnerDistractors.filter((item) => item.kind === answerKind)),
    ...shuffle(beginnerDistractors.filter((item) => item.kind !== answerKind)),
  ].map((item) => ({
    id: `fallback-${item.jp}-${item.en}`,
    value: reviewCard.type === "en_to_jp" ? item.jp : item.en,
    kanaValue: reviewCard.type === "en_to_jp" ? item.kana : undefined,
  }));
  const distractors: MultipleChoiceOption[] = [];
  const seen = new Set([normalizeChoice(correctValue)]);

  for (const candidate of [...rankedDeckCandidates, ...fallbackCandidates]) {
    const normalizedValue = normalizeChoice(candidate.value);
    if (!normalizedValue || seen.has(normalizedValue)) continue;

    seen.add(normalizedValue);
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }

  return shuffle([
    {
      id: `correct-${vocabularyCard.id}`,
      value: correctValue,
      kanaValue: optionKanaValue(vocabularyCard),
    },
    ...distractors,
  ]);
}

function shouldUseMultipleChoice(reviewCard: LocalReviewCard) {
  if (reviewCard.masteryLevel === "new" || reviewCard.masteryLevel === "learning") {
    return true;
  }

  if (reviewCard.masteryLevel === "familiar") {
    return reviewCard.reviewCount % 3 !== 2;
  }

  return false;
}

function getJapaneseAnswer(card: LocalVocabularyCard) {
  return card.analysis.normalizedForm || card.analysis.originalPhrase;
}

function getShortEnglishAnswer(card: LocalVocabularyCard) {
  const alternatives = splitEnglishAlternatives(
    card.analysis.conciseMeaning || card.analysis.naturalTranslation,
  );
  return alternatives[0] || card.analysis.naturalTranslation;
}

function getVocabularyKind(card: LocalVocabularyCard): DistractorKind {
  const metadata = [card.analysis.suggestedTags.join(" "), card.analysis.conciseMeaning]
    .join(" ")
    .toLowerCase();

  if (/verb|動詞/.test(metadata)) return "verb";
  if (/adjective|形容詞/.test(metadata)) return "adjective";
  if (/adverb|副詞/.test(metadata)) return "adverb";
  return "noun";
}

function normalizeChoice(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index);
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }

  return result;
}

function randomInteger(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

type DistractorKind = "verb" | "noun" | "adjective" | "adverb";

const beginnerDistractors: Array<{
  jp: string;
  kana: string;
  en: string;
  kind: DistractorKind;
}> = [
  { jp: "食べる", kana: "たべる", en: "eat", kind: "verb" },
  { jp: "飲む", kana: "のむ", en: "drink", kind: "verb" },
  { jp: "行く", kana: "いく", en: "go", kind: "verb" },
  { jp: "見る", kana: "みる", en: "see", kind: "verb" },
  { jp: "聞く", kana: "きく", en: "listen", kind: "verb" },
  { jp: "話す", kana: "はなす", en: "speak", kind: "verb" },
  { jp: "読む", kana: "よむ", en: "read", kind: "verb" },
  { jp: "書く", kana: "かく", en: "write", kind: "verb" },
  { jp: "時間", kana: "じかん", en: "time", kind: "noun" },
  { jp: "場所", kana: "ばしょ", en: "place", kind: "noun" },
  { jp: "仕事", kana: "しごと", en: "work", kind: "noun" },
  { jp: "友達", kana: "ともだち", en: "friend", kind: "noun" },
  { jp: "大きい", kana: "おおきい", en: "big", kind: "adjective" },
  { jp: "小さい", kana: "ちいさい", en: "small", kind: "adjective" },
  { jp: "新しい", kana: "あたらしい", en: "new", kind: "adjective" },
  { jp: "難しい", kana: "むずかしい", en: "difficult", kind: "adjective" },
  { jp: "いつも", kana: "いつも", en: "always", kind: "adverb" },
  { jp: "ときどき", kana: "ときどき", en: "sometimes", kind: "adverb" },
  { jp: "ゆっくり", kana: "ゆっくり", en: "slowly", kind: "adverb" },
  { jp: "すぐ", kana: "すぐ", en: "immediately", kind: "adverb" },
];

function checkAnswer(
  reviewCard: LocalReviewCard,
  vocabularyCard: LocalVocabularyCard,
  answer: string,
): AnswerResult {
  if (reviewCard.type === "en_to_jp") {
    const normalizedAnswer = normalizeJapanese(answer);
    const acceptedAnswers = [
      vocabularyCard.analysis.originalPhrase,
      vocabularyCard.analysis.normalizedForm,
      vocabularyCard.analysis.readingKana,
    ].map(normalizeJapanese);

    return {
      isCorrect: acceptedAnswers.includes(normalizedAnswer),
      expectedAnswer: vocabularyCard.analysis.originalPhrase,
    };
  }

  const acceptedEnglish = [
    vocabularyCard.analysis.naturalTranslation,
    vocabularyCard.analysis.conciseMeaning,
  ];

  return {
    isCorrect: hasEnglishMeaningOverlap(answer, acceptedEnglish),
    expectedAnswer: vocabularyCard.analysis.naturalTranslation,
  };
}

function normalizeJapanese(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s。、，,.!?！？「」『』()（）]/g, "");
}

function normalizeEnglishWords(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(stemEnglishWord)
    .filter((word) => word.length > 2 && !englishStopWords.has(word));
}

function hasEnglishMeaningOverlap(answer: string, acceptedAnswers: string[]) {
  const normalizedAnswer = normalizeEnglishWords(answer);
  const answerWords = new Set(normalizedAnswer);

  if (answerWords.size === 0) {
    return false;
  }

  return acceptedAnswers.flatMap(splitEnglishAlternatives).some((acceptedAnswer) => {
    const acceptedWords = normalizeEnglishWords(acceptedAnswer);

    if (acceptedWords.length === 0) {
      return false;
    }

    if (
      acceptedWords.length === 1 &&
      normalizedAnswer.length === 1 &&
      areCloseEnglishWords(normalizedAnswer[0] ?? "", acceptedWords[0] ?? "")
    ) {
      return true;
    }

    const matches = acceptedWords.filter((word) => answerWords.has(word)).length;
    return matches >= Math.min(2, acceptedWords.length);
  });
}

function splitEnglishAlternatives(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .split(/\s*(?:;|\/|\||,|\bor\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stemEnglishWord(word: string) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function areCloseEnglishWords(first: string, second: string) {
  if (first === second) return true;
  if (first.length < 5 || second.length < 5 || Math.abs(first.length - second.length) > 1) {
    return false;
  }

  return editDistanceWithinOne(first, second);
}

function editDistanceWithinOne(first: string, second: string) {
  let firstIndex = 0;
  let secondIndex = 0;
  let edits = 0;

  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] === second[secondIndex]) {
      firstIndex += 1;
      secondIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (first.length > second.length) firstIndex += 1;
    else if (second.length > first.length) secondIndex += 1;
    else {
      firstIndex += 1;
      secondIndex += 1;
    }
  }

  return edits + (firstIndex < first.length || secondIndex < second.length ? 1 : 0) <= 1;
}

const englishStopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "your",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "into",
  "from",
  "about",
  "roughly",
]);

function scheduleSilenceStop(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  onSilence: () => void,
  timeoutMs = SPEECH_SILENCE_TIMEOUT_MS,
) {
  clearSilenceTimer(timerRef);
  timerRef.current = setTimeout(onSilence, timeoutMs);
}

function clearSilenceTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
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
    return "I did not hear speech. Try again.";
  }

  if (error === "audio-capture") {
    return "No microphone was found.";
  }

  if (error === "network") {
    return "Speech recognition needs a network connection.";
  }

  return "Speech recognition stopped. Try again or type your answer.";
}
