# Towerflow Foundry — repository-first development

Source of truth: `Cos229-239/2610_Team02`. The shared integration branch is `dev`; feature work must go through review.

## What this first change does
Adds a reusable world-locked movement controller and automated tests. W = negative Z (screen/world up), S = positive Z (down), A = negative X (left), D = positive X (right). Camera yaw/pitch do **not** rotate the movement vector. Shift doubles movement speed. Diagonals are normalized and room bounds are enforced.

## Important integration status
The previously supplied Towerflow Collaboration Room starter ZIP has **not** been committed into this repository. These controls are ready to integrate but will not change the running room until its source is checked into this repository and the old input handler is replaced. Do not mistake this branch for a working deployment.

## One-time room import
Commit the prior collaboration-room starter contents to a dedicated `collaboration-room/` directory, excluding `.env`, credentials, `node_modules/`, generated data, and local repository checkouts. Once imported, use the checked-in code, not circulating ZIP files, as the canonical project.

## Runtime integration
In `public/room.js`, import:
```js
import { installWorldInput, moveWorld } from '../input/world-movement.js';
const input = installWorldInput({onInteract:interact, onMenu:toggleMenu, onChat:openChat});
```
Serve the module at the browser-readable URL appropriate to the application layout and convert the room's JS to a module (or bundle it). In the animation loop, replace camera-relative WASD calculations with:
```js
position.copy(moveWorld(position, input.pressed, delta));
```
For the current Three.js app you may need to copy only x and z, retaining position.y. Keep I/J/K/L solely for camera pitch/yaw. Disable movement while overlays, editor, chat, or menus have focus. Review key event prevention and camera restrictions.

## How changes from this chat enter the foundry
1. Inspect current `dev`.
2. Create a short-lived `feature/...` branch.
3. Implement and test the requested behavior.
4. Open a pull request into `dev`.
5. Review/test before merging; do not push straight into shared `dev`.
6. Log what was implemented versus what remains unverified.

## Run unit tests
```sh
cd collaboration-room/input
npm test
```

## Next foundry stages
Import the existing room, wire and test these controls in-browser, add CI checks, build isolated per-user repo worktrees for IDE changes, add preview/keep/discard workflow, and protect write privileges and room authentication. The browser runtime and local server are not remotely controlled by this repository connector.


## 2026-11-20 — Four teammate desks (preservation-first staged change)

**Intent:** Display one physical workbench each for Malik, Omarion, Dayna and William inside the **existing** development chamber, matching the existing `station()` workbench form instead of creating separate rooms, copying projects or replacing shared consoles.

**Scope:** A bounded, additive edit of `collaboration-room/live-room/public/room.js` on `feature/team02-member-desks-preservation-20261120`:
- Malik (`SVN-760`) → `dev` inventory Win32 GUI source.
- Omarion (`HyperRealmEnd`) → `dev` inventory/sales/reporting source.
- Dayna (`DaynaPerezColon`) → `dev` shared terminal UI source.
- William (`Lopobunnie`) → `WilliamPersonal` Windows Forms solution; **not claimed merged into dev**.

Desks reuse the existing physical desk function, show an in-room E-interaction panel for source/history/review, and route the signed-in viewer to their **own** already-existing contribution workspace. The workbenches do not expose a teammate's OS session or pretend that native code is deployed to the 3D room.

**Preservation:** Original source content was mechanically recovered byte-for-byte by removing the two new marker blocks; preservation comparison **PASS**. Syntax parse of the staged module (with its external `import` line removed for the parser-only test) **PASS**. Four expected member IDs and source link path encoding checks **PASS**. Existing geometry, render loop, camera, room transition, WASD, projector, GitHub authentication, WebSocket and Azure Bridge sources have **not** been edited by this change.

**Unverified:** Browser walk-up interaction, camera-space collision/visibility, live server file parity, OAuth user experience, Windows IDE execution, and teammate-facing visuals. This GitHub feature branch is **not** a running-room deployment. Do not overwrite the user's separate live room or run automatic `git reset`, `git clean`, `git switch`, `pull`, or installer operations on a dirty live tree. Review staged diff and reconcile with the actual live `public/room.js` before selectively publishing; then run two-account in-room acceptance and GPU/frame-time checks.

**Account ownership clarification (2026-11-20):** Every desk is a physical display for the named teammate's work; the person operating it authenticates with **their own** GitHub OAuth identity. The desk now checks `/api/me`, shows the signed-in GitHub login, and unlocks the existing `tfOpenMemberDesk` launcher only after the account is verified. Azure Bridge `/api/azure-bridge/loadout` derives ownership from `req.session.user.login`, not from the desk label. Teammates do not inherit the host's identity, local Windows account, GitHub token, or privileged IDE session. Equivalent capabilities are subject to each teammate's actual GitHub repository permissions and the existing server role gates. Browser, two-account and live-directory tests remain pending.

### Automatic teammate desk synchronization with dev (2026-11-20)

Physical member workstations use the **existing** room geometry and account-bound Azure Bridge. New read-only `GET /api/azure-bridge/member-dev?member=<GitHubLogin>` derives recent commits from GitHub's **shared `dev` history**, filtering by the named collaborator's GitHub author identity; it is protected by the original `auth` and `ensureMember` middleware, returns only the allowlisted four team identities, caches for 45 seconds, and never writes Git state, checks out a branch, or executes source. The desk panel refreshes its GitHub history every 60 seconds while open. Each user continues working through the **separately authenticated** personal workspace; a desk display does not change whose OAuth account is signed in.

**Publish semantics:** A push to a personal branch or an unmerged PR is **not** in `dev`. Once a teammate's code is actually reachable in `dev`, the desk's commit feed and `dev` source links reflect it on refresh. GitHub's author association may omit merges or commits authored under an unmatched email; this is a known evidence limitation. Native C++/C# code cannot safely auto-run or auto-deploy inside the browser; editor/debugger actions still use the actual teammate's account and tools. Deploying the updated `room.js` and bridge server into the separate live host requires source preservation, restart of Node for the new endpoint, and browser validation. Do not claim live synchronization until these runtime gates pass.

### Collaborator desk: Inspect project files (2026-11-20)

Each of the four existing physical team desks now includes **Inspect project files**. The on-demand, authenticated read-only report examines the latest GitHub `dev` tree and the designated personal branch (for William, `WilliamPersonal`), lists source files in that collaborator's project scope, and checks a bounded set of expected files for GitHub author-matched contributions. Every present source file supports **Pull code**, fetching up to 64 KiB of the actual original text through an allowlisted endpoint. No source is evaluated or rewritten.

The report separates **WORKING** (only documented, revision-matched CI check success), **NOT WORKING** (relevant CI check failure), **MISSING** (expected paths absent from `dev`), and **UNKNOWN** (desktop GUI/runtime adapters and contracts not tested). Red files indicate missing expected files or no matched GitHub-author contribution; this is not proof of broken functionality. Green denotes original source and author history, **not** a passing runtime. Amber denotes personal-branch-only files or uncertain authorship. Git author/email attribution may be incomplete. This is source and CI evidence analysis, not an AI semantic correctness proof or a native Windows GUI test.

New API endpoints (both retain existing `auth` and `ensureMember`):
- `GET /api/azure-bridge/collaborator-audit?member=<allowlisted GitHub login>`
- `GET /api/azure-bridge/collaborator-source?member=<login>&path=<scoped path>&ref=<dev or member ref>`

Scoped desktop installation: `tools/install-collaborator-audit.ps1` on the workstations feature branch; it reconciles two exact marked snippets into the existing room and Azure Bridge, adds only the one new CommonJS module, parses staged JavaScript, and restores original bytes if a write fails. It stops on missing or conflicting anchors. A successful installation requires restart of the existing Node host and **Ctrl+Shift+R** to refresh the browser. Native C++ / C# execution is not performed automatically.

### NYC Atmosphere V1 — optional live visual layer (2026-11-20)

The reviewed `collaboration-room/live-room/public/nyc-atmosphere.mjs` is an **additive, reversible** Three.js scene group, not a replacement for the private live host's 3D renderer. It uses a bounded Midtown Manhattan footprint query to NYC's `BUILDING` dataset (`5zhs-2jue`) for actual polygon footprints and roof heights, bounded procedural building silhouettes when the source is unavailable, a weather-responsive distant sky panel, instanced window geometry, and Open-Meteo weather including `is_day`, cloud coverage, and precipitation. Source-accurate heights/facades depend on the dataset; the procedural fallback is clearly labelled **SIMULATED**. Weather updates every 10 minutes; building data is fetched on initial load and explicit `refresh()`. No API keys or paid service required for noncommercial demonstration, subject to providers' terms.

Install through reviewed `tools/install-nyc-atmosphere.ps1` only after verifying the actual live room's bootstrap contract. It adds `public/nyc-atmosphere.mjs` and appends a small bootstrap to the **existing** `public/room.js`, retaining every previous byte (including customized room modules), and validates staged JavaScript before installing. Nothing touches the graphics' existing objects, OAuth, navigation, collaboration, audio, or development room. The in-room **NYC: ON/OFF** comparison control and `window.tfNYCAtmosphere.dispose()` provide rollback without deleting source. The new skyline is positioned beyond the existing room bounds, but actual visibility and performance against the private ~947 KiB room remain **unverified** until desktop installation and a browser screenshot. Outdoor framing may require calibrating the position to that exact build; do not assert pixel-level visual success from syntax alone.

Tests: `node --test collaboration-room/live-room/public/nyc-atmosphere.test.mjs` (also added to the existing Contribution Checks workflow). **All existing features stay unchanged** until deployed and inspected. CI pass does not substitute for scene, FPS, weather and day/night browser validation.
