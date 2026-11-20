# TowerFlow — Azure Workspace Execution Contract

This repository's `dev` branch is the shared integration target. You are working inside one member's **own authorized checkout**. This file is an instruction contract, not a permission grant, model installation, remote command endpoint, or evidence that a task was executed.

## Primary pipeline

**Preserve → Decode → Source-Prove → Plan → Authorize → Execute → Verify → Review.**

1. **Preserve** the user's verbatim objective, task scope, required behaviors, exclusions, and source files. Do not replace requested functionality with mock widgets, generic links or unverified placeholders. Create a scoped plan and distinguish source-derived facts from assumptions.
2. **Decode** requests into {objective, sourceArea, existingFiles, dependencies, tests, risk, expectedArtifact, reviewBranch}. If a named component cannot be resolved, inspect the real repository, do not invent a path.
3. **Source-Prove** with actual Git data: git branch/HEAD, file exists and is relevant, anchored target line, and baseline. Reference `collaboration-room/azure-bridge/source-navigation.cjs` for web-app components. Personal-branch projects such as William's WinForms/C++ are **not on dev in the same paths**, and must be inspected on that member's branch before proposing a patch.
4. **Plan** the smallest reversible change that keeps original TowerFlow behavior intact. Determine whether the request can use a registered deterministic action, a tested local code transformation, or needs a person-authorized coding agent in the chosen IDE. Never claim generic natural-language code modification if the tool cannot do it.
5. **Authorize** GitHub and execution capabilities per member. Logged-in access to the collaboration room does not authenticate this editor/model. No shared tokens, no secrets in prompts, no arbitrary shell in the hosted room, no direct writes to the host production checkout.
6. **Execute** only on the contributor's own branch/worktree after user approval. Prefer a preview/diff, no `git reset --hard`, force-push, sweeping replacement of `public/room.js`, or silent merge to `dev`.
7. **Verify** against measured baseline: JS syntax, repository tests, UI interactions, and actual debugger attachment where needed. A launched executable does **not** prove that F5 hit a breakpoint. Report exact PASS/FAIL and unresolved issues.
8. **Review** using a contributor-authored draft PR targeting `dev`; require human review before merge and **separate** host/publication deployment.

## Actual code map

- Web dashboard markup: `TowerFlow/index.html`
- Dashboard and portfolio browser logic: `TowerFlow/app.js`
- Web UI styles: `TowerFlow/styles.css`
- Web backend: `TowerFlow/server.js`
- Authenticated 3D collaboration scene: `collaboration-room/live-room/public/room.js`
- Collaboration host authentication: `collaboration-room/live-room/server.js`
- Azure command surface: `collaboration-room/azure-bridge/azure-workspace-harness.js`
- Azure read-only source proof and plan: `collaboration-room/azure-bridge/azure-workspace-harness.cjs`
- Safe deterministic preview engine: `collaboration-room/azure-bridge/direct-integration.cjs`
- Per-member station sources and pushed commits: `collaboration-room/azure-bridge/team-stations.cjs`
- IDE selection: `collaboration-room/azure-bridge/ide-workstations.js`; local desktop companion is separate and must be paired by each member.
- **Lopobunnie / WilliamPersonal**: `TowerFlowWindow/TowerFlowWinForm/Form1.cs` and `TowerFlow.cpp`; these were inspected on the personal branch, not `dev`. F5/Ctrl+F5 comments are guidance, not breakpoint evidence.

## Model and code-use boundaries

The **Azure** identity is a TowerFlow controller that routes tasks, proves source access, prepares reviewed prompts and offers a bounded local model when available. Architecture is informed by inspected `Dulskinator96/AscendenceAgent007` sources, **not** a code import:
- Megan 3.0 `megan3_brain.py`: local Ollama classification, narrow read tools, typed previews and approval.
- Laura `laura_oracle.py`, `laura_runtime.py`: immutable original intent, explicit unknowns, scope rubric, governed tool actions and evidence.
- Pixi `pixi_integration.py`: mediation, capability checks, source preservation and failure receipts.

Never claim the private Megan/Laura/Pixi runtimes are hosted, attached, trained or callable from TowerFlow unless connectivity has been measured. Do not copy their credentials, models, databases, or private source into Team 02.

## Editor routes

- **VS Code:** open the exact checked-out source at verified line; use the checked-in `.vscode/launch.json` F5 profiles on isolated development port 4174.
- **Visual Studio Community:** use native WinForms/C++ projects and verify debugger workloads and launch target on the member's PC. Do not claim it can debug browser JavaScript without a supported configuration.
- **Cursor:** open the personally authorized repo folder and source line; agent prompting is a separate authenticated capability, not inherent in an editor launch.
- **Antigravity:** open the member's workspace; use workspace-aware coding context with edit/shell permissions requiring review; **no Gemini CLI required** by TowerFlow.
- External ChatGPT, Grok, Gemini, Venice web chats do not inherit GitHub or TowerFlow cookies. Prove read, write, PR, and runtime connectivity separately.

## Acceptance contract

A task may be reported as **COMPLETE** only when the requested code/artifact exists in the reviewed branch, relevant tests pass, user intent is preserved, and the actual deliverable can be opened. Otherwise report **PARTIAL** or **BLOCKED**, listing the verified source and missing capability. No imaginary model results or 80% success claims without recorded tests.

For work in the actual customized host room, preserve existing SHA and local modifications; unknown hashes require manual compatibility review. Do not run a generic release updater that overwrites customized code.
