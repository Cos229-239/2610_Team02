# Towerflow: four IDEs, one repository

Use **both Microsoft Visual Studio Community and Visual Studio Code**, plus Cursor and Google Antigravity. All editors point to one Git checkout at `C:\Users\dulsk\Desktop\Team2`.

| IDE | Open | Primary role |
|---|---|---|
| Visual Studio Community (2022/2026, as supported) | `Towerflow-Team02.sln` | Solution navigation and local code inspection; Node debugging requires the supported JavaScript/Node tooling and may need separate configuration. |
| Visual Studio Code | `Towerflow-Team02.code-workspace` | JavaScript/Node editing, test tasks, Git Source Control |
| Cursor | Repository folder `C:\Users\dulsk\Desktop\Team2` | AI-assisted changes on feature branches |
| Google Antigravity | Repository folder `C:\Users\dulsk\Desktop\Team2` | Agent-assisted planning, coding, testing |

**Do not install four copies of Towerflow**. All four IDEs use the same Git source, ideally not editing the same file simultaneously. The `.sln` here groups existing source files as **Solution Items**, not a runnable JavaScript project, and it does not itself start or attach to Node. It is safe to open but is not yet a full Visual Studio debugger integration.

## Sync caveat
`collaboration-room/live-room/` only contains the live application after the import script was run on the Windows host. Those untracked files are currently local; they are **not** in the PR and are not accessible to remote GitHub tools until reviewed and committed. Keep secrets out of Git. Do not run `git add .` on an unreviewed import.

## Browser refresh and teammate disruption
- Static client file update: running Node usually stays up; existing clients stay connected but use old JS until their own reload.
- One client's browser reload: that client briefly disconnects; other clients remain connected.
- Node process restart: drops all clients' current WebSocket connections. Automatic reconnect and presence restoration have **not** been verified.
- Never restart a live team session for a browser-only fix unless serving behavior requires it.

## Recommended release process
1. Import and review actual live room source.
2. Feature branch and tests, then PR into `dev`.
3. Stage only reviewed static assets for hot deployment with backup and health check; notify browsers to update.
4. Deploy backend changes with an announced maintenance/reconnection plan and rollback path.

Live origin is published via Tailscale Funnel; do not publish IDE ports, terminals, workspace filesystem, or coding agents on the public Funnel address.
