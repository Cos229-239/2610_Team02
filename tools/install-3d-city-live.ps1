# Aggressive actual 3D city experiment. Reuses EXISTING preview source, with exact SHA guard.
# User can revert to exact original anytime using the original recovery hash.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$module=Join-Path $live 'public\city-exterior-3d.mjs'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$path='collaboration-room/live-room/public/city-exterior-3d.mjs'
$approvedPreview='2659415DA4B7F32D3EE163592D88A714F7CEDB17B52C228057DAB62219CCFB4E'
$approvedOriginal='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$staging=Join-Path $env:TEMP ('tf-city3d-stage-'+[guid]::NewGuid().ToString('N'))
$log=New-Object System.Collections.Generic.List[string]
$modified=$false;$ok=$false
function Note([string]$s){Write-Host $s;[void]$log.Add($s)}
function Assert-Tf([bool]$condition,[string]$failure){if(-not $condition){throw $failure}}
function Sha([string]$p){(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash}
function Export-Git([string]$gitPath,[string]$file){
 $start=[Diagnostics.ProcessStartInfo]::new()
 $start.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($arg in @('-C',$repo,'show',($ref+':'+$gitPath))){[void]$start.ArgumentList.Add($arg)}
 $start.UseShellExecute=$false;$start.RedirectStandardOutput=$true
 $proc=[Diagnostics.Process]::Start($start)
 try{
  $output=[IO.File]::Create($file)
  try{$proc.StandardOutput.BaseStream.CopyTo($output)}finally{$output.Dispose()}
  $proc.WaitForExit()
  Assert-Tf ($proc.ExitCode -eq 0) 'Module export failed'
 }finally{$proc.Dispose()}
}
function HttpPar([string]$url,[string]$source){
 $temp=Join-Path $staging ('download-'+[guid]::NewGuid().ToString('N'))
 try{
  Invoke-WebRequest -Uri $url -OutFile $temp -TimeoutSec 12|Out-Null
  (Sha $temp) -eq (Sha $source)
 }finally{Remove-Item $temp -Force -ErrorAction SilentlyContinue}
}
try{
 Note '=== TOWERFLOW ACTUAL 3D EXTERIOR EXPERIMENT ==='
 Assert-Tf (Test-Path $room) 'Live room.js missing'
 Assert-Tf (Test-Path (Join-Path $repo '.git')) 'Git repo missing'
 $hash=Sha $room
 Note ('CURRENT SHA256: '+$hash)
 $already=$false
 if($hash -eq $approvedPreview){
  Assert-Tf (-not (Test-Path $module)) '3D city module already exists; inspect first'
 }elseif((Get-Content $room -Raw).Contains('TF_CITY3D_EXPERIMENT_V1')){
  $already=$true
  Assert-Tf (Test-Path $module) '3D integration marker present, module missing'
  Note 'CITY 3D INSTALLATION ALREADY PRESENT — verifying rather than overwriting'
 }else{
  throw 'Unrecognized room.js version. No files modified; reconcile first.'
 }
 New-Item -ItemType Directory -Path $staging|Out-Null
 $config=Invoke-RestMethod -Uri 'http://127.0.0.1:4173/api/config' -TimeoutSec 10
 Assert-Tf ($config.owner -eq 'Cos229-239' -and $config.repo -eq '2610_Team02') 'Incorrect server identity'
 Assert-Tf (HttpPar 'http://127.0.0.1:4173/room.js?city3d=baseline' $room) 'Live room HTTP source differs'
 Note '[1] SOURCE HASH + SERVER IDENTITY: PASS'
 $staged=Join-Path $staging 'city-exterior-3d.mjs'
 Export-Git $path $staged
 $expected=(& git.exe -C $repo rev-parse ($ref+':'+$path)).Trim()
 Assert-Tf ($LASTEXITCODE -eq 0) 'Git revision not available'
 $actual=(& git.exe -C $repo hash-object $staged).Trim()
 Assert-Tf ($expected -eq $actual) 'Module Git object verification failed'
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $parse=@(& $node --check $staged 2>&1)
 Assert-Tf ($LASTEXITCODE -eq 0) ('Invalid 3D city module: '+($parse -join '; '))
 Note '[2] EXACT GITHUB MODULE + NODE SYNTAX: PASS'
 if(-not $already){
  $text=[IO.File]::ReadAllText($room)
  Assert-Tf ($text.Contains('TF_REVERSIBLE_EXTERIOR_PREVIEW_V1')) 'Expected existing preview integration missing'
  Assert-Tf (-not $text.Contains('TF_CITY3D_EXPERIMENT_V1')) 'City already present'
  $backup=Join-Path $staging 'pre-city3d-room.js'
  [IO.File]::Copy($room,$backup)
  $original=$null
  $candidates=@(Get-ChildItem $env:TEMP -Directory -Filter 'tf-capital-guard-*' -ErrorAction SilentlyContinue|
    ForEach-Object {Join-Path $_.FullName 'prior-room.js'})
  $candidates+=@(Get-ChildItem $env:TEMP -Directory -Filter 'tf-exterior-preview-guard-*' -ErrorAction SilentlyContinue|
    ForEach-Object {Join-Path $_.FullName 'original-room.js'})
  foreach($candidate in $candidates){
   if((Test-Path $candidate) -and ((Sha $candidate) -eq $approvedOriginal)){$original=$candidate;break}
  }
  Assert-Tf ([bool]$original) 'Exact original source unavailable; cannot guarantee rollback'
  [IO.File]::Copy($original,(Join-Path $staging 'known-good-room.js'))
  $text+="`n// TF_CITY3D_EXPERIMENT_V1 - user requested real geometry, view only behind original window`n"+
   "if(new URLSearchParams(location.search).get('tfCity3D')==='1'){`n"+
   "  import('./city-exterior-3d.mjs').then(m=>{`n"+
   "    const city=m.installCityExterior3D({THREE,scene,renderer,camera,document,window});`n"+
   "    window.tfCity3DReady=city;`n"+
   "  }).catch(error=>console.error('[TowerFlow 3D City] rejected / original room remains',error));`n"+
   "}`n"
  $patched=Join-Path $staging 'patched-room.js'
  [IO.File]::WriteAllText($patched,$text,[Text.UTF8Encoding]::new($false))
  $check=Get-Content $patched -Raw | & $node --input-type=module --check 2>&1
  Assert-Tf ($LASTEXITCODE -eq 0) ('Patched room JS syntax invalid: '+($check -join '; '))
  $modified=$true
  [IO.File]::Copy($staged,$module)
  [IO.File]::Copy($patched,$room,$true)
  Note '[3] MODULE + ONE OPT-IN TAIL MOUNT INSTALLED'
 }else{
  Assert-Tf ((Sha $staged) -eq (Sha $module)) 'Existing module differs from GitHub source'
  Note '[3] IDEMPOTENT: MATCHING MODULE ALREADY INSTALLED'
 }
 Assert-Tf (HttpPar 'http://127.0.0.1:4173/room.js?city3d=verify' $room) 'Modified live room HTTP mismatch'
 Assert-Tf (HttpPar 'http://127.0.0.1:4173/city-exterior-3d.mjs?city3d=verify' $module) '3D module HTTP mismatch'
 Note '[4] LOCAL HTTP EXACT SOURCE AND MODULE: PASS'
 $url='http://127.0.0.1:4173/room/team02?tfCity3D=1'
 if($config.roomUrl){
  $builder=[UriBuilder]::new($config.roomUrl)
  $builder.Query='tfCity3D=1'
  $url=$builder.Uri.AbsoluteUri
 }
 Note ('LIVE PREVIEW URL: '+$url)
 Note ('ROLLBACK SNAPSHOT: '+$staging)
 Note 'WINDOW 3D: REAL PROCEDURAL MESHES / MOVING CARS / NEAR MID FAR / WEATHER'
 Note 'VISUAL ACCURACY: NOT YET CONFIRMED IN BROWSER'
 Note 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 $ok=$true
 try{Start-Process $url}catch{Note ('Browser launch failed: '+$_.Exception.Message)}
}catch{
 Note ('EXPERIMENT FAILED: '+$_.Exception.Message)
 if($modified){
  try{
   [IO.File]::Copy((Join-Path $staging 'pre-city3d-room.js'),$room,$true)
   Remove-Item $module -Force -ErrorAction SilentlyContinue
   Note ('ROLLED BACK TO PRE-3D SOURCE: '+(Sha $room))
  }catch{Note ('ROLLBACK ERROR: '+$_.Exception.Message)}
 }
 Note 'DO NOT REFRESH FOR THIS UPGRADE'
}finally{
 ($log -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
 Write-Host ('STATUS: '+$(if($ok){'3D EXPERIMENT SERVED; BROWSER ACCEPTANCE PENDING'}else{'DEPLOYMENT BLOCKED'}))
}
