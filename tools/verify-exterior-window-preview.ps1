# TowerFlow experimental preview verification. Safe to re-run; no live changes.
# Verifies exact original + only designated import/mount delta, installed modules,
# Node ESM syntax/tests, local HTTP parity, and public route (informational).
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$prefix='collaboration-room/live-room/public/'
$baselineHash='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$assets=@('exterior-window-adapter.mjs','exterior-window-preview.mjs')
$report=New-Object System.Collections.Generic.List[string]
$fail=$false
function Log([string]$value){Write-Host $value;[void]$report.Add($value)}
function Check([bool]$condition,[string]$name){if($condition){Log ('PASS '+$name)}else{$script:fail=$true;Log ('FAIL '+$name)};return $condition}
function Digest([string]$path){(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash}
function GitOut([string[]]$args){
 $r=& git.exe -C $repo @args
 if($LASTEXITCODE -ne 0){throw 'Git command failed'}
 ($r -join "`n").Trim()
}
function ExportBlob([string]$gitPath,[string]$destination){
 $p=[System.Diagnostics.ProcessStartInfo]::new()
 $p.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($arg in @('-C',$repo,'show',($ref+':'+$gitPath))){[void]$p.ArgumentList.Add($arg)}
 $p.UseShellExecute=$false;$p.RedirectStandardOutput=$true
 $process=[System.Diagnostics.Process]::Start($p)
 try{
  $stream=[IO.File]::Create($destination)
  try{$process.StandardOutput.BaseStream.CopyTo($stream)}finally{$stream.Dispose()}
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw 'Could not retrieve '+$gitPath}
 }finally{$process.Dispose()}
}
function HttpHash([string]$uri,[string]$output){
 Invoke-WebRequest -Uri $uri -OutFile $output -TimeoutSec 10 | Out-Null
 Digest $output
}
$stage=Join-Path $env:TEMP ('tf-exterior-verify-'+[guid]::NewGuid().ToString('N'))
try {
 Log '=== TOWERFLOW DEPLOYED PREVIEW EVIDENCE ==='
 if(!(Test-Path $room)){throw 'Live room.js unavailable'}
 if(!(Test-Path (Join-Path $repo '.git'))){throw 'Repo unavailable'}
 New-Item -ItemType Directory -Path $stage | Out-Null
 $originalCandidates=@(
   Get-ChildItem $env:TEMP -Directory -Filter 'tf-exterior-preview-guard-*' -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName 'original-room.js' }
   Get-ChildItem $env:TEMP -Directory -Filter 'tf-capital-guard-*' -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName 'prior-room.js' }
 )
 $original=$null
 foreach($candidate in $originalCandidates){
  if((Test-Path $candidate) -and ((Digest $candidate) -eq $baselineHash)){$original=$candidate;break}
 }
 if(!(Check ([bool]$original) 'ORIGINAL RECOVERY SOURCE EXACT HASH')){throw 'No trusted baseline; no assumptions'}
 $base=[IO.File]::ReadAllText($original)
 $actual=[IO.File]::ReadAllText($room)
 $first="import * as THREE from 'three';"
 $extra="import {installExteriorWindowPreview} from './exterior-window-preview.mjs';"
 $tail="// TF_REVERSIBLE_EXTERIOR_PREVIEW_V1`ntry{installExteriorWindowPreview({scene,THREE,window,document});}catch(error){console.warn('Window preview unavailable',error);}`n"
 $expected=$base.Replace($first,$first+"`n"+$extra)+"`n"+$tail
 $sourceExact=$actual -ceq $expected
 Log ('LIVE_SHA256 '+(Digest $room))
 if(!(Check $sourceExact 'SOURCE EXACTLY BASELINE + TWO INTENDED INJECTION LINES')){
  Log 'Source differs from intended exact text. No overwrite attempted.'
 }
 $listener=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
 if(!(Check ([bool]$listener) 'SERVER LISTENS ON 4173')){throw 'No running listener'}
 Log ('SERVER_PID '+$listener.OwningProcess)
 $config=Invoke-RestMethod -Uri 'http://127.0.0.1:4173/api/config' -TimeoutSec 7
 if(!(Check ($config.owner -eq 'Cos229-239' -and $config.repo -eq '2610_Team02') 'SERVER REPO IDENTITY')){throw 'Wrong server'}
 $tmp=Join-Path $stage 'served-room.js'
 Check ((HttpHash ('http://127.0.0.1:4173/room.js?verify='+[guid]::NewGuid().ToString('N')) $tmp) -eq (Digest $room)) 'LOCAL ROOM.JS HTTP BYTE PARITY' | Out-Null
 foreach($asset in $assets){
  $liveAsset=Join-Path $live ('public\'+$asset)
  if(!(Check (Test-Path $liveAsset) ('ASSET EXISTS '+$asset))){continue}
  $export=Join-Path $stage $asset
  ExportBlob ($prefix+$asset) $export
  Check ((Digest $liveAsset) -eq (Digest $export)) ('EXACT BRANCH CONTENT '+$asset) | Out-Null
  Check ((HttpHash ('http://127.0.0.1:4173/'+$asset+'?verify='+[guid]::NewGuid().ToString('N')) (Join-Path $stage ('served-'+$asset))) -eq (Digest $liveAsset)) ('LOCAL HTTP PARITY '+$asset) | Out-Null
 }
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $source=(Join-Path $stage 'exterior-window-adapter.mjs')
 if(Test-Path $source){
  $checkOutput=@(& $node --check $source 2>&1)
  Check ($LASTEXITCODE -eq 0) 'ADAPTER ESM SYNTAX' | Out-Null
  if($LASTEXITCODE -ne 0){Log ('CHECK_OUTPUT '+($checkOutput -join '; '))}
  ExportBlob ($prefix+'exterior-window-adapter.test.mjs') (Join-Path $stage 'exterior-window-adapter.test.mjs')
  $tests=@(& $node --test (Join-Path $stage 'exterior-window-adapter.test.mjs') 2>&1)
  $testOk=$LASTEXITCODE -eq 0
  Check $testOk 'NODE WINDOW ADAPTER TEST SUITE' | Out-Null
  foreach($line in $tests){if([string]$line -match '(tests |pass |fail |duration_ms |not ok|error:|SyntaxError)'){Log ('NODE '+([string]$line))}}
 }
 if(Test-Path (Join-Path $stage 'exterior-window-preview.mjs')){
  $checkOutput=@(& $node --check (Join-Path $stage 'exterior-window-preview.mjs') 2>&1)
  Check ($LASTEXITCODE -eq 0) 'PREVIEW ESM SYNTAX' | Out-Null
 }
 Log 'REAL WEBGL APPEARANCE: NOT AUTOMATICALLY VERIFIED; INSPECT BROWSER'
 Log 'PREVIEW_URL http://127.0.0.1:4173/room/team02?tfExteriorPreview=1'
 Log 'REVERT: use tools/revert-exterior-window-preview.ps1 only if visual regression'
 if(-not $fail){
  Log 'RESULT: INSTALLED SOURCE AND TESTS VERIFIED; READY FOR BROWSER OBSERVATION'
  Log 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
  try{Start-Process 'http://127.0.0.1:4173/room/team02?tfExteriorPreview=1'}catch{Log ('BROWSER LAUNCH ERROR '+$_.Exception.Message)}
 }else{
  Log 'RESULT: SOURCE OR TEST MISMATCH. STOP. DO NOT REDEPLOY YET.'
 }
}catch{Log ('VERIFICATION ERROR '+$_.Exception.Message)}finally{
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
 Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
}
