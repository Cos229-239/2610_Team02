# Towerflow Configuration Agent v1

## Purpose
Configure **the browser-based Towerflow Development Room** without starting desktop IDEs or exposing your Windows desktop. The agent is a **local, deterministic configuration tool**, not an autonomous AI with arbitrary operating-system privileges.

Configuration is in `tools/towerflow-config.json`. Four development stations display their genuine capabilities and GitHub repository link. A workstation may use Towerflow's existing browser editor; this does **not** embed Microsoft Visual Studio Community, VS Code, Cursor, or Antigravity as desktop processes.

## Safe commands
Open PowerShell in `C:\Users\dulsk\Desktop\Team2` after retrieving the three agent files from PR #8:

```powershell
node .\tools\towerflow-config-agent.mjs --dry-run
node --test .\tools\towerflow-config-agent.test.mjs
node .\tools\towerflow-config-agent.mjs --apply
```

The **dry run** verifies both copies of `room.js` are present and syntactically valid before any modifications. The **apply** operation backs up each modified room file under `Desktop\Towerflow_Configuration_Backups`, then replaces only the bounded config-agent block and adds an IDE panel hook, leaving camera-relative movement unchanged.

The tool is idempotent: repeating the same configuration yields no changes. It refuses to proceed if the previously installed `TF_DEV_ROOM_V1` room, the confirmed Option A movement formula, or known IDE interaction anchors are absent. No arbitrary shell commands or extensions from the configuration file are executed.

## What is not integrated yet
- No desktop IDE is started, controlled, streamed, or embedded by Towerflow.
- No remote API keys or AI model credentials are configured.
- No GitHub commit, push, pull-request merge, or server restart is performed.
- No visual layout redesign or additional 3D geometry is deployed in this version.
- No agent automatically writes new features to GitHub. Editing the repository uses the existing authenticated API and review workflow.
- A code deployment is not complete until GitHub review and host sync are verified.

## Extension architecture
Future integrations should implement a documented **capability interface** (read-only project navigation, audited diff preview, workspace-specific source editing, test status), enforce server-side collaborator authorization, and keep privileged desktop operations behind a private authenticated channel. Every extension must provide fixture-based tests, a schema/version upgrade, a rollback route, and accessibility checks before promotion into the public room.

## Updates and teammate continuity
The agent patches the locally served `public/room.js` file. Browsers need to refresh to load it. Node/Tailscale are not restarted. Another teammate's browser stays connected until they choose to reload; the reloading user briefly reconnects to the room.
