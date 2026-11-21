# TowerFlow live-room agent rules — preserve accepted scene

1. Read [ADR-20261121-EXTERIOR-INTEGRATION-MEASUREMENT-GATES.md](ADR-20261121-EXTERIOR-INTEGRATION-MEASUREMENT-GATES.md) before touching live graphics. Read the detailed incident ADR on `feature/capital-window-world-emulation-20261121`.
2. The restored Windows `public/room.js` is the known-accepted visual baseline. SHA-256 `0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0`. Verify again; no assumptions about Git `dev` parity.
3. First perform read-only inventory using `tools/inspect-live-graphics-preservation.ps1`. Capture actual live window, material, and camera measurements and same-pose screenshots before choosing an integration approach.
4. Never copy feature `room.js` into the live server, replace the existing renderer/scene, cut walls, remap projector targets, or substitute a procedural skyline without measured viewport and occlusion tests.
5. Keep existing floor, window, ship, desks, auth, movement, dev-room, sound and multiplayer untouched. Prototype only a separate opt-in exterior adapter; weather effects remain outside.
6. Live preview, public asset parity, runtime WebGL behavior and actual visual acceptance are separate gates. A merge, code compile, mock transitions or HTTP 200 does not prove graphical quality. Do not promote unless all preservation-critical checks pass.
7. Never merge/clean/reset unresolved Git worktree changes; do not reconfigure Tailscale/Cloudflare or inspect secrets. Keep one working Node/Express server on the verified live directory.
8. Every Windows operator command copies sanitized results to clipboard; only print `PRESS CTRL + SHIFT + R IN YOUR BROWSER` **in the terminal** when updated live assets are actually served and ready to inspect. Do not claim visual approval before comparison.
