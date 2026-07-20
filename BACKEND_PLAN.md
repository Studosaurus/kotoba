# Kotoba Backend Plan

This plan is intentionally deferred while the early product flow is tested locally.

The immediate product priority is validating the real-world capture loop:

```text
Listening to Japanese media
→ pause
→ hold to record or type a phrase
→ receive English translation and learning details
→ save locally
→ capture another phrase
```

Backend, authentication, durable persistence, and full learner-model integration should resume after the capture flow feels useful.

## Backend Goals

The backend should eventually support:

- Authenticated users
- Durable vocabulary captures
- Learner events
- Learner Model projections
- Unified Study item creation
- Review results
- Media/source context
- Spotify connector accounts and playback context
- AI-generated data provenance and confidence

## Recommended Order

### 1. Supabase Project Setup

Create or link a Supabase project.

Configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` if server-only admin operations become necessary

Apply the initial MVP migration:

- `supabase/migrations/0001_initial_mvp_schema.sql`

### 2. Authentication

Implement Supabase Auth with the lightest usable path first.

Recommended MVP:

- Magic-link email sign-in
- Auth callback
- Protected app routes
- Profile row creation
- Sign out

Avoid complex account settings until the learning loop requires them.

### 3. Vocabulary Persistence

Persist confirmed vocabulary captures.

Initial table:

- `vocabulary_items`

Save:

- Original phrase
- Normalized form
- Reading
- Meaning
- Natural translation
- Grammar explanation
- Example sentence
- JLPT estimate
- Tags
- Confidence
- Source context
- Provenance

AI output should remain editable before save.

### 4. Learner Events

After a vocabulary item is saved, emit:

- `vocabulary.captured`

Keep events pragmatic. Do not implement strict event sourcing unless the product needs it.

### 5. Study Item Generation

After saving vocabulary, create a due study item.

Initial behavior:

- One vocabulary study item per saved vocabulary item
- Due immediately
- Simple status and review count

Do not overbuild scheduling yet.

### 6. Study Review Flow

Implement the first vocabulary review loop:

- Show due item
- Reveal answer/details
- Rate Again, Hard, Good, Easy
- Record review result
- Update next due date

Use a simple schedule before adding a full spaced repetition model.

### 7. Dashboard Projections

Show real data:

- Vocabulary saved
- Due study items
- Recent captures
- Recent reviews
- Basic activity summary

### 8. Spotify Connector

Prioritize Spotify once local capture flow feels right.

Spotify should be implemented as the first generic Media connector, not as a direct dependency of Vocabulary Capture.

Initial Spotify slice:

- Spotify OAuth
- Connector account storage
- Current playback read
- Podcast/episode metadata
- Playback position
- Generic media context normalization
- Automatic source context attachment during capture

The Media module owns playback context. Vocabulary Capture consumes connector-neutral source context only.

## Already Scaffolded

The repository already contains early backend scaffolding:

- Supabase client setup
- Auth callback route
- Magic-link sign-in shell
- Initial MVP SQL migration
- Handwritten Supabase database types
- Server action draft for persistent vocabulary save

These are intentionally not part of the active local-only prototype until backend work resumes.

## Deferred Decisions

Resolve later:

- Whether to use Supabase local development or remote-only migrations
- Whether to use magic links, OAuth, or both
- Exact AI provider/model and structured output schema
- Whether source context should be stored inline or normalized into separate media tables
- Study scheduling model beyond the first simple MVP schedule
- Whether local captures should be migrated into authenticated storage after sign-in

