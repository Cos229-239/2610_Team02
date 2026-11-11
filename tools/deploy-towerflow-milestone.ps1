# TOWERFLOW_MILESTONE_V1
# Version-pinned Git-first deployment. No Node restart, Git push or host code execution.
[CmdletBinding()]
param(
  [string]$Repo = (Join-Path $PSScriptRoot '..'),
  [string]$Branch = 'feature/towerflow-vscode-live-room-sync',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$report = [System.Collections.Generic.List[string]]::new()
$report.Add('=== TOWERFLOW PRODUCT + DEVELOPMENT MILESTONE ===')
$backup = $null
try {
  $Repo = (Resolve-Path -LiteralPath $Repo).Path
  $remote = (& git -C $Repo remote get-url origin 2>$null) -join ''
  if ($LASTEXITCODE -ne 0 -or $remote -notmatch '(^|/|:)Cos229-239/2610_Team02(\.git)?$') {
    throw 'Git origin is not the expected Team 02 repository.'
  }
  & git -C $Repo fetch origin $Branch
  if ($LASTEXITCODE -ne 0) { throw 'GitHub fetch failed.' }
  $sha = (& git -C $Repo rev-parse FETCH_HEAD) -join ''
  if ($sha -notmatch '^[a-f0-9]{40}$') { throw 'Unable to pin fetched revision.' }
  $report.Add('PINNED GITHUB REVISION: ' + $sha)
  $files = @(
    'TowerFlow/index.html','TowerFlow/app.js','TowerFlow/styles.css',
    'TowerFlow/inventory-core.js','TowerFlow/inventory-ui.js','TowerFlow/inventory-core.test.cjs',
    'TowerFlow/flow-core.js','TowerFlow/flow-ui.js','TowerFlow/flow-core.test.cjs',
    'TowerFlow/flow-agent-ui.js','TowerFlow/sales-globe.js','TowerFlow/sales-globe-realistic.js','TowerFlow/corporate-core.js','TowerFlow/corporate-core.test.cjs','TowerFlow/contributions.js','TowerFlow/contributions.json',
    'TowerFlow/flow-integration.test.cjs',
      'TowerFlow/corporate-core.test.cjs',
      'integrations/frontier/projector-machine.test.cjs',
      'integrations/collaboration/whiteboard-core.test.cjs',
      'integrations/agents/task-orchestrator.test.cjs',
    'integrations/frontier/frontier-lobby.js',
    'integrations/frontier/projector-machine.js','integrations/frontier/projector-machine.test.cjs',
    'integrations/collaboration/whiteboard-core.cjs','integrations/collaboration/whiteboard-core.test.cjs',
    'integrations/aura/aura-world-emulator.js',
    'integrations/world/world-state.cjs','integrations/world/world-sync-client.js',
    'integrations/world/world-state.test.cjs',
    'integrations/market/alpha-vantage.cjs','integrations/market/market-handler.cjs',
    'integrations/market/alpha-vantage.test.cjs','integrations/market/market-handler.test.cjs',
    'integrations/agents/towerflow-agent.cjs','integrations/agents/agent-handler.cjs',
    'integrations/agents/task-orchestrator.cjs','integrations/agents/task-orchestrator.test.cjs',
    'integrations/agents/flow-planner.cjs','integrations/agents/flow-planner.test.cjs',
    'integrations/agents/towerflow-agent.test.cjs','integrations/agents/agent-handler.test.cjs',
    'integrations/contributions/pr-reader.cjs','integrations/contributions/pr-reader.test.cjs',
    'integrations/mediator/configuration-mediator.cjs',
    'integrations/mediator/configuration-mediator.test.cjs',
    'tools/install-frontier-lobby.mjs','tools/install-frontier-lobby.test.mjs',
    'tools/install-towerflow-earth-texture.mjs','tools/install-towerflow-earth-texture.test.mjs',
    'tools/install-aura-world-emulation.mjs','tools/install-aura-world-emulation.test.mjs',
    'tools/install-towerflow-business-product.mjs',
    'tools/install-towerflow-business-product.test.mjs',
    'tools/install-shared-world-from-git.mjs','tools/install-shared-world-from-git.test.mjs',
    'tools/serve-portfolio-preview.cjs','tools/serve-portfolio-preview.test.cjs',
    'tools/towerflow-pr-synopsis.cjs','tools/towerflow-pr-synopsis.test.cjs',
    'tools/open-towerflow-ides.ps1','tools/preview-towerflow-contribution.ps1','tools/onboard-towerflow-contributor.ps1',
    'tools/verify-towerflow-agent-performance.cjs',
    '.devcontainer/devcontainer.json','.devcontainer/full-stack/devcontainer.json','.vsconfig'
  )
  $backup = Join-Path $env:USERPROFILE (
    'Desktop\Towerflow_Milestone_Source_Backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss')
  )
  New-Item -ItemType Directory -Path $backup -Force | Out-Null
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $manifest = [System.Collections.Generic.List[object]]::new()
  foreach ($file in $files) {
    $destination = Join-Path $Repo $file
    $spec = "$sha`:$file"
    # git show is a byte stream. Converting it through PowerShell's native
    # command text pipeline corrupts UTF-8 BOMs on some Windows hosts.
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = 'git'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $false
    foreach ($arg in @('-C', $Repo, 'show', $spec)) {
      [void]$psi.ArgumentList.Add($arg)
    }
    $process = [System.Diagnostics.Process]::Start($psi)
    $buffer = [System.IO.MemoryStream]::new()
    try {
      $process.StandardOutput.BaseStream.CopyTo($buffer)
      $process.WaitForExit()
      if ($process.ExitCode -ne 0) { throw "Git retrieval failed: $file" }
      $newBytes = $buffer.ToArray()
    } finally {
      $buffer.Dispose()
      $process.Dispose()
    }
    $oldSha = $null
    if (Test-Path -LiteralPath $destination) {
      $oldSha = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
      $copy = Join-Path $backup $file
      New-Item -ItemType Directory -Path (Split-Path $copy -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $destination -Destination $copy -Force
    }
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    [System.IO.File]::WriteAllBytes($destination,$newBytes)
    $newSha = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    $manifest.Add([pscustomobject]@{file=$file;before=$oldSha;after=$newSha})
    $report.Add('FETCHED: ' + $file)
  }
  $manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backup 'manifest.json') -Encoding utf8
  $report.Add('SOURCE BACKUPS: ' + $backup)
  Push-Location $Repo
  try {
    $checks = @(
      'TowerFlow/inventory-core.test.cjs',
      'TowerFlow/flow-core.test.cjs',
      'TowerFlow/flow-integration.test.cjs',
      'tools/install-towerflow-earth-texture.test.mjs',
      'tools/serve-portfolio-preview.test.cjs',
      'tools/install-towerflow-business-product.test.mjs',
      'integrations/mediator/configuration-mediator.test.cjs',
      'integrations/mediator/environment-profiles.test.cjs',
      'integrations/world/world-state.test.cjs',
      'integrations/market/alpha-vantage.test.cjs',
      'integrations/market/market-handler.test.cjs',
      'integrations/agents/towerflow-agent.test.cjs',
      'integrations/agents/agent-handler.test.cjs',
      'integrations/agents/flow-planner.test.cjs',
      'integrations/contributions/pr-reader.test.cjs',
      'tools/install-frontier-lobby.test.mjs',
      'tools/install-aura-world-emulation.test.mjs',
      'tools/install-shared-world-from-git.test.mjs',
      'tools/towerflow-pr-synopsis.test.cjs'
    )
    & node --test @checks
    if ($LASTEXITCODE -ne 0) { throw 'Integration tests failed. Deployment not performed.' }
    & node 'tools/verify-towerflow-agent-performance.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'Agent skill acceptance failed. Deployment not performed.' }
    $report.Add('AUTOMATED TESTS: PASSED')
    $installers = @(
      'tools/install-towerflow-earth-texture.mjs',
      'tools/install-frontier-lobby.mjs',
      'tools/install-aura-world-emulation.mjs',
      'tools/install-towerflow-business-product.mjs',
      'tools/install-shared-world-from-git.mjs'
    )
    foreach ($install in $installers) {
      & node $install --dry-run
      if ($LASTEXITCODE -ne 0) { throw "Preservation check failed: $install" }
      $report.Add('DRY RUN PASSED: ' + $install)
    }
    if ($DryRun) {
      $report.Add('DRY RUN: live room/product untouched')
    } else {
      foreach ($install in $installers) {
        & node $install --apply
        if ($LASTEXITCODE -ne 0) { throw "Apply failed: $install. Inspect backup manifest." }
        $report.Add('APPLIED: ' + $install)
      }
      try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/towerflow/index.html?tab=inventory' -TimeoutSec 8 -SkipHttpErrorCheck
        if ([int]$response.StatusCode -eq 200 -and ([string]$response.Content).Contains('id="tfInventory"')) {
          $report.Add('BUSINESS DASHBOARD: HTTP 200, CONTENT VERIFIED')
        } else { $report.Add('WARNING: business dashboard HTTP/content check not verified') }
      } catch { $report.Add('WARNING: local business dashboard not reachable') }
    }
  } finally { Pop-Location }
  $report.Add('NODE SERVER: NOT RESTARTED')
  $report.Add('SHARED WORLD BACKEND: STAGED; ACTIVATES AFTER PLANNED RESTART')
  $report.Add('GITHUB PUSH/MERGE: NONE')
  $report.Add('NATIVE IDE PROCESSES: NOT LAUNCHED')
  $report.Add('RESULT: COMPLETED')
} catch {
  $report.Add('RESULT: STOPPED')
  $report.Add($_.Exception.Message)
  if ($backup) { $report.Add('SOURCE BACKUPS: ' + $backup) }
  $report.Add('No automatic Node restart or cross-installer rollback performed.')
}
$output = $report -join [Environment]::NewLine
try { $output | Set-Clipboard } catch {}
Write-Host $output -ForegroundColor Cyan
