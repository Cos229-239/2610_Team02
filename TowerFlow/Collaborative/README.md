# TowerFlow — Collaboration Room

**Current runnable starting point:** [room/](room/) — a GitHub-connected room application with repository selection, live participant presence, task/goal/suggestion capture as GitHub Issues, branch browsing, and a browser IDE launch.

## Run the room
See [room/README.md](room/README.md) for the GitHub OAuth setup and local run instructions. The application runs locally with Node.js; no database or paid hosting is required for this first slice.

## Product direction
Towerflow is a shared production room, not a project-management dashboard. People enter one workspace, connect to the project repository, see teammates as colored orbs, open the IDE, post tasks/goals/suggestions, and follow the project's Git activity.

GitHub is the source of truth for repository access, code, branches, issues, and pull requests. Towerflow is the collaboration layer around that work.

## Implementation status
- Implemented in this branch: GitHub OAuth flow, repository picker, 3D room scene, WebSocket presence, colored participant orbs, basic movement, GitHub issue creation/listing, branch browsing, and GitHub browser IDE launch.
- Not yet implemented: durable user sessions, invitation links and room roles, simultaneous shared editor (Monaco + Yjs), individual code-server workspaces, Git diff/review/checkpoint UI, and integrated application preview/asset contribution.
- The current server stores sessions and presence in memory. It is a local development build, not production-ready.
- The standalone [production-desk.html](production-desk.html) remains as a prior prototype; it is no longer the primary product direction.
- The old Supabase prototype is retired and must not be configured or deployed.

The existing portfolio dashboard and native C++ project remain untouched. No merge, external deployment, or paid service has been authorized.
