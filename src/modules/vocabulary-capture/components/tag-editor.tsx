"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

interface TagEditorProps {
  tags: string[];
  onChange(tags: string[]): void;
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const normalized = newTag.trim();

    if (!normalized || tags.includes(normalized)) {
      setNewTag("");
      return;
    }

    onChange([...tags, normalized]);
    setNewTag("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[#202329] pl-3 pr-1"
          >
            <input
              value={tag}
              aria-label={`Tag ${index + 1}`}
              onChange={(event) => {
                const nextTags = [...tags];
                nextTags[index] = event.target.value;
                onChange(nextTags);
              }}
              className="w-24 bg-transparent text-sm text-[#f8f9fb] outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => onChange(tags.filter((_, tagIndex) => tagIndex !== index))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#bdc1c6] outline-none hover:bg-[#2b2f36] focus:ring-4 focus:ring-[#8ab4f8]/20"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="new-vocabulary-tag">
          Add tag
        </label>
        <input
          id="new-vocabulary-tag"
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag"
          className="h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-[#202329] px-3 text-sm text-[#f8f9fb] outline-none placeholder:text-[#6f737d] focus:border-[#8ab4f8] focus:ring-4 focus:ring-[#8ab4f8]/20"
        />
        <button
          type="button"
          onClick={addTag}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#a8c7fa] text-[#062e6f] outline-none focus:ring-4 focus:ring-[#a8c7fa]/30"
          aria-label="Add tag"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
