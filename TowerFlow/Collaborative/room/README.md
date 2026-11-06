# Towerflow Collaboration Room

A local-first GitHub-connected workspace.

## Included in this first runtime slice
- GitHub OAuth sign-in; access token stays on the server.
- Repository picker for repositories available to the signed-in user.
- Shared 3D room with live colored-orb presence over WebSockets.
- WASD movement and IJKL camera yaw controls; keyboard controls do not capture text-field input.
- Open the selected repository in GitHub's browser-based VS Code editor.
- Browse repository branches.
- Create tasks, goals, and suggestions as GitHub Issues with [TASK], [GOAL], and [SUGGESTION] prefixes.

## Run locally
1. Install Node.js 20+.
2. Create a GitHub OAuth App with callback URL `http://localhost:4173/auth/github/callback`.
3. Copy `.env.example` to `.env`; add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Never commit the real `.env`.
4. Run `npm install`, then `npm start`.
5. Open `http://localhost:4173`.

The OAuth app requests `read:user user:email repo` so it can list repositories the user can access and create issues where the user has write permission. Tokens are not returned to the browser.

## Current boundaries
- Session and room presence are in memory; server restart signs users out and clears presence.
- The IDE opens `github.dev`; persistent individual code-server workspaces are not yet provisioned.
- Presence is synchronized, but editor buffers are not yet shared.
- Invitations, room roles, durable storage, Monaco/Yjs collaboration, individual workspace containers, pull-request/checkpoint workflows, and an integrated Towerflow application preview remain future build phases.
- This is a local development build, not production-hardened. Do not expose it publicly as-is.
- No Supabase or paid hosting is used.
