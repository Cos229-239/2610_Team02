# TowerFlow capital-world guarded live deployment.
# Invoked from an existing clean/dirty Git worktree; does not checkout/merge/reset it.
# Live room and GitHub worktrees are intentionally independent.
$ErrorActionPreference = 'Stop'
$repo = Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live = Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$ref = 'origin/feature/capital-window-world-emulation-20261121'
$pathRoom = 'collaboration-room/live-room/public/room.js'
$pathWorld = 'collaboration-room/live-room/public/capital-world.mjs'
$localOrigin = 'http://127.0.0.1:4173'
$remoteOrigin = 'https://dulsky.tail0ef7c0.ts.net'
$temporary = Join-Path $env:TEMP ('tf-capital-guard-' + [guid]::NewGuid().ToString('N'))
$report = Join-Path $env:TEMP ('tf-capital-result-' + [guid]::NewGuid().ToString('N') + '.txt')
New-Item -ItemType Directory -Path $temporary | Out-Null
$success = $false
$changed = $false
$backedUp = $false
$oldWorldExists = $false
$transcriptStarted = $false
function Require([bool]$condition,[string]$message){if(-not $condition){throw $message}}
function Git([string[]]$parts){
  $lines = & git -C $repo @parts
  if($LASTEXITCODE -ne 0){throw ('Git command failed: ' + ($parts -join ' '))}
  return ($lines -join "`n").Trim()
}
function ExportBlob([string]$revision,[string]$target,[string]$destination){
  $p = [System.Diagnostics.ProcessStartInfo]::new()
  $p.FileName = (Get-Command git -ErrorAction Stop).Source
  foreach($a in @('-C',$repo,'show',("${revision}:${target}"))){[void]$p.ArgumentList.Add($a)}
  $p.UseShellExecute=$false;$p.RedirectStandardOutput=$true;$p.RedirectStandardError=$false
  $proc=[System.Diagnostics.Process]::Start($p)
  try {
    $out=[System.IO.File]::Create($destination)
    try {$proc.StandardOutput.BaseStream.CopyTo($out)} finally {$out.Dispose()}
    $proc.WaitForExit()
    Require ($proc.ExitCode -eq 0) ('Git blob read failed: ' + $target)
  } finally {$proc.Dispose()}
}
function Hash([string]$file){return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash}
try {
  Start-Transcript -Path $report -Force | Out-Null
  $transcriptStarted=$true
  Write-Host '=== TOWERFLOW FULL LIVE GRAPHICS DEPLOYMENT ===' -ForegroundColor Cyan
  Require (Test-Path (Join-Path $repo '.git')) 'Git worktree unavailable.'
  Require (Test-Path (Join-Path $live 'server.js')) 'Live Node server unavailable.'
  $room = Join-Path $live 'public\room.js'
  $world = Join-Path $live 'public\capital-world.mjs'
  Require (Test-Path $room) 'Live room.js unavailable.'
  $url=Git @('remote','get-url','origin')
  Require ($url -match 'Cos229-239[/\\]2610_Team02(\.git)?$') 'Unexpected repository origin.'
  Write-Host "[1] PRESERVATION: repository identity PASS; live room exists"
  $unmerged = & git -C $repo diff --name-only --diff-filter=U
  Require ($LASTEXITCODE -eq 0) 'Cannot read Git index state.'
  if($unmerged){Write-Warning 'Unmerged Git index entries present. Left untouched.'}
  & git -C $repo fetch origin
  Require ($LASTEXITCODE -eq 0) 'Git fetch failed.'
  $head=Git @('rev-parse',$ref)
  $base=Git @('merge-base','origin/dev',$ref)
  Write-Host "[2] FEATURE HEAD: $head"
  Write-Host "[2] MERGE BASE: $base"
  $stageCurrent = Join-Path $temporary 'current-room.js'
  $stageBase = Join-Path $temporary 'base-room.js'
  $stageFeature = Join-Path $temporary 'feature-room.js'
  $stageWorld = Join-Path $temporary 'capital-world.mjs'
  [System.IO.File]::Copy($room,$stageCurrent)
  ExportBlob $base $pathRoom $stageBase
  ExportBlob $ref $pathRoom $stageFeature
  ExportBlob $ref $pathWorld $stageWorld
  Require ((Git @('hash-object',$stageWorld)) -eq (Git @('rev-parse',("${ref}:${pathWorld}")))) 'Module blob integrity mismatch.'
  Write-Host '[3] VERIFIED EXACT GIT SOURCE FILES' -ForegroundColor Green
  # 3-way merge *only* in temporary files: current live, merge-base, requested feature.
  # Keep all unrelated local graphics changes, or stop if the merge is ambiguous.
  $mergeMessages = & git merge-file $stageCurrent $stageBase $stageFeature 2>&1
  Require ($LASTEXITCODE -eq 0) ('Live room differs from feature; safe 3-way merge unavailable. ' + ($mergeMessages -join ' '))
  $stagedRoomText=[System.IO.File]::ReadAllText($stageCurrent)
  Require ($stagedRoomText.Contains('installCapitalWorld')) 'Merged room does not import/install capital world.'
  Require ($stagedRoomText.Contains('TF_CAPITAL_WORLD_V1_BEGIN')) 'Merged room lacks activation marker.'
  Require (-not ($stagedRoomText -match 'left:\\{x:-20\\.58,z:0,ry:Math\\.PI/2,w:29\\}')) 'Exterior observation window remains projector target.'
  Require ($stagedRoomText.Contains('right:{x:20.58')) 'Projector targets missing after merge.'
  $node=(Get-Command node -ErrorAction Stop).Source
  $syntaxCheck = Get-Content -LiteralPath $stageCurrent -Raw -Encoding UTF8 | & $node --input-type=module --check 2>&1
  Require ($LASTEXITCODE -eq 0) ('Merged room JavaScript syntax failure: ' + $syntaxCheck)
  & $node --check $stageWorld
  Require ($LASTEXITCODE -eq 0) 'Capital-world module syntax failure.'
  Write-Host '[4] GUARDED MERGE + JAVASCRIPT SYNTAX PASS' -ForegroundColor Green
  $localConfig=Invoke-RestMethod -Uri ($localOrigin+'/api/config') -TimeoutSec 6
  Require ($localConfig.owner -eq 'Cos229-239' -and $localConfig.repo -eq '2610_Team02') 'Port 4173 is not identified as TowerFlow.'
  $liveResponse=Invoke-WebRequest -Uri ($localOrigin+'/room.js') -UseBasicParsing -TimeoutSec 10
  Require ($liveResponse.StatusCode -eq 200) 'Live room asset unavailable.'
  # The running server must serve the actual file being changed; do not edit a stale directory.
  $servedOriginal=Join-Path $temporary 'served-original.js'
  Invoke-WebRequest -Uri ($localOrigin+'/room.js') -OutFile $servedOriginal -TimeoutSec 10
  Require ((Hash $servedOriginal) -eq (Hash $room)) 'Running server is serving a different room.js. No deployment.'
  Write-Host '[5] RUNNING SERVER SOURCE MATCHES TARGET DIRECTORY' -ForegroundColor Green
  $oldWorldExists=Test-Path $world
  $priorRoom=Join-Path $temporary 'prior-room.js'
  $priorWorld=Join-Path $temporary 'prior-world.mjs'
  [System.IO.File]::Copy($room,$priorRoom)
  if($oldWorldExists){[System.IO.File]::Copy($world,$priorWorld)}
  $backedUp=$true
  try {
    # Update module first, then room activation. No server restart required for static assets.
    [System.IO.File]::Copy($stageWorld,$world,$true);$changed=$true
    [System.IO.File]::Copy($stageCurrent,$room,$true)
    $servedRoom=Join-Path $temporary 'served-room.js'
    $servedWorld=Join-Path $temporary 'served-world.mjs'
    Invoke-WebRequest -Uri ($localOrigin+'/room.js?tf='+$head) -OutFile $servedRoom -TimeoutSec 10
    Invoke-WebRequest -Uri ($localOrigin+'/capital-world.mjs?tf='+$head) -OutFile $servedWorld -TimeoutSec 10
    Require ((Hash $servedRoom) -eq (Hash $room)) 'Live room.js hash mismatch after deployment.'
    Require ((Hash $servedWorld) -eq (Hash $world)) 'Live weather module hash mismatch after deployment.'
    Write-Host '[6] LOCAL HTTP ASSET BYTE PARITY PASS' -ForegroundColor Green
    # Verify public route separately; remote failure does not justify deleting a healthy installation.
    $remoteRoom=Join-Path $temporary 'remote-room.js'
    $remoteWorld=Join-Path $temporary 'remote-world.mjs'
    Invoke-WebRequest -Uri ($remoteOrigin+'/room.js?tf='+$head) -OutFile $remoteRoom -TimeoutSec 15
    Invoke-WebRequest -Uri ($remoteOrigin+'/capital-world.mjs?tf='+$head) -OutFile $remoteWorld -TimeoutSec 15
    Require ((Hash $remoteRoom) -eq (Hash $room)) 'Public room.js differs from local deployment.'
    Require ((Hash $remoteWorld) -eq (Hash $world)) 'Public weather module differs from local deployment.'
    Write-Host '[7] TAILSCALE FUNNEL ASSET BYTE PARITY PASS' -ForegroundColor Green
    $success=$true
  } catch {
    Write-Warning ('Verification stopped: '+$_.Exception.Message)
    # Preserve a successful local install if only remote connectivity is not verified.
    if((Test-Path $world) -and (Test-Path $room)){
      $localRoomValid=$false;$localWorldValid=$false
      try {
        Invoke-WebRequest -Uri ($localOrigin+'/room.js?rollback='+$head) -OutFile (Join-Path $temporary 'local-after.js') -TimeoutSec 5
        Invoke-WebRequest -Uri ($localOrigin+'/capital-world.mjs?rollback='+$head) -OutFile (Join-Path $temporary 'world-after.mjs') -TimeoutSec 5
        $localRoomValid=((Hash (Join-Path $temporary 'local-after.js')) -eq (Hash $room))
        $localWorldValid=((Hash (Join-Path $temporary 'world-after.mjs')) -eq (Hash $world))
      } catch {}
      if($localRoomValid -and $localWorldValid){
        Write-Warning 'Local deployment verified; remote access unverified. Keeping deployed files. NO REFRESH PROMPT.'
        $changed=$false
      }
    }
    if($changed){
      [System.IO.File]::Copy($priorRoom,$room,$true)
      if($oldWorldExists){[System.IO.File]::Copy($priorWorld,$world,$true)}
      elseif(Test-Path $world){Remove-Item -LiteralPath $world -Force}
      $changed=$false
      Write-Warning 'Original live files restored due to local deployment failure.'
    }
    throw
  }
  Write-Host ''
  Write-Host '=============================================' -ForegroundColor Green
  Write-Host ' TOWERFLOW LIVE ASSET DEPLOYMENT VERIFIED' -ForegroundColor Green
  Write-Host ' PRESS CTRL + SHIFT + R IN YOUR BROWSER' -ForegroundColor Yellow
  Write-Host '=============================================' -ForegroundColor Green
  Write-Host 'Test rain, snow, blizzard, storms and the non-projectable observation window.'
  Write-Host 'Browser WebGL/FPS and teammate sync require separate end-to-end acceptance.'
  Start-Process ($remoteOrigin+'/room/team02')
} catch {
  Write-Host ('DEPLOYMENT NOT FULLY VERIFIED: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host 'DO NOT ASSUME NEW GRAPHICS ARE LIVE.' -ForegroundColor Yellow
} finally {
  if($transcriptStarted){Stop-Transcript | Out-Null}
  try {Get-Content -LiteralPath $report -Raw | Set-Clipboard;Write-Host 'REPORT COPIED TO CLIPBOARD.' -ForegroundColor Cyan} catch {Write-Warning 'Clipboard copy failed.'}
  try {Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue} catch {}
  Write-Host ('RESULT: '+$(if($success){'ASSETS VERIFIED, BROWSER CHECK PENDING'}else{'NOT FULLY VERIFIED'}))
}
