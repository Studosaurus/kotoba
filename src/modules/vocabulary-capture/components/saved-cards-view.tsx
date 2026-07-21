"use client";

import { ArrowLeft, LoaderCircle, Mic, Search, Trash2, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import {
  formatDueLabel,
  formatMastery,
  formatReviewCardType,
  getDueCountForVocabulary,
  getMasteryProgress,
  getMasteryDistribution,
  getNextDueCardForVocabulary,
  getVocabularyMastery,
} from "../local/local-study-scheduler";
import type {
  LocalAudioClip,
  LocalReviewCard,
  LocalVocabularyCard,
} from "../local/local-vocabulary-types";
import type { VocabularySourceContext } from "../types";

interface SavedCardsViewProps {
  vocabularyCards: LocalVocabularyCard[];
  reviewCards: LocalReviewCard[];
  onDelete(cardId: string): void;
  onUpdateAudioClip(cardId: string, audioClip: LocalAudioClip): void;
  onUpdateSourceContext(cardId: string, sourceContext: VocabularySourceContext | undefined): void;
  onStudy(): void;
}

export function SavedCardsView({
  vocabularyCards,
  reviewCards,
  onDelete,
  onUpdateAudioClip,
  onUpdateSourceContext,
  onStudy,
}: SavedCardsViewProps) {
  const [query, setQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string>();
  const rootRef = useRef<HTMLElement | null>(null);
  const listScrollPositionRef = useRef(0);
  const selectedCard = selectedCardId
    ? vocabularyCards.find((card) => card.id === selectedCardId)
    : undefined;
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return vocabularyCards;
    }

    return vocabularyCards.filter((card) => {
      const searchable = [
        card.analysis.originalPhrase,
        card.analysis.readingKana,
        card.analysis.conciseMeaning,
        card.analysis.naturalTranslation,
        card.analysis.suggestedTags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [vocabularyCards, query]);
  const masteryDistribution = getMasteryDistribution(reviewCards);

  const getScrollContainer = () =>
    rootRef.current?.closest<HTMLElement>("[data-vocabulary-scroll-container]") ?? null;

  const openCardDetail = (cardId: string) => {
    const scrollContainer = getScrollContainer();
    listScrollPositionRef.current = scrollContainer?.scrollTop ?? 0;
    setSelectedCardId(cardId);
    window.requestAnimationFrame(() => scrollContainer?.scrollTo({ top: 0, behavior: "auto" }));
  };

  const returnToList = () => {
    const scrollContainer = getScrollContainer();
    setSelectedCardId(undefined);
    window.requestAnimationFrame(() =>
      scrollContainer?.scrollTo({ top: listScrollPositionRef.current, behavior: "auto" }),
    );
  };

  if (selectedCard) {
    return (
      <div ref={(node) => { rootRef.current = node; }}>
        <SavedCardDetail
          card={selectedCard}
          reviewCards={reviewCards}
          onBack={returnToList}
          onDelete={(cardId) => {
            onDelete(cardId);
            returnToList();
          }}
          onUpdateAudioClip={(audioClip) => onUpdateAudioClip(selectedCard.id, audioClip)}
          onUpdateSourceContext={(sourceContext) =>
            onUpdateSourceContext(selectedCard.id, sourceContext)
          }
        />
      </div>
    );
  }

  return (
    <section ref={(node) => { rootRef.current = node; }} className="space-y-4">
      <div className="rounded-[1.5rem] bg-[#17191d] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#f8f9fb]">Saved</h2>
            <p className="mt-1 text-sm text-[#bdc1c6]">
              {vocabularyCards.length} words / {reviewCards.length} flashcards
            </p>
          </div>
          <button
            type="button"
            onClick={onStudy}
            className="min-h-11 rounded-full bg-[#a8c7fa] px-4 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
          >
            Study
          </button>
        </div>
        <label className="mt-4 flex h-12 items-center gap-2 rounded-xl bg-[#202329] px-3 text-[#bdc1c6]">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Search saved cards</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-base text-[#f8f9fb] outline-none placeholder:text-[#6f737d]"
          />
        </label>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {masteryDistribution.map((item) => (
            <div key={item.level} className="rounded-xl bg-[#202329] px-2 py-2 text-center">
              <p className="text-sm font-semibold text-[#f8f9fb]">{item.count}</p>
              <p className="truncate text-[10px] font-semibold uppercase text-[#9aa0a6]">
                {formatMastery(item.level)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="rounded-[1.5rem] bg-[#17191d] p-5 text-sm text-[#bdc1c6]">
          No saved cards yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((card) => {
            const mastery = getVocabularyMastery(card, reviewCards);
            const displayWord = getSavedListDisplayWord(card);

            return (
              <article key={card.id} className="rounded-[1.25rem] bg-[#17191d] p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openCardDetail(card.id)}
                    className="min-w-0 flex-1 text-left outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
                  >
                    <p lang="ja" className="text-xl font-medium leading-snug text-[#f8f9fb]">
                      {displayWord}
                    </p>
                    <p lang="ja" className="mt-0.5 text-sm font-medium text-[#a8c7fa]">
                      {card.analysis.readingKana}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-[#bdc1c6]">
                      {card.analysis.conciseMeaning || card.analysis.naturalTranslation}
                    </p>
                    <MasteryProgressBar mastery={mastery} compact />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(card.id)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#ffb1c0] outline-none hover:bg-[#3a1f26] focus:ring-4 focus:ring-[#ff9aa8]/20"
                    aria-label={`Delete ${card.analysis.originalPhrase}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function getSavedListDisplayWord(card: LocalVocabularyCard) {
  const { normalizedForm, originalPhrase } = card.analysis;
  const containsKanji = (value: string) => /\p{Script=Han}/u.test(value);

  if (containsKanji(normalizedForm)) {
    return normalizedForm;
  }

  if (containsKanji(originalPhrase)) {
    return originalPhrase;
  }

  return normalizedForm || originalPhrase;
}

function SavedAudioClip({
  card,
  onUpdateAudioClip,
}: {
  card: LocalVocabularyCard;
  onUpdateAudioClip(audioClip: LocalAudioClip): void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        const mimeType = recorder.mimeType || chunks[0]?.type || "audio/webm";
        stopStream(stream);
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);

        if (chunks.length === 0) {
          setError("No audio was recorded.");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          onUpdateAudioClip({
            dataUrl: String(reader.result),
            mimeType,
            durationMs: 0,
            createdAt: new Date().toISOString(),
          });
          setError(undefined);
        };
        reader.onerror = () => setError("Could not save the recording.");
        reader.readAsDataURL(new Blob(chunks, { type: mimeType }));
      };

      setError(undefined);
      setIsRecording(true);
      recorder.start();
    } catch {
      setError("Microphone permission was blocked or unavailable.");
      setIsRecording(false);
      stopStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="mt-4 rounded-2xl bg-[#101113] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#a8c7fa]">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Recording
          </p>
          <p className="mt-1 text-sm text-[#bdc1c6]">
            {card.audioClip ? formatDuration(card.audioClip.durationMs) : "No recording saved"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void startRecording();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#202329] px-4 text-sm font-semibold text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25 data-[recording=true]:bg-[#ffb1c0] data-[recording=true]:text-[#3a1f26]"
          data-recording={isRecording}
          aria-label={isRecording ? "Stop replacement recording" : "Record replacement audio"}
        >
          {isRecording ? (
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
          {isRecording ? "Stop" : card.audioClip ? "Record new" : "Record"}
        </button>
      </div>
      {card.audioClip ? (
        <audio
          controls
          src={card.audioClip.dataUrl}
          className="mt-3 w-full"
          aria-label={`Recording for ${card.analysis.originalPhrase}`}
        />
      ) : null}
      {error ? <p className="mt-2 text-sm font-medium text-[#ff9aa8]">{error}</p> : null}
    </div>
  );
}

function SavedCardDetail({
  card,
  reviewCards,
  onBack,
  onDelete,
  onUpdateAudioClip,
  onUpdateSourceContext,
}: {
  card: LocalVocabularyCard;
  reviewCards: LocalReviewCard[];
  onBack(): void;
  onDelete(cardId: string): void;
  onUpdateAudioClip(audioClip: LocalAudioClip): void;
  onUpdateSourceContext(sourceContext: VocabularySourceContext | undefined): void;
}) {
  const relatedReviewCards = reviewCards.filter(
    (reviewCard) => reviewCard.vocabularyCardId === card.id,
  );
  const mastery = getVocabularyMastery(card, reviewCards);
  const dueCount = getDueCountForVocabulary(card, reviewCards);
  const nextDueCard = getNextDueCardForVocabulary(card, reviewCards);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#17191d] text-[#f8f9fb] outline-none focus:ring-4 focus:ring-[#8ab4f8]/20"
          aria-label="Back to saved words"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-lg font-semibold text-[#f8f9fb]">
          Word details
        </h2>
        <button
          type="button"
          onClick={() => onDelete(card.id)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#17191d] text-[#ffb1c0] outline-none focus:ring-4 focus:ring-[#ff9aa8]/20"
          aria-label={`Delete ${card.analysis.originalPhrase}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <section className="rounded-[1.75rem] bg-[#17191d] p-5">
        <KanjiReadingText
          phrase={card.analysis.originalPhrase}
          reading={card.analysis.readingKana}
          className="text-4xl leading-tight text-[#f8f9fb]"
        />
        <p className="mt-4 text-2xl font-semibold leading-snug text-[#a8c7fa]">
          {card.analysis.naturalTranslation}
        </p>
        <p className="mt-3 text-base leading-6 text-[#bdc1c6]">{card.analysis.conciseMeaning}</p>
        <MasteryProgressBar mastery={mastery} />
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <Pill>{dueCount} due</Pill>
          {nextDueCard ? <Pill>next {formatDueLabel(nextDueCard)}</Pill> : null}
          {relatedReviewCards.map((reviewCard) => (
            <Pill key={reviewCard.id}>{formatReviewCardType(reviewCard.type)}</Pill>
          ))}
        </div>
      </section>

      <DetailSection title="Example">
        <KanjiReadingText
          phrase={card.analysis.exampleSentence}
          reading={card.analysis.exampleSentenceReading}
          className="text-xl leading-snug text-[#f8f9fb]"
        />
        <p className="mt-3 text-sm leading-6 text-[#bdc1c6]">
          {card.analysis.exampleSentenceTranslation}
        </p>
      </DetailSection>

      <DetailSection title="Grammar">
        <p className="text-sm leading-6 text-[#bdc1c6]">{card.analysis.grammarExplanation}</p>
      </DetailSection>

      <SavedAudioClip card={card} onUpdateAudioClip={onUpdateAudioClip} />

      <DetailSection title="Metadata">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Pill>{card.analysis.normalizedForm}</Pill>
          <Pill>{card.analysis.jlptEstimate}</Pill>
          <Pill>{card.analysis.confidence} confidence</Pill>
          {card.analysis.suggestedTags.map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Source">
        <SourceEditor
          key={`${card.id}:${sourceEditorKey(card.analysis.sourceContext)}`}
          sourceContext={card.analysis.sourceContext}
          onSave={onUpdateSourceContext}
        />
      </DetailSection>
    </section>
  );
}

function SourceEditor({
  sourceContext,
  onSave,
}: {
  sourceContext?: VocabularySourceContext;
  onSave(sourceContext: VocabularySourceContext | undefined): void;
}) {
  const [draft, setDraft] = useState(() => ({
    sourceName: sourceContext?.sourceName ?? "",
    mediaItemTitle: sourceContext?.mediaItemTitle ?? "",
    timestampLabel: sourceContext?.timestampLabel ?? "",
    capturedAtLabel: sourceContext?.capturedAtLabel ?? "",
  }));
  const [savedMessage, setSavedMessage] = useState<string>();
  const hasSource = hasSourceContext(sourceContext);

  const updateDraft = (field: keyof typeof draft, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setSavedMessage(undefined);
  };

  const saveSource = () => {
    const nextSource = normalizeSourceDraft(draft);

    onSave(nextSource);
    setSavedMessage(nextSource ? "Source updated." : "Source cleared.");
  };

  const clearSource = () => {
    const emptyDraft = {
      sourceName: "",
      mediaItemTitle: "",
      timestampLabel: "",
      capturedAtLabel: "",
    };

    setDraft(emptyDraft);
    onSave(undefined);
    setSavedMessage("Source cleared.");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill>{getSourceStatusLabel(sourceContext)}</Pill>
        {hasSource ? <Pill>{formatSourceSummary(sourceContext)}</Pill> : null}
      </div>
      <div className="grid gap-3">
        <SourceInput
          label="Source"
          value={draft.sourceName}
          placeholder="Japanese with Shun"
          onChange={(value) => updateDraft("sourceName", value)}
        />
        <SourceInput
          label="Episode"
          value={draft.mediaItemTitle}
          placeholder="Episode title"
          onChange={(value) => updateDraft("mediaItemTitle", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <SourceInput
            label="Time"
            value={draft.timestampLabel}
            placeholder="4:12"
            onChange={(value) => updateDraft("timestampLabel", value)}
          />
          <SourceInput
            label="Date"
            value={draft.capturedAtLabel}
            placeholder="Jul 19, 2026"
            onChange={(value) => updateDraft("capturedAtLabel", value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearSource}
          className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#ffb1c0] outline-none focus:ring-4 focus:ring-[#ff9aa8]/20"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={saveSource}
          className="min-h-10 rounded-full bg-[#a8c7fa] px-5 text-sm font-semibold text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
        >
          Save source
        </button>
      </div>
      {savedMessage ? <p className="text-sm font-medium text-[#a8c7fa]">{savedMessage}</p> : null}
    </div>
  );
}

function SourceInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange(value: string): void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#9aa0a6]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-xl border border-[#2b2f36] bg-[#101113] px-3 text-sm text-[#f8f9fb] outline-none placeholder:text-[#6f737d] focus:border-[#a8c7fa] focus:ring-4 focus:ring-[#8ab4f8]/20"
      />
    </label>
  );
}

function KanjiReadingText({
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

function MasteryProgressBar({
  mastery,
  compact = false,
}: {
  mastery: LocalReviewCard["masteryLevel"];
  compact?: boolean;
}) {
  const progress = getMasteryProgress(mastery);

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#bdc1c6]">
        <span>{formatMastery(progress.level)}</span>
        <span>
          {progress.isComplete ? "Mastered" : `Next: ${formatMastery(progress.nextLevel)}`}
        </span>
      </div>
      <div className={`${compact ? "mt-1.5 h-1.5" : "mt-2 h-2"} overflow-hidden rounded-full bg-[#2b2f36]`}>
        <div className="h-full rounded-full bg-[#a8c7fa]" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

function DetailSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-[1.5rem] bg-[#17191d] p-4">
      <h3 className="text-sm font-semibold text-[#f8f9fb]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Pill({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="rounded-full bg-[#202329] px-3 py-1 text-[#bdc1c6]">{children}</span>;
}

function formatDuration(durationMs: number) {
  if (durationMs <= 0) {
    return "Recording saved";
  }

  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${seconds}s saved`;
}

function hasSourceContext(sourceContext?: VocabularySourceContext) {
  return Boolean(
    sourceContext?.sourceName?.trim() ||
      sourceContext?.mediaItemTitle?.trim() ||
      sourceContext?.timestampLabel?.trim() ||
      sourceContext?.capturedAtLabel?.trim(),
  );
}

function formatSourceSummary(sourceContext?: VocabularySourceContext) {
  const sourceName = sourceContext?.sourceName?.trim();
  const mediaItemTitle = sourceContext?.mediaItemTitle?.trim();

  if (sourceName && mediaItemTitle) {
    return `From ${sourceName} / ${mediaItemTitle}`;
  }

  if (mediaItemTitle) {
    return `From ${mediaItemTitle}`;
  }

  if (sourceName) {
    return `From ${sourceName}`;
  }

  return "No source";
}

function getSourceStatusLabel(sourceContext?: VocabularySourceContext) {
  if (!hasSourceContext(sourceContext)) {
    return "No source";
  }

  if (sourceContext?.provenance === "manual") {
    return "Manual source";
  }

  return "Active episode";
}

function normalizeSourceDraft(draft: {
  sourceName: string;
  mediaItemTitle: string;
  timestampLabel: string;
  capturedAtLabel: string;
}): VocabularySourceContext | undefined {
  const sourceName = draft.sourceName.trim();
  const mediaItemTitle = draft.mediaItemTitle.trim();
  const timestampLabel = draft.timestampLabel.trim();
  const capturedAtLabel = draft.capturedAtLabel.trim();

  if (!sourceName && !mediaItemTitle && !timestampLabel && !capturedAtLabel) {
    return undefined;
  }

  return {
    sourceName: sourceName || undefined,
    mediaItemTitle: mediaItemTitle || undefined,
    timestampLabel: timestampLabel || undefined,
    capturedAtLabel: capturedAtLabel || undefined,
    provenance: "manual",
  };
}

function sourceEditorKey(sourceContext?: VocabularySourceContext) {
  return [
    sourceContext?.sourceName ?? "",
    sourceContext?.mediaItemTitle ?? "",
    sourceContext?.timestampLabel ?? "",
    sourceContext?.capturedAtLabel ?? "",
    sourceContext?.provenance ?? "",
  ].join("|");
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
