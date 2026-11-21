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
