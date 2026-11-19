# TowerFlow — Two-Mode Contribute Pilot

## What is implemented

Within the **existing** authenticated TowerFlow `Contribute` desk, a new two-card entry offers:

**1. Develop in VS Code** — choose UI, Dashboard, Markets, Watchlist, Portfolio, Holdings, Trading, Analytics, Charts, Settings, Backend or Collaboration Room. Each category is mapped to a reviewed source path and a source anchor in `source-navigation.cjs`. When the contributor runs and pairs the optional local companion (from PR #25), a tab opens the real checkout in VS Code at the dynamically resolved source line. Without the companion, a GitHub browser-editor link is offered; it does not imply a local debugger session.

**2. Integrate into TowerFlow** — users enter a request, examine a changed executable web preview, and may explicitly create a **draft PR** targeting `dev`. The first audited transformation is exactly the dashboard headline. Example: `Change the dashboard headline to TowerFlow Command Center.` The backend validates the request, obtains hash-verified `dev` web assets using the existing preview service, modifies only the recognized heading in `TowerFlow/index.html`, and renders a 15-minute isolated sandbox preview. It never modifies the running host.

After explicit confirmation, the backend attempts to create a new user-scoped feature branch and commit the previewed HTML using the currently authenticated member's existing GitHub token, checks that `dev` has not moved, and opens a draft PR. **This write step requires GitHub authorization; a read-only session cannot push.** It does not merge or deploy.

## Non-features and boundaries

- This is **not a general-purpose autonomous AI code editor**. Unsupported natural language prompts fail with a transparent message. A configurable coding agent is a future milestone, not a claimed capability.
- A successful VS Code process launch does **not** prove a debugger attached or a breakpoint fired.
- The preview runs an isolated HTML/JS app, and its local demo data is not real market data.
- Source location anchors may change with future refactors; unmapped source fails closed rather than guessing.
- The direct PR flow needs live OAuth write-permission, browser, Windows and two-account acceptance; the current CI only checks controlled test fixtures.
- PR #25's companion must be integrated before local VS Code navigation works. PR #26's App Integration Hub is separate and should not be replaced.
- The original room source, graphics, movement, audio, and OAuth code were not edited. Existing Team Contributions controls remain below the two primary options.

## Validation

`node tools/check-contributions.cjs` includes both the new direct-integration tests and the companion protocol tests. GitHub Actions also runs the existing Chrome desk and interactive-preview fixtures, C++ header Debug build and inventory tests. The direct-integration tests cover prompt rejection, HTML escaping, source hash validation, preview bytes, contributor ownership, pinned `dev`, draft PR metadata and duplicate submission within one process.

**No automatic deployment or merge.** Keep this stack in draft until PR #25 is reviewed, CI succeeds, the live host installation is assessed and two separate teammates complete acceptance.

## Source

- `collaboration-room/azure-bridge/source-navigation.cjs`
- `collaboration-room/azure-bridge/direct-integration.cjs`
- `collaboration-room/azure-bridge/direct-integration.test.cjs`
- `collaboration-room/azure-bridge/two-mode-contribute.js`
- `tools/towerflow-companion.cjs` and tests
- Targeted `server.cjs`, `install.cjs`, `companion-client.js`, `loadout.css` updates.
