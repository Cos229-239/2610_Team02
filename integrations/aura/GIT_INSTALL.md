# Towerflow — Git-sourced AURA installation (no artifacts or ZIP)

**Review branch:** `feature/towerflow-vscode-live-room-sync` (PR #8 into `dev`).

The live source is NOT committed to GitHub. This integration instead fetches the reviewed installer, AURA client, server adapter, and world knowledge from the feature branch, then narrowly patches the EXISTING Windows live app. Do not upload `.env` or push the unreviewed local live room to GitHub.

## Existing live-world source baseline
- The user supplied a private review of the actual Node Express application.
- Live backend expected SHA-256: `0e973fd7be3878b5770bc561f9c158821f4e44f400912e3764b6c95adc700743`.
- Live and imported workspace `public/room.js` SHA-256: `63a8f1299c23bb0e80adc75d52b9223d89ee0f773aacac7b188d29f0863ba49f`.
- Installer stops without modification if files differ from these baselines or from an exact already-installed result. No destructive merge, no git checkout, no blind overwrite.

## What the installer does
- Adds `/api/aura/*` to the existing Express backend behind existing `auth` and `ensureMember` middleware, with a separately guarded AURA handler.
- Uses loopback `127.0.0.1:11434`, Qwen3 8B, reviewed `towerflow-knowledge/WORLD.md`, and consent-based, per-user private memory. Requests use rate limits and same-origin checks.
- Enables in-room AURA chat and memory UI at the existing AURA help/chaperone interaction. Browser users must refresh their tab to load the static UI.
- Fixes multiplayer move broadcasting into the second room (X around 62).
- Backs up any replaced files to `Desktop/Towerflow_AURA_Git_Backups/<timestamp>/` and writes a manifest.
- Does not restart Node, change secrets, run IDE desktop processes, push to GitHub, change branches, or grant AURA write access.

## What does not become active immediately
Backend routes require a **planned Node restart** because Node has already loaded `server.js`. Restart disconnects existing WebSockets. The installer does not restart the running server. In-room UI will show its backend is offline until the planned restart.

This release **does not embed full Visual Studio Community, VS Code, Cursor or Antigravity desktop interfaces**. Existing browser source editor and four capability/configuration panels remain. The authenticated source explorer can be improved without exposing Windows shells or remote desktop to Funnel.

## Test sequence
After fetching the new `tools/install-towerflow-aura-from-git.mjs`, the support files `integrations/aura/aura-service.cjs`, `integrations/aura/aura-room-client.js`, and `towerflow-knowledge/WORLD.md`, run:
```powershell
node --test .\tools\install-towerflow-aura-from-git.test.mjs .\integrations\aura\aura-service.test.cjs
node .\tools\install-towerflow-aura-from-git.mjs --dry-run
node .\tools\install-towerflow-aura-from-git.mjs --apply
```
Review the dry-run report before applying. The deployment has not been verified on the Windows host yet. GitHub CI validates fixture cases only, not the running team's authentication and WebSocket behavior.
