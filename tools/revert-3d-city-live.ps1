# Emergency rollback of only the 3D city tail, leaving earlier optional preview untouched.
$ErrorActionPreference='Stop'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$original='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$preview='2659415DA4B7F32D3EE163592D88A714F7CEDB17B52C228057DAB62219CCFB4E'
$log=New-Object System.Collections.Generic.List[string]
function Say([string]$v){Write-Host $v;[void]$log.Add($v)}
function Sha([string]$p){(Get-FileHash $p -Algorithm SHA256).Hash}
try{
 Say '=== TOWERFLOW 3D CITY EMERGENCY REVERT ==='
 if(!(Test-Path $room)){throw 'room.js unavailable'}
 $current=[IO.File]::ReadAllText($room)
 $hash=Sha $room
 Say ('CURRENT SHA: '+$hash)
 if($hash -eq $original -or $hash -eq $preview){
  Say '3D CITY IS NOT INSTALLED: NO FILES MODIFIED'
 }else{
  if(-not $current.Contains('TF_CITY3D_EXPERIMENT_V1')){throw 'Unknown revision; refusing destructive revert'}
  $snapshot=Join-Path $env:TEMP ('tf-city3d-before-revert-'+[guid]::NewGuid().ToString('N')+'.js')
  [IO.File]::Copy($room,$snapshot)
  Say ('CURRENT EXPERIMENT SAVED: '+$snapshot)
  $staged=@(Get-ChildItem $env:TEMP -Directory -Filter 'tf-city3d-stage-*' -ErrorAction SilentlyContinue|ForEach-Object{Join-Path $_.FullName 'pre-city3d-room.js'})
  $match=$null
  foreach($candidate in $staged){if((Test-Path $candidate) -and ((Sha $candidate) -eq $preview)){$match=$candidate;break}}
  if($match){
   [IO.File]::Copy($match,$room,$true)
   if((Sha $room) -ne $preview){[IO.File]::Copy($snapshot,$room,$true);throw 'Exact hash verification failed; restored experiment'}
   Say '3D CITY REMOVED FROM ROOM.JS: PASS'
  }else{throw 'Exact pre-city source unavailable; current room unchanged'}
 }
 $hash=Sha $room
 $download=Join-Path $env:TEMP ('tf-rollback-http-'+[guid]::NewGuid().ToString('N')+'.js')
 try{
  Invoke-WebRequest -Uri ('http://127.0.0.1:4173/room.js?tfRollback='+[guid]::NewGuid().ToString('N')) -OutFile $download -TimeoutSec 10|Out-Null
  if((Sha $download) -eq $hash){
   Say 'LIVE HTTP SOURCE PARITY: PASS'
   Say 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
  }else{Say 'HTTP PARITY FAILED; DO NOT REFRESH'}
 }finally{Remove-Item $download -Force -ErrorAction SilentlyContinue}
}catch{Say ('REVERT BLOCKED: '+$_.Exception.Message)}finally{
 ($log -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
