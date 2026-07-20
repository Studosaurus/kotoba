# Kotoba Current Status

Last updated: 2026-07-20

This document is a handoff snapshot for continuing Kotoba from a new Codex thread or a new desktop environment. The durable source of truth remains the repository documents and code, but this file captures the current product state and recent implementation context.

## Repository

- GitHub: `https://github.com/Studosaurus/kotoba`
- Desktop path: `C:\Users\crime\Documents\GitHub\kotoba`
- Previous working copy still exists at `C:\Users\crime\Documents\Kotoba`; use the GitHub path going forward.
- Production URL: `https://kotoba-gules.vercel.app`
- Main branch: `main`

## Source Of Truth Documents

Read these first before changing architecture:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `BACKEND_PLAN.md`
- `SPOTIFY_MEDIA_PLAN.md`

## Product Direction

Kotoba is a modular AI-powered Japanese learning platform. The MVP is focused on validating a tight loop:

1. Listen to Japanese audio, especially podcasts.
2. Pause or capture a word/phrase.
3. Speak or type Japanese into Kotoba.
4. Get a quick English translation.
5. Receive learner details such as reading, grammar, examples, JLPT estimate, and tags.
6. Save the card locally.
7. Review cards through a study queue with spaced repetition.

The current priority is testing local-first product flow. Authentication, Supabase persistence, real learner events, and backend sync are intentionally deferred until the experience feels right.

## Current Architecture

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Local-first prototype state in `localStorage`
- Vercel production deploys
- Modular monolith structure under `src/modules`, `src/domains`, `src/connectors`, and `src/lib`

Important boundaries:

- Modules own product experiences.
- Connectors adapt external services.
- Modules should not depend on specific connectors.
- AI is an analysis/personalization layer, not the source of truth.
- Unified Study is a platform capability, currently local and vocabulary-first.

## Implemented User-Facing Features

### Vocabulary Capture

Primary file:

- `src/modules/vocabulary-capture/components/vocabulary-capture-experience.tsx`

Current behavior:

- App opens on Vocabulary Capture.
- Mobile-first dark UI inspired by Google Translate.
- Japanese text capture supports typing, paste, Enter-to-submit, and microphone capture.
- Speech recognition uses Japanese language mode where available.
- Recording automatically stops after silence.
- Captured spoken audio can be saved with the vocabulary card.
- Quick AI analysis returns fast first-pass translation fields.
- Background enrichment adds learner details after the quick result.
- Save is local-only and clears the capture input so another phrase can be captured quickly.
- Saved cards remain in local browser storage for the current device/browser.

Current AI implementation:

- `src/modules/vocabulary-capture/actions/analyze-vocabulary.ts`
- Uses OpenAI Responses API.
- `quickAnalyzeVocabularySafely` provides fast first-pass output.
- `enrichVocabularyAnalysisSafely` fills richer learner metadata.

### Saved Cards

Primary file:

- `src/modules/vocabulary-capture/components/saved-cards-view.tsx`

Current behavior:

- Saved tab displays locally saved cards.
- Tapping a saved card opens a detail view.
- Detail view shows phrase, reading, translation, meaning, grammar, example, tags, source, mastery, and recording.
- Source context can be edited or cleared locally.
- Recording appears in the saved card/detail and can be replaced.
- Kanji reading can be revealed by tapping the Japanese text.

### Study Queue

Primary file:

- `src/modules/vocabulary-capture/components/study-queue-view.tsx`

Current behavior:

- Local spaced repetition prototype.
- Cards include Japanese-to-English, English-to-Japanese, and audio-to-English when a recording exists.
- User must type or speak the answer.
- App marks answers right/wrong.
- Correct answers move out of the current queue.
- Incorrect answers remain in the queue.
- Mastery level updates locally.
- Mastery progress and level-up moments are present.
- Japanese answer fields have web-level Japanese keyboard hints, but iOS PWAs cannot reliably force keyboard language switching like native iOS apps.

### Podcast Listening

Primary files:

- `src/modules/media/components/podcast-media-experience.tsx`
- `src/modules/media/components/media-player-provider.tsx`
- `src/modules/media/components/global-mini-player.tsx`
- `src/modules/media/local/local-media-store.ts`
- `src/modules/media/services/curated-podcasts.ts`

Current behavior:

- Podcast listening is RSS-based and local-first.
- Curated/default podcasts include Japanese learning shows.
- Users can add an RSS feed URL.
- Shows page visually follows Apple Podcasts / Spotify direction.
- Main podcast selection page shows recently updated shows.
- Search and add-RSS controls appear below the show grid.
- Listening stats and goals appear on the main show selection page.
- Daily goal is shown by default; full stats and weekly/monthly goals are behind an expand control.
- Show detail page lists episodes.
- Episode ordering can be toggled oldest/newest and is saved locally.
- Episode progress and listened state are saved locally.
- Dedicated full player page exists.
- Mini player persists at the bottom while browsing.
- Expanding the mini player opens the player page.
- Player supports play/pause, scrub, previous/next episode, skip back/forward, playback speed, and capture.
- Playback speed options are `0.8x`, `0.85x`, `0.9x`, `0.95x`, and `1x`.
- Finishing an episode advances to the next episode instead of looping.

### Source Context

Current behavior:

- When a podcast episode is active, captured vocabulary receives source context automatically.
- Source includes podcast/show, episode title, timestamp, and capture date.
- Source provenance distinguishes active-episode capture from manual edits.
- If no episode is active, capture UI says `Select a source podcast`.

### Settings And Local Safety

Primary files:

- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/settings/local-data-backup.tsx`
- `src/lib/local-permission-settings.ts`

Current behavior:

- Settings uses a full-screen dark mobile layout.
- Settings links to connectors.
- Settings supports exporting all local Kotoba data.
- Settings supports importing a backup JSON after confirmation.
- Export/import includes all `localStorage` keys beginning with `kotoba:`.
- Microphone permission state is saved locally when capture observes granted, denied, unknown, or unavailable.
- Settings has a voice recording panel to request/check microphone permission.

### PWA / Deployment

Current behavior:

- `public/manifest.webmanifest` starts the app at `/modules/vocabulary-capture`.
- App icon is a black-background pixel tanuki with full body and large tail.
- `src/app/api/app-version/route.ts` exposes a build version.
- `src/app/app-version-checker.tsx` checks for new builds and reloads the app shell without clearing localStorage.
- iOS may still cache Home Screen icons aggressively.

## Local Data Keys

Known local storage keys include:

- `kotoba:vocabulary-deck`
- `kotoba:user-podcasts`
- `kotoba:current-episode-playback`
- `kotoba:episode-progress`
- `kotoba:media-settings`
- `kotoba:listening-stats`
- `kotoba:permission-settings`
- `kotoba:app-version`

Legacy vocabulary keys may still be migrated if present:

- `kotoba:vocabulary-captures`
- `kotoba:vocabulary-cards`

## Environment

Important environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- Supabase values from `.env.example`
- Spotify variables exist from earlier scaffold work, but Spotify is not the current practical path because Web API access was blocked by Spotify account/API limitations.

The current podcast direction is RSS-first in-app listening instead of relying on Spotify playback metadata.

## Validation Commands

Use the portable Node install if needed:

```powershell
$nodeDir = Join-Path (Get-Location) '.tools\node-v24.18.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir 'npm.cmd') run typecheck
& (Join-Path $nodeDir 'npm.cmd') run lint
& (Join-Path $nodeDir 'npm.cmd') run build
```

Normal commands if Node is globally available:

```bash
npm run typecheck
npm run lint
npm run build
```

Deploy command used so far:

```powershell
$nodeDir = Join-Path (Get-Location) '.tools\node-v24.18.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir 'npm.cmd') exec -- vercel deploy --prod --yes
```

## Known Issues And Constraints

- This is still local-first. Deleting the Home Screen app or clearing site data can remove local vocabulary and listening data unless exported first.
- iOS PWA keyboard language switching cannot be forced like a native app such as Tsurukame.
- Settings and some older scaffold pages may still need visual polish.
- Some old scaffold routes still exist, including dashboard/modules/sign-in, but the current experience starts on capture.
- GitHub Desktop previously held a file handle on `C:\Users\crime\Documents\Kotoba`, so the repo was cloned into `C:\Users\crime\Documents\GitHub\kotoba` instead of physically moved.
- The original Codex thread may not attach automatically to the desktop project; use this file plus the repository docs as handoff context.

## Recommended Next Steps

1. Open `C:\Users\crime\Documents\GitHub\kotoba` as the Codex Desktop project.
2. In any new Codex thread, ask it to read `CURRENT_STATUS.md` and the source-of-truth docs before making changes.
3. Continue testing the local podcast-capture-study loop on iPhone.
4. Polish the study interaction next: answer evaluation, mastery feedback, and queue clarity.
5. Improve saved word detail and source editing once real usage reveals friction.
6. Keep backend/auth deferred until the local flow feels worth preserving across devices.
7. Before backend work, use `BACKEND_PLAN.md` to implement Supabase persistence deliberately.

