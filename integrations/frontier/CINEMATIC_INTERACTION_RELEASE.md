# FRONTIER // CYBER-CINEMATIC GRAPHICS + INTERACTION UPGRADE

**Release candidate** — 2026-11-12. This is an upgrade to the **existing original Frontier/Development Room**, never a replacement dashboard or independent photo studio. Source commit on the \`feature/frontier-cinematic-fidelity-20261112\` feature branch. Production host is not modified by a GitHub commit.

## Preserved user intent (transcribed)

The collaboration room must feel like a dramatic cybersecurity engineering headquarters rather than a flat app. Its original floor-sinking geometric exhibits must be interactive and customizable in shape, movement, glowing colors and reversible shatter animations. Glowing rings and luminous infrastructure should have saturated depth comparable in energy and contrast to the glowing portal/ember aesthetics in electronic artist **ILLENIUM**'s *Awake* and *Ascend* art, but all TowerFlow assets and effects must remain original, not copied. Pressing **C** should slide open team chat from the **left**, without breaking keyboard controls or typing. The integrated Development Room must provide genuine efficient debugging, with professional IDE access. Preserve AURA/FLOW, auth, world controls, projection, finance data, Tailscale, and all teammates' work.

## Code correlation — AI model-ready translation

| User concept | Technical implementation | Non-negotiable preservation |
|---|---|---|
| Cyber ambience | Physically modeled server-blade bays, optical terminals, 3 PBR instanced categories, plus existing architecture | Existing scene, collisions, wall projection, AURA opposite corner |
| Vibrant photonic lines | 2 instanced additive halos on existing cyan and violet line records, bounded emissive energy | No replacement renderer, HDR renderer setting, tone mapping or new input raycasts |
| Luminous rings | 4 ring pairs (bright core + broad additive optical halo), 2 actual shadowless PointLights local to front exhibits | Restore original rings, prohibit whole-room exposure change |
| Geometry/shape | 9 typed configurations per original 4 floor platforms | Original platform identity and lift Y track |
| Movement | spin, hover, orbit, figure8, pendulum, helix, static; one existing loop | No additional frame loop, no world position drift |
| Shatter | 16 instanced fake crystalline fragments per exhibit, finite 1.4-second shatter/reformation; no destructive geometry split | No damage to imported assets or multiplayer shared world |
| Press C chat | Left fixed ARIA-labeled dock, safe textContent messages, typed authenticated room transport adapter | No new unauthenticated socket, no hijack in text inputs, no fictional sent messages |
| Debugger | VS Code F5 Node debugger configurations for graphics/interaction tests and real Codespaces debugger link | No arbitrary commands executed on production Windows host |
| Real asset fidelity | Same-origin rights-provenanced SHA-256 verified GLB v2 path and scoped placement; more real GLB/PBR assets needed | Do not mistake geometry for scan; no hotlink/scrape unlicensed imagery |

## SPECS

**Graphics:** PBR metallic–roughness and optional clearcoat on room-compatible mesh geometry. Expose \`tfFrontier.cinematicFidelity\`, \`tfFrontier.lighting\`, and \`tfFrontier.cyberAtmosphere\` diagnostics. Four colored rings with local illumination; programmable warm-amber, electric-blue, violet-magenta color presets. Effects update from the existing projector update loop and transition off with retracting platforms.

**Object actions:** All four pre-existing floor platforms have a click/E customization panel while raised. Available geometry: original/icosahedron/dodecahedron/octahedron/sphere/cube/torus/torusKnot/cone. Patterns: spin/hover/orbit/figure8/pendulum/helix/static. Validated speed and intensity bounds. Shatter is an additive optical effect, not computational fracturing, and returns to original form. Settings persist *per browser*, not yet authoritative multiplayer state.

**Chat:** \`C\` toggles the left dock if focus is not an editable text control. The dock refuses message input until it is bound to the existing authenticated room chat stream. \`tfFrontier.bindTeamChatTransport({subscribe,send,history?})\` supplies that adapter. Message authors and text render via safe \`textContent\`; no stored HTML. A team-shared chat claim requires a source-matched bridge to the **actual live room** WebSocket, which has not been imported into this branch.

**Debugger:** In-room editor remains a repository file editor, not an executable host terminal; a labeled Codespaces link accesses a **real** isolated debugger and terminal. VS Code \`.vscode/launch.json\` has two runnable isolated Node test/debug configurations; \`.vscode/tasks.json\` provides one-click graphics + interaction test task.

## DESIGN

The art direction is **original cyber-spectral lighting**: deep-black graphite, sapphire/cyan ionization, violet/magenta charge lines, gold ember accents, disciplined separation of dark surfaces and bright light sources, saturated ring portals with a bright optical core and a broad diffused aura. Artistic inspiration is the **high contrast, radiant portal and ember quality** of *Awake/Ascend*, NOT copied album covers, character silhouettes, phoenix motifs, proprietary artwork, logos or video assets.

The current implementation uses an additive transparency halo, actual limited-range point-light illumination, and emissive materials; it does **not** claim physically accurate bloom diffusion, cinema-grade ray-tracing, full HDRI light probes, environment reflections or photo-grounded texture maps. Production GLB/PBR assets must be licensed and integrated separately with observed visual comparison.

## PRESERVATION

- \`tools/install-frontier-lobby.mjs\` only updates **exact byte-matched previously reviewed Frontier module** inside the original Windows \`public/room.js\`; unrecognized edits fail closed.
- Original \`server.js\`, OAuth/cookies, \`.env\`, Tailscale and Cloudflare settings, workstation APIs, 3D movement math, room voice and teammate files are **never modified** by this graphics feature.
- **The AURA installer still fails against original live \`room.js\` SHA-256 \`A494702CE2B940DF904A99116A05CB8BFC983D34C63F07327B68122F6EE77CC2\`.** Graphics execution must not disable, modify or bypass its independent safety gate; do not pass \`-StageIntelligence\` while that mismatch persists.
- Source CI is **not** visual or multiplayer certification. GPU FPS p50/p95, two-client synchronous settings, and chat delivery remain unverified until local host + real teammate testing.

## API and release verification

**Local runtime controls:**
- \`tfFrontier.configurePedestal(0,{shape:"sphere",pattern:"orbit",color:"magenta",speed:1,intensity:1.2})\`
- \`tfFrontier.shatterPedestal(0)\`
- \`tfFrontier.setLighting("electric-dusk",1.0)\`
- \`tfFrontier.setCinematicFidelity(true)\`
- \`tfFrontier.toggleChat()\`
- \`tfFrontier.bindTeamChatTransport(authenticatedExistingRoomChatAdapter)\`
- \`tfFrontier.mountReviewedGLB({manifest,loader})\` with approved local asset + SHA-256.

**Host install candidate:** fetch into isolated Git worktree rather than checkout/force resetting \`Desktop/Towerflow_Upgraded\`. Run: \`node --test integrations/frontier/cinematic-fidelity.test.cjs integrations/frontier/experience-upgrades.test.cjs integrations/frontier/cyber-ambience.test.cjs integrations/frontier/projector-machine.test.cjs tools/install-frontier-lobby.test.mjs\`. Then \`node tools/install-frontier-lobby.mjs --dry-run\`; only if this passes proceed with \`--apply\`. Refresh the original authenticated room browser. No host Node restart is required for inlined, browser-only module changes. In-house host AI service staging remains separate.

**Independent acceptance gates:**
1. CODE: syntax, bounded transforms, no remote asset URL, UI keyboard precedence, invalid inputs rejected, hash verification, reversible mutation.
2. PATTERN: demonstrate each of four original platform clicks, every motion pattern, C opens *left* dock, genuine debugger, real photogenic glow and projector functionality.
3. PRESERVATION: original room SHA before/after; non-Frontier region byte-identical; no OAuth/session regression; wall A/B; unchanged user ceiling settings; real frame-time p50/p95; two members see verified synced chat only after adapter integration.

**Promotion status:** Development source only. No run or authentic hardware visual evidence sufficient to claim zero degradation or ≥80% functional reliability. Do not merge to \`dev\` or tell teammates new features are live without verification.

## Visual references and authoritative engineering docs

- ILLENIUM, *Awake*: https://www.beatport.com/release/awake/2117466
- ILLENIUM, *Ascend*: https://www.universal-music.de/illenium/musik/ascend-552666
- Khronos glTF 2.0: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Three.js physically based color and lighting: https://threejs.org/manual/#en/color-management
- GitHub Codespaces: https://docs.github.com/en/codespaces
- VS Code JavaScript debugging: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
