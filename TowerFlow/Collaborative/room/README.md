# Towerflow Collaboration Room

A local-first GitHub-connected development room with server-enforced room access.

## Included in this runtime slice
- GitHub OAuth sign-in; OAuth access tokens remain on the server.
- Repository picker for repositories available to the signed-in GitHub user.
- Shared 3D room with live presence over authenticated WebSockets.
- WASD movement and IJKL camera controls; keyboard input is ignored while typing in form controls.
- GitHub browser IDE link, branch browsing, and GitHub Issue-backed tasks/goals/suggestions.
- Private room membership with Owner, Editor, and Viewer roles.
- Hashed, expiring, use-limited invitations; owner-only invitation revocation and member role/removal controls.

## Run locally
1. Install Node.js 20+.
2. Create a GitHub OAuth App with callback URL `http://localhost:4173/auth/github/callback`.
3. Copy `.env.example` to `.env`; add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Never commit the real `.env`.
4. Run `npm install`, then `npm start`.
5. Open `http://localhost:4173`.

The OAuth app requests `read:user user:email repo` to list repositories and use the signed-in user's own GitHub permissions. Tokens are not returned to the browser. For shared invitation links, set `APP_URL` to the externally reachable HTTPS origin before sharing; do not expose the local development server directly to the public internet.

## Room access model
- A GitHub repository admin initializes the room and becomes its immutable Owner.
- Owner can create/revoke invitations, promote/demote Editors and Viewers, and remove non-owner members.
- Editor can read and create project issues; Viewer is read-only.
- Every room API request and WebSocket join checks room membership on the server. Current GitHub repository permissions are also checked; a Towerflow invite never grants GitHub repository access.
- Viewer invitations require GitHub read access. Editor invitations and Editor role assignments require GitHub write/maintain/admin access. A Viewer invite stays Viewer even if the recipient has GitHub write access.
- Invite tokens are 256-bit random values; only SHA-256 hashes are persisted. Invites expire in 1–30 days, have 1–100 uses, and can be revoked. Owner cannot be invited, demoted, or removed.
- Mutating browser requests require the configured same-origin Origin header. WebSocket upgrades require the same origin and a valid server session.

## Storage and operational limits
- Room, member, and invitation metadata are persisted in `data/rooms.json` using serialized in-process mutations and atomic file replacement. The store attempts restrictive directory/file modes (0700/0600 on POSIX); verify filesystem ACLs separately on Windows.
- This JSON store is intentionally single-process/local-MVP only. Do not run multiple server processes or multiple hosts against the same file. Before multi-instance or production/hybrid hosting, replace this adapter with a transactional shared database (for example self-hosted PostgreSQL) and add a durable shared session store, backups, monitoring, rate limits, and deployment-specific security review.
- Login sessions and live presence remain in memory. A server restart preserves room membership/invites but signs users out and clears presence.
- The IDE currently opens `github.dev`; individual code-server workspaces, Monaco/Yjs shared buffers, PR checkpoints, and integrated AI are not implemented yet.
- This remains a local development build, not production-ready. No Supabase or paid hosting is used.
