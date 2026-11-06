# Towerflow Collaboration Room

A local-first room that connects collaborators to a GitHub repository.

## First usable slice
- GitHub OAuth sign-in; the access token remains server-side.
- Choose a repository available to the signed-in GitHub account.
- Shared room presence with colored orb identities and WASD movement.
- Open the selected repository in GitHub's VS Code for the Web editor.
- View and create tasks, goals, and suggestions as GitHub Issues.
- Browse repository branches.

## Run locally
1. Use Node.js 20 or newer.
2. Create a GitHub OAuth App with callback URL `http://localhost:4173/auth/github/callback`.
3. Copy `.env.example` to `.env`; fill in the OAuth client ID and secret.
4. Run `npm install`, then `npm start`.
5. Open `http://localhost:4173`.

The OAuth app requests `read:user user:email repo` to list repositories the user can access and create issues where they have write permission. Never commit the real `.env` file.

## Boundaries — not yet implemented
Sessions and presence are in memory and reset when the server restarts. The IDE button opens GitHub's browser editor; persistent individual code-server workspaces are not provisioned. Presence is live, but editor contents are not synchronized yet. The next major build step is Monaco + Yjs shared editing, followed by isolated per-person IDE workspaces, invitations/roles, durable room storage, pull-request workflows, and an application preview. This is a local development build, not production-hardened; do not expose it publicly as-is. No Supabase or paid hosting is used.
