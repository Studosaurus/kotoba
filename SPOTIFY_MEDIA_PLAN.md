# Kotoba Spotify And Media Plan

This plan captures the current Spotify connector work and the next media-assisted learning steps.

The immediate product goal is to validate this loop:

```text
Listening to Japanese audio
-> pause
-> capture a phrase by voice or text
-> receive translation and learning details
-> save locally with media source context
-> review through study cards
```

Spotify and media work should continue to support that loop without turning Kotoba into a full podcast player.

## Current Implementation

The app currently includes:

- Spotify connector manifest marked available.
- Spotify OAuth routes:
  - `/api/connectors/spotify/login`
  - `/api/connectors/spotify/callback`
  - `/api/connectors/spotify/disconnect`
- Generic media endpoint:
  - `/api/media/current-playback`
- Server-side Spotify token storage in secure cookies.
- Token refresh support.
- Current playback lookup through Spotify Web API.
- Normalization from Spotify playback into Kotoba's generic `PlaybackState`.
- `/connectors` UI for connecting, disconnecting, and checking current playback.
- Vocabulary Capture source-context attachment from generic playback data.

Vocabulary Capture does not depend on Spotify directly. It consumes generic media playback context only.

## Required External Setup

Vercel environment variables:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Spotify Developer Dashboard redirect URI:

```text
https://kotoba-gules.vercel.app/api/connectors/spotify/callback
```

Local development redirect URI, if needed later:

```text
http://localhost:3000/api/connectors/spotify/callback
```

## Near-Term Product Goals

### 1. Verify OAuth In Production

Confirm that:

- Connect redirects to Spotify.
- Callback returns to Kotoba.
- Tokens are saved in secure cookies.
- `/connectors` shows connected state.
- Current playback appears when Spotify is actively playing or paused.
- Disconnect clears the connection.

### 2. Improve Current Playback Context

Add clearer states:

- Not connected
- Connected, nothing playing
- Connected, currently playing
- Connected, paused
- Spotify API unavailable
- Token expired and refresh failed

The UI should make these states understandable without exposing API details.

### 3. Capture Source Context Reliably

When the learner captures vocabulary while Spotify has active playback context, attach:

- Media source: Spotify
- Show or artist
- Episode or track title
- Playback timestamp
- Capture date
- External Spotify URL when available

The saved vocabulary item should expose this source context in its details.

## Audio Clip Study

Audio snippets are a strong next candidate after current playback is verified.

The goal is not to redistribute podcast audio. The goal is to help the learner review short clips they personally captured while studying.

### Desired Flow

```text
User pauses after hearing a phrase
-> taps capture
-> app records a short local voice/audio clip or marks a Spotify timestamp
-> phrase is analyzed
-> vocabulary item is saved with source context
-> study card can later play the captured audio cue
```

### MVP Clip Options

Option A: Local microphone clip

- Record the learner repeating the phrase.
- Store the clip locally in browser storage during the prototype phase.
- Use the clip as the prompt for listening or production study cards.
- Lowest legal and API complexity.
- Best immediate experiment.

Option B: Spotify timestamp bookmark

- Store podcast episode and timestamp.
- Open Spotify at or near the source later.
- Avoid storing Spotify audio.
- Depends on Spotify playback behavior and deep-link support.

Option C: External audio extraction

- Attempt to capture actual podcast audio.
- Do not pursue for MVP.
- Raises platform, copyright, browser, and reliability concerns.

Recommended MVP: Option A plus Option B metadata.

## Audio Study Card Types

Future study cards could include:

- Audio to meaning: play clip, learner provides English meaning.
- Audio to Japanese: play clip, learner types or speaks Japanese phrase.
- Japanese to audio shadowing: show phrase, learner records pronunciation.
- Source recall: show saved phrase and source context, optionally reopen the media item.

These should be added as Study card types, not as Spotify-specific behavior.

## Architecture Notes

- Spotify remains a connector.
- Media remains connector-neutral.
- Vocabulary Capture consumes current media context but does not own connector auth.
- Study owns review scheduling and mastery.
- Audio clips should be represented as study assets or media references, not as arbitrary fields on unrelated components.
- Local-only prototype storage is acceptable until the flow is validated.

## Deferred Backend Work

When backend work resumes, persist:

- Connector accounts and encrypted refresh tokens.
- Media sources and media items.
- Playback observations.
- Vocabulary source context.
- Audio clip metadata.
- Study cards derived from audio assets.
- Review attempts and mastery updates.

Do not store third-party audio without confirming product, legal, and platform constraints.

## Open Questions

- Should audio cards use learner-recorded clips, source timestamps, or both?
- Should captured clips be retained indefinitely or expire unless saved?
- How much audio is useful for study: 3 seconds, 5 seconds, or phrase-length dynamic clips?
- Should answer grading for audio cards be deterministic, AI-assisted, or user-confirmed?
- Should Spotify be required for Media MVP, or should local audio clips work independently?
