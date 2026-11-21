# ADR — Precision-first exterior integration after original scene recovery

**Status:** PROPOSED / SAFE DISCOVERY IMPLEMENTED. **No live graphics deployment authorized by this ADR.**  
**Date:** 2026-11-21  
**Repository:** `Cos229-239/2610_Team02`  
**Upstream:** `dev`  
**Incident reference:** `feature/capital-window-world-emulation-20261121:collaboration-room/live-room/ADR-20261121-LIVE-ROOM-PRESERVATION-BOOT-AND-GRAPHICS-ACCEPTANCE.md`.

## Decision

The restored live `room.js` and its **visually accepted appearance** are the baseline. We will compare original source **and actual browser view** against each candidate adapter before integration; a code parse, SHA match, or 867 mocked states is insufficient. Maintain single Three.js scene/renderer/camera authority. No replacement of interior objects, materials, windows, lights, ship, workstations, or navigation; no blind merge of a GitHub feature `room.js` onto a divergent live source.

**Known-good live SHA256:** `0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0` (confirmed after recovery, local HTTP parity PASS). The original was recovered from a precise hash-matched `%TEMP%/tf-capital-guard-*/prior-room.js` snapshot. User confirmed visual recovery. Never assume the temp folder still exists; verify its hash or require operator-provided exact source.

## Compare: inspected repository vs known-live evidence

| Topic | `dev` repository source evidence | Known-live evidence | Implication |
|---|---|---|---|
| Runtime | Express/Node, WebSockets, Three.js `0.167.1` importmap | Node localhost 4173 API returned Team02; remote Tailscale recovery user reported | Reuse infrastructure; do not add second backend. |
| Graphics authority | `room.js` creates `scene`, `camera`, `renderer`, `animate()` | Recovered local hash, observed good visual appearance per user | Adapter is subordinate; must not replace these. |
| Atrium geometry | Source uses room `42 × 32` scene units, walls `x=-21, x=21`, `z=±16`, camera `far=130` | Original live actual dimensions require source inspection because hash does **not** prove equality with GitHub `dev` | Treat repository numbers as provisional, not surveyed real measurements. |
| Development room | `tfRoomX=62` | Existing live developer room preserved | Both viewports need independent sight-line checks. |
| Exterior | Existing rear skyline silhouettes, multiple atmosphere/reference subsystems | Original panoramic window/cinematic floor accepted | Do not obscure a physically different existing window or project into the glass. |
| Bad feature | Previously built two exteriors at `x=-21`/`x=83`, large procedural city meshes and changed wall segments | After deploy, screenshot showed obstructing towers and light/tiled floor; reverted | Geometry and material overlap are unacceptable until same-pose comparison passes. |

The `dev` source is **not proof of the exact live source layout**; derive exact numbers from a hash-verified live file first.

## Implementation plan, with stop/go gates

**Stage 0 — Baseline forensic inspection (implemented):** Run `tools/inspect-live-graphics-preservation.ps1` from this branch without checking it out. It reports verified original SHA256, source/HTTP parity, known geometric anchor expressions, running listener identity, and marks unknown visual results as NOT VERIFIED. It copies sanitized output to clipboard. This script does **not** edit live code, Git worktrees, funnels or `.env`.

**Stage 1 — Quantitative camera/scene capture (not yet performed):** Collect scene coordinates in the live browser for the current camera pose and window intersections. For each intended pane measure world-space center, corners, normal, horizontal/vertical field of view, eye-to-window distance, near/mid/far clipping, reference floor height, and number of occluding triangle hits along at least a 5×5 ray grid. Measure screenshot geometry with pixel landmarks from exact viewport dimensions; capture consistent day/night and weather-free frames. No arbitrary scale claims: distinguish scene units from physical metres.

**Stage 2 — Non-destructive adapter prototype (blocked pending Stage 1):** Mount a namespaced disposable exterior group only beyond the verified pane; respect existing wall geometry and projector raycasts. Do not cut walls or move the interior. If the original window is actually a texture/screen without physical opening, first add a separate opt-in non-production viewport layer/portal *behind* the existing presentation; do not modify the original pane until a same-pose proof exists. Start with just ground plane/horizon, then one road/building sample, then expand. Require no interior overlap in frustum/ray casts; add staging mode and `dispose()`.

**Stage 3 — Causal weather (blocked pending geometry):** Rain outside only; wetness on exterior building facade, street/sidewalk puddles, glass rivulets, umbrellas synchronized with agents; snow accumulation on roof/ground and wind drift; storms appropriately change clouds, luminance and precipitation. Reversible normal-weather transition. Test geometry occlusion under each state, not only mesh counts.

**Stage 4 — Acceptance:** Preserve original floor, window, ceiling, projector ship, desks, controls and menu. Sample FPS on RTX 2060 SUPER with representative scene and worst precipitation; verify no unexpected WebGL errors; run WASD/E, three projector target walls, non-projectable window, dev-room entry, GitHub OAuth, remote route and two clients. User approves same-pose before/after screenshots before merging or releasing.

**Stage 5 — Deployment (not authorized until previous pass):** Use detached module and a **minimal import/mount with exact original-hash guard**, separate rollback source, localhost + public byte-hash parity and an actual browser render. A failed visual gate restores the original exact file and re-verifies byte parity. Never promote a feature on transport-only success. Terminal prints `PRESS CTRL + SHIFT + R IN YOUR BROWSER` when deployed assets can be *inspected*, not when graphics are presumed visually accepted. Always copy sanitized command output to clipboard.

## Reliability and quantification

Baseline tests must be explicit, repeatable, and independently evidenced. Let `acceptance_rate = tests_passed / tests_executed`; do not invent an experimental success rate from simulated transitions. Promotion threshold is ≥80% measured and **all preservation-critical visual checks pass** (fail closed regardless of overall percentage). Record before/after pixel registration error, occlusion count, wall/window hit-tests, frame-time percentiles and draw-call/triangle counts when instrumentation exists. Unknown results remain unknown.

## Operational warning

Previous `feature/capital-window-world-emulation-20261121` had functional weather/state prototypes but failed visible fidelity. Its `tools/deploy-capital-world-live.ps1` is **not an approved release installer**. Do not run or auto-repair live graphics with it. Preserve the exact original verified source as authoritative while gathering measurements. GitHub `dev` and live `public/room.js` are separate; never infer that fetching or merging deploys a live asset.
