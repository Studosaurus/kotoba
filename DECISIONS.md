# Kotoba Decisions

This document records architectural and product decisions for Kotoba.

Decisions should be updated when the project intentionally changes direction. Historical decisions should not be silently deleted; they should be superseded by newer entries.

## ADR-001: Use A Modular Monolith For The MVP

Status: Accepted

Decision:

Kotoba will begin as a modular monolith.

Rationale:

- The MVP does not require distributed services.
- A single deployable application reduces operational complexity.
- Strong internal boundaries are sufficient for early modularity.
- Future service extraction remains possible if usage patterns justify it.

Consequences:

- Domain boundaries must be enforced through code organization and review discipline.
- Shared infrastructure is acceptable.
- Cross-domain access should happen through explicit interfaces rather than arbitrary imports or direct data access.

## ADR-002: Maintain Strong Domain Boundaries

Status: Accepted

Decision:

Kotoba will separate core domains such as Identity, Learner Model, Study, Modules, Connectors, AI, and Jobs/Sync.

Rationale:

- The product is expected to grow over many years.
- Future modules should not require broad rewrites.
- Clear ownership prevents the Learner Model and Study Engine from becoming incidental dumping grounds.

Consequences:

- Some simple MVP features may require slightly more structure than a single-feature app.
- Boundaries should remain pragmatic and should not introduce unnecessary indirection.

## ADR-003: Use First-Party Modules Only For The MVP

Status: Accepted

Decision:

The MVP module system will support first-party modules only.

Rationale:

- Third-party module installation is not required to validate the product.
- Dynamic plugin systems add significant complexity.
- First-party modules are enough to prove the architecture.

Consequences:

- Module boundaries are still real, but modules do not need external packaging or runtime installation.
- A future third-party module system can be considered after product-market validation.

## ADR-004: Treat Connectors As External Service Adapters

Status: Accepted

Decision:

Connectors are adapters to external services. They fetch and normalize external data but do not own learning logic.

Rationale:

- External services have different APIs, auth flows, rate limits, and data models.
- Modules should not depend on vendor-specific details.
- Connector replacement or addition should not require module rewrites.

Consequences:

- Connector data must be normalized into internal contracts.
- Connector-specific identifiers and metadata should be retained as provenance but isolated from module logic.

## ADR-005: Prevent Modules From Depending On Specific Connectors

Status: Accepted

Decision:

Modules must depend on connector-neutral contracts, not specific connector implementations.

Rationale:

- The Media module should work with Spotify now and other media sources later.
- Connector leakage would make future integrations harder.

Consequences:

- Spotify is implemented as the first generic Media connector.
- Spotify-specific API concepts belong inside the Spotify connector.
- The Media module consumes generic media records and playback state.

## ADR-006: AI Is A Reasoning Layer, Not Source Of Truth

Status: Accepted

Decision:

AI will be used for reasoning, personalization, explanation, classification, enrichment, and recommendation. AI is never the source of truth.

Rationale:

- AI output may be incorrect or uncertain.
- Learner trust requires editable and auditable data.
- Durable learner state should come from user actions, connector data, structured observations, and review outcomes.

Consequences:

- AI-generated fields should be editable before save when user-facing.
- AI-derived data should retain confidence and provenance where appropriate.
- The Learner Model should not be built from opaque AI memory alone.

## ADR-007: Derive Learner Model From Events And Observations Where Practical

Status: Accepted

Decision:

The Learner Model should be derived from learner events and observations wherever practical, while favoring implementation simplicity over architectural purity during the MVP.

Rationale:

- Events and observations preserve context.
- Derived learner state supports future recalculation and improved personalization.
- Strict event sourcing may slow MVP delivery unnecessarily.

Consequences:

- MVP implementation may use direct records and projections where simpler.
- Important learner-affecting actions should still be represented as structured events or observations.
- The system should avoid arbitrary mutation of learner state from unrelated modules.

## ADR-008: Unified Study Is A Platform Capability

Status: Accepted

Decision:

Study belongs to the platform, not to an individual module.

Rationale:

- Multiple modules will eventually generate reviewable material.
- Learners should have one study experience, not disconnected review queues.
- Study history is central to the Learner Model.

Consequences:

- Modules may contribute study candidates.
- Study owns scheduling and review results.
- MVP study is vocabulary-first but should retain extensible item and prompt types.

## ADR-009: Make MVP Study Vocabulary-First

Status: Accepted

Decision:

The MVP Study Engine will focus on vocabulary review.

Rationale:

- Vocabulary Capture is an MVP module.
- Vocabulary review is a clear, valuable, testable study loop.
- Generalizing study too early would add complexity.

Consequences:

- Future study types should be anticipated but not fully implemented.
- The data model should avoid assuming every future study item is a flashcard.

## ADR-010: Use Spotify As First Generic Media Connector

Status: Accepted

Decision:

Spotify will be the first implementation of a generic Media connector.

Rationale:

- Spotify provides a concrete integration for validating media-assisted vocabulary capture.
- The Media module should represent podcasts, episodes, playback state, and listening history without depending on Spotify directly.

Consequences:

- Media contracts must be connector-neutral.
- Spotify-specific auth, identifiers, API limits, and sync behavior remain inside the Spotify connector.

## ADR-011: Retain Provenance And Confidence Where Appropriate

Status: Accepted

Decision:

AI-generated and connector-derived data should retain provenance and confidence where appropriate.

Rationale:

- Automation requires trust.
- Users need correction paths.
- Future AI and analytics need to distinguish confirmed facts from inferred suggestions.

Consequences:

- Not every field requires complex metadata.
- Fields that affect learner state, study, or user trust should record origin and confidence when practical.

## ADR-012: Target A Responsive Mobile-Optimized PWA

Status: Accepted

Decision:

Kotoba will target a responsive progressive web app optimized for mobile.

Rationale:

- Mobile is the primary learning context.
- A PWA allows faster MVP delivery than native apps.
- Responsive web keeps desktop use available without separate clients.

Consequences:

- Core workflows must be designed mobile-first.
- Interactions should be fast and lightweight.
- Native apps are deferred until justified by usage or platform needs.

## ADR-013: Prioritize Automation Over Feature Count

Status: Accepted

Decision:

Kotoba will prioritize low-friction automation over adding many features.

Rationale:

- The main product value is reducing the effort required to turn real exposure into learning.
- More modules do not matter if capture and review remain cumbersome.

Consequences:

- MVP scope should remain narrow.
- Manual entry should exist as fallback, not as the primary experience.
- Product quality should be judged by workflow speed, accuracy, and correction ergonomics.

