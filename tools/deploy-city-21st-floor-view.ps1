# TowerFlow exterior altitude and window-click fix. Only modifies city-exterior-3d.mjs.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$module=Join-Path $live 'public\city-exterior-3d.mjs'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$source='collaboration-room/live-room/public/city-exterior-3d.mjs'
$dir=Join-Path $env:TEMP ('tf-21st-storey-'+[guid]::NewGuid().ToString('N'))
$report=New-Object 'System.Collections.Generic.List[string]'
$modified=$false
function Say([string]$v){Write-Host $v;[void]$report.Add($v)}
function Require([bool]$ok,[string]$reason){if(-not $ok){throw $reason}}
function Sha([string]$p){(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash}
function ByteMatch([string]$url,[string]$sourcePath){
 $download=Join-Path $dir ('served-'+[guid]::NewGuid().ToString('N'))
 try{
  Invoke-WebRequest -Uri $url -OutFile $download -TimeoutSec 10 | Out-Null
  return (Sha $download) -eq (Sha $sourcePath)
 }finally{Remove-Item $download -Force -ErrorAction SilentlyContinue}
}
try{
 Say '=== TOWERFLOW 21ST-STOREY EXTERIOR CORRECTION ==='
 Require (Test-Path (Join-Path $repo '.git')) 'Team repository unavailable'
 Require ((Test-Path $room) -and (Test-Path $module)) 'Active live graphics files unavailable'
 $roomText=[IO.File]::ReadAllText($room)
 Require ($roomText.Contains('TF_CITY3D_EXPERIMENT_V1')) '3D exterior is not mounted in this room'
 $oldText=[IO.File]::ReadAllText($module)
 Require ($oldText.Contains('TF_EXTERIOR_CITY_ACTUAL_3D_V1')) 'Unexpected current city implementation'
 $oldRoomHash=Sha $room
 $oldCityHash=Sha $module
 Say ('ROOM SOURCE SHA256: '+$oldRoomHash)
 Say ('OLD CITY MODULE SHA256: '+$oldCityHash)
 New-Item -ItemType Directory -Path $dir | Out-Null
 $config=Invoke-RestMethod -Uri 'http://127.0.0.1:4173/api/config' -TimeoutSec 10
 Require ($config.owner -eq 'Cos229-239' -and $config.repo -eq '2610_Team02') 'Port 4173 belongs to a different service'
 Require (ByteMatch 'http://127.0.0.1:4173/room.js?city21=baseline' $room) 'Live room.js HTTP parity failed'
 $prior=Join-Path $dir 'previous-city-exterior-3d.mjs'
 [IO.File]::Copy($module,$prior)
 $staged=Join-Path $dir 'city-exterior-3d.mjs'
 $info=[Diagnostics.ProcessStartInfo]::new()
 $info.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($arg in @('-C',$repo,'show',($ref+':'+$source))){[void]$info.ArgumentList.Add($arg)}
 $info.UseShellExecute=$false
 $info.RedirectStandardOutput=$true
 $process=[Diagnostics.Process]::Start($info)
 try{
  $output=[IO.File]::Create($staged)
  try{$process.StandardOutput.BaseStream.CopyTo($output)}finally{$output.Dispose()}
  $process.WaitForExit()
  Require ($process.ExitCode -eq 0) 'Cannot export 21st-storey module'
 }finally{$process.Dispose()}
 $blob=(& git.exe -C $repo rev-parse ($ref+':'+$source)).Trim()
 Require ($LASTEXITCODE -eq 0) 'Missing expected Git blob'
 $localBlob=(& git.exe -C $repo hash-object $staged).Trim()
 Require ($blob -eq $localBlob) 'Exported module differs from exact Git source'
 $code=[IO.File]::ReadAllText($staged)
 foreach($anchor in @('const STREET_LEVEL=-70','urban.position.y=STREET_LEVEL','leftHitTargets.forEach(({object})=>{object.raycast=()=>{};})','const h=x===-53?42+rand()*22')){
  Require ($code.Contains($anchor)) ('Required altitude/click contract missing: '+$anchor)
 }
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $parse=@(& $node --check $staged 2>&1)
 Require ($LASTEXITCODE -eq 0) ('Node syntax check failed: '+($parse -join '; '))
 Say '[1] 21ST-STOREY SOURCE AND NODE SYNTAX: PASS'
 if((Sha $staged) -ne $oldCityHash){
  $modified=$true
  [IO.File]::Copy($staged,$module,$true)
 }
 Require ((Sha $room) -eq $oldRoomHash) 'Unrelated room.js mutation detected'
 Require (ByteMatch ('http://127.0.0.1:4173/city-exterior-3d.mjs?city21='+[guid]::NewGuid().ToString('N')) $module) 'Updated 3D city HTTP mismatch'
 Say '[2] LIVE NODE HTTP BYTE PARITY: PASS'
 Say '[3] ROOM.JS AND ORIGINAL INDOOR FLOOR: NOT MODIFIED'
 Say '[4] ORIGINAL LEFT PROJECTOR TARGET: TEMPORARILY NON-CLICKABLE IN 3D PREVIEW'
 Say ('NEW CITY MODULE SHA256: '+(Sha $module))
 Say ('ROLLBACK MODULE: '+$prior)
 $url='http://127.0.0.1:4173/room/team02?tfCity3D=1'
 if($config.roomUrl){
  $u=[UriBuilder]::new($config.roomUrl);$u.Query='tfCity3D=1';$url=$u.Uri.AbsoluteUri
 }
 Say ('PREVIEW URL: '+$url)
 Say 'ACTUAL BROWSER VIEW: NOT YET VERIFIED'
 Say 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 try{Start-Process $url}catch{Say ('BROWSER OPEN ERROR: '+$_.Exception.Message)}
}catch{
 Say ('DEPLOYMENT BLOCKED: '+$_.Exception.Message)
 if($modified){
  try{[IO.File]::Copy((Join-Path $dir 'previous-city-exterior-3d.mjs'),$module,$true);Say ('MODULE ROLLED BACK: '+(Sha $module))}
  catch{Say ('ROLLBACK FAILURE: '+$_.Exception.Message)}
 }
 Say 'DO NOT REFRESH FOR THIS UPGRADE'
}finally{
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
