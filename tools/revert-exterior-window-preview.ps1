# Revert only the query-gated exterior experiment to exact accepted room.js.
$ErrorActionPreference='Stop'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$known='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$report=New-Object System.Collections.Generic.List[string]
function Say([string]$v){Write-Host $v;[void]$report.Add($v)}
try {
 Say '=== TOWERFLOW REVERSIBLE EXPERIMENT RESTORE ==='
 if(!(Test-Path $room)){throw 'Live room.js missing'}
 $current=(Get-FileHash $room -Algorithm SHA256).Hash
 Say ('CURRENT: '+$current)
 $sources=@(Get-ChildItem -Path (Join-Path $env:TEMP 'tf-exterior-preview-guard-*') -ErrorAction SilentlyContinue | Where-Object PSIsContainer | ForEach-Object {Join-Path $_.FullName 'original-room.js'})
 $sources+=@(Get-ChildItem -Path (Join-Path $env:TEMP 'tf-capital-guard-*') -ErrorAction SilentlyContinue | Where-Object PSIsContainer | ForEach-Object {Join-Path $_.FullName 'prior-room.js'})
 $verified=$null
 foreach($candidate in $sources){
  if((Test-Path $candidate) -and ((Get-FileHash $candidate -Algorithm SHA256).Hash -eq $known)){$verified=$candidate;break}
 }
 if($current -eq $known){
  Say 'ORIGINAL ALREADY ACTIVE; NO CHANGES NEEDED'
 }elseif(!$verified){
  throw 'Exact recovery source not found. NOTHING CHANGED.'
 }else{
  $text=[System.IO.File]::ReadAllText($room)
  if(-not $text.Contains('TF_REVERSIBLE_EXTERIOR_PREVIEW_V1')){
   throw 'Current room does not contain our known marker. REFUSING OVERWRITE.'
  }
  $save=Join-Path $env:TEMP ('tf-before-preview-restore-'+[guid]::NewGuid().ToString('N')+'.js')
  [System.IO.File]::Copy($room,$save)
  Say ('CURRENT EXPERIMENT SNAPSHOT: '+$save)
  [System.IO.File]::Copy($verified,$room,$true)
  if((Get-FileHash $room -Algorithm SHA256).Hash -ne $known){
   [System.IO.File]::Copy($save,$room,$true)
   throw 'Restoration digest mismatch, returned to experiment.'
  }
  Say 'ORIGINAL ROOM.JS RESTORED: PASS'
 }
 # Assets are left untouched, since the original room has no import and cannot execute them.
 $tmp=Join-Path $env:TEMP ('tf-restore-http-'+[guid]::NewGuid().ToString('N')+'.js')
 try{
  Invoke-WebRequest -Uri ('http://127.0.0.1:4173/room.js?restore='+[guid]::NewGuid().ToString('N')) -OutFile $tmp -TimeoutSec 10 | Out-Null
  if((Get-FileHash $tmp -Algorithm SHA256).Hash -eq $known){
   Say 'SERVER SOURCE PARITY: PASS'
   Say 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
  }else{Say 'HTTP PARITY NOT VERIFIED - DO NOT REFRESH'}
 }finally{Remove-Item $tmp -Force -ErrorAction SilentlyContinue}
}catch{Say ('RESTORE BLOCKED: '+$_.Exception.Message)}finally{
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
