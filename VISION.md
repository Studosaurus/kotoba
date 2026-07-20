# Kotoba Vision

## Purpose

Kotoba is a modular AI-powered Japanese learning platform designed to connect a learner's existing resources into one cohesive long-term learning experience.

Kotoba is not intended to replace tools such as WaniKani, podcasts, books, YouTube, Anki, Bunpro, Kindle, tutors, or conversation partners. Instead, it helps the learner capture value from those resources, understand what they are learning, and turn real exposure into durable progress.

The platform should grow with the learner over many years. A beginner should be able to use Kotoba for simple vocabulary capture and study. An advanced learner should eventually be able to use it as a personalized companion for listening, reading, conversation, writing, and review.

## Product Thesis

Japanese learners often use many disconnected resources. Each resource may be useful on its own, but the learner's knowledge, history, weaknesses, and context remain fragmented.

Kotoba's core thesis is:

> Learning becomes more effective when real-world exposure, captured vocabulary, study history, and AI personalization all contribute to one shared Learner Model.

The Learner Model is the center of the product. Modules contribute learning signals into it. AI uses it to personalize explanations, recommendations, conversations, and study sessions. Study uses it to decide what needs review. The dashboard uses it to show progress.

No module should maintain an isolated understanding of the learner.

## Product Principles

### Reduce Friction

Kotoba's primary product goal is reducing friction.

The app should minimize typing, manual data entry, repeated decisions, and context switching. A learner should be able to capture a word, confirm its meaning, and continue listening or reading within seconds.

Automation is more valuable than feature volume.

### Automation First

Kotoba should assume everything possible and ask the user only when necessary.

When confidence is sufficiently high, fields should be populated automatically. When confidence is low, the user should be asked for the smallest possible correction.

Automation must remain auditable. Connector-derived and AI-generated data should retain provenance and confidence where appropriate.

### Mobile First

Kotoba should feel fast, lightweight, and natural on a phone.

The target platform for the MVP is a responsive progressive web app optimized for mobile. Most common interactions should complete in under ten seconds.

### Modular

Kotoba is composed of first-party learning modules and external service connectors.

Modules provide learner-facing capabilities such as vocabulary capture or media learning. Connectors adapt external services such as Spotify, WaniKani, Anki, or Kindle into Kotoba's internal contracts.

Modules should be loosely coupled. Adding future modules should require minimal modification to existing code.

### AI First, Not AI As Truth

AI is a reasoning and personalization layer. It should help explain, enrich, recommend, classify, summarize, and generate practice.

AI is never the source of truth. Durable learner state should come from user actions, connector data, structured observations, review results, and confirmed edits. AI output should be stored with appropriate confidence and provenance when it influences learner-facing data.

### Unified Study

Study is a platform capability, not a module.

Every module may contribute reviewable material into one unified study experience. The MVP study experience is vocabulary-first, but the foundation should remain extensible to future item types such as listening comprehension, grammar, reading, writing, and conversation practice.

## MVP Scope

The MVP intentionally remains small. It exists to prove the core platform loop:

1. The learner captures vocabulary from real exposure.
2. AI reduces the effort required to understand and save it.
3. Media context is captured automatically when available.
4. Saved vocabulary updates the Learner Model.
5. A study item is generated automatically.
6. The dashboard reflects meaningful progress.

### Platform Capabilities

- Authentication
- Dashboard
- Learner Model
- Study Engine
- Module System
- Connector System

### Modules

- Vocabulary Capture
- Media

### Connectors

- Spotify

Spotify is the first implementation of a generic Media connector. The Media module must never depend on Spotify-specific concepts.

## MVP Workflows

### Vocabulary Capture

The core vocabulary capture workflow is:

1. User hears or reads a Japanese word or phrase.
2. User types or dictates it into Kotoba.
3. AI analyzes it and generates:
   - Dictionary form
   - Kana
   - English meaning
   - Natural translation
   - Brief grammar explanation
   - One example sentence
   - JLPT estimate
   - Suggested tags
4. User can edit any field.
5. User saves.
6. The vocabulary item is added to the Learner Model.
7. A study item is automatically generated.

### Media

The Media module tracks:

- Listening history
- Current podcast
- Episode
- Playback position
- Listening statistics
- Streaks
- Listening goals

When vocabulary is captured while Spotify playback is active, Kotoba should automatically populate:

- Podcast
- Episode
- Timestamp
- Capture date

The user should rarely need to enter this information manually.

## Long-Term Direction

Future modules may include:

- WaniKani Companion
- AI Conversation
- Reading Companion
- Vision Companion
- Writing Coach

Future connectors may include:

- Apple Podcasts
- RSS
- YouTube
- WaniKani API
- Anki
- Bunpro
- Kindle

The architecture should support these additions without requiring the MVP to solve every future use case in advance.

