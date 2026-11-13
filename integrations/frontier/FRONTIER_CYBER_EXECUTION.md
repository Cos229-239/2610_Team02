# TOWERFLOW // FRONTIER: CYBER AMBIENCE + ZERO-DEGRADATION EXECUTION
**Release candidate** — upgrade the original authenticated room, not a second TowerFlow application.

## Preserved intent: transcription
Make the existing Frontier/Development Room feel like an immersive cybersecurity and computer-science production facility, with cinematic but physically plausible materials, photographically credible lighting, and high-end spatial ambience. Integrate robust capabilities into the *actual* original room instead of creating a new dashboard or rebuilding from scratch. Reuse the projector state machine, room-world store, globe renderer, AURA/FLOW, contributor IDE and business logic. Do not degrade any working behavior, data, permission, media route, frame rate, or graphics setting merely to add features. Keep code correlation and proof of actual behavior.

## AI translation: enforceable engineering requirements
**SPECS:** Room architecture: graphite, titanium/chrome trunks, inset azure/violet fiber-optic pathways, realistic PBR roughness and metalness, deliberate luminance falloff, physically positioned room-scale geometry. Make it feel like a high-caliber engineering headquarters rather than an overlay, a webpage or a generic neon gaming lobby. Keep architecture photogenic, not cluttered.

**DESIGN:** Three-dimensional, non-interactive perimeter frames and computer-network-inspired illuminated conduit nodes. Preserve wall-projection sightlines, original room props, AURA's opposite-corner orb, its meaningful studio configuration and the Development Room. Assets should later be replaced by licensed real GLB/PBR/HDR assets one at a time after image-grounded comparison; do not mistake geometric proxies for photographic scans.

**PRESERVATION:** Existing camera controls (whatever the verified live implementation uses), projector wall selection, 3-second-after-descent boot delay, floor-prop transforms, persistent world settings, GitHub OAuth, headset voice, chat, IDE sessions, contributors, business finance/inventory, sales globe, filesystem and all other working features are unchanged. No new click raycasts, collision objects, global lighting mutations, server endpoints, redirects, new background animation loops, destructive setup or arbitrary shell. Optional cyber layer must fail open to original room.

**API:** Additive browser module `integrations/frontier/cyber-ambience.js` embedded by the pre-existing approved `tools/install-frontier-lobby.mjs` installer. API:
- `window.TowerflowCyberAmbience.install({THREE,scene})`: idempotent, only uses the provided live scene, never constructs/replaces a second scene.
- `window.tfFrontier.cyberAtmosphere`: read-only candidate telemetry (counts; not runtime FPS proof).
- `window.tfFrontier.setCyberAtmosphere(enabled)`: explicit optional ambience toggle; persistent independently of existing scene settings.
- `window.TowerflowProjectorMachine` is reused unchanged.

## Implementation and resource budget
- **3 total InstancedMesh draw-call groups** (chrome conduits / cyan transmit channels / violet node markers), shared box geometry, standard PBR materials.
- No new shadow casters or light sources, no changes to canvas resolution, antialiasing, WebGL backend, tone mapper, postprocessing or renderer pixel ratio.
- All ambience meshes opt out of raycasting, input and station registration.
- Geometry constrained to perimeter around the real room, outside projector zones; gap kept around AURA's opposing-corner orb.
- Reuse the existing projector animation loop for low-frequency LED breathing; no additional requestAnimationFrame.
- Dynamic code does **not** assign any fake inventory/sales/network data to ambient light strips.
- Project budget is an **architectural estimate**, not measured proof of p95 frame-time or photorealism. Any measured performance regression blocks promotion.

## Evidence and compatibility snapshot
Reviewed base: `feature/frontier-execution-evidence-20261111` @ `5b52c3dd3ed15b9b090496a8937a3f171644f62a`.
Related branches: `feature/towerflow-vscode-live-room-sync` and `towerflow/room-access-controls`. The former contains Frontier projectors and product integration scripts. The latter contains a **different** Collaborative room/server implementation; do not assume it is the deployed Windows host.

Existing recovered Markdown: `TOWERFLOW_PRODUCT_DIRECTION_AND_HANDOFF.md`, `TOWERFLOW_PRODUCT_RELEASE.md`, `AGENTS.md`, `integrations/frontier/FRONTIER_ARCHITECTURE.md`, `integrations/agents/AGENT_CAPABILITIES.md`, `collaboration-room/LIVE_ROOM_VSCODE_SYNC.md`, `Documents/PMP3_TowerFlow_Phased_Development.md`.

**Known conflict:** older Foundry instructions document world-locked WASD; `AGENTS.md` on the base feature branch says camera-relative FPS. Requirements have been corrected across conversations. We do not change movement in this feature. The definitive baseline is the running `public/room.js` on the local host, which is not in this branch. A movement decision requires an observed host build and explicit acceptance; no silent rewrite.

**Host boundary:** authoritative host `%USERPROFILE%\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room` running port 4173. A GitHub commit cannot update it. `Desktop\Towerflow_Upgraded` is a detached Git worktree; avoid blind `git pull` or branch switches there.

## Candidate validation and acceptance
**CODE — automated:** syntax check, cyber layout unit tests, projector timing tests, existing installer invariants and source-preservation tests on Windows/Linux CI. A test success proves only the tested contracts.

**PATTERN — real browser:** compare before/after full-resolution screenshots of identical original-room camera positions. Review architectural design against photograph/licensed references, material and light falloff, no projector blockage, no false active system data, no generic overlay. Test walls A/B, entering via click/portal, AURA orb, 4 Development Room IDE stations, original object actions and AI controls with two authenticated clients.

**PRESERVATION — real runtime:** unchanged controller movement, OAuth, team chat/voice, inventory/finance, world scene persistence after reconnect, globe color thresholds, environment mode, browser refresh and stable projector/off state. Track hash/revision and authorized reviewer in release receipt. Profile p50/p95 frame time with the actual RTX 2060 SUPER 8 GB and a second teammate system. Do not claim no degradation if you have not measured the old and new.

**Security:** public Funnel stays unchanged; do not expose native shell or IDE terminals to the browser, and verify WebSocket origin plus per-message authorization for any later server sync.

## Controlled original-room launch
Use `tools/launch-original-frontier.ps1 -ApplyCyber` from a checkout of **this feature branch**. It tests the code, refuses a missing/divergent Frontier module, performs a preservation dry-run and targeted apply, never restarts a running Node server and opens the **existing** room on loopback. If the live room's source diverges, the installer blocks rather than silently overwriting the user's work.

Because the host cannot be inspected through GitHub alone, **source staging and CI are not an end-to-end deployment**. Release needs host execution and browser/multiplayer acceptance. Keep the PR in draft until the independent three-gate evaluation passes.

## Full-scale next milestones (reuse; do not rebuild)
1. Import the authentic current `server.js` and `public/room.js` privately, redact secrets, inventory current features and pin baseline screenshot + timing receipts.
2. Bind existing `projector-machine.js` to authenticated versioned server state; retarget, restoration, reconnection, two-client validation.
3. Replace high-visibility individual room proxies with licensed GLB furniture/conduits; use 1–2K PBR maps, known scale, HDR lighting and screenshot alignment. Preserve the existing renderer until fidelity and frame-time comparison proves improvement.
4. Connect the existing Development Room to authenticated contributor workspaces, isolated branches, reviewed tests, PR previews, and official IDE onboarding.
5. Extend existing WebRTC signaling for authenticated voice + headsets, PTT, mute/deafen, positional/environmental audio; no AI dependency.
6. Connect approved sales data to the existing accurate Earth globe with provenance, green/yellow/red rules, explicit no-data regions, and organization permissions.
7. Give AURA/FLOW bounded, independently verified tasks through existing orchestration tools. Experimental capability must not bypass production authority.
8. Promote only verified changes with versioned receipts, health checks, rollback strategy and collaborative release coordination.

## Scientific/technical references
- Khronos glTF 2.0 PBR: https://www.khronos.org/gltf/pbr/
- Three.js linear color management and physically based textures: https://threejs.org/manual/#en/color-management
- WebGLRenderer performance info: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
- Yjs awareness is ephemeral; document updates need persistence: https://docs.yjs.dev/getting-started/adding-awareness
- OWASP WebSocket handshake origin and message validation: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
