# Kotoba Roadmap

## Roadmap Principles

Kotoba should grow through thin, validated slices.

Each phase should preserve the core architecture:

- Modules are first-party learning capabilities.
- Connectors adapt external services.
- The Learner Model is shared across the platform.
- Study is unified.
- AI improves the experience without becoming the source of truth.

The MVP should prove the learning loop before expanding module count.

## Phase 0: Project Foundation

Goal: Establish the source of truth before implementation.

Deliverables:

- `VISION.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `DECISIONS.md`
- Initial product and technical scope
- MVP boundaries
- Architectural decision log

Exit criteria:

- Core architecture is reviewed and accepted.
- MVP scope is intentionally narrow.
- Open questions are documented.

## Phase 1: Application Foundation

Goal: Create the deployable product shell.

Deliverables:

- Responsive PWA foundation
- Authentication
- Basic authenticated dashboard
- Initial domain structure
- Persistence foundation
- Background job foundation
- Error handling and observability baseline

Exit criteria:

- A user can sign in.
- A user can reach the dashboard on mobile and desktop.
- Domains are organized according to the modular monolith architecture.
- No application module depends directly on an external connector.

## Phase 2: Learner Model And Study Foundation

Goal: Establish shared learner state and vocabulary-first study.

Deliverables:

- Learner profile
- Learner events and observations
- Vocabulary knowledge representation
- Study item model
- Vocabulary review scheduling
- Review result recording
- Dashboard summaries for vocabulary and study activity

Exit criteria:

- Saving vocabulary updates learner state.
- Saving vocabulary creates a study item.
- Completing reviews updates study history.
- Dashboard reflects study progress.

## Phase 3: Vocabulary Capture MVP

Goal: Make vocabulary capture fast, useful, and low-friction.

Deliverables:

- Type or dictate Japanese word or phrase
- AI-generated dictionary form
- AI-generated kana
- AI-generated English meaning
- AI-generated natural translation
- AI-generated grammar explanation
- AI-generated example sentence
- AI-generated JLPT estimate
- AI-generated suggested tags
- User-editable fields
- Save flow
- Provenance and confidence metadata where appropriate

Exit criteria:

- A learner can capture a word in under ten seconds when AI confidence is high.
- A learner can edit all generated fields before saving.
- Saved vocabulary enters the Learner Model.
- A study item is generated automatically.

## Phase 4: Media Module And Spotify Connector

Goal: Connect listening context to vocabulary capture.

Deliverables:

- Generic media connector contract
- Spotify connector
- Spotify account connection
- Current playback detection where available
- Podcast and episode metadata
- Playback position
- Listening history
- Listening statistics
- Listening streaks
- Listening goals
- Automatic media source attachment during vocabulary capture

Exit criteria:

- Spotify data is normalized through generic media contracts.
- Media module does not depend on Spotify-specific concepts.
- Vocabulary captured during playback automatically includes podcast, episode, timestamp, and capture date when available.
- The user can still capture vocabulary manually when media context is unavailable.

## Phase 5: MVP Hardening

Goal: Prepare the MVP for real use.

Deliverables:

- Mobile UX polish
- Loading and empty states
- Connector failure states
- Retry behavior for sync jobs
- Data correction flows
- Basic export or account data review
- Privacy review
- Performance pass
- Usability testing against core flows

Exit criteria:

- Common workflows feel fast on mobile.
- External service failures do not block core vocabulary capture.
- AI and connector-derived data show reasonable correction paths.
- MVP is ready for private beta.

## Post-MVP Candidates

Future work should be prioritized based on observed learner behavior, not architectural desire.

Potential next modules:

- WaniKani Companion
- Reading Companion
- AI Conversation
- Writing Coach
- Vision Companion

Potential next connectors:

- Apple Podcasts
- RSS
- YouTube
- WaniKani API
- Anki
- Bunpro
- Kindle

Potential platform improvements:

- More advanced scheduling
- Richer learner knowledge graph
- AI memory with consent and deletion controls
- Offline-friendly capture
- Native mobile application
- Cross-resource recommendations
- Multi-modal study prompts

## Explicitly Deferred

The following should remain out of scope until the MVP validates the core loop:

- Third-party module marketplace
- User-installable modules
- Full plugin runtime
- Full grammar graph
- Full transcript ingestion pipeline
- Multi-service media aggregation
- Native mobile apps
- Complex social features

