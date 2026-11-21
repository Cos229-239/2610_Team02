# ADR — Preserve TowerFlow's verified live room before any graphics integration

**Date:** 2026-11-21  
**Status:** ACCEPTED FOR OPERATOR HANDOFF; implementation/process controls require independent validation  
**Scope:** Team 02 TowerFlow live collaboration room and Windows hosting  
**Decision:** The *exact working room* is authoritative for appearance and runtime behavior. GitHub feature work is not a live upgrade until it survives guarded integration, runtime asset parity **and actual visual acceptance**. Regressions require return to the known-good exact source, not an improvised replacement.

## 1. Incident: actual outcome and evidence

At the start of this session the independently hosted room was verified by `GET http://127.0.0.1:4173/api/config` identifying `Cos229-239/2610_Team02`, configured branch `dev`. The live room was under a non-Git directory. The feature `feature/capital-window-world-emulation-20261121` was available on GitHub but `public/capital-world.mjs` was **missing** from the live server. A Git fetch therefore did not change the room.

Attempting to deploy the feature produced:
1. A PowerShell **call-depth overflow** from naming a helper `Git` and then calling `git` within it: PowerShell command resolution is case-insensitive, so recursion occurred. A corrected installer used `Invoke-TfGit` and `git.exe`.
2. A three-way merge failure: original live `room.js` had diverged from GitHub feature content; the safe merge refused to apply.
3. A subsequent strict-anchor fallback *did* allow deployment to proceed, but **visual acceptance failed**. User screenshot showed a light tiled floor, obstructed window, prominent generic tower/column geometry, and lost intended cinematic atmosphere. HTTP parity alone had not proven graphics correctness. The change is classified as a **visual regression**. Do not deploy that feature directly again or treat the old installer as production-approved.

**Known-good source before intervention:** live `public/room.js` SHA-256  
`0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0`.

**Regressed live source:** `AAE81A8494DB4297E42599506D0AD8B91057B230A5EDEDC11571284E55B60864`.

**Successful recovery, user-terminal evidence:** the exact original was found in  
`%TEMP%\tf-capital-guard-6c38d70978844041b84b8af1e90c49fc\prior-room.js`.  
Its SHA-256 equaled the expected original. It was copied to the live `public\room.js`, and a fresh GET of `/room.js` returned matching SHA-256 bytes. User reported **success** after restoration. The regressed revision was preserved as  
`%TEMP%\TowerFlow-current-before-restore-2c6008f3a6ae4f4083e04aefbbadf478.js`.  
Do not assume these temporary paths remain indefinitely; verify existence/hash before reuse. No claim that all runtime browser elements or teammate multiplayer were independently retested.

**Control failure:** the deployment described a graphics upgrade as ready on the strength of syntax, mocked state transitions, and matching HTTP assets. This was insufficient. There was no same-pose screenshot baseline, camera/frustum/occlusion check, geometry intersection review, inside/outside boundary audit, or full browser test before promotion. Corrective action: separate CODE, PATTERN, and PRESERVATION gates; all must pass, and visual acceptance is a release blocker.

## 2. Actual Windows installation topology (observed this session)

| Windows path | Purpose | Git? |
| --- | --- | --- |
| `C:\Users\dulsk\Desktop\Towerflow_Upgraded` | Separate Desktop development checkout | Yes |
| `C:\Users\dulsk\Documents\GitHub\2610_Team02` | Team 02 Git checkout / `dev` worktree | Yes |
| `C:\Users\dulsk\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room` | Actual live Node.js collaboration server | **No** |

A boot attempt initially failed because it required `.git` under the live server folder. Never repeat that assumption.

The Desktop checkout was on `feature/earth-visual-fidelity-20261110` with **unmerged `UU` entries** and other staged changes. It must not be reset, cleaned, switched, stashed, force-pulled, or used for unattended merges. Another observed checkout `Documents\GitHub\2610_Team02` was on `dev` with a clean index, though initially behind upstream; it remained distinct from the live server.

The live server code uses **Node.js + Express.js + WebSockets + Three.js** on port 4173. No second Express/graphics backend is warranted merely to add effects. `server.js` reads `REPO_PATH` for the underlying repository; HTTP service and Git worktree are distinct. The site is served through `express.static(.../public)`.

## 3. Boot order actually evidenced in this session

**Verified local success:** a PowerShell boot used the correct *non-Git* live path, launched or reused `node server.js` from that directory, with `REPO_PATH` pointing to `Documents\GitHub\2610_Team02` for a fresh process. Server PID **11668** was reported at that time. `GET http://127.0.0.1:4173/api/config` identified repository owner `Cos229-239`, repo `2610_Team02`, configured branch `dev`. The local collaboration room URL was `http://127.0.0.1:4173/room/team02`. A running server on port 4173 must be identified by process command line and `/api/config` before reuse. An HTTP 200 alone does not prove an authenticated entry or a working 3D scene.

**Tailscale:** the first boot yielded `unexpected state: NoState`, `No serve config`, and a timed-out public URL. A separate recovery command inspected/started the Windows `Tailscale` service, launched the Tailscale desktop client if absent, waited for `tailscale status --json` `BackendState=Running`, and attempted `tailscale funnel --bg --https=443 4173`. The user explicitly reported **success** after this recovery. The previously recorded public URL was `https://dulsky.tail0ef7c0.ts.net/room/team02`. The exact GUI login/restart event and public HTTP response in that successful command were not pasted, so preserve the distinction between **user-reported remote success** and **independently observed endpoint evidence**. Do not conflate Tailscale with Cloudflare.

**Cloudflare:** the `Team2` launch was **requested** by the boot script; no definitive tunnel-ready/public-route evidence was recorded. Never claim a working Cloudflare route merely from `Start-Process` or `cloudflared tunnel list`. Do not change existing tunnel routing or OAuth origin without inspection.

**Practical boot procedure, lowest risk:**
1. Inspect three paths and identify which `server.js` process owns port 4173. Do not kill unknown processes, create duplicate listeners, or require Git under the live directory.
2. Inspect `Get-Service Tailscale`; if stopped start it (admin may be required). Inspect `tailscale status --json` and get `BackendState=Running`. Launch the desktop client/sign in only if needed. Never loop `tailscale up` blindly while in `NoState`.
3. Start or reuse the live `node server.js` **from the live folder**. For newly started processes provide `REPO_PATH=C:\Users\dulsk\Documents\GitHub\2610_Team02`. Retain existing `.env` / `PUBLIC_URL`, OAuth and session configuration without exposing secrets. Do not restart a healthy Node server just to copy public static assets.
4. Check `/api/config` identity; `/room/team02` HTTP 200; then start/restore the previously verified Funnel mapping: `tailscale funnel --bg --https=443 4173`. Check `tailscale funnel status`, public `/room/team02`, and, if needed, public `/room.js` SHA-256 parity.
5. Confirm GitHub sign-in, **Enter Chamber**, navigation, projector controls and (for claims about collaboration) at least two authenticated clients. Earlier `Invalid OAuth state` was observed in past sessions, but no specific root cause was established in this session.
6. Git sync is **separate**: inspect `git status` and unmerged indexes. `git fetch origin` only downloads refs; it does not update the live server. Fast-forward `dev` only if its own checkout is clean, on `dev`, and has no worktree conflict; never assume remote `dev` reflects the running `room.js`.

## 4. Graphics integration contract — this is mandatory

**Protect:** the original dark polished/reflection-oriented floor, skyline window / realistic exterior opening, atmospheric lighting, spacecraft/projector, full station set, navigation, Development Room, team/member resources, OAuth, WebSockets, existing sound and world modules. No replacement of the main `scene`, `renderer`, or existing assets. Never substitute a generic illustrative city for the current verified window panorama. Merely adding a second exterior scene is *not* safe if new meshes occlude the glass or foreground.

**Proposed architecture:** `stable interior → protected window boundary → isolated exterior environment adapter`; expose only narrow lifecycle and update hooks. Exterior geometry must be outside correct world-space planes, at proper near/mid/far field distances and respecting camera far plane/frustum, fog, clipping, depth order, occlusion, sight lines and material blending. Avoid huge columns directly adjacent to the window. Preserve projector wall targets except the exterior glass: left observation window must not activate/receive spaceship projection. Consider both rooms independently. Only alter wall segmentation if an image-verified window viewport and collision/raycast acceptance exist.

**Weather is causal, not decorative:** rain and snow stay **outside**. Wet facades, glass rivulets, road roughness and puddles, umbrellas tracked to pedestrian instances, snow accumulation and wind-related behavior must appear together and reset on dry weather. Keep instance budgets, frame timings and memory within the user's hardware; measure rather than promise.

**Required release gates:**
- **PRESERVATION:** exact source fingerprints, baseline viewport screenshots at a fixed camera pose, record of original materials/windows/projector and explicit byte-exact rollback source. No rollback by guessing a Git commit.
- **CODE:** clean syntax, deterministic test transitions, no duplicate render loop ownership, guaranteed disposal, unique and verified integration anchors. An unchanged `room.js` plus a new `.mjs` should be preferred where possible. Never accept accidental physical material replacement, independent camera or renderer, or an unsafe 3-way merge fallback solely because it parses.
- **PATTERN / VISUAL:** compare **before and after actual WebGL screenshots from the same pose** for floor, windows, ceiling, ship and desk layout. Verify exterior geometry doesn't obscure the intended scene. Run interaction tests for front/back/right projector and non-projectable exterior window, WASD/E, entrance, auth, dev-room transitions, weather transitions and effects outside room boundaries. Measure FPS/frame timings before release on real hardware. User acceptance is mandatory before declaring graphics upgrade complete.
- Treat browser-screenshot unavailable as **NOT VERIFIED**, not PASS. Target ≥80% demonstrated reliability on defined baseline tests before promoting experimental changes; do not invent percentages.

**Deployment:** stage differences without touching either Git worktree, and show a concise changed-file/anchor diff. Stop on unmerged files, unexpected hash or ambiguous anchors. Apply minimally with rollback; verify `public/room.js` and weather module SHA-256 on disk, localhost HTTP and external route. **HTTP parity is only a transport gate—not visual acceptance.** Do not remove the known-good restore source until browser visual acceptance.

**Do not reuse** the pre-recovery fallback installer as a production-approved launch path: `tools/deploy-capital-world-live.ps1` had recursion and unsafe visual acceptance history; treat it as experimental until its output is validated against the exact restored baseline. In particular do not copy the feature's entire `room.js` into live. The capital-world feature branch remains experimental; do not merge to shared `dev` until end-to-end visual tests.

## 5. Verified recovery runbook

1. First find exact content by SHA-256, **not by filename/branch assumption**. Search `%TEMP%\tf-capital-guard-*\prior-room.js` before broad filesystem or Git history searches; also inspect earlier `original-room.js` snapshots only if present. Compare against expected `0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0`.
2. When exact match exists, preserve the currently live changed file separately and record its SHA. The actual recovery preserved the regressed source in a unique `%TEMP%\TowerFlow-current-before-restore-*.js` file.
3. Copy only the verified original to `<live>\public\room.js`. Do **not** erase the capital-world module solely to restore original behavior; without import it stays unused.
4. Verify on-disk SHA-256 and download actual `http://127.0.0.1:4173/room.js?restore=<nonce>` to a temporary file; compare SHA-256 bytes. Only after both match print the terminal hard-refresh instruction.
5. In browser press **Ctrl + Shift + R**, visually confirm original floor, panoramic window, cinematic lighting, spaceship, controls and interactions. This browser visual confirmation was reported as successful, but not independently captured in a post-restore screenshot.
6. If recovery source is missing, **do not fabricate replacement**. Inspect deployment staging, native backups and Git history as *candidates*, each verified by exact fingerprint.
7. Preserve the successful recovery path and notes in this ADR; temporary `%TEMP%` paths are not durable disaster recovery. A future approved deployment must preserve a deterministic rollback source until acceptance, with no automatic deletion on failed verification.

## 6. Command-output and browser-refresh operator protocol

Every one-paste local PowerShell diagnostic/deployment should:
- Check prerequisites and stop safely on mismatch without silent resets, fresh clones or routing changes.
- Emit concise statuses: `BOOT`, `LOCAL_HTTP`, `TAILSCALE_BACKEND`, `FUNNEL`, `OAUTH/ENTER`, `GIT_REF`, `LIVE_HASH`, `VISUAL_ACCEPTANCE`. Mark unknowns explicitly.
- **Copy the report to clipboard** via `Set-Clipboard`, preferably by capturing sanitized output in memory or a temp transcript outside repo. Exclude secrets and access tokens.
- **Inside the PowerShell terminal** print `PRESS CTRL + SHIFT + R IN YOUR BROWSER` **only after** the actual server-served asset hash matches the intended candidate and the operator is instructed to perform visual acceptance. It means *ready to inspect*, never *visual quality certified*. If parity fails print `DO NOT REFRESH FOR THIS UPGRADE`.
- Do not prompt the user in chat to refresh as a substitute for a conditional terminal instruction.

## 7. Evidence matrix / handoff state after restoration

| Claim | Evidence | Status |
| --- | --- | --- |
| Existing live server launched in this session | PID 11668 was reported, `/api/config` matched repo | OBSERVED AT TIME; current PID unverified |
| Tailscale recovered | User said "success" after Windows Tailscale recovery | USER REPORTED, public HTTP details unavailable |
| Cloudflare Team2 launched | Script requested process start | UNVERIFIED connected public route |
| Git worktree topology | User checked 3 paths, identified Git vs live | VERIFIED then; recheck before edits |
| Weather feature code and mock transitions | GitHub commits and mocked tests | CODE TESTED, not accepted visually |
| Exterior weather upgrade visual result | User screenshot showed severe scene regression | FAILED |
| Exact original source restored | `prior-room.js` hash exact, live hash and HTTP exact | PASS |
| Original graphics appearance restored | User reported "success" | USER ACCEPTED; no independent screenshot/FPS |
| GitHub feature merged to `dev` | Not attempted | NO |
| Two-client collaboration | Not tested this session | UNKNOWN |

## 8. Future AI agent handoff instructions

Next agent must first read this ADR, then inspect **actual** live hashes and `TOWERFLOW_CONTINUITY_HANDOFF.md` where accessible; do not let stale directory notes override current observations. Do not infer that a Git commit deployed to the private live folder. When discussing progress separate **facts / hypotheses / assumptions / unknowns**, and CODE / PATTERN / PRESERVATION independently.

**Priority order:** keep the accepted live room operational → verify original preserved look → investigate exterior graphics occlusion by reading baseline code and comparing same-pose browser renders → implement narrowly scoped exterior adapter → run visual/regression tests → optional staged deployment → human acceptance → only then consider promotion to shared `dev`.

**Decision rationale:** preserving an already working scene is more important than adding unverified features. Architectural isolation and same-pose visual testing are required because this incident proved transport parity and syntax could pass while the user's visible room was degraded.
