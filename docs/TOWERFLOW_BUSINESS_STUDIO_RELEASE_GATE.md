# TowerFlow Business Studio: audited release blueprint

## Preservation and operational truth

Latest live diagnostic from the user showed `public/room.js` SHA-256 `de4449d398211135b6e525d9a0f6e73400d3983b15bf5f056081d6cefe103a07`, with the original Business Studio projector and IDE dispatch **present**. The previous nine-file staging attempt correctly **BLOCKED** eight customized module hashes and made **zero changes**. Do not overwrite the live scene, replace Azure Bridge modules, or use a generic `git reset`/force merge. This draft branch does **not** deploy automatically.

The new `tools/towerflow-reconcile-business-v1.cjs` is independent of the earlier UI updater. It patches **only** uniquely audited in-world wall controls, team stations, and map markers into the existing customized scene, adds a small authenticated server extension, and stages `business-signals.cjs`, `team-stations.cjs`, `team-stations.js`, `azure-workspace-harness.cjs`, `azure-workspace-harness.js`, and `azure-local-reasoner.cjs`. It does **not** replace the locally customized `two-mode-contribute.js`, `app-hub.js`, `azure-ai-connect.js`, `ide-workstations.js`, `direct-integration.cjs`, `source-navigation.cjs` or `loadout.css`. Before writing anything, it checks expected anchors, reconstructs the original scene byte-for-byte from the proposed result, validates JavaScript syntax, and refuses incomplete or unknown feature blocks. The tool supports explicit `--plan` and `--apply`, with checksum checks and rollback on failed writes.

### Read-only Windows PowerShell acceptance

```powershell
& {
 $ErrorActionPreference='Stop'
 $room=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
 $checkout=Join-Path $env:TEMP ('TowerFlow-BusinessReview-'+[guid]::NewGuid().ToString('N'))
 try {
   git clone --quiet --depth 1 --single-branch --branch feature/business-studio-team-world-signals-20261120 https://github.com/Cos229-239/2610_Team02.git $checkout
   if($LASTEXITCODE -ne 0){throw 'Review checkout failed'}
   node --test (Join-Path $checkout 'tools\towerflow-reconcile-business-v1.test.cjs')
   if($LASTEXITCODE -ne 0){throw 'Preservation tests failed'}
   node (Join-Path $checkout 'tools\towerflow-reconcile-business-v1.cjs') $room --plan
   if($LASTEXITCODE -ne 0){throw 'Host code is not compatible; do not apply'}
   Write-Host 'PLAN PASSED. No production files changed.'
 } finally { if(Test-Path $checkout){Remove-Item -LiteralPath $checkout -Recurse -Force} }
}
```

Only after the host-specific plan passes and release PR is reviewed should the same tool be used with `--apply`. The Node server must be restarted using the already-working TowerFlow/Tailscale boot launcher to mount new API routes; a browser refresh alone cannot load absent .cjs modules. Opening the app and hard-refreshing **does not** merge PRs. Use physical click/E and two-account tests after restart.

## Business Studio wall projector

Four transparent raycastable wall faces are registered **behind existing clickable station screens**, so a visible station can remain in the foreground. Clicking the wall aims the **cloned** Development Room projector, spot light, translucent cone and branded screen. The original atrium projector and its independent four-wall state machine are preserved.

The wall surface shows a **branded in-world presentation**, *not* an actual rasterization of an HTML iframe to a Three.js texture. Clicking the Business Studio projector offers a real same-origin TowerFlow application iframe, where its actual interactive controls run. The Source/IDE/Team buttons remain separate.

## World sales signals and correctness

A genuine global transactional heatmap cannot be produced from stock quotes or anonymous stock trades alone. A broker's trade stream may report fills, asset symbols, timestamps and execution prices, but **not the merchant/customer's physical sales region or reliable profit**. The prototype only shows dots when an authorized business-transaction file is connected and contains explicit coarse geographic coordinates and a trustworthy net amount.

Source contract: a configured absolute UTF-8 JSON-lines ledger path in `.env`:

```dotenv
TOWERFLOW_BUSINESS_EVENTS_FILE=C:\TowerFlowData\approved-business-events.jsonl
```

Each line must be a normalized, real transaction record resembling:

```json
{"event_id":"EXAMPLE-DO-NOT-IMPORT","kind":"sale","net_revenue_cents":1250,"latitude":40.7,"longitude":-74.0,"currency":"USD","occurred_at":"2026-11-20T00:15:00Z"}
```

The example above is a **schema demonstration only**, not an actual transaction. The backend reads at most 1 MiB, accepts only events from the last 24 hours, and shows the newest 80 valid events. The frontend polls every ~7 seconds when active, with a 100 ms dot-pulse update (no extra heavy render loop). Colors: green for positive reported net business revenue; yellow for exactly balanced (zero); red for refund, return, or negative net amount.

Locations are rounded to approximately 0.1 degree. **Original event IDs are never exposed**: the backend HMACs them using an ephemeral session salt, and raw financial amounts/customer information are omitted from responses. The file's integrity and source legitimacy are **not independently verified**; the mode is `CONFIGURED_LEDGER`, not `LIVE_PROVIDER_VERIFIED`. Without the file the sphere reports `UNCONFIGURED` and displays **zero live dots**. The clearly labeled DEMO button can visualize synthetic red/yellow/green pulses, never mixed with the live mode.

Before claiming real results, an operator must build a legitimate approved POS/commerce/accounting adapter, confirm business-region geolocation and cost/basis calculations, and audit refund/reversal handling.

## Five individual GitHub stations

The in-world desks are backed by the contributor's **remote personal branch**, not an assumed common working tree. Users click or press E to open the latest pushed SHA, commit title/date, actual changed source files (from GitHub commit detail) and verified selected source files, with a refresh button. The five logged-in team accounts are:

| Account | Branch | Work areas | Verified source evidence |
| --- | --- | --- | --- |
| `Lopobunnie` | `WilliamPersonal` | Windows Forms + C++ | `TowerFlowWindow/TowerFlowWinForm/Form1.cs` and `TowerFlow.cpp` **both exist** on that personal branch |
| `svn-760` | `MalikPersonal` | Inventory and operations | Expected dev file path is not present at the same location on the personal branch; the latest changed-files API supplies true paths |
| `HyperRealmEnd` | `OmarionPersonal` | Inventory and reporting | `Towerflow_OW/TowerFlow.slnx` verified |
| `DaynaPerezColon` | `DaynaPersonal` | Interface | `DisplayHelper.h` verified |
| `Dulskinator96` | `DanielPersonal` | Collaboration / room | Some dev-path files differ on the personal branch; latest pushed changed-file evidence is authoritative |

**William's file inspection:** `Form1.cs` starts with comments explaining Ctrl+F5 (run without debugging) and F5 (debugging). `TowerFlow.cpp` includes the same F5/Ctrl+F5 instructions before `main()`. These are comments, **not proof that the Visual Studio debugger has been run successfully on the teammate's Windows PC**. A GitHub Desktop commit without *Push origin* cannot be seen by the shared host; a pushed branch is not automatically merged into `dev`.

## Azure availability in both business and collaboration

The actual TowerFlow business web app now includes a small **AZURE** control that can issue same-origin, allowlisted UI actions to its **authenticated parent room iframe**: open provider connection handoff, world sales panel, development IDE, member stations or Business Studio projector. The parent checks sender origin and verifies the source iframe. A standalone browser app has no shared AI session, and displays this limitation. No paid external model API, inferred AI repository write access, unreviewed code generation, or session-token relay is added by this control.

**The Azure control is a native command surface, NOT a confirmed standalone intelligent model**. An actual external ChatGPT/Cursor/Gemini/Antigravity/Venice model needs a separately authorized connection and proof of its repository read/write tools. AI-integration claims remain unverified until a real provider performs a repository read and edited-draft-PR task.

The app's production publish tool `tools/import-room-app.cjs` reads **`dev`** as its source. Therefore the business-app AZURE button and its script cannot appear in the published iframe from this draft branch alone. Merging/deploying that app is a separate, reviewed release operation.

## Remaining physical acceptance gates

- Verify four business room wall click targets and E interactions without blocking original IDE screens/return portal.
- Confirm business lens and beam aim accurately, and the clickable projected screen opens the working TowerFlow iframe.
- Confirm world label no longer obstructs Earth in the **actual customized host**, which may also contain another non-repository AZURE plaque. Inspect that exact host's source before attempting to move it.
- Test two accounts (one including Lopobunnie) with branch push/refresh and Form1.cs/TowerFlow.cpp change detection.
- Test installed Cursor and Antigravity IDEs opening their own authorized Git checkouts, plus VS Code F5 breakpoints on isolated port 4174.
- Do not claim a live revenue feed or AI-code integration until the source and provider permission gates pass.

## Azure intent harness: Megan × Laura × Pixi, with proof boundaries

Reviewed the **actual private** `Dulskinator96/AscendenceAgent007` repository, including `megan3_brain.py` in `feature/megan3-local-intake-desktop-20261119`, `laura_core.py`, `laura_mcp.py`, `laura_runtime.py`, `pixi_integration.py` and `forge_vision_gate.py`. **No private files, tokens, model weights, personal databases or service URLs are copied into Team 02**. We reused patterns/contract ideas, not confidential implementation.

Portable ingredients: **Megan** → bounded requests, clear intent/preview separation, local Ollama with no downloads; **Laura** → typed assignment validation, auth-gated tool dispatch, immutable evidence and operator control; **Pixi** → distinct transport, evidence and task-success gates. These form a small Azure coordinator in the public team checkout rather than a parallel imported AI system.

- `azure-workspace-harness.cjs`: signed-in prompt → bounded component/intent registry → approved GitHub `dev` file lookup using the **member's own OAuth token**, only server-side → verified source receipt → chosen IDE workstation. Ambiguous prompts refuse to guess. No shells or source writes.
- `azure-workspace-harness.js`: minimal conversation box; choose VS Code, Visual Studio Community, Cursor or Antigravity; open the source at the validated path (subject to a personally paired local IDE companion), or copy a source-grounded coding task into a separately authorized AI.
- `azure-local-reasoner.cjs`: **optional** local Ollama intent classifier, disabled by default; enabled only by setting `TOWERFLOW_AZURE_MODEL` to an actually installed local model (for example `dolphin-llama3:8b`). It returns *unverified model suggestions* strictly constrained to registered source areas and operations. **It does not write code, connect external AI browser tabs, launch IDE processes or possess GitHub tokens.**

Workflow: **Original prompt → deterministic source registry (or optional typed local-model suggestion) → GitHub source proof → exact personal IDE source → build/debug/review with independent evidence → teammate draft PR.** Local inference is a free, opt-in feature, not an external paid model API. A complete prompt-to-code-changing autonomous Azure agent remains a *future* permissioned milestone and must not be claimed as finished by the presence of this harness. A genuine next-phase agent must obtain **user-approved scopes**, personal working-branch isolation, source hash preservation, test runner, rollback, review and measured end-to-end ≥80% reliability before it is permitted to act.

**Note:** The actual TowerFlow business web app now has a separate, small `AZURE` action menu in `TowerFlow/azure-business.js`, but the room's existing `tools/import-room-app.cjs` publishes strictly from the **dev** branch. This new script and its `index.html` tag will not appear in the published application merely because the draft PR exists or the room is restarted. The app publish process has its own guarded release gate.
