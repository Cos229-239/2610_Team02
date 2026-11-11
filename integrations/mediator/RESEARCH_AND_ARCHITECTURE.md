# Towerflow Configuration Mediator — engineering research and acceptance contract

**Status 2026-11-10:** Source analysis and research complete for a first contract. `configuration-mediator.cjs` is **implemented and testable as a standalone, dependency-injected library**. It is **NOT WIRED to the running Express server**, no code-execution runner has been provisioned, and no guests gain new permissions. GitHub CI validates only contract fixtures, not Windows desktop sessions or the live 3D browser.

## Actual known repository conditions

- Windows live collaboration room is a Node/Three.js multiplayer app served privately from `C:\Users\dulsk\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room`, exposed through Tailscale Funnel. Live `server.js` and `public/room.js` source are **not tracked in the remote branch**, although a local copy exists at `collaboration-room/live-room/`. This prevents safely wiring an arbitrary new handler from GitHub without first reviewing the exact running version and its session/authorization middleware.
- `TowerFlow/index.html`, `TowerFlow/app.js`, `TowerFlow/styles.css` implement the existing *local financial portfolio* application. It is **not yet** a connected warehouse inventory/revenue/stock-movement intelligence platform. Retain existing portfolio functions, color themes and local data.
- The four native IDE launch instructions exist in `tools/open-towerflow-ides.ps1`; opening IDEs there happens on the **host Windows machine**, never on remote guests' machines. `Towerflow-Team02.sln` groups source items; it is not automatically a configured Node debugger. `github.dev` is a browser editor but is **not equivalent to executing or debugging in a provisioned Codespace**.
- The Frontier and scene-emulator patches are in `integrations/frontier` and `integrations/aura`. Reported installer success is not evidence that the user's visual acceptance tests passed; the missing Development Room and other regressions need replay and restoration.
- Existing Ollama Qwen3:8b on loopback supports AURA inference; inference does **not** grant tool access, shell access, IDE control, or guaranteed visual accuracy.
- The supplied user mission demands three preserved tiers ($0, $500, $100000) in a simulated payment front-end, business inventory + revenue + financial market dashboards, contributor-owned previews, and no unauthorized deletion of collaborators' work. The accompanying Bento style sources require accessible states and preservation; the one-HTML prototype constraint describes an independent browser demonstration, **not** the production runtime architecture of a multiplayer/code-execution service.

## Primary-source research (reviewed 2026-11-10)

| Candidate/provider | Official source | Fit and decision | Permissions/licensing & key limits | Connection status |
|---|---|---|---|---|
| Microsoft Visual Studio Installer / Community | https://learn.microsoft.com/visualstudio/install/ | **Keep:** versioned `.vsconfig` profiles + exported workloads, SDKs, components; users can independently choose/migrate configurations. | Installed locally on *each user's* Windows computer. Requires explicit local approval and eligible licenses; never silently modify host. No promise that VS Community can run in a Linux Codespace. | Existing host launcher only; runtime configurations unverified |
| Microsoft/VS Code Dev Containers | https://code.visualstudio.com/docs/devcontainers/containers | **Keep:** declarative per-project runtime stacks for JS/TS, Python, Go, Rust, Java, .NET and C++ where images/toolchains exist. | Requires Docker/compatible container engine and extension locally, or a supported cloud runtime; may install network dependencies only after user approval. | NOT CONNECTED |
| GitHub Codespaces | https://docs.github.com/en/codespaces/developing-in-a-codespace/developing-in-a-codespace | **Prefer for isolated browser test/debug:** editor, terminal, compiler, debugger and preview ports away from Towerflow host; collaborator's own GitHub identity. | Availability, policy, billing, permission and quota need checking per account. Codespaces is not desktop Visual Studio Community. Avoid public forwarded ports by default. | NOT CONNECTED |
| GitHub Branch Protection / rulesets | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches | **Keep:** PR review, required checks, protected dev/main and merge records. Host explicitly approves integration; merge and deployment are separate. | Owner/admin GitHub rights only; author ownership over discard in Towerflow UI cannot override GitHub admins or repository policies. | Existing repo and PR; policies not verified |
| GitHub Actions execution security | https://docs.github.com/en/actions/reference/security/secure-use | **Keep:** GitHub-hosted isolated runners for untrusted PR tests; reject executing stranger code directly on Windows live host or persistent self-hosted runners. | Malicious code/secret and resource consumption threats; do not pass secrets to untrusted PR jobs. | Existing workflow tests; execution mediator runner NOT CONNECTED |
| Khronos glTF / PBR materials | https://www.khronos.org/gltf/pbr and https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html | **Keep:** asset exchange, metal/roughness/normal/occlusion/emissive materials, validation and physically based shading for photorealism. | Subject/reference image rights and model redistribution license must be recorded. A rendered replica cannot recover hidden geometry/materials from one photo; require multiple views, measurements, confidence and artifact provenance. | World emulator is artistic/procedural, NOT a photogrammetry engine |
| User-supplied Bento skill/design sources | uploaded SKILL and DESIGN files | **Adapt:** retain design attribution and markers, dark palette override, keyboard controls, reduced motion and data evidence labels. | Original author typeui.sh, MIT notice; preserve metadata. | Design research only |

## Mediator architecture (proposal; not production-wired)

```text
3D room (untrusted, no secrets)
    │  HTTPS same-origin API + session/csrf binding
    ▼
trusted Node BFF / configuration mediator
    ├── authenticate GitHub session AND authorize specific operation / target
    ├── input schema, exact branch/revision, idempotency, rate & cost quotas
    ├── environment registry (language / IDE / workload / runtime capabilities)
    ├── job scheduler + audit trail + ownership + cancellation
    ├── preview broker: signed, isolated URL to compiled app or scene snapshot
    ├── repository broker: scoped contributor PR / review / merge synopsis
    ├── scene broker: approved versioned glTF asset with provenance
    └── isolated execution backend (Codespace / hosted ephemeral runner)
           │ never mounts production credentials or host live-room directory
           ▼
      tests / logs / debugger / source maps / artifacts / preview
```

**Typed request types already present in mediator library:** `environment.inspect`, `environment.propose`, `environment.test`, `environment.cancel`, `world.preview`, `world.propose`, `contribution.inspect`, `contribution.submit`, and `contribution.review`. It denies privileges without trusted authorization, requires a pinned revision hash, enforces role levels, rejects embedded shell/credential fields, checks request origin for mutations, requires an idempotency token, and **fails closed (501)** where no trusted adapter is configured. The library deliberately does not create containers, run code, install workloads, write files, commit, merge, or call the local machine.

**Production integration still required:** existing Express route mapping, cookie+CSRF auth, request size limits, origin validation including WebSocket origin, exact protected repo ownership, per-user persistent job store, idempotency database uniqueness, quotas, rate limits, cancellation semantics, concurrency/locks, asset provenance validation, sandboxed runner, signed previews, logs, telemetry, GitHub webhook verification, integration testing and host approval UI. A demo no-op should never masquerade as completed execution.

## Configuration and language coverage

Do not restrict Towerflow contributors to Python/C#/C++. Define **runtime capability discovery**: JS/TS/Node, Python, C#/F#/.NET, C/C++, Java/Kotlin, Go, Rust, SQL, WebAssembly, shader languages, and user-installed toolchains where supported. The mediator must report capability as `available`, `installable-with-consent`, or `unsupported` based on a verified per-workspace inventory—never assume a compiler exists. Users retain their own VS Community installation/workloads, extensions, MSBuild, SDKs, debugger, NuGet settings and license scope. Share repository-level `.vsconfig` / `.devcontainer/devcontainer.json` proposals only with explicit opt-in; machine-specific paths and credentials remain private. A browser cannot remotely open an arbitrary desktop IDE on a visitor's computer; a local consented companion is needed for deep desktop bridges.

## Realism and asset preservation contract

1. **Capture** at least several licensed/reference photographs of the subject from diverse angles under known lighting; record source URL, rights, access date, camera/exposure when available, dimensions, scale references, object identity, material types, mechanical articulation, and visible/unobserved regions. Real-time web research cannot reconstruct occluded geometry automatically.
2. **Represent** geometry in validated `.glb/.gltf` with PBR texture sets (base color, metallic, roughness, normal, occlusion, emissive), environment lighting, soft shadows and LOD levels. Optional depth/photogrammetry outputs require confirmed capture hardware/software and their licenses.
3. **Preserve** manifest: object ID, asset version/hash, source citations and permissions, measurement confidence, polygon/texture budgets, scene anchors, authored-by, legal rights, expected motion, fidelity targets and rollback pointer. Reference material is immutable; enhanced procedural outputs are derivatives.
4. **Verify** visually against source photographs from fixed calibrated camera angles and multiple-device screenshots. Report geometric and color discrepancies rather than claim perfect/total recall. Avoid bias toward dramatic effects that reduce faithful material appearance.
5. **Collaborate** by submitting versioned proposals for preview. Only authorized approvals change the shared scene revision. All guests joining after a change receive the same authoritative scene state, assets and clock seed; clients can reduce quality for accessibility/performance but not silently diverge in published object positions.

## Non-regression release gates

- UI: original Development Room teleport and four stations, clickable host IDE links, initial spawn, dashboard, themes, portfolio, inventory (once built), collaborator visibility, first-person camera-relative WASD, mobile controls and the AURA chat interface.
- Backend: GitHub OAuth callback, permission gates, per-user memory privacy, room WebSocket voice and presence, host-only merge, no unauthenticated code execution and no elevated guest permission.
- Fidelity: controlled screenshots of original and revised scenes, projector entrance sequence, view-distance and LOD, accessibility reduced motion, color/contrast checks.
- Production release: isolated run/tests, contributor-specific feature branch, PR + meaningful synopsis, owner review, staged deployment, health metrics, backup and tested rollback. **No new live restart or automatic merge in this research milestone.**

## Critical product decisions awaiting confirmation

1. Should non-host developers use GitHub Codespaces (preferred default if authorized) to run code and preview, or individually managed local dev containers?
2. Is native Visual Studio Community required on **each collaborator's own Windows PC**, with an explicitly installed consent-based desktop bridge, or is launching it outside the browser sufficient?
3. What is the authority model for approving shared 3D scene changes: owner-only initially (recommended) or contributor self-approval within an isolated team sandbox?
4. Should the self-contained one-file HTML request be treated as an **independent marketing/prototype demo**, while the real product retains its multi-file protected backend? These are architecturally different requirements.

No settings were changed in user machines by this document. The original mission and uploaded template metadata are retained in the user's source files.
