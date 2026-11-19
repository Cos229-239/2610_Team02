# TowerFlow — Free-First Local AI Planning Adapter

## Purpose

Extend the existing two-option **Contribute** desk with an optional, real, source-aware AI analysis capability. This is the low-risk first step toward general prompt-to-code editing. It uses the contributor's **own local Gemini CLI** rather than a centrally shared API key, paid service, or unrestricted room-host agent.

**Important:** This milestone is **read-only AI planning**, not autonomous code modification. The earlier controlled dashboard-headline change still provides the small tested prompt-to-preview-to-draft-PR vertical slice. For other prompts, AI analysis generates a concrete change plan but does not modify files or publish anything.

## How it works

1. Member enters room and signs in as their own GitHub identity.
2. Member runs the optional local companion from their own Team 02 checkout, pairs it in **Contribute**, and prepares the **integration** workspace.
3. Member selects **2 · Integrate into TowerFlow**, writes a request and selects a relevant source area.
4. Clicking **Analyze with my local AI** checks `GET http://127.0.0.1:4179/ai-capabilities`, then invokes the local companion's authenticated `POST /ai-plan` for that exact account and `integration` workspace.
5. The local companion verifies its original HTTPS room origin and private bearer token, verifies repo origin/branch status, resolves the audited source file and anchor, and invokes Gemini CLI's documented **`--approval-mode plan`** with **`--output-format json`** and `-p`, via Node `execFile` (no shell interpolation).
6. The user receives the actual planning response with source path, line, and conspicuous **PLANNED ONLY** status.

Gemini CLI must be installed on that contributor computer with `npm install -g @google/gemini-cli` and logged in using that contributor's own supported authentication. This branch **does not install the model or authorize GitHub on the user's behalf**. The local companion accepts the installed CLI at the conventional npm location, or an explicit local `TF_GEMINI_CLI_PATH` pointing to its absolute `dist/index.js`.

## Boundaries

- Provider: Gemini CLI, on the member's own PC; no credentials transmitted through TowerFlow.
- Mode: explicitly `plan`; never `auto_edit` or `yolo`.
- Request: 8–1200 characters; only one running job; bounded 90-second model execution and 256 KiB raw output.
- Source registry: 12 audited areas. File paths and shell commands are never accepted from the browser.
- Output: max 14,000 characters, codeModified=false, testsExecuted=false, previewGenerated=false.
- Workspace: contributor-specific `work/<login>/integration` checkout, with validated remote and branch. The room host's files are not exposed to the agent.
- No commits, pushes, GitHub PR creation, merge or deployment occurs from AI planning.
- This is not proof Gemini is behaving correctly or improving the app; those claims require physical Windows and independent model tests.
- **Security warning:** Gemini may inspect local source and may send prompt/source context to its provider, depending on account settings. Contributors should not put secrets or personal data into prompts or the workspace. Do not use an unrestricted local AI shell or merge/deploy based only on its plan.
- Existing room graphics, audio, controls, OAuth and Team Contributions are untouched.

## Evidence required before enabling AI source edits

Validate a representative task suite across UI/Markets/Portfolio, including malicious source comments, fabricated completion claims, cross-account calls, dirty Git workspaces, model unavailability, source refactors and browser timeout. Review actual AI output against source and tests.

Only after demonstrating >=80% reliability **and zero critical security/preservation failures** should a narrowly permissioned execution adapter be added. Future editing should use an isolated worktree, read-only diff review, schema-validated patch scope, independent automated tests, and an explicit human-controlled draft PR.

## Repository paths

- `tools/towerflow-ai-planner.cjs` — constrained provider adapter.
- `tools/towerflow-ai-planner.test.cjs` — mocked provider and security tests.
- `tools/towerflow-companion.cjs` — local authenticated AI capabilities and plan endpoints.
- `collaboration-room/azure-bridge/companion-client.js` — paired-browser API access.
- `collaboration-room/azure-bridge/two-mode-contribute.js` — source picker and plan output inside Option 2.

Review the existing `docs/TOWERFLOW_TWO_MODE_CONTRIBUTE.md` before integrating stacked PRs. PR #25 supplies the companion baseline. PR #27 adds the two-mode interface, and this work builds on it.
