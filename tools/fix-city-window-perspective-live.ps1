# Precise hotfix: only replace the active 3D exterior module. Never modify room.js.
# Existing browser reloads the new module. Old module kept in TEMP for instant rollback.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$module=Join-Path $live 'public\city-exterior-3d.mjs'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$gitPath='collaboration-room/live-room/public/city-exterior-3d.mjs'
$recovery=Join-Path $env:TEMP ('tf-city3d-frame-hotfix-'+[guid]::NewGuid().ToString('N'))
$log=New-Object System.Collections.Generic.List[string]
$changed=$false
function Msg([string]$s){Write-Host $s;[void]$log.Add($s)}
function Guard([bool]$yes,[string]$msg){if(-not $yes){throw $msg}}
function Hash([string]$file){(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash}
function ByteParity([string]$url,[string]$file){
 $download=Join-Path $recovery ('http-'+[guid]::NewGuid().ToString('N')+'.mjs')
 try{
  Invoke-WebRequest -Uri $url -OutFile $download -TimeoutSec 12 | Out-Null
  return (Hash $download) -eq (Hash $file)
 }finally{Remove-Item $download -Force -ErrorAction SilentlyContinue}
}
try{
 Msg '=== TOWERFLOW 3D WINDOW ALIGNMENT / ORIGINAL FRAME HOTFIX ==='
 Guard (Test-Path $room) 'Missing live room.js'
 Guard (Test-Path $module) '3D exterior module not installed'
 Guard (Test-Path (Join-Path $repo '.git')) 'Git worktree unavailable'
 $roomText=[IO.File]::ReadAllText($room)
 Guard ($roomText.Contains('TF_CITY3D_EXPERIMENT_V1')) 'Active source does not mount the expected 3D city'
 $oldText=[IO.File]::ReadAllText($module)
 $oldFrame='for(const z of [-6.2,0,6.2])box(group,.13,5.7,.16,-20.58,6.65,z,palette.frame);'
 $already=$oldText.Contains('Do not duplicate the original atrium window mullions')
 Guard ($already -or $oldText.Contains($oldFrame)) 'Unknown city geometry revision; abort, no overwrite'
 New-Item -ItemType Directory -Path $recovery | Out-Null
 $config=Invoke-RestMethod -Uri 'http://127.0.0.1:4173/api/config' -TimeoutSec 10
 Guard ($config.owner -eq 'Cos229-239' -and $config.repo -eq '2610_Team02') 'Wrong server on port 4173'
 Guard (ByteParity 'http://127.0.0.1:4173/room.js?frameBaseline=1' $room) 'Server source does not match live file'
 Guard (ByteParity 'http://127.0.0.1:4173/city-exterior-3d.mjs?frameBaseline=1' $module) 'Server module differs before hotfix'
 $roomHash=Hash $room
 Msg ('ORIGINAL ROOM SOURCE: '+$roomHash)
 Msg ('OLD CITY MODULE SHA256: '+(Hash $module))
 [IO.File]::Copy($module,(Join-Path $recovery 'previous-city-exterior-3d.mjs'))
 $stage=Join-Path $recovery 'updated-city-exterior-3d.mjs'
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($arg in @('-C',$repo,'show',($ref+':'+$gitPath))){[void]$start.ArgumentList.Add($arg)}
 $start.UseShellExecute=$false;$start.RedirectStandardOutput=$true
 $process=[Diagnostics.Process]::Start($start)
 try{
  $output=[IO.File]::Create($stage)
  try{$process.StandardOutput.BaseStream.CopyTo($output)}finally{$output.Dispose()}
  $process.WaitForExit()
  Guard ($process.ExitCode -eq 0) 'Could not export corrected city module'
 }finally{$process.Dispose()}
 $expected=(& git.exe -C $repo rev-parse ($ref+':'+$gitPath)).Trim()
 Guard ($LASTEXITCODE -eq 0) 'Git revision unavailable'
 $got=(& git.exe -C $repo hash-object $stage).Trim()
 Guard ($expected -eq $got) 'Git blob integrity mismatch'
 $stagedText=[IO.File]::ReadAllText($stage)
 Guard ($stagedText.Contains('Do not duplicate the original atrium window mullions')) 'Corrected original-window logic missing'
 Guard ($stagedText.Contains('for(const x of [-53,-83,-108])')) 'Corrected building setback missing'
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $result=@(& $node --check $stage 2>&1)
 Guard ($LASTEXITCODE -eq 0) ('Corrected module failed syntax: '+($result -join '; '))
 Msg 'STAGED MODULE EXACT GIT BLOB + NODE SYNTAX: PASS'
 if((Hash $module) -ne (Hash $stage)){
  $changed=$true
  [IO.File]::Copy($stage,$module,$true)
 }
 Guard ((Hash $room) -eq $roomHash) 'Room.js unexpectedly changed'
 Guard (ByteParity 'http://127.0.0.1:4173/city-exterior-3d.mjs?frameNew=1' $module) 'New module HTTP parity mismatch'
 Msg 'LIVE MODULE HTTP PARITY: PASS'
 Msg 'ROOM.JS UNTOUCHED: PASS'
 Msg ('PREVIOUS MODULE SNAPSHOT: '+(Join-Path $recovery 'previous-city-exterior-3d.mjs'))
 $url='http://127.0.0.1:4173/room/team02?tfCity3D=1'
 if($config.roomUrl){
  $u=[UriBuilder]::new($config.roomUrl);$u.Query='tfCity3D=1';$url=$u.Uri.AbsoluteUri
 }
 Msg ('VISUAL INSPECTION URL: '+$url)
 Msg 'FIX: NO DOUBLE WINDOW MULLIONS; ORIGINAL FRAME RETAINED; NEAR TOWERS SET BACK'
 Msg 'VISUAL RESULT: NOT YET BROWSER VERIFIED'
 Msg 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 try{Start-Process $url}catch{Msg ('Browser auto-open error: '+$_.Exception.Message)}
}catch{
 Msg ('HOTFIX BLOCKED: '+$_.Exception.Message)
 if($changed){
  try{
   [IO.File]::Copy((Join-Path $recovery 'previous-city-exterior-3d.mjs'),$module,$true)
   Msg ('ROLLED BACK MODULE SHA256: '+(Hash $module))
  }catch{Msg ('ROLLBACK ERROR: '+$_.Exception.Message)}
 }
 Msg 'DO NOT REFRESH FOR THIS UPGRADE'
}finally{
 ($log -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
