# Team 02 Towerflow — shared editor and agent instructions

## Repository roles
- Shared GitHub integration branch: `dev`. Make work on focused feature branches and use pull requests.
- Canonical live-room source under migration: `collaboration-room/live-room/` (imported from the Windows host). Do not assume it is complete until reviewed and committed.
- The live Windows deployment is **not** automatically updated by Git commits or IDE edits.
- Older Foundry movement tests are in `collaboration-room/input/`. Do not mistake that standalone module for the currently deployed room controller.

## Movement behavior
- **Live Towerflow uses Option A (camera-relative first-person movement)**: W moves forward in the viewing direction; S backward; A/D strafe. Preserve the verified sign-corrected formula: `vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side`, `vz=-Math.cos(yaw)*fw-Math.sin(yaw)*side`. The standalone Foundry test module may use different world-fixed requirements.
- Shift increases movement speed.
- IJKL adjusts the camera; movement follows camera yaw.
- Normalize diagonal movement to prevent speed boosts, respect position boundaries, and preserve multiplayer move broadcasts.
- Add or run deterministic tests; inspect the live room's actual `public/room.js` before claiming the bug is fixed.

## Security and deployment
- Never commit or print `.env`, OAuth secrets, session keys, certificates, logs, or `node_modules`.
- Public Tailscale Funnel exposes the room; do NOT put VS Code server, terminals, or arbitrary command execution behind that public URL.
- Keep repo/write and privileged server endpoints authenticated and properly authorized, not merely OAuth-login gated.
- Prefer reviewed GitHub PRs and a separate deployment step with rollback, rather than editing the public live server from several IDEs.
- A browser refresh loads updated static JS for that viewer, but a Node server restart disconnects WebSocket clients; reconnect may not retain in-memory presence, calls, or chat.
- Never assert that collaborators stay connected across restarts without actual reconnect-and-state tests.

## IDE practices
- Use the same local Git checkout (`C:\Users\dulsk\Desktop\Team2`) in VS Code, Cursor, or Antigravity, but avoid simultaneous agents editing the same files.
- Read the applicable project state before making edits; examine diff, run tests, and propose a PR.
- The `Towerflow-Team02.code-workspace` file is intended for VS Code-compatible editors.
- A full sync or live deployment must be explicitly verified; GitHub changes alone do not update the locally hosted room.
