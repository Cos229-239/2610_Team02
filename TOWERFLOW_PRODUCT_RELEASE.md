# Towerflow — product integration record

**Feature branch:** `feature/towerflow-vscode-live-room-sync` → PR #8 → `dev`. **Preservation priority:** do not replace the legacy financial portfolio, room, camera controls, voice, GitHub OAuth, or Development Room. Do not restart Node to stage file changes.

## Original mission, retained

- **Frontier:** Multiplayer collaboration headquarters with AURA and Development Room. Original in-world movement stays camera-relative. The four native IDE station identities and collaborator presence remain part of the room.
- **TowerFlow business application only:** Inventory intelligence for real-world product stock (including obsolete phones/tablets/computers/components), revenue and gross-profit analysis, financial-market portfolio tracking, and “Business & Corp Start Here.”
- **Cinematic entrance:** Clicking Towerflow pauses the projector for **2 seconds**; a massive ceiling aperture opens, four hologram platforms sink, the spacecraft-inspired projector descends toward eye level and casts a volumetric beam. Four physically walk-up/clickable business tabs open the real business application. Models are procedural, not scans or photogrammetrically reconstructed; a theatrical approximation is not evidence of engineering accuracy.
- **Demonstration tiers:** $0, $500, $100,000 with explicit simulated-only checkout and no card collection. **FLOW**, stylized `)=L0\/\/`, is the proposed Towerflow business subject-matter assistant; **AURA** remains the room-world assistant. $500 concept includes three trends over three months and five searches, while $100,000 concept includes more comprehensive analysis, charts and data tools. These are *proposed commercial entitlements*, not verified provider quotas or activated subscriptions.
- **User-requested personas:** Goku, L Lawliet, Ryuk, Bulma and future choices. Exact branded appearance/voice/performances require appropriate asset and voice authorization before commercial reproduction. Do not substitute unrelated characters or call an unlicensed impersonation official.
- **Rocky greeting:** Sound-only replacement for the entrance AI greeting; no video or 3D Rocky model. The desired source is a **genuine Rocky Balboa film excerpt**. The hook exists and remains silent until an authentic authorized recording/manifest is provided. TikTok or other posted videos are not by themselves a recording license.
- **Contributions:** The code author retains their feature work and can submit an identifiable `author : contribution` preview. A maintainer sees the exact preview build/diff and accepts or leaves it pending without silently deleting the submission. GitHub administrator rights remain separate from product permissions. A merge is not deployment.
- **IDE realism:** Native Visual Studio Community and its installed workloads remain native on users' PCs. Remote browser coding and execution must use explicit isolated environments such as supported Codespaces or devcontainers, not the Windows live host. Other languages remain eligible when verified toolchains exist.
- **Realistic 3D objects:** Preserve evidence photos, permissions, model hashes, references, dimensions, materials, mechanical articulation, confidence, PBR/glTF and regression screenshots. Exact reconstruction of unseen surfaces from one image cannot be guaranteed.

## Implemented in the feature branch, source-level

| Component | Implemented | Live connected |
|---|---|---|
| Existing portfolio, theme selection, investments and transactions | Preserved source | Existing user browser data; no externally verified portfolio quote refresh |
| Business inventory, revenue and repricing calculations | `TowerFlow/inventory-core.js` + UI; deterministic demo/manual input | Static-files install pending user host validation |
| FLOW tier demonstrations and grounded analysis | `TowerFlow/flow-core.js`, `flow-ui.js`; no paid activation or false trading advice | Static-files install pending |
| FLOW + AURA hybrid | Explicit confirmation before sending **aggregate-only** report to existing authenticated AURA chat | Requires active AURA endpoint and Ollama; inference is not proof of reality |
| Corporate category-level economics | Deterministic SKU, capital, sales, profit and footprint grouping | Static-files install pending |
| Opt-in external market connector | Alpha Vantage GLOBAL_QUOTE server module, cache and timeout; authenticated handler | **Not connected** until provider key, rights, reviewed backend route and a planned restart |
| Frontier 3D business entrance | Two-second pause, opening iris, sinking platforms, detailed projector, walk-up 3D tabs | Source committed; host staging and visual acceptance pending |
| Shared authoritative world | Reviewed persistent world store, scene sync client, member-checked endpoint | **Not active** until live server receives staged backend and planned restart |
| Native IDE profiles and mediation | .vsconfig, devcontainers and fail-closed operation contract | Full run/debug workspace brokering **not connected** |
| Contribution synopsis and isolated preview foundation | GitHub PR checks and local portfolio preview | Full per-contribution hosted preview + owner-retention portal **not connected** |
| Rocky film entrance audio | Sound-only licensed-manifest hook, skip/mute, no video | **Silent by design**; no recording rights/asset supplied |
| Brand/persona commercial rights | Preserved in project specification | **Not cleared/connected** |

## External evidence and standards

- Provider freshness: Alpha Vantage `GLOBAL_QUOTE` defaults to end-of-trading-day updates, not guaranteed real-time; commercial/realtime rights must be arranged. Official documentation: https://www.alphavantage.co/documentation/
- SEC XBRL company facts: https://www.sec.gov/search-filings/edgar-application-programming-interfaces — an optional future source, but not connected and not directly browser-CORS-accessible.
- Native IDE configs: https://learn.microsoft.com/visualstudio/install/
- Isolated cloud workspaces: https://docs.github.com/en/codespaces/
- Asset format: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

## Verification and release contract

1. PR branch only; no auto-merge or host restart. CI includes Windows and Linux static product checks and source-level world/mediator tests.
2. First test the installed code against **both original room copies**. Reject unreviewed overwrites; where the Git checkout server is stale, leave it unchanged and stage verified room code independently.
3. Run `tools/deploy-towerflow-milestone.ps1 -DryRun`, retaining detailed failure output and backup manifest, then manually `-apply` only on a successful validation. The script uses Git byte streams to avoid Windows BOM corruption.
4. Verify original portfolio data and themes, all business tabs, FLOW answers, full-screen and in-world iframe, camera WASD, Dev Room four stations, voice/WebSocket, AURA, invitation checks and older client reconnects.
5. Explicitly verify visual experience on multiple devices: pause timing, aperture, projector descent, individual 3D tab click and walk-in, accessibility/reduced-motion, animation budgets, renderer performance and light contrast. **CI does not prove visual quality.**
6. Route staging does not activate new server endpoints until a planned restart. When restart is separately approved, make a backup, schedule for collaborators, restart once, verify `/api/health`, `/api/world/state`, OAuth, voice and quote statuses. Roll back if health or authorization fails.
7. Do not mark a live quote, subscription, contribution build preview, exact character voice or photorealistic reconstruction as `VERIFIED` absent actual provider/asset access and observed behavior.

**Commercialization blockers:** business entity and permissions model, live POS/warehouse data connectors, secure and licensed financial feeds, real payment infrastructure, data retention/privacy policies, licensing of film/anime persona assets and voices, code-execution isolation with durable jobs, accessible design QA, and real-world scene performance measurements.

## Earth visual fidelity — isolated review branch (2026-11-10)

- Branch: `feature/earth-visual-fidelity-20261110` (review only; not merged or deployed).
- Changed `integrations/aura/aura-world-emulator.js`: the small **solar-system exhibit Earth** now attempts geographic Earth and cloud textures with a subtle atmospheric limb. If remote images fail, the existing procedural Earth remains. Added source-level assertions in `tools/install-aura-world-emulation.test.mjs`.
- Asset URLs currently point to public Three.js example imagery. **Before production:** verify browser CSP/CORS, image rights/provenance, image availability, and visual performance. Prefer reviewed self-hosted licensed assets rather than runtime third-party dependencies.
- **Scope boundary:** This does **not** repair a separate TowerFlow sales globe, does not implement a full-size Earth viewer, does not alter the Windows live room, and does not restart Node. The locally untracked `TowerFlow/sales-globe.js` and modified working-tree files must be examined on the host before integrating.
- Validation pending: run `node --test tools/install-aura-world-emulation.test.mjs`, verify desktop rendering and cloud alignment, confirm existing camera-relative movement and Development Room are preserved. Do not claim these tests have run or visual quality has been accepted.
