# Module-only city visual iteration. Existing live room.js, auth and interior untouched.
# Run on the user's Windows host. Fast fail and exact module rollback.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$module=Join-Path $live 'public\city-exterior-3d.mjs'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$source='collaboration-room/live-room/public/city-exterior-3d.mjs'
$previous='D034FED4A21F48D561F75E6813C89CEFD49A6551DCFEE83666967DAE79C04954'
$expectedRoom='E069A32C52F8AC8E4DC39CDEB1DE5EF84113CACAEA98E32EC5DDA3EA2D04B088'
$log=New-Object System.Collections.Generic.List[string]
$temp=Join-Path $env:TEMP ('tf-panorama-city-'+[guid]::NewGuid().ToString('N'))
$modified=$false
function Say([string]$s){Write-Host $s;[void]$log.Add($s)}
function Guard([bool]$test,[string]$message){if(-not $test){throw $message}}
function Digest([string]$p){(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash}
function HttpHash([string]$url,[string]$target){
 Invoke-WebRequest -Uri $url -OutFile $target -TimeoutSec 12|Out-Null
 Digest $target
}
try{
 Say '=== TOWERFLOW FULL-WALL PANORAMA + RESIDENTS + CHAOS MODES ==='
 Guard (Test-Path $room) 'Live room.js missing'
 Guard (Test-Path $module) 'Existing 3D module missing'
 Guard (Test-Path (Join-Path $repo '.git')) 'Git repo unavailable'
 Guard ((Digest $room) -eq $expectedRoom) 'Room.js differs from last measured revision; integration blocked.'
 $text=[IO.File]::ReadAllText($room)
 Guard ($text.Contains('TF_CITY3D_EXPERIMENT_V1')) '3D city mount not present'
 New-Item -ItemType Directory -Path $temp|Out-Null
 $configuration=Invoke-RestMethod 'http://127.0.0.1:4173/api/config' -TimeoutSec 10
 Guard ($configuration.owner -eq 'Cos229-239' -and $configuration.repo -eq '2610_Team02') 'Wrong live server'
 $roomHttp=HttpHash ('http://127.0.0.1:4173/room.js?panorama='+[guid]::NewGuid().ToString('N')) (Join-Path $temp 'http-room.js')
 Guard ($roomHttp -eq $expectedRoom) 'Running room does not match accepted source'
 Say '[1] EXACT ROOM.JS + LIVE SERVER IDENTITY: PASS'
 $existing=Digest $module
 $backup=Join-Path $temp 'previous-city-exterior-3d.mjs'
 [IO.File]::Copy($module,$backup)
 Say ('EXISTING MODULE HASH: '+$existing)
 $stage=Join-Path $temp 'city-exterior-3d.mjs'
 $processInfo=[Diagnostics.ProcessStartInfo]::new()
 $processInfo.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($a in @('-C',$repo,'show',($ref+':'+$source))){[void]$processInfo.ArgumentList.Add($a)}
 $processInfo.UseShellExecute=$false;$processInfo.RedirectStandardOutput=$true
 $process=[Diagnostics.Process]::Start($processInfo)
 try{
  $stream=[IO.File]::Create($stage)
  try{$process.StandardOutput.BaseStream.CopyTo($stream)}finally{$stream.Dispose()}
  $process.WaitForExit()
  Guard ($process.ExitCode -eq 0) 'Cannot retrieve updated module'
 }finally{$process.Dispose()}
 $blob=(& git.exe -C $repo rev-parse ($ref+':'+$source)).Trim()
 Guard ($LASTEXITCODE -eq 0) 'Cannot verify Git revision'
 $stagedBlob=(& git.exe -C $repo hash-object $stage).Trim()
 Guard ($blob -eq $stagedBlob) 'Module Git blob differs'
 $script=[IO.File]::ReadAllText($stage)
 foreach($required in @(
  'Full-wall panoramic glazing',
  'Apartment/hotel detail',
  'Chaos Schemes',
  'Continuous gradient sky',
  'originalTrims.forEach'
 )){Guard ($script.Contains($required)) ('Missing expected visual feature: '+$required)}
 $syntax=@(& node.exe --check $stage 2>&1)
 Guard ($LASTEXITCODE -eq 0) ('New module failed JS syntax: '+($syntax -join '; '))
 Say '[2] EXACT MODULE + JAVASCRIPT SYNTAX + FEATURE MARKERS: PASS'
 if($existing -ne (Digest $stage)){
  Guard ($existing -eq $previous) 'Existing city module differs from last observed version; no overwrite'
  [IO.File]::Copy($stage,$module,$true)
  $modified=$true
 }
 $newHash=Digest $module
 $served=HttpHash ('http://127.0.0.1:4173/city-exterior-3d.mjs?panorama='+[guid]::NewGuid().ToString('N')) (Join-Path $temp 'http-city.mjs')
 Guard ($served -eq $newHash) 'New city module not served correctly'
 Guard ((Digest $room) -eq $expectedRoom) 'room.js changed unexpectedly'
 Say '[3] LIVE MODULE BYTE PARITY: PASS'
 Say 'ROOM.JS MODIFICATIONS: ZERO'
 Say ('NEW CITY SHA256: '+$newHash)
 Say ('EXACT ROLLBACK MODULE: '+$backup)
 $url='http://127.0.0.1:4173/room/team02?tfCity3D=1'
 if($configuration.roomUrl){
  $builder=[UriBuilder]::new($configuration.roomUrl)
  $builder.Query='tfCity3D=1'
  $url=$builder.Uri.AbsoluteUri
 }
 Say ('VISUAL REVIEW URL: '+$url)
 Say '3D FEATURES: FULL-WALL WINDOWS, OPEN SKY, CURTAINS, BLINDS, TENANTS, CHAOS MODES'
 Say 'STATUS: MODULE INSTALLED / REAL BROWSER VISUAL ACCEPTANCE REQUIRED'
 Say 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 try{Start-Process $url}catch{Say ('Browser launch blocked: '+$_.Exception.Message)}
}catch{
 Say ('DEPLOYMENT ERROR: '+$_.Exception.Message)
 if($modified){
  try{
   [IO.File]::Copy((Join-Path $temp 'previous-city-exterior-3d.mjs'),$module,$true)
   Say ('PREVIOUS CITY MODULE RESTORED: '+(Digest $module))
  }catch{Say ('ROLLBACK ERROR: '+$_.Exception.Message)}
 }
 Say 'DO NOT REFRESH FOR THIS UPGRADE'
}finally{
 ($log -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
