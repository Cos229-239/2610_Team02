# Non-mutating TowerFlow graphics parity, code-anchor and spatial baseline inspection.
# Does NOT deploy, switch branches, restart servers, or access .env.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$originalSha='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$report=New-Object System.Collections.Generic.List[string]
function Emit([string]$s){Write-Host $s;[void]$report.Add($s)}
function Assert-Tf([bool]$ok,[string]$message){if(-not $ok){throw $message}}
try {
 Emit '=== TOWERFLOW PRESERVATION BASELINE / READ ONLY ==='
 Assert-Tf (Test-Path $room) 'The original live room.js is missing.'
 Assert-Tf (Test-Path (Join-Path $live 'server.js')) 'Live server.js is missing.'
 Assert-Tf (Test-Path (Join-Path $repo '.git')) 'Secondary Team02 worktree is missing.'
 $hash=(Get-FileHash -LiteralPath $room -Algorithm SHA256).Hash
 Emit ("LIVE_SHA256: "+$hash)
 Emit ("KNOWN_GOOD_SHA256: "+$originalSha)
 $baselineOk=$hash -eq $originalSha
 Emit ("EXACT_ORIGINAL_SOURCE: "+$(if($baselineOk){'PASS'}else{'FAIL / investigate before integration'}))
 $raw=[System.IO.File]::ReadAllText($room)
 $lines=[System.IO.File]::ReadAllLines($room)
 $signals=@(
  @('THREE_SCENE','new THREE.Scene'),
  @('RENDERER','new THREE.WebGLRenderer'),
  @('MAIN_ANIMATE','function animate()'),
  @('LEFT_WALL','box(.6,11,32,-21,5.5,0,wall)'),
  @('DEVELOPMENT_ROOM','const tfRoomX = 62'),
  @('PROJECTOR_TARGETS','const wallTargets='),
  @('PROJECTOR_LAYOUT','const wallLayout='),
  @('EXISTING_WORLD','window.tfWorldEmulator'),
  @('REFERENCE_STUDIO','window.tfReferenceStudio'),
  @('CAPITAL_MOUNT','installCapitalWorld')
 )
 foreach($item in $signals){
   $label=$item[0];$needle=$item[1]
   $found=@(for($i=0;$i -lt $lines.Length;$i++){if($lines[$i].Contains($needle)){$i+1}})
   Emit ("ANCHOR "+$label+": "+$(if($found.Count){$found -join ','}else{'NOT FOUND'}))
 }
 # Emit only exact geometric dimensions when present in the actual source. Never infer metres or camera pose.
 foreach($regex in @(
   'PerspectiveCamera\([^\r\n]+',
   'box\(42,\.5,32,0,-\.27,0,floor\)',
   'box\(\.6,11,32,-21,5\.5,0,wall\)',
   'box\(\.6,\s*11,\s*32,\s*tfRoomX\s*\+\s*21,\s*5\.5,\s*0,\s*wall\)'
  )){
  $m=[regex]::Match($raw,$regex)
  if($m.Success){Emit ('MEASURED_SOURCE_EXPRESSION: '+$m.Value)}
 }
 $listener=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
 if($listener){
   $owner=Get-CimInstance Win32_Process -Filter ("ProcessId="+$listener.OwningProcess) -ErrorAction SilentlyContinue
   Emit ("LISTENER_PID: "+$listener.OwningProcess)
   Emit ("LISTENER_PROCESS: "+$owner.Name)
 } else {Emit 'LISTENER: NOT RUNNING'}
 $local=Join-Path $env:TEMP ('tf-parity-'+[guid]::NewGuid().ToString('N')+'.js')
 try {
   Invoke-WebRequest -Uri ('http://127.0.0.1:4173/room.js?baseline='+[guid]::NewGuid().ToString('N')) -OutFile $local -TimeoutSec 7 | Out-Null
   $served=(Get-FileHash -LiteralPath $local -Algorithm SHA256).Hash
   Emit ("LOCAL_HTTP_SHA256: "+$served)
   Emit ("SERVER_SOURCE_PARITY: "+$(if($served -eq $hash){'PASS'}else{'FAIL'}))
 } catch {Emit ('SERVER_SOURCE_PARITY: UNVERIFIED '+$_.Exception.Message)} finally {
   Remove-Item $local -Force -ErrorAction SilentlyContinue
 }
 $sourceBranch=(& git.exe -C $repo branch --show-current).Trim()
 Emit ("WORKTREE_BRANCH: "+$sourceBranch)
 $unmerged=@(& git.exe -C $repo diff --name-only --diff-filter=U)
 Emit ("UNMERGED_FILES: "+$unmerged.Count)
 Emit "SPATIAL_SIGHTLINE_OCCLUSION: NOT VERIFIED - requires browser same-pose captures"
 Emit "FLOOR_MATERIAL_VISUAL_PARITY: NOT VERIFIED - requires actual screenshot"
 Emit "CAMERA_MEASUREMENTS: NOT VERIFIED - require in-scene telemetry"
 Emit "RELEASE_GATE: "+$(if($baselineOk){'BASELINE VALID ONLY; DO NOT DEPLOY'}else{'BLOCKED - SOURCE DIFFERS FROM KNOWN GOOD'})
} catch {Emit ('FAIL: '+$_.Exception.Message)} finally {
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
