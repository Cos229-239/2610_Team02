# Towerflow live room + Visual Studio Code workflow

## Current state (do not confuse these projects)
- **Live room on Dan's Windows machine:** `C:\Users\dulsk\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room` — Node server on `127.0.0.1:4173`; externally published with Tailscale Funnel.
- **Shared GitHub repo:** `Cos229-239/2610_Team02`, integration branch `dev`. The live room is not automatically synchronized with this repository.
- **Foundry movement module:** `collaboration-room/input/world-movement.js` is merged into `dev`, but the live room's `public/room.js` is a different file and does not yet import it.
- **VS Code workspace:** `Towerflow-Team02.code-workspace` opens the repository and imported room (once imported).

## Initial import (on the Windows PC hosting the room)
1. Clone or open a local checkout of the Team 02 GitHub repository on the `dev` branch and pull latest changes.
2. Get this integration branch or its merged contents into your local checkout.
3. Open PowerShell in the repo root and run:
   `& .\tools\import-local-towerflow-room.ps1 -OpenVSCode`
4. Review changes in VS Code's Source Control view. The importer copies only `server.js`, package manifests, and assets inside `public`. It never intentionally imports `.env`, private keys, token files, or logs. Still inspect every diff before making the repo public or pushing.
5. Create a feature branch, commit reviewed changes, and open a PR targeting `dev`. Do **not** push credentials.

The script leaves the original local room running. It imports a *copy* into `collaboration-room/live-room` and does not automatically deploy GitHub changes back to the live server. That reverse-sync path must be deliberately designed with rollback, review, and access controls.

## Updating and testing movement
- `W/S` should map to north/south (negative/positive world Z), and `A/D` to west/east (negative/positive world X), independent of camera yaw.
- Confirm the actual `public/room.js` implementation after importing. Do not assume the standalone Foundry movement module is wired into it.
- Run the unit tests in the Foundry module: `node --test collaboration-room/input/world-movement.test.mjs`.
- Test controls in the live room only after reviewed code has been deployed.

## VS Code integration
Open `Towerflow-Team02.code-workspace`. Use **Source Control** for branches and PRs, **Explorer** for file editing, and the integrated terminal for tests. VS Code runs locally; opening a browser room is not the same as opening the server's filesystem. Do not expose the VS Code remote server or unauthenticated terminal over the public Funnel address.

## Tailscale and GitHub authentication
The intended stable origin is `https://dulsky.tail0ef7c0.ts.net` and the callback is `https://dulsky.tail0ef7c0.ts.net/auth/github/callback`. These are settings of the local deployment, not the GitHub repository. `.env` stays on the host computer and never belongs in git. GitHub OAuth callback configuration lives in the OAuth application's developer settings.

## Team security
Funnel is public. Validate GitHub collaborator authorization and protection on every repository-reading, repository-writing, and interactive execution endpoint before sharing. Successful OAuth login by one account is not sufficient evidence that other accounts are authorized or unauthorized users are blocked.
