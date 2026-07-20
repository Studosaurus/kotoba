"use client";

import { ChevronDown, Loader2, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import type { VocabularyAnalysis } from "../types";
import type { VocabularyValidationErrors } from "../utils/validation";
import { TagEditor } from "./tag-editor";

interface EditableAnalysisCardProps {
  analysis: VocabularyAnalysis;
  errors: VocabularyValidationErrors;
  isEnriching?: boolean;
  enrichmentError?: string;
  isSaving: boolean;
  onChange(analysis: VocabularyAnalysis): void;
  onSave(): void;
}

export function EditableAnalysisCard({
  analysis,
  errors,
  isEnriching = false,
  enrichmentError,
  isSaving,
  onChange,
  onSave,
}: EditableAnalysisCardProps) {
  return (
    <section className="space-y-3">
      {isEnriching || enrichmentError ? (
        <div className="rounded-[1.25rem] border border-[#2b2f36] bg-[#17191d] px-4 py-3 text-sm font-medium text-[#bdc1c6]">
          {isEnriching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2
                className="h-4 w-4 animate-spin text-[#a8c7fa] motion-reduce:animate-none"
                aria-hidden="true"
              />
              Adding learner details...
            </span>
          ) : (
            <span className="text-[#ffb1c0]">{enrichmentError}</span>
          )}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] bg-[#17191d] p-5 shadow-[0_18px_60px_rgb(0_0_0/0.28)]">
        <EditableTextarea
          label="Japanese"
          lang="ja"
          value={analysis.originalPhrase}
          error={errors.originalPhrase}
          rows={2}
          className="text-2xl"
          onChange={(value) => onChange({ ...analysis, originalPhrase: value })}
        />
        <div className="my-4 h-px bg-[#2b2f36]" />
        <EditableTextarea
          label="English"
          value={analysis.naturalTranslation}
          error={errors.naturalTranslation}
          rows={2}
          className="text-3xl text-[#a8c7fa]"
          onChange={(value) => onChange({ ...analysis, naturalTranslation: value })}
        />
      </div>

      <div className="rounded-[1.5rem] bg-[#17191d] p-4">
        <div className="grid gap-3">
          <EditableInput
            label="Reading"
            lang="ja"
            value={analysis.readingKana}
            error={errors.readingKana}
            onChange={(value) => onChange({ ...analysis, readingKana: value })}
          />
          <EditableInput
            label="Meaning"
            value={analysis.conciseMeaning}
            error={errors.conciseMeaning}
            onChange={(value) => onChange({ ...analysis, conciseMeaning: value })}
          />
          <EditableInput
            label="Dictionary form"
            lang="ja"
            value={analysis.normalizedForm}
            onChange={(value) => onChange({ ...analysis, normalizedForm: value })}
          />
        </div>
      </div>

      <Disclosure title="Grammar">
        <EditableTextarea
          label="Grammar"
          value={analysis.grammarExplanation}
          rows={4}
          onChange={(value) => onChange({ ...analysis, grammarExplanation: value })}
        />
      </Disclosure>

      <Disclosure title="Example">
        <div className="space-y-4">
          <EditableTextarea
            label="Japanese example"
            lang="ja"
            value={analysis.exampleSentence}
            rows={2}
            onChange={(value) => onChange({ ...analysis, exampleSentence: value })}
          />
          <EditableInput
            label="Reading"
            lang="ja"
            value={analysis.exampleSentenceReading}
            onChange={(value) => onChange({ ...analysis, exampleSentenceReading: value })}
          />
          <EditableTextarea
            label="English"
            value={analysis.exampleSentenceTranslation}
            rows={2}
            onChange={(value) => onChange({ ...analysis, exampleSentenceTranslation: value })}
          />
        </div>
      </Disclosure>

      <Disclosure title="Details">
        <div className="space-y-4">
          <EditableInput
            label="JLPT"
            value={analysis.jlptEstimate}
            onChange={(value) => onChange({ ...analysis, jlptEstimate: value })}
          />
          <TagEditor
            tags={analysis.suggestedTags}
            onChange={(suggestedTags) => onChange({ ...analysis, suggestedTags })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <EditableInput
              label="Source"
              value={analysis.sourceContext?.sourceName ?? ""}
              onChange={(sourceName) =>
                onChange({ ...analysis, sourceContext: { ...analysis.sourceContext, sourceName } })
              }
            />
            <EditableInput
              label="Episode"
              value={analysis.sourceContext?.mediaItemTitle ?? ""}
              onChange={(mediaItemTitle) =>
                onChange({
                  ...analysis,
                  sourceContext: { ...analysis.sourceContext, mediaItemTitle },
                })
              }
            />
            <EditableInput
              label="Time"
              value={analysis.sourceContext?.timestampLabel ?? ""}
              onChange={(timestampLabel) =>
                onChange({
                  ...analysis,
                  sourceContext: { ...analysis.sourceContext, timestampLabel },
                })
              }
            />
            <EditableInput
              label="Date"
              value={analysis.sourceContext?.capturedAtLabel ?? ""}
              onChange={(capturedAtLabel) =>
                onChange({
                  ...analysis,
                  sourceContext: { ...analysis.sourceContext, capturedAtLabel },
                })
              }
            />
          </div>
        </div>
      </Disclosure>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="sticky bottom-24 ml-auto flex h-12 w-fit min-w-32 items-center justify-center gap-2 rounded-full bg-[#a8c7fa] px-5 text-sm font-semibold text-[#062e6f] shadow-[0_10px_30px_rgb(0_0_0/0.3)] outline-none transition focus:ring-4 focus:ring-[#a8c7fa]/35 disabled:opacity-70 md:static"
      >
        {isSaving ? (
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Save className="h-5 w-5" aria-hidden="true" />
        )}
        Save
      </button>
    </section>
  );
}

function Disclosure({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <details className="group rounded-[1.5rem] bg-[#17191d]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-base font-semibold text-[#f2f3f5] outline-none focus:ring-4 focus:ring-[#8ab4f8]/25">
        {title}
        <ChevronDown
          className="h-5 w-5 transition group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-[#2b2f36] p-4">{children}</div>
    </details>
  );
}

function EditableInput({
  label,
  value,
  error,
  lang,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  lang?: string;
  onChange(value: string): void;
}) {
  const id = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-[#9aa0a6]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        lang={lang}
        inputMode="text"
        autoCapitalize={lang === "ja" ? "none" : undefined}
        autoComplete={lang === "ja" ? "off" : undefined}
        autoCorrect={lang === "ja" ? "off" : undefined}
        spellCheck={lang === "ja" ? false : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-transparent bg-[#202329] px-3 text-base text-[#f8f9fb] outline-none focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/20"
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-[#ff9aa8]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EditableTextarea({
  label,
  value,
  error,
  lang,
  rows,
  className = "text-base",
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  lang?: string;
  rows: number;
  className?: string;
  onChange(value: string): void;
}) {
  const id = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-[#9aa0a6]">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        lang={lang}
        inputMode="text"
        autoCapitalize={lang === "ja" ? "none" : undefined}
        autoComplete={lang === "ja" ? "off" : undefined}
        autoCorrect={lang === "ja" ? "off" : undefined}
        spellCheck={lang === "ja" ? false : undefined}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full resize-none bg-transparent leading-snug text-[#f8f9fb] outline-none focus:ring-0 ${className}`}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-[#ff9aa8]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
