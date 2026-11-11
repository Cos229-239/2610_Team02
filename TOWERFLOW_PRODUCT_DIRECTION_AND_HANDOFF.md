# TOWERFLOW — Product Direction, Technical Contract & Handoff
**Decision record:** 2026-11-10  
**Status:** requirements confirmed; architecture and implementation pending  
**Repository:** `Cos229-239/2610_Team02`  
**Working integration branch:** `feature/towerflow-vscode-live-room-sync` → PR #8 → `dev`  
**Live Windows host:** `%USERPROFILE%\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room`  
**Recovered Git workspace:** `%USERPROFILE%\Desktop\Towerflow_Upgraded` (detached worktree; **do not assume this is an ordinary branch**)  
**Other known checkout:** `%USERPROFILE%\Documents\GitHub\2610_Team02` (last observed on `dev`)  
**Former broken path:** `%USERPROFILE%\Desktop\Team2\TowerFlow` — deleted; must not be hardcoded.

> This document records the user's confirmed direction and a recommended engineering implementation; it is **not a claim that the described features are implemented**. Protect the working live room; no automatic server restarts or destructive workspace operations.

## 1. Product mission and priority order
Towerflow is a multiplayer 3D collaborative workplace with AURA (world/engineering) and FLOW (business) agents, a professional contributor IDE, genuine team voice, and a commercial TowerFlow application entered **only through deliberate in-room interaction**.

Priority A: teammates can contribute room components, app features, code, data connectors, and reusable modules with minimal friction. Priority B: AURA and FLOW execute bounded, tested, inspectable tasks, not unsupported promises. Priority C: reliable headset voice communication. Priority D: reliable, accessible end-to-end workspace and cinematic realism.

## 2. Non-negotiable in-room behavior
- Room loads as a normal collaboration space, **without automatic spacecraft descent, TowerFlow overlay, proximity triggers, popup browser tab, or floating dashboard**.
- Clicking a supported room **wall surface** is the deliberate trigger. Clicking another wall while active rotates/repositions the projector beam and relocates the projection; there is only one active projection instance. Distinguish wall clicks from UI controls, drag gestures, object interaction, and navigation.
- **Before descent, the existing floor-zone objects are functional, design-specific interactive objects**, not disposable decoration. Each object exposes appropriate actions based on what it physically represents (e.g. inspect, open workspace, manipulate display, interact with equipment), consistent hover/focus/keyboard prompts, and per-member permissions. Interacting with these objects must **not** activate the projector; only a deliberate wall click does. Preserve object state and ongoing user work when lowering/retracting objects; during animation disable unsafe collisions/interaction or provide a coherent transition; restore all interaction and exact transforms upon ascent. Multiplayer clients must see identical object interaction state. Audit the actual existing floor objects before assigning behaviors—do not invent a common generic button for every model.
- **Sequence:** (1) click wall; (2) objects in the designated projector zone move fully below floor, clearing actual existing display objects as well as any newer podiums; (3) ceiling-mounted projector descends; (4) **three seconds after descent completes**, projector powers on; (5) a visible forward-facing light beam contacts the selected wall, revealing the fully interactive wall-projected TowerFlow gateway. Wall projection is neither a browser popup nor a floating UI.
- When the projection is active, a player can **click** the portal OR **walk through** it to enter the corresponding separate, multiplayer-aware 3D TowerFlow app instance. Route transitions must not accidentally fire merely because a player bumps into a prop.
- Interacting with the **projector itself** opens projector settings: theme/color scheme and Power Off. Power Off clears the projection/beam, retracts the projector into ceiling, then raises lowered items to exactly their initial transforms. Ensure idempotent controls, mid-transition clicks, disconnects, reconnects, and multiple participants are handled deterministically.
- Design projector as **premium metallic chrome + sky-blue**, realistic physical materials, reflections, well-made geometry, subtle mechanical movement and beam optics (avoid pretending a primitive mesh is photorealistic). AURA's azure orb belongs in the *opposite corner of the room*, not the center or obstructing the projection.
- **Architecture recommendation:** authoritative state machine with states `IDLE → CLEARING → DESCENDING → BOOT_DELAY(3s) → PROJECTING → RETARGETING → SHUTTING_DOWN → RESTORING → IDLE`, explicit wall target and timing, replicated to participants; single owner for animation and wall display. No imperative auto-start upon scene mount. Validate floor Y, collision, input priority and restored poses in live 3D tests.
- Preserve existing camera-relative WASD, membership/auth, Dev Room, voice, and guest sessions. Do not restart live Node automatically during development.

### Acceptance scenario
Two clients enter: nothing projects. User clicks wall A: zone objects lower entirely, then projector descends; after descent finishes, exactly 3 seconds elapse before light illuminates wall A and gateway renders. User clicks wall B: same device smoothly retargets without duplicating applications. User enters via click; another enters by walking through intentionally. User powers off: light and interface disappear, device retracts, objects return. No new browser tab is opened throughout.

## 3. Three distinct commercial tiers
**Tier 1 — $0:** existing default TowerFlow portfolio/inventory/finance dashboard, honest demo-data labels and clearly limited integrations.

**Tier 2 — $500:** same recognizable Tier 1 foundation plus real, commercially useful integrations and operational workflows, with verifiable entitlements, data connection setup, tenant isolation, reliable ingestion and audit. No fictitious checkout/provider or unenforced quotas.

**Tier 3 — $100,000:** a **distinct executive 3D Corporate Command Center** (not Tier 1 recolored) with **gold, vibrant magenta, royal blue** materials, premium spatial information architecture and dedicated enterprise permissions. Industry configuration choices: large multinational operations, finance, or technology/engineering; adapt modules to the buyer rather than claim to support every industry without validation.

**Tier 3 required workflow:** ingest authorized company sales, inventory, product, procurement and shipment inputs; map provenance; create 3D interactive charts, an Excel-compatible table view/export, a PDF viewer and a PowerPoint-style slide/report experience in the command environment. Real XLSX/PDF/PPTX handling needs explicit parsers, storage and permissions; a rendered model alone is insufficient. Provide 2 disclosed mock scenarios: (a) high-margin, high-velocity sellers; (b) stagnant inventory whose holding cost erodes margin. For a stagnant SKU, simulate removing it from sale and swapping in a named improved prototype/model; calculate avoided cost, write-off, logistics, refunds, lost revenue risk, replacement costs, expected new sales, shipment stop/start and remaining shelf allocation. **Preview and authorization before any ERP/order/shipment mutations**; never claim an external system changed without confirmed provider acknowledgment. Produce event-by-event immutable records, receipts/expense evidence and year-end realized vs forecast gain/loss summaries; distinguish accounting valuation from simulation.

**Three swaps/year:** enforce as a **configurable company policy** with a clear counter and override authority, as requested. Do **not** present three swaps as a universal tax-bracket or tax-law restriction without jurisdiction-specific legal/tax validation. Tax classifications and filings belong to the organization's qualified professionals.

**Commercial acceptance:** role-based access, team tenancy and scoped tools, source lineage, audit history, real connector verification, reversible approval workflows, error recovery, load tests, support commitments, and clear service-level guarantees. No $100,000 product launch while these remain unverified.

## 4. Team-owned local IDE onboarding — must work on each contributor's machine
**Non-negotiable flow:** Click `Develop / Open Repo` in Frontier → choose a project/component/file → detect a **consented local companion / IDE protocol handler**. If VS Code, Visual Studio or supported IDE is installed, open the exact file/folder on that contributor's **own computer**, not the host's desktop. If IDE absent, guide the contributor to official download, install and login, then resume setup. For a missing checkout, show an explicit OS folder picker: **the contributor decides where to store the repository**; never silently force `Desktop\Team2` or a shared host location. Clone the correct repo/branch into that chosen destination (after permission checks); open IDE once cloned. Existing local checkout is user-selected or validated, not overwritten. Preserve the directory choice per *user/device*, allow relocation and reconnection.

**Browser security constraint:** a normal webpage cannot inspect arbitrary local files, install programs, run `git`, or open a local IDE reliably without user permission and an installed native companion or supported protocol/extension. Do not fake these capabilities; provide a safe browser-based `github.dev`/Codespaces fallback when the companion isn't installed. Native companion must use signed/versioned installers, loopback/OS protocol restrictions, user consent per sensitive operation, verified origin, allowlisted repository targets and file-system sandboxing, and no exposed arbitrary shell API.

**Development Room:** source explorer, actual editor/language services, search, build/test/debug, Git branch and PR UI, terminal only with properly scoped native authorization, AI coding and rollback, permission-aware environment variables, end-to-end route from in-room feature to repo path. Answer clearly for every component: “where does code go; what changes; how is it tested; how is it previewed; who can integrate it; how is it reverted?” Source Browser/Git panel must not reference the deleted `C:\Users\dulsk\Desktop\Team2\TowerFlow` path.

## 5. Collaborative contributions and whiteboard reference case
- One contributor-owned branch per feature, immutable attribution and PR evidence; add-on packages/components with manifests describing module ID, owner, target (room/app/agent), interface schema, dependencies, capabilities, migrations, tests and rollback.
- Integration pipeline: local feature workspace → AI-assisted change plan → static analysis and security checks → automated tests → isolated 3D/app preview, including multi-user tests → protected `dev` integration → deliberate production release. **No personal approval by the product owner for ordinary safe merges**; configured team maintainers/release roles and CI handle them. Never grant model unrestricted production deploys, secrets, arbitrary deletes or silent server restarts. Governance should be role-based, not a bottleneck.
- Whiteboard acceptance: request “add a collaborative whiteboard” produces code in a defined room module, synchronized server-authoritative board state, persistent notes, account-stable unique contributor colors, presence/edit history and accessible interaction; test two browsers + reconnection + collision + unauthorized edits; submit a traceable PR and preview with rollback.
- Existing static PR preview does **not** validate true 3D/server/multiplayer behavior. Use isolated sandboxed runtime and authenticated test identities for fuller previews. Do not execute untrusted teammate code on production Windows host.

## 6. Agent contracts — AURA and FLOW
AURA = world orchestration, collaboration and engineering tasks; FLOW = business operational intelligence with appropriate scoped tools. Both must expose a task lifecycle: `REQUEST → INTENT/PLAN → DISCOVERY → PERMISSION CHECK → TOOL EXECUTION → VALIDATION → EVIDENCE → COMMIT/PREVIEW/REPORT` or explicit failure+rollback. Store task IDs, tool calls, diffs, input/output schema, sources, timestamps, artifacts, errors and test results.

**Autonomy policy (user-confirmed):** agents can create branches, edit their own isolated workspaces, run allowlisted tests, propose and commit changes, and integrate automatically **when required tests, permissions and configured branch protections pass**. Do not require the owner to approve each task. Higher-risk actions (production host changes, destructive operations, financial shipments, money movement, secret changes, external transactions) remain separately gated by organization roles and approval policy. No silent task success: artifact and verification evidence must be inspectable.

Use bounded plan-execute-verify-repair loops, deterministic schemas/tool contracts, capability/permission maps, time/cost limits, retry caps, fail-closed behavior, regression tests, task memory with proven provenance, independent postcondition checkers and measured model performance. Don't infer reliability from model fluency. For every task specify expected outcome and verify the actual resulting app/service behavior.

**Current reality as of 2026-11-10:** FLOW exposes only bounded `inventory.review` and `market.research` tools; `/api/agents/plan` proposes a skill that still requires an explicit execution click. AURA is currently primarily an Ollama chat integration, **not yet** a verified autonomous coder. Forty local fixture tasks and CI passing do **not** establish real-world coding competence, provider correctness or multiplayer functionality. This is a gap to close, not a shipped feature.

## 7. Headset voice and entrance greeting
Recommend **persistent team voice** with PTT, mute, deafen, per-user gain, clear microphone/headphone device selection, speaking indicators, optional spatial attenuation and private/team channels. Use browser WebRTC with correctly configured STUN/TURN as required, authenticated signaling, consent, transport privacy, reconnect behavior and tested latency, packet loss, echo cancellation and cross-PC/browser audio. Measure at least 2–3 real clients, not just local microphone availability.

For greeting, choose an **original, premium, uplifting, professionally voiced short recording** (licensed for commercial deployment), **audio only**, not an imitation of Rocky Balboa or another recognizable performer without permission. No video, blocked autoplay, robotic fallback impersonation or unlicensed voice. Provide skip/mute and user-gesture playback.

## 8. What's actually been completed / recovered
- Feature branch source recovered in isolated `Desktop\Towerflow_Upgraded` worktree after accidental deletion of `Desktop\Team2`.
- User terminal reported successful installer run at GitHub SHA `fdd8e3a4555e718477354fb5a5cac098f97fda55`, with source backups at `Desktop\Towerflow_Setup_Backups\20261110-174445`, followed by controlled Node restart; local `/api/health` returned HTTP 200 and unauthenticated agent/contribution endpoints returned 401. These verify staging/server and auth gating, **not agent execution or scene visual quality**.
- Changes in Git include Frontier projector/orb prototype, Tier 1/Tier 2/Tier 3 pricing preview, FLOW bounded tools, contribution cards/PR metadata, preview scripts and tests. The **user tested the experience and found major unacceptable mismatches:** auto projector descent, TowerFlow intruding into room, accidental proximity interaction, wrong wall projection, mediocre enterprise tier, local repo path errors, unsatisfactory voice/greeting and incomplete IDE/team integration. **Do not describe these as fixed.**
- Installer repair commits up to `fdd8e3a4` handle absent secondary room copy while preserving authoritative live room and divergent workspaces; GitHub CI gates passed for this SHA. This does not fix runtime design.
- Installed source and active UI may diverge in browser cache or host configuration; actual wall/projector/voice must be observed and tested with human participants.

## 9. Handoff execution sequence
1. **Preserve and inventory:** read-only locate current live source, scripts, source paths, repo link, current active process, backups; preserve auth/voice/WASD; collect reproducible visual/runtime logs. Never rewrite `.env`, discard contributor edits, or auto-restart.
2. **Fix broken IDE link:** eliminate hardcoded deleted path; introduce per-user/device repository resolution and onboarding spec; validate a second team member chooses an arbitrary local folder, opens a file in local IDE, and returns to room. Use native bridge only with install/consent/security design.
3. **Unify contribution model:** manifests and target registries; permissions, GitHub PR ownership, CI preview sandbox, branch protection, promotion/rollback; whiteboard as first real multi-user integration test.
4. **Harden agent workflows:** build tool contracts; constrain code-writing to isolated branches; measure postconditions and adversarial cases, then enable CI-gated autonomy for team-approved low-risk scopes; no fake blanket “subject matter expert” guarantees.
5. **Voice:** reproduce and repair end-to-end WebRTC with headsets and a remote peer; keep existing sessions available until staged release.
6. **Projector state-machine rewrite:** wall-only click, three-second-after-descent activation, retargeting, no popups, power-off restore, actual legacy floor objects, metallic chrome model, azure orb relocation, synchronized participants; visual acceptance on the real host.
7. **Tier boundaries:** keep Tier 1 recognizable; implement verified Tier 2 commercial services; design/build a distinct Tier 3 executive environment with datasets, spreadsheet/PDF/presentation viewers, audited product swap simulation and per-org swap policy. Don't imply financial/accounting compliance until validated.
8. **Release:** test in isolated copies first; run E2E browser/3D/multi-client acceptance; back up live and schedule a controlled server restart with collaborators; verify authenticated endpoints, original room controls and tier entitlements; preserve a rollback release.

## 10. Open engineering decisions (do not invent)
- Exact set of walls that are raycastable, and how click priority distinguishes ordinary scene interactions.
- Concrete licensed 3D model/asset pipeline and performance budget on host/clients.
- Native IDE companion distribution, authentication model and supported operating systems/IDEs.
- Real collaborative data persistence/retention and tenancy; deployment target beyond single Windows host.
- Approved voice provider/STUN/TURN, connectivity test matrix and moderation controls.
- Enterprise integrations, ERP/provider authorization and contract terms; precise financial accounting/legal treatment of swaps per jurisdiction.
- Release team roles and rollback/incident ownership.

## 11. No-claim list
Do not call a staged prototype enterprise-ready, say AI writes/verifies code end to end, claim real payment/market/ERP connections without credentials and live tests, assert an authorized celebrity voice asset exists, or promise the projector works to spec until in-room tests pass. GitHub commit does not auto-deploy to the user's PC.

---
**Next engineering handoff:** use this document and `CONTRIBUTING.md` / `integrations/agents/AGENT_CAPABILITIES.md`, inspect current code and the *surviving live room*, then implement isolated, testable fixes without rewriting unrelated modules.
