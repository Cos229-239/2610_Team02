# Towerflow Frontier — first real integration slice

**Source preservation:** The complete 636-line original user-approved Towerflow directive is retained once in the companion generated artifact `Towerflow_Frontier_Production_Directive.md` (SHA-256 UTF-8 original core: `5dc0da54d4088282fc58e329e6c199f315f93d8899380b54d6514c190f40bb55`). That artifact is delivered in the conversation, not assumed present in this GitHub checkout. The old uploaded `GOLDEN_PROMPT.md` is not validated: it duplicates sections and its self-declared grade is not evidence. Do not treat its header as an acceptance gate.

## Objective and scope
Build a functioning end-to-end Towerflow **engineering workflow** before chasing scene spectacle: enter room → interact with projector → enter Dev Room → open a real authorized IDE/workspace → tell AURA to investigate code → authorize isolated patch → run tests → view a preview → inspect Code/Pattern/Preservation verdict → submit PR. Preserve AURA, FLOW, portfolio, four IDE labels, audio, camera-relative WASD/IJKL, shared chat and all existing live state. No remote host or public URL will receive new permissions through this PR.

## What's implemented in this branch
- `frontier-execution-evidence.cjs`: three independent fail-closed gates; a check is PASS, FAIL or UNKNOWN. PASS/FAIL require an evidence reference. Unknown never counts as success. A promotion summary uses the Wilson 95% lower bound and sample threshold; it is not a proof of project success.
- `frontier-workflow-adapter.cjs`: dependency-injected bridge into the **existing** `task-orchestrator.cjs` for `repo.feature.integrate`. Insists on SPECS/DESIGN/PRESERVATION/API, task-bound revision, sandbox isolation, evidence verification, and explicit human-publishing authorization.
- Tests use controlled fake adapters to exercise the actual orchestrator lifecycle, rejecting unverified, unauthorized, revision-mismatched or nonisolated work. **No real model, code runner or browser is exercised by these tests.**
- CI executes the targeted suite on Linux and Windows, with ordinary Node.js tooling and no credentials.

## Integration blockers (real, not hypothetical)
1. **Authoritative live code:** The Windows `server.js` and `public/room.js` version running via Tailscale Funnel is not a tracked production snapshot in this branch. Inspect real server/room files before introducing routes or scene mutations. GitHub commits are not live deployment.
2. **Authenticated job backend:** Add a trusted server adapter and an isolated per-user runner / Codespace with explicit quotas and cancellation; never route raw command execution through the public room.
3. **Trusted outcomes:** Replace test stubs with independent browser/CI result collector that checks actual artifacts and content hashes. The gate's `evidence` strings are syntactically checked but not cryptographically authenticated.
4. **Persistent collaboration:** Session persistence/reconnect, code sync (e.g., Yjs), durable task/event store, and presence need host and multi-user tests.
5. **Graphics / audio:** PBR, WebGPU/WebGL fallback, texture provenance, spatial sound, voice/chat reliability, sales globe and per-user/room configuration require actual browser/media-device observations and defined performance budgets.

## Execution contracts
- **SPECS:** pinned objectives, postconditions and mandatory invariants.
- **DESIGN:** actual user-visible scene, IDE, chat and sound outcomes; not a screenshot-only mock.
- **PRESERVATION:** all existing features; pass on explicit regressions only.
- **API:** trusted task mediation and independent checks, never a second instruction core.
- **CODE:** trace exact intent and applicable scientific mechanism.
- **PATTERN:** observe resulting behavior.
- **PRESERVATION:** observe all required previous behaviors after the change.
- Release only if every gate passed with **authenticated source evidence**, independent held-out trials meet predefined reliability targets, and a maintainer approves deployment. No claim of 80% likelihood without samples.

## Run
`node --test integrations/agents/frontier-execution-evidence.test.cjs integrations/agents/frontier-workflow-adapter.test.cjs`

## Research used
- Anthropic agent eval design: https://www.anthropic.com/research/demystifying-evals-for-ai-agents
- Playwright screen comparisons: https://playwright.dev/docs/test-snapshots
- Yjs ephemeral awareness and document persistence: https://docs.yjs.dev/getting-started/adding-awareness
- GitHub Actions security guide: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

**Status convention:** COMMITTED means repository bytes exist. TESTED means tests executed and results inspected. LIVE VERIFIED means the real room user workflow was observed. These must never be conflated.
