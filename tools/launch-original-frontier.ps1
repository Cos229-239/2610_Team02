# TOWERFLOW EXISTING-ROOM LAUNCH (additive, fail-closed)
# Does not install any replacement application, change .env, restart active Node,
# alter authenticated APIs, modify user/browser state, or change Tailscale Funnel.
[CmdletBinding()]
param(
  [switch]$ApplyCyber,
  [switch]$NoBrowser,
  [string]$LiveRoom = (Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room')
)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$live=[System.IO.Path]::GetFullPath($LiveRoom)
$hostRoot=[System.IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room'))
if (-not ($live.StartsWith($hostRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase))) {
  throw 'Refusing unexpected live-room path; original room must be inside Team02 host directory.'
}
$node=(Get-Command node -ErrorAction Stop).Source
$server=Join-Path $live 'server.js'
$room=Join-Path $live 'public\room.js'
if (-not (Test-Path -LiteralPath $server -PathType Leaf) -or -not (Test-Path -LiteralPath $room -PathType Leaf)) {
  throw 'Authoritative live server.js/public/room.js missing; refusing a substitute or rebuilt app.'
}
$tests=@(
 'integrations/frontier/cyber-ambience.test.cjs',
 'integrations/frontier/projector-machine.test.cjs',
 'tools/install-frontier-lobby.test.mjs',
 'integrations/world/world-state.test.cjs',
 'integrations/agents/frontier-execution-evidence.test.cjs'
)
Write-Host 'TOWERFLOW / FRONTIER / ORIGINAL LIVE ROOM' -ForegroundColor Cyan
Write-Host ('Source: '+$live)
Push-Location $repo
try {
  foreach($relative in $tests) {
    if (-not (Test-Path $relative)) {throw "Required test missing: $relative"}
  }
  & $node --test @tests
  if($LASTEXITCODE -ne 0){throw 'Regression tests failed; original room unchanged'}
  Write-Host 'CODE / SOURCE TESTS: PASS' -ForegroundColor Green
  if($ApplyCyber){
    $source=[System.IO.File]::ReadAllText($room)
    if(-not $source.Contains('// TF_FRONTIER_LOBBY_V1_BEGIN') -or
       -not $source.Contains('// TF_FRONTIER_LOBBY_V1_END')){
      throw 'Original Frontier addon missing. Refusing to create or substitute a new room.'
    }
    & $node 'tools/install-frontier-lobby.mjs' --dry-run
    if($LASTEXITCODE -ne 0){throw 'Preservation dry-run failed; original room unchanged'}
    & $node 'tools/install-frontier-lobby.mjs' --apply
    if($LASTEXITCODE -ne 0){throw 'Conservative ambient integration failed; examine targeted rollback receipt'}
    Write-Host 'CYBER ROOM: EXISTING FRONTIER MODULE OPTIMIZED' -ForegroundColor Green
  } else {
    Write-Host 'CYBER ROOM: dry-run/installation skipped (ApplyCyber not specified)'
  }
} finally {Pop-Location}

# Never interrupt the user's existing server or participants.
$listener=@(Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue)
if($listener.Count -eq 0){
  Start-Process -FilePath $node -ArgumentList ('"'+$server+'"') -WorkingDirectory $live -WindowStyle Hidden | Out-Null
  Write-Host 'SERVER: START REQUESTED (existing host, no replacement)' -ForegroundColor Cyan
}else{
  Write-Host 'SERVER: EXISTING PROCESS LEFT UNTOUCHED' -ForegroundColor Green
}
$health='http://127.0.0.1:4173/api/health'
$ok=$false
for($n=0;$n -lt 25;$n++){
  try{
    $response=Invoke-WebRequest -Uri $health -TimeoutSec 2 -UseBasicParsing
    if([int]$response.StatusCode -eq 200){$ok=$true;break}
  }catch {Start-Sleep -Milliseconds 250}
}
if(-not $ok){throw 'Existing host health was not confirmed. No replacement server deployed.'}
Write-Host 'HOST HTTP HEALTH: 200 (not a browser/multiplayer certification)' -ForegroundColor Green
Write-Host 'SCENE URL: http://127.0.0.1:4173/room/team02' -ForegroundColor Cyan
Write-Host 'Tailscale Funnel unchanged; refresh existing browser tab to load source changes.'
if(-not $NoBrowser){Start-Process 'http://127.0.0.1:4173/room/team02'}
