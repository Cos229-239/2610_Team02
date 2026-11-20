# Azure — TowerFlow Workspace Harness

Status: **Draft PR #36**, stacked on #35/#34/#33/#32. Latest GitHub Actions: **86/86 Node tests passed**, all 6 CI jobs passed including browser and Windows/Linux companion scenarios. **Not merged into dev; not installed or tested on the user's live Windows room.**

## Research baseline and reuse boundaries

Review evidence from `Dulskinator96/AscendenceAgent007`:

| Source | Observed capability | Azure design reuse | Not claimed |
| --- | --- | --- | --- |
| `feature/megan3-local-intake-desktop-20261119:megan3_brain.py` | Ollama local turns; bounded file reads; SQLite session/history; prepare/diff/approve edits; explicit no arbitrary shell | Typed, bounded intake, source proof, preview, approval | Megan runtime copied into TowerFlow; unattended general edits |
| `main:laura_oracle.py` | Ten-scoped rule-based Oracle evaluator; intake provenance/constraints | Original objective SHA, explicit unknowns, guarded action route | A trained frontier oracle |
| `main:laura_runtime.py` / `knowledge.py` | Local model plan, bounded retrieval and source preservation | Source-backed read + evidence receipt; no fabricated embeddings | Model itself knows private repository without authorization |
| `main:pixi_integration.py` | Local request broker, capability checks, bounded UI read/dispatch, preserved source | Local mediation/authorization, no cross-tenant secrets | Original native Pixi's agent loop running inside TowerFlow |

Source architectures **inform**, but private project code, databases, keys, assets, and model weights are **not imported** into the Team 02 repository. Megan's intake product retention and original Pixi/Laura service reachability are not assumed.

## Azure capability path

```text
Authenticated Team 02 room member
   -> Azure textarea (preserve original words and SHA-256)
   -> explicit target or allowlisted area matcher (reject ambiguous)
   -> read dev file through member GitHub OAuth
   -> verify source path, blob SHA and unique anchored line when content available
   -> choose editor (VS Code / Visual Studio Community / Cursor / Antigravity)
   -> personally-paired local desktop companion opens member checkout at source line
   -> optional local Ollama suggests a source area (never receives write authority)
   -> for FIVE supported CSS/HTML requests only: isolated preview
   -> explicit user confirmation -> draft PR to dev (never merge or publish)
   -> review, actual tests, separate deployment
```

The workspace controller is capable of classification, source verification, presenting IDE-specific run/debug instructions, isolated preview and reviewed PR submission for *registered* transformations. **It is not a general autonomous software engineer or a universal prompt-to-code executor.** The chosen IDE's own agent account, if any, must independently prove its code tools and permissions.

### First supported transformations

Dashboard heading; dashboard description; holdings title; web app accent color; web app background color. All other requests: show exact source and open in preferred IDE; do not simulate success.

### Editor/tool contract

- VS Code: built-in `code --goto file:line` and checkout-scoped F5 launch configurations on port 4174; actual editor installation and debugger attachment on teammate's PC must be measured.
- Visual Studio Community: native solution/WinForms/C++ builds on Windows; installed workloads, project configuration and F5 must be verified separately; app web JS does not magically become a VS native project.
- Cursor: verified local executable/checkout/open file; optional agent tools are separate from process launch and may be account-dependent.
- Antigravity: local IDE and personally authorized workspace; never installs or requires Gemini CLI. Prompt injection/agent execution is **not** claimed from a file open.
- Project-wide `AGENTS.md` provides shared instructions for compatible IDE agents; `GEMINI.md` references the same guardrails. Neither grants repo access or installs an AI.

## Live deployment safety

The previous live preflight reported the real scene SHA-256:
`de4449d398211135b6e525d9a0f6e73400d3983b15bf5f056081d6cefe103a07`.
The old generic nine-file updater correctly rejected **eight locally customized Azure Bridge module hashes**. Do not overwrite or force-push them.

`tools/towerflow-reconcile-business-v1.cjs` uses explicit `--plan` then `--apply` only after host compatibility and owner review. It:
- Preserves every original scene byte outside narrow reviewed new code blocks.
- Adds Business Studio wall/teammate/Earth/Azure scene actions only at uniquely audited anchors.
- Extends the host's existing Bridge server without replacing unrelated routes.
- Creates only previously absent new Azure Workspace Harness/Local Reasoner, Business Signals, and Team Stations module files; blocks custom same-name files.
- Never replaces customized `app-hub.js`, `two-mode-contribute.js`, `azure-ai-connect.js`, `ide-workstations.js`, `source-navigation.cjs` or `loadout.css`.
- Runs Node syntax validation, stage checksum, and in-process rollback for failures.

**Use a read-only plan first.** In PowerShell:

```powershell
& {
 $ErrorActionPreference='Stop'
 $room=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
 $tmp=Join-Path $env:TEMP ('AzureReview-'+[guid]::NewGuid().ToString('N'))
 try {
   git clone --quiet --depth 1 --single-branch --branch feature/azure-command-harness-20261120 https://github.com/Cos229-239/2610_Team02.git $tmp
   if($LASTEXITCODE -ne 0){throw 'GitHub checkout failed'}
   node --test (Join-Path $tmp 'tools\towerflow-reconcile-business-v1.test.cjs')
   if($LASTEXITCODE -ne 0){throw 'Preservation regression failed'}
   node (Join-Path $tmp 'tools\towerflow-reconcile-business-v1.cjs') $room --plan
   if($LASTEXITCODE -ne 0){throw 'Host compatibility blocked. No installation attempted'}
   Write-Host 'READ-ONLY PLAN PASSED. No live files changed.' -ForegroundColor Green
 }finally{if(Test-Path $tmp){Remove-Item -LiteralPath $tmp -Recurse -Force}}
}
```

After a reviewed and passing plan, an explicit second run with `--apply` can stage the narrow update; the *existing* TowerFlow Node host process must restart once to load new CJS routes. Do not restart solely to bring in this draft branch: no code is installed by a refresh.

## Gate before claiming success

- Two separate GitHub accounts can use their own station and personal branch.
- Source content matches real repo, including personal-branch WinForms/C++ paths absent from dev.
- Azure source navigation, optional model suggestion, preview and draft PR work with the *actual* authenticated local host.
- Chosen real installed IDE opens the requested source and F5 hits a breakpoint where supported.
- No mutations outside reviewed files or changed 3D graphics; business globe is honest without real ledger and the projector targets actual requested walls.
