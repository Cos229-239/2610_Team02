# TowerFlow AI and IDE integration — verified capability matrix

## Acceptance verdict (2026-11-20)

**Scope:** Repository branch `feature/ide-provider-debug-proof-20261120`, stacked on PRs #33/#32. **Not installed on the running TowerFlow room or merged into dev.**

The JavaScript acceptance job observed **55/55 Node tests passed**, verified the 13 source registry entries below against actual files, exercised source-targeted simulated Windows IDE launches, parsed seven account-specific launcher scripts, tested Chrome browser functionality and triggered/resumed an actual breakpoint in `TowerFlow/app.js` on isolated test port **4174**. Windows and Linux companion jobs also completed successfully. **No real Windows GUI IDE/debugger launched by these mock tests.**

## Component-to-source contract

The authoritative mapping is `collaboration-room/azure-bridge/source-navigation.cjs`. Every entry has a unique anchored line in the source checked out by the contributor's own Git branch. The browser UI now exposes related files so a label such as **UI / Dashboard** cannot hide the required HTML+CSS+JS split.

| UI component | Primary code | Reference line in tested branch | Related sources |
| --- | --- | ---: | --- |
| UI / Interface | `TowerFlow/styles.css` | 1 | `index.html`, `app.js` |
| Dashboard | `TowerFlow/index.html` | 19 | `styles.css`, `app.js` |
| Markets | `TowerFlow/app.js` | 62 | — |
| Watchlist | `TowerFlow/app.js` | 49 | — |
| Portfolio | `TowerFlow/app.js` | 41 | — |
| Holdings | `TowerFlow/app.js` | 45 | — |
| Trading | `TowerFlow/app.js` | 68 | — |
| Analytics | `TowerFlow/app.js` | 60 | — |
| Charts | `TowerFlow/app.js` | 52 | — |
| Settings | `TowerFlow/app.js` | 89 | — |
| Backend/API | `TowerFlow/server.js` | 3 | — |
| Collaboration desk | `collaboration-room/azure-bridge/desk.js` | 2 | `collaboration-room/live-room/public/room.js`, `server.cjs` |
| 3D room scene | `collaboration-room/live-room/public/room.js` | 21 | `ide-workstations.js` |

**These line numbers are evidence for the tested Git checkout only**; at launch time the local companion recalculates the exact line against that teammate's personal branch, and rejects missing/ambiguous anchors instead of blindly jumping to an approximate location.

## Button/capability matrix

| Button | Actual behavior | Verified evidence | Gap |
| --- | --- | --- | --- |
| Contribute / Open code | Opens source selector and selected module | Browser smoke + source audit | Must verify on actual logged-in teammate device |
| Describe a change → Generate preview | Applies one of five allowlisted HTML/CSS transformations in an isolated preview | Browser CSS + dashboard test | Does not understand arbitrary prompts |
| Submit for team review | Creates a **draft PR** through authorized GitHub path, never auto-merges | Stubbed GitHub test | Real permissions and PR not executed on production |
| App integrations | Source picker, advanced PR/history actions | Browser smoke + app hub tests | Expanded advanced controls require deliberate click |
| Connect an AI / provider link | Opens selected provider and copies verified repository-oriented task handoff | Browser provider test | **Not** an OAuth or AI session connection |
| Verify my PR | Uses logged-in user's GitHub token server-side to check PR author/base/head/files | 2 endpoint tests | Does not prove which AI wrote the code |
| IDE: Open in VS Code | Opens selected personal checkout at anchored code line through paired PC companion | Simulated Windows launch tests for each source | Actual Windows executable/window must be verified |
| IDE: Open in Cursor | Passes personal checkout and exact source line, including `--classic` | Stubbed process spawn test | Cursor CLI flags should be checked on installed version |
| IDE: Visual Studio Community | Opens audited native solution or source in installed Visual Studio | Stubbed process spawn and allowlist test | Native F5 and workloads not physically validated |
| IDE: Antigravity | Launches detected local binary at audited checkout | Stubbed process spawn and allowlist test | Does not prove agent features or symbol navigation |
| IDE: Debugger (F5) guide | Explains checked-in browser vs Node presets, safe port **4174** | `.vscode/launch.json` + `tasks.json` audit, real Chrome test breakpoint | **Not** proof of an actual debugging session after launch; dynamic 3D room source may have mismatched line mappings |

## External AI: actual boundaries

A separate AI browser tab has **no inherited TowerFlow session, cookies, GitHub OAuth, or access to the contributor's PC**. Linking to an AI site and copying a prompt cannot overcome this boundary.

| Provider | Repository read route | Real coding/write route | Supported by current TowerFlow? |
| --- | --- | --- | --- |
| ChatGPT | Connect GitHub in that ChatGPT user's account | An authorized coding tool such as Codex or IDE with write privileges, if available | **Task handoff only**; standard GitHub app is read-only |
| Grok | Its own GitHub connector where available | Requires independently proven branch/edit/PR tools, not just search | **Task handoff only** |
| Gemini | Separate Gemini web chat does not inherit repo access | GitHub-authorized Gemini Code Assist in an IDE or a capable editor; **no Gemini CLI** | **Task handoff only** |
| Venice | Standalone Venice web chat has no verified native TowerFlow/GitHub connection | Separate supported agent/IDE runtime with authorized local workspace/GitHub access; APIs may incur cost | **Task handoff only** |
| Other AI | GitHub connector, approved local workspace, or provider native repository integration | Only if provider actually has write tools and signed-in author permissions | **Task handoff only** |

**Minimum qualifying live integration:** A real external AI must show (1) its active repository-capable tool name, (2) a successful authenticated read of `TowerFlow/index.html` at `dev`, (3) verified write capability through its own permitted tooling, (4) a scoped change with an actual test result, and (5) a contributor-authored **draft PR** showing those changes. Anything less is a handoff, **not integration**. Neither the draft PR nor its author proves which AI produced the code.

## Deployment gate and security

Refreshing or restarting the existing TowerFlow server loads **only its already-installed source**. Draft PR code has not been deployed to that host; refresh alone cannot add these upgrades. A controlled release requires a reviewed integration of stacked PRs, reconciliation with the customized live `public/room.js`, and staged update of the affected frontend, bridge, navigation and debugger files. Do not replace the running 3D scene wholesale, force merge, change teammate branches, or publish without owner review.

**Next:** Run the same source and F5 acceptance on the actual Windows team member PCs with two separate GitHub identities, then prove a **real provider repository read** before treating any AI button as connected.

## Safe, explicit host rollout (no scene replacement)

The verified release branch contains `tools/towerflow-stage-verified-ui.cjs`. Its `--plan` mode performs zero host writes and compares installed Azure module Git blob hashes with reviewed versions from prior PR candidates. The `--apply` mode updates **only nine explicit Azure JS/CSS/CJS files**, never `server.js`, `public/room.js`, Git branches, Cloudflare or Tailscale. Unexpected customized files are **BLOCKED and preserved**. Updated .cjs modules need the original host Node server to be restarted before their new routes are active. A stopped process may invalidate an OAuth login transaction; sign in again after restart.

Run on the TowerFlow host using **PowerShell**, not CMD:

```powershell
& {
  $ErrorActionPreference='Stop'
  $room=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
  $stage=Join-Path $env:TEMP ('TowerFlow-ReviewedUI-'+[guid]::NewGuid().ToString('N'))
  try {
    git clone --quiet --depth 1 --branch feature/ide-provider-debug-proof-20261120 --single-branch https://github.com/Cos229-239/2610_Team02.git $stage
    if($LASTEXITCODE -ne 0){throw 'Source checkout failed'}
    $tool=Join-Path $stage 'tools\towerflow-stage-verified-ui.cjs'
    node --test (Join-Path $stage 'tools\towerflow-stage-verified-ui.test.cjs')
    if($LASTEXITCODE -ne 0){throw 'Safety test failed'}
    node $tool $room --plan
    if($LASTEXITCODE -ne 0){throw 'Host customization/compatibility blocked; no changes attempted'}
    # Only after reviewing the paths and source hashes:
    # node $tool $room --apply
  } finally {
    if(Test-Path $stage){Remove-Item -LiteralPath $stage -Recurse -Force}
  }
}
```

Use the **explicit** `--apply` command only when the plan is accepted. Do not rerun the older generic installer as a shortcut. Before claiming successful operation, manually open the Development Room, test an authenticated source navigation and F5 breakpoint, and verify the external AI's own repo-read and repo-write permissions. The updater does not manufacture a connected AI or promote draft PRs.
