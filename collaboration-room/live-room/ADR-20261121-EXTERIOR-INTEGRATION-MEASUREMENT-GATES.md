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


## 2026-11-21 forensic ownership update (from exact live source, hash checked)

The live `room.js` is 6,575 lines and has materially different floor/window ownership from the GitHub `dev` file. User-supplied line excerpts show:
- `TF_REFERENCE_ATRIUM_V2` at lines 12–64 owns **ceramic overlay tiles** (`2.47 × .012 × 2.47`, grid spaced 2.5 units) and **one textured window plane**, `PlaneGeometry(12,5.5)`, `x=-20.66,y=6.6,z=0`, rotation `Math.PI/2`. The skyline is drawn on a **1024 × 512 CanvasTexture**. There is an opaque wall mesh at `x=-21`. This is **not a physical transparent window** and there is no verified open geometric portal; pushing external 3D towers behind/through it will not necessarily render correctly.
- A later material upgrade at lines 4140–4179 alters the tile material maps and uses a `THREE.PMREMGenerator` to produce an environment map from a `reflectionStage` scene; this stage is not a second competing room renderer.
- A **separate planar floor reflection** at lines 5026–5079 uses a `640 × 360 HalfFloatType` render target, an offscreen mirror camera, and a mesh named `TF_POLISHED_MARBLE_REFLECTION`. A second planar resin reflection for the development room begins near 6085, using `TF_DEVELOPMENT_PLANAR_RESIN`. No floor/material edits are allowed for exterior integration.
- Projector `wallLayout` at lines 2373–2377 includes `left` and `wallTargets` at 2378. Removing that target could alter controls; defer until separately tested. Current prototype does not alter it.

**Decision:** The safe first experimental interface is the **already existing window CanvasTexture**, with **no extra 3D geometry**, no wall cuts and no scene/module replacement. Implemented `public/exterior-window-adapter.mjs` is a separately imported, **explicitly opt-in**, disposable 2D texture overlay. It identifies the exact original window by geometry/position/rotation/canvas dimensions; snapshots the bitmap, draws a bounded rain/snow visual probe only on that window, retains material/mesh identity and restores exact pixels on `dispose()`. It does **not** auto-mount and is not imported by the live `room.js`. It is intentionally not advertised as realistic 3D weather.

**Evaluation:** `public/exterior-window-adapter.test.mjs` contains five Node test groups covering unique targeting, autostart rejection, preservation, weather input validation and bit-for-bit bitmap restoration. Node tests are available on this feature branch, but full browser rendering/visual fidelity is **NOT VERIFIED**. Source-level mock tests do not authorize release.

**Next:** Run the exact branch's Node tests, measure real loaded window texture ownership in browser, capture same-pose original screenshots, then consider a controlled preview-only loader and screenshot comparisons with a dedicated explicit opt-in UI. No live file changes have been made as part of this stage.


## 2026-11-21 panoramic-window visual revision

**Direct browser evidence:** user screenshots demonstrated (a) an overly narrow square opening with a thick opaque lower wall in the first 3D experiment, (b) conflicting/original mullions, and (c) a layered flat skyline square behind 3D buildings. The preceding module-only alignment hotfix deployed successfully and confirmed original `room.js` unchanged, but visual acceptance remained unsatisfactory. Live room hash at that verified hotfix: `E069A32C52F8AC8E4DC39CDEB1DE5EF84113CACAEA98E32EC5DDA3EA2D04B088`; previous 3D module SHA256: `D034FED4A21F48D561F75E6813C89CEFD49A6551DCFEE83666967DAE79C04954`.

**User design criteria:** make the entire atrium left wall transparent/full-height city-facing windows; eliminate the inset square and duplicate overlaid painted scene; keep visible sky above building roofs; enhance tower windows with hotel/apartment blinds and curtains, moving tenant silhouettes; add the requested "chaos schemes." Exact preexisting chaos presets are **not established** in this repo/session, so experimental modes (storm/blackout/rush) must not be misrepresented as the user's original schemes.

**GitHub implementation:** `public/city-exterior-3d.mjs` V2 replaces the previous *partial* reconstituted wall with full-width, floor-to-ceiling aperture (original solid wall and original 12×5.5 painted skyline hidden during preview), single coplanar slender mullion set, hide existing narrow inset rail details during preview, add a continuous sky backdrop near `x=-120`, plus instanced blinds, curtains, moving occupants on the existing procedural tower windows, and three experimental chaos modes: storm, blackout, rush. Original graphics and visibility restored by `dispose()`. The original `room.js`, Node server and OAuth are unchanged.

**Deployment:** `tools/deploy-panorama-chaos-city-v2.ps1` targets only the running `city-exterior-3d.mjs`; requires the observed pre-V2 source fingerprints, checks exact Git blob and Node ESM syntax, verifies local HTTP bytes, retains previous module for rollback, and opens configured authenticated room origin. Never assume the previous PowerShell Job5 failure means a script ran; it failed with a control character. Run in **foreground PowerShell**, not an empty/background job. No browser visual acceptance or FPS measurements have yet been recorded for V2.

**Reality status:** the city is procedural, not an accurate replica of a named capital. Human silhouettes are stylized animated facades, not fully rigged humanoids. The original user's "chaos schemes" need to be correlated with the actual desired scheme specification before a claim of matching them. This is a larger visual experiment, not production completion.
