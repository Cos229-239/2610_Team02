# Towerflow World Knowledge — verified baseline (2026-11-09)

## Purpose
Towerflow is the Team 02 collaborative browser-based 3D environment connected to the GitHub repository `Cos229-239/2610_Team02`. This file is a **curated source**, not a substitute for inspecting the deployed source or live behavior. Update with reviewed commits after changes are verified.

## Confirmed scene and navigation
- Browser scene uses Three.js perspective camera and WebGL renderer.
- Atrium dimensions are approximately 42 × 32 scene units with six initial workstation categories: Code Nexus (IDE), AI Studio, Tactical Board, Team Portal, Sound Garden and Link Hub.
- Entering the room is gated by a GitHub sign-in flow; authorization must also be checked server-side for sensitive operations.
- The user confirmed the live first-person controller works using camera-relative W/S movement, A/D strafing, Shift sprint and I/J/K/L looking controls. The verified horizontal vectors are `vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side` and `vz=-Math.cos(yaw)*fw-Math.sin(yaw)*side`.
- The development chamber has been introduced in the live browser file with `TF_DEV_ROOM_V1`: a large entrance display in the atrium, a spatially offset second scene area and four IDE-labeled stations (Visual Studio Community, VS Code, Cursor, Google Antigravity).
- **Do not claim that the four desktop IDEs are actually running inside Towerflow.** Currently these stations share a browser source editor and GitHub project context, pending protected integrations.

## Collaboration
- Presence uses WebSocket under `/ws`, with join/leave/move/chat messages. Voice uses browser microphones and WebRTC.
- Browser-side JavaScript updates can be loaded by refreshing a client's tab; this briefly reconnects that client, not necessarily the rest of the team.
- Restarting the Node process interrupts all WebSocket connections; reliable reconnection/state restoration across restart has not been verified.

## Architecture and source-of-truth caution
- Live Windows Node app is a separate folder from the GitHub checkout. Source import was performed as a local copy; it has not automatically become a tracked remote GitHub file.
- The public room is hosted over Tailscale Funnel and the Node server listens locally on port 4173.
- GitHub source changes do not automatically deploy to the live host. Enforce review, secret scanning, tests, backups and rollback.
- The shared repository's integration branch is `dev`, with feature work via pull requests.
- The separate Foundry movement module in `collaboration-room/input` has historical world-fixed behavior and is NOT the deployed controller. Preserve the user-confirmed Option A first-person behavior in the live room.

## Assistant principles
- Distinguish verified code and user-tested behavior from proposed designs and assumptions.
- Retrieve from curated documentation, cite document sections/paths, and explicitly say when evidence is missing.
- Never claim that an IDE, AI model, or remote deployment is operational based on a displayed station or configuration file.
- Prevent unrestricted terminal/editor/API access over public Funnel. No autonomous production writes or Git merges without review and approval.
- Never store OAuth tokens, API keys, full chat logs, or teammate personal data in the assistant's long-term memory.
