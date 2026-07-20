# Kotoba Architecture

## Overview

Kotoba is a responsive PWA backed by a modular monolith.

The architecture prioritizes clear domain boundaries, implementation simplicity, mobile-first performance, and long-term extensibility. The MVP should avoid premature service extraction, dynamic plugin infrastructure, and unnecessary abstraction while still enforcing the most important architectural rule:

> Modules do not depend on specific connectors, and no module owns an isolated understanding of the learner.

## Architectural Style

Kotoba uses a modular monolith for the MVP.

This means:

- One deployable application.
- Strong internal domain boundaries.
- Shared infrastructure where practical.
- Domain-owned data and behavior.
- Explicit interfaces between domains.
- Future service extraction only if operational needs justify it.

The modular monolith should be treated as a design discipline, not as a distributed system simulation.

## Core Domains

### Identity

Owns authentication and user identity.

Responsibilities:

- User accounts
- Sessions
- Authentication provider integration
- User-level authorization primitives

### Learner Model

Owns the derived understanding of the learner.

Responsibilities:

- Learner profile
- Known and learning vocabulary
- Learning observations
- Skill confidence
- Study history summaries
- Media exposure summaries
- Personalization context for AI

The Learner Model should be derived from learner events and observations wherever practical. During the MVP, implementation simplicity is allowed to take priority over strict event-sourcing purity.

### Study

Owns unified study behavior across the platform.

Responsibilities:

- Study item creation
- Review scheduling
- Study queue generation
- Review result recording
- Vocabulary-first review flows for MVP
- Extensible item and prompt types for future modules

Study is a platform capability, not a module.

### Modules

Owns first-party learner-facing capabilities.

MVP modules:

- Vocabulary Capture
- Media

Responsibilities:

- Module-specific user workflows
- Interpretation of platform and connector data
- Creation of learner events and observations
- Contribution of study candidates

Modules must not depend on specific external services.

### Connectors

Owns integration with external services.

MVP connector:

- Spotify

Responsibilities:

- External authentication
- External API communication
- Rate limit handling
- Sync state
- Data normalization
- Provenance tracking
- Connector health and failure states

Connectors provide data to modules through internal connector-neutral contracts. Connectors do not own learning logic.

### AI

Owns access to AI reasoning capabilities.

Responsibilities:

- Vocabulary analysis
- Explanation generation
- Tag suggestions
- JLPT estimation
- Personalization using Learner Model context
- Confidence and provenance metadata for generated outputs

AI is never the source of truth. AI output becomes durable learner data only after being accepted directly or indirectly through product workflows.

### Jobs And Sync

Owns asynchronous work.

Responsibilities:

- Connector sync jobs
- Retry behavior
- Long-running AI enrichment
- Background media updates
- Scheduled maintenance tasks

Mobile-first interactions should remain fast. Work that may exceed the interaction budget should run asynchronously.

## Modules And Connectors

Modules and connectors are different architectural concepts.

### Modules

Modules are product capabilities that the learner enables, disables, and uses directly.

Examples:

- Vocabulary Capture
- Media
- WaniKani Companion
- AI Conversation
- Reading Companion
- Vision Companion
- Writing Coach

Modules may:

- Render user-facing workflows.
- Read from the Learner Model through approved interfaces.
- Emit learner events and observations.
- Create or suggest study items.
- Use connector-neutral data.

Modules must not:

- Depend on a specific connector implementation.
- Store isolated learner knowledge.
- Own global study scheduling.
- Treat AI output as unquestioned truth.

### Connectors

Connectors adapt external services into Kotoba.

Examples:

- Spotify
- Apple Podcasts
- RSS
- YouTube
- WaniKani API
- Anki
- Bunpro
- Kindle

Connectors may:

- Authenticate with external services.
- Fetch external data.
- Normalize external data.
- Preserve external identifiers.
- Track sync state.
- Emit connector records with provenance.

Connectors must not:

- Own learner-facing study flows.
- Decide what the learner knows.
- Write arbitrary state into the Learner Model.
- Leak service-specific concepts into modules.

## Generic Media Connector Contract

Spotify is the first implementation of a generic Media connector.

The Media module should work with connector-neutral concepts such as:

- Media source
- Media collection
- Media item
- Playback state
- Playback position
- Listening event
- External reference

Spotify-specific concepts such as Spotify playlist IDs, episode IDs, auth tokens, market restrictions, and API paging belong inside the Spotify connector.

## Learner Data Flow

The preferred data flow is:

```text
Connector syncs external data
        ↓
Connector emits normalized records
        ↓
Module interprets records into learning artifacts
        ↓
Module emits learner events and observations
        ↓
Learner Model derives learner state
        ↓
Study Engine schedules review
        ↓
AI uses Learner Model context for personalization
```

The MVP may use simpler persistence paths when appropriate, but the conceptual ownership boundaries should remain intact.

## Vocabulary Capture Flow

1. User enters a Japanese word or phrase by typing or dictation.
2. Vocabulary Capture requests AI analysis.
3. AI returns suggested structured fields:
   - Dictionary form
   - Kana
   - English meaning
   - Natural translation
   - Brief grammar explanation
   - Example sentence
   - JLPT estimate
   - Tags
4. If active media context is available, Media provides connector-neutral source context.
5. User edits or confirms the generated fields.
6. Vocabulary Capture saves the vocabulary item.
7. A learner event or observation is recorded.
8. Learner Model updates derived vocabulary knowledge.
9. Study creates a vocabulary review item.

## Media Flow

1. User connects Spotify.
2. Spotify connector authenticates and syncs playback or listening data.
3. Spotify data is normalized into generic media records.
4. Media module displays current podcast, episode, position, listening statistics, streaks, and goals.
5. When vocabulary is captured during active playback, Media provides source context:
   - Podcast
   - Episode
   - Timestamp
   - Capture date
6. Vocabulary Capture attaches that context automatically.

## Provenance And Confidence

Kotoba should retain provenance and confidence where appropriate.

Examples:

- A vocabulary item's kana may come from AI analysis.
- A capture timestamp may come from Spotify playback state.
- A JLPT estimate may come from AI classification.
- A known-word confidence score may come from study history.

Provenance helps with debugging, user trust, correction, and future automation.

## Performance Principles

Kotoba is mobile-first.

Guidelines:

- Common workflows should complete in under ten seconds.
- Capture flows should avoid unnecessary screens.
- Long-running work should be asynchronous.
- Dashboards should favor precomputed summaries.
- Connector sync failures should degrade gracefully.
- The app should remain useful when external services are temporarily unavailable.

## MVP Non-Goals

The MVP does not include:

- Third-party installable modules.
- Native mobile apps.
- Full offline sync.
- Reading Companion.
- WaniKani Companion.
- AI Conversation.
- Writing Coach.
- Complex grammar knowledge graph.
- AI memory as durable source of truth.
- Multi-connector media support beyond the generic abstraction and Spotify implementation.

