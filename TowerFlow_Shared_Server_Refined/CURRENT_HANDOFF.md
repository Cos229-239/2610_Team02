# TowerFlow Team 02 — Current Engineering Handoff

**Snapshot:** 2026-11-21 (America/New_York)  
**Primary repository:** `Cos229-239/2610_Team02`  
**Shared integration branch:** `dev`  
**Verified pre-handoff HEAD:** `74c87ce38667b1e77795479982a4f1b2a9f45e49`  
**Main deliverable:** `TowerFlow_Shared_Server_Refined/` (Node.js/browser inventory manager **v2.3.0**)  
**Status:** Source synchronized and 8/8 tests passed on the user's PC; **local production-style handoff and successful browser launch still unverified**.

> **Scope rule:** Team 02 is the shared inventory project. The former 3D Collaboration Chamber belongs to the private `Dulskinator96/AscendenceAgent007` workspace. Do not reintroduce its 3D scene, room server, Git/editor desks, multiplayer APIs, or Tailscale Funnel into Team 02's `dev`.

## 1. What is verified

| Area | Evidence-backed state |
| --- | --- |
| GitHub `dev` | Synced to `74c87ce` before this handoff; no `collaboration-room/` files remain in the complete `dev` Git tree. |
| Server source | `TowerFlow_Shared_Server_Refined/server.js`, `lib/`, `public/`, `test/`, and `reference/` are present. Node `>=20`; no runtime npm dependencies are declared. |
| Application tests | User's PowerShell output: `npm.cmd test` / `node --test` **8 tests passed, 0 failed** on Node `v24.14.1`. This validates the tested operations, **not** a current live browser/session. |
| Accounts | Local password accounts; first owner setup, administrator/editor roles, salted password hashes, restart-invalidated in-memory sessions. |
| Safety/data consistency | Inventory revisions reject stale writes; Azure Stock Guide requires a user-bound, one-time preview with five-minute expiry and explicit confirmation. |
| Contribution preservation | Dayna, Malik, Omarion, William and Daniel are credited; their features are **adapted** into the browser/server edition. Native C++ and C# sources are still separate. |
| Room migration | Original 40 room-related files moved into private AscendenceAgent007. A subsequent private GitHub Actions archive SHA-validated **344 unique blobs**, covering **1,614 room file references on 38 historical room-bearing branches**. These are preserved file snapshots, **not** a copy of full Git history. |
| Room authorization | New private room source is configured owner-only for `Dulskinator96`, without Team 02 member lookup/invite or multiplayer socket service. **New private runtime has not yet passed live browser acceptance.** |
| Room pull requests | 26 obsolete room-related PRs closed without merge. Three unrelated evaluation/learning PRs (#10, #11, #12) remained open at the audit. Team member access was not changed. |
| CI | Last checked Team 02 `dev` Actions run **failed**. `tools/check-inventory.sh` refers to Malik's `TowerFlow Files/TowerFlow (Malik modified)/tests/` paths that exist on `MalikPersonal`, not on `dev`. Confirm actual failing job logs before any corrective edit. |

## 2. Latest observed local system state — critical distinction

The user's repo checkout was at:
`%USERPROFILE%\Documents\GitHub\2610_Team02`.

Observed Windows PowerShell execution:
- `dev` fast-forwarded successfully from `677c411` to `74c87ce`.
- Fourteen modified generated `TowerFlowWinForm/bin/` and `obj/` build outputs were restored **only after validation**. No source-file modifications were reported at that time.
- `TowerFlow_Shared_Server_Refined` tests succeeded **8/8**.
- Port `4173` was then owned by Node PID `11668`, whose HTTP page identified **`Team 02 Collaboration Chamber`**, not the refined inventory application. That process's current state **has not subsequently been verified**.
- Tailscale `funnel status` later showed **only** `https://dulsky.tail0ef7c0.ts.net:8443 (tailnet only) -> http://127.0.0.1:8765`. Public port `443 -> 4173` Funnel was **already disabled**; retain the independent private `8443 -> 8765` connection.
- An idempotent port-transition PowerShell command was supplied, but **no successful execution output has been received**. **Do not claim port 4173 is running the refined server yet.**

**Security:** The refined Node server binds to `0.0.0.0` on `TOWERFLOW_PORT` (default `4173`), so access may extend across LAN/VPN interfaces. It uses HTTP; **do not expose it through a public Funnel, router forwarding or public reverse proxy**. Restrict Windows firewall to trusted private network/VPN as appropriate.

## 3. Canonical architecture

```text
Team 02 dev
└── TowerFlow_Shared_Server_Refined/
    ├── server.js                 HTTP routes, auth checks, persistence, live notices
    ├── lib/accounts.js          Local users, permissions, password verification, sessions
    ├── lib/inventory.js         Products, parts, locations, ledger, stock, orders, revisions
    ├── lib/import-legacy.js     Legacy parts/inventory import
    ├── lib/report.js            Dashboard/report export
    ├── lib/azure-guide.js       Deterministic stock commands and explicit apply
    ├── public/index.html        Inventory app shell
    ├── public/dashboard.html    Offline dashboard
    ├── public/app.js            Browser interaction and live refresh
    ├── public/styles.css        Presentation
    ├── reference/AzureStockGuide.cs   Unmodified C# attribution source; not executed
    ├── test/integration.test.js
    ├── test/azure-guide.test.js
    ├── data/.keep               Runtime account/inventory data untracked by design
    ├── CONTRIBUTIONS.md
    ├── INTEGRATION.md
    └── README.md
```

**Boundaries:**
- This is **not** the former 3D room and has no live Three.js chamber, team avatars, VS Code workstation, arbitrary code editing, or AI model orchestrator.
- The Azure Stock Guide is an **offline deterministic command interpreter**, not Microsoft Azure, a conversational LLM, or a cloud integration.
- The original C++ and WinForms applications are **not executed inside** the shared server.
- Persistence files `data/inventory.json`, `data/inventory.json.bak`, `data/accounts.json`, and `data/accounts.json.bak` are operationally significant. **Never reset, overwrite, commit, or clean these without checking ownership and obtaining explicit authorization.**

## 4. Feature coverage / contributors

| Contributor | Preserved functional contribution |
| --- | --- |
| **Dayna Perez Colon** | Product/item validation, categories, prices, quantity and minimum-stock behavior. |
| **Malik Brown** | Bulk stock set/clear, work orders, supplier purchase orders, receive-once safeguards, oversell prevention. |
| **Omarion Walter** | Product/location ledger, barcode/QR, purchase/sale/transfer movements, dashboards, export and legacy inventory import. |
| **William Jones** | Part and serial identifiers, revision, search, six-digit serials, parts-file import; independent WinForms source retained. |
| **Daniel Dulsky** | Azure Stock Guide behavior derived from `AzureStockGuide.cs` with confirmed stock adjustments, integrated into the shared server; private 3D room intentionally excluded. |

The application adds consolidated accounts, revision checking and notifications. See `CONTRIBUTIONS.md` and `INTEGRATION.md` for **original-source vs adapted/reimplemented** distinctions.

## 5. Safe next execution sequence

1. **Inspect before changing**: verify `git status --short --branch`, `git rev-parse HEAD` and current process identity on TCP 4173.
2. **Respect local work**: do not `git clean -fd`, `git reset --hard`, `git restore .`, or switch branches over changes. Generated tracked WinForms `bin/` and `obj/` outputs can change on Visual Studio builds; review exact paths before targeted restore.
3. **Update only safely**: `git fetch origin` then `git pull --ff-only origin dev` when on a clean `dev` checkout.
4. **Test**: inside `TowerFlow_Shared_Server_Refined/`, run `npm.cmd test`, require all 8 tests pass or investigate the changed test count.
5. **Check port 4173**: if old Chamber is still running, identify via process and HTTP response; stop **only the confirmed old process**. Preserve any unrelated application. Public Funnel must remain off.
6. **Launch**: set `$env:TOWERFLOW_PORT='4173'`, then run `node server.js` in the refined server directory. Server logs should show owner setup and private-network URL.
7. **Verify**: inspect HTTP 200 page title `TowerFlow · Inventory`, matching port-owner PID and real sign-in/owner screen. Do **not** create/reset owners if existing `accounts.json` is present.
8. **Accept**: test authorized login, stock edit, stale-edit rejection, Azure guide preview/confirm, accounts, and refresh across two browser clients. Record **actual results** before declaring rollout complete.
9. **Fix CI independently**: resolve the inventory-check branch/path discrepancy by agreement with the team; do not delete their original native work.

### PowerShell evidence collection — report automatically copied to clipboard

**Read-only.** This prints only port/process metadata, server HTTP title, Git state and tests; no process killing, branch switching, or data writes:

```powershell
& {
  $report = [System.Collections.Generic.List[string]]::new()
  function Record([string]$line) { Write-Host $line; [void]$report.Add($line) }
  try {
    $repo = Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
    $app = Join-Path $repo 'TowerFlow_Shared_Server_Refined'
    Record '=== TOWERFLOW CURRENT HANDOFF VERIFICATION ==='
    if (!(Test-Path (Join-Path $repo '.git'))) { throw "Missing Git checkout: $repo" }
    Record ('GIT BRANCH: ' + ((git -C $repo branch --show-current) | Out-String).Trim())
    Record ('GIT HEAD: ' + ((git -C $repo rev-parse HEAD) | Out-String).Trim())
    Record ('GIT STATUS: ' + ((git -C $repo status --short --branch) | Out-String).Trim())
    if (!(Test-Path (Join-Path $app 'server.js'))) { throw "Missing server: $app" }
    Record ('NODE: ' + ((node --version) | Out-String).Trim())
    $pids = @(Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($ownerPid in $pids) {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid"
      Record "PORT 4173 PID: $ownerPid; PROCESS: $($proc.Name); CMD: $($proc.CommandLine)"
    }
    if (!$pids.Count) { Record 'PORT 4173: NO LISTENER' }
    try {
      $page = Invoke-WebRequest 'http://127.0.0.1:4173/' -TimeoutSec 4
      $title = [regex]::Match([string]$page.Content,'(?is)<title>\s*(.*?)\s*</title>').Groups[1].Value
      Record "HTTP 4173: $($page.StatusCode); TITLE: $title"
    } catch { Record ('HTTP 4173: ' + $_.Exception.Message) }
    Record '=== DIAGNOSTIC COMPLETE ==='
  } catch { Record ('ERROR: ' + $_.Exception.Message) }
  finally {
    Set-Clipboard -Value ($report -join [Environment]::NewLine)
    Write-Host 'REPORT COPIED TO CLIPBOARD'
  }
}
```

## 6. Team workflow, quality gates, and known risks

- **Integration branch is `dev`**; contributors use personal or feature branches and PRs reviewed into `dev`. Never automatically merge someone's historical room branch back into `dev`.
- Current Team 02 CI has JavaScript checks plus Linux native inventory checks; the latter has the **known path problem** described above. The refined server's own `npm test` passed **locally**, but this does not mean CI is green.
- Potential operational risks: publicly exposed HTTP, port collision with old server, accidental account/inventory overwrite, incorrectly assumed owner initialization, generated WinForms output tracked by Git, and unverified remote browser access.
- Local `node server.js` process state, Tailscale route state, and actual client acceptance must be **measured after each restart**; a repo commit is not proof of deployment.
- The Ascendence private room source and archive exist independently. There is **no authorization to remove teammates from Team 02 GitHub**, and no reason to preserve the Team 02 room's former membership logic.

## 7. Definition of done for next operator

- [ ] `dev` checkout is on intended commit with local changes preserved.
- [ ] `npm.cmd test` passes; failures are investigated rather than bypassed.
- [ ] Port `4173` belongs to the correct refined server process, not the retired Chamber.
- [ ] No public Funnel routes traffic to `4173`.
- [ ] User can open, authenticate to, and use the shared inventory in a browser.
- [ ] Two authorized clients can observe shared stock updates and stale edits are rejected.
- [ ] Existing owner accounts and inventory survive restart.
- [ ] CI check-path mismatch is triaged with teammate-source preservation.
- [ ] Handoff evidence includes command output, observed UI result, and exact Git commit hash.

**Next task:** finish local runtime transition and browser acceptance for `TowerFlow_Shared_Server_Refined`; do **not** resume the old collaboration room in Team 02.
