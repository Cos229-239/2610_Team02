# PROPOSED FEATURE — Rocky Balboa film entrance greeting

**State:** PROPOSED / DISABLED. No licensed recording has been provided or embedded. This is not a voice clone, and no AI-generated attempt to reproduce Sylvester Stallone's vocal identity is part of this implementation.

## Product intent
When the authenticated user enters the Frontier 3D lobby through the existing Enter button, a recognizable **genuine Rocky Balboa film recording**, if explicitly authorized, plays at moderate volume. The room remains interactive and voice chat is unaffected. Playback is personal, not rebroadcast to all connected guests. A visible skip control stops playback; a persistent mute flag supports visitors who do not wish to hear it. If the asset is unavailable, expired or blocked by browser autoplay rules, entrance remains silent.

## Licensing and fidelity acceptance
A film excerpt entails separate consideration of the film/recording copyright, performer/character/likeness/voice rights, and distribution and commercial use. A sound-alike synthetic recording marketed as indistinguishable from the character is **not** a substitute for rights clearance. Secure a genuine excerpt or an authorized original performance before enabling a commercial installation. Keep written proof of asset identity, territory, duration, use, expiry, approved edits, and distributor permission. Do not include unauthorized film clips in GitHub.

For authorized masters only, preserve source PCM losslessly during editing; avoid pitch correction, speed changes, neural timbre transfer, and aggressive equalization that misrepresent the performer. For web distribution export an appropriately encoded, level-normalized rendition while preserving a reference checksum, integrated loudness measurement, true peak, sample rate and format. Validate listening quality in desktop and mobile browsers, with consent and a playable fallback only if it is itself authorized.

## Scene architecture
The hook is inside `integrations/frontier/frontier-lobby.js` alongside the existing Enter handler, guarded by `TF_ROCKY_GREETING_PROPOSAL_V1` markers. It has no network access or assets while disabled. It requires both `enabled` and `rightsVerified`, and restricts audio URLs to same-origin `/room-assets/approved/*.mp3|ogg|wav`. The actual path, transcript, rights record, and volume are configuration fields **intentionally not populated or enabled**. Do not add a generic substitute voice or impersonation fallback.

Before any activation: add a server-side, signed rights manifest with expiry checks and asset checksum validation; then implement a trusted configuration loader. Do not allow visitors to set `rightsVerified` through client state. Restrict publishing the asset to authorized maintainers. Make browser consent explicit and ensure pressing Enter initiates audio playback as user gesture. Add a visible persisted sound-toggle UI and optional captions/transcript. Do not inject or restart the live Node server just for this proposal.

## Acceptance checks
- Disabled by default: no playback, no external fetch and no audio placeholder.
- Without a rights manifest: always silent; do not label synthesized audio as genuine.
- Valid authorized file: only a same-origin approved route can play, with skip, mute, individual playback, accessible text and browser-autoplay handling.
- Preserve camera-relative movement, Dev Room access, AURA UI, multiplayer voice, scene snapshots and room timing.
- Explicitly compare original master to delivered encoding for audible quality and track artifact checksums; do not assert "exact frequencies" without measured evidence.

This proposal does not grant an authorization or certify any rights.
