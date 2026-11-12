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

## Photo-grounded 3D visual engineering extension (separate preview)
The additive `collaboration-room/photo-studio/` experiment interprets owned or licensed photographs into **provisional** camera-calibrated 3D placement and real multi-part candidate meshes, with optional GLB and photographic HDR/PBR maps. Its architecture, source/licensing guard, uncertainty labels, tests, and future integration boundaries are documented in [the studio README](photo-studio/README.md) and [engineering contract](photo-studio/ENGINEERING.md).

Start the existing `node collaboration-room/preview-server.cjs`, open `http://127.0.0.1:4174/` and follow **Open photographic 3D lab**, or navigate directly to `http://127.0.0.1:4174/photo-studio/index.html`.

This is **not** the authenticated collaboration room and **not** a service API for the C++ portfolio. It has no permission to alter team project files from within the browser. The existing world-locked preview and its tests remain unchanged. The full live room is not in this repository, so no claim of live integration should be made without importing and examining the live runtime. The team should preserve the actual approved movement behavior independently of the preview module.

Photo-to-3D release requires all three independent gates: **CODE** (runs/tests), **PATTERN** (matches reference photography and real camera calibration), and **PRESERVATION** (all existing runtime functions and contributor state remain correct). Reviewer approval is necessary before merging the draft PR into `dev`.
