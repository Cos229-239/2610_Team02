# TowerFlow reversible live graphics experiment. Uses EXACT recovered source.
# Deploys 2 ESM modules and one URL-gated import/mount. Keep rollback snapshot.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$known='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$sourceDir='collaboration-room/live-room/public/'
$room=Join-Path $live 'public\room.js'
$assets=@('exterior-window-adapter.mjs','exterior-window-preview.mjs')
$staging=Join-Path $env:TEMP ('tf-exterior-preview-guard-'+[guid]::NewGuid().ToString('N'))
$report=New-Object System.Collections.Generic.List[string]
$mutated=$false;$success=$false;$recoveryReady=$false
function Say([string]$s){Write-Host $s;[void]$report.Add($s)}
function Require-Tf([bool]$ok,[string]$why){if(-not $ok){throw $why}}
function Digest([string]$path){return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash}
function Repo-Git([string[]]$parts){
 $result=& git.exe -C $repo @parts
 Require-Tf ($LASTEXITCODE -eq 0) ('git.exe failed: '+($parts -join ' '))
 return ($result -join "`n").Trim()
}
function Export-GitBlob([string]$gitPath,[string]$dest){
 $p=[System.Diagnostics.ProcessStartInfo]::new()
 $p.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($a in @('-C',$repo,'show',($ref+':'+$gitPath))){[void]$p.ArgumentList.Add($a)}
 $p.UseShellExecute=$false;$p.RedirectStandardOutput=$true
 $process=[System.Diagnostics.Process]::Start($p)
 try{
  $out=[System.IO.File]::Create($dest)
  try{$process.StandardOutput.BaseStream.CopyTo($out)}finally{$out.Dispose()}
  $process.WaitForExit()
  Require-Tf ($process.ExitCode -eq 0) ('Git export failed: '+$gitPath)
 }finally{$process.Dispose()}
}
function Check-HttpParity([string]$uri,[string]$file){
 $download=Join-Path $staging ('download-'+[guid]::NewGuid().ToString('N'))
 try{
  Invoke-WebRequest -Uri $uri -OutFile $download -TimeoutSec 12 | Out-Null
  return (Digest $download) -eq (Digest $file)
 } finally {Remove-Item $download -Force -ErrorAction SilentlyContinue}
}
try{
 Say '=== TOWERFLOW REVERSIBLE WINDOW WEATHER EXPERIMENT ==='
 Require-Tf (Test-Path (Join-Path $repo '.git')) 'Git checkout missing'
 Require-Tf (Test-Path (Join-Path $live 'server.js')) 'Live server missing'
 Require-Tf (Test-Path $room) 'Live room.js missing'
 $origin=Repo-Git @('remote','get-url','origin')
 Require-Tf ($origin -match 'Cos229-239[/\\]2610_Team02(\.git)?$') 'Unexpected Git origin'
 Require-Tf ((Digest $room) -eq $known) 'Original live hash differs. No deployment.'
 New-Item -ItemType Directory -Path $staging | Out-Null
 Require-Tf (Check-HttpParity 'http://127.0.0.1:4173/room.js?baseline=1' $room) 'Local server not serving exact original'
 $config=Invoke-RestMethod -Uri 'http://127.0.0.1:4173/api/config' -TimeoutSec 7
 Require-Tf ($config.owner -eq 'Cos229-239' -and $config.repo -eq '2610_Team02') 'Wrong server on 4173'
 Say '[1] EXACT ORIGINAL + LOCAL SERVER: PASS'
 $prior=Join-Path $staging 'original-room.js'
 [System.IO.File]::Copy($room,$prior)
 $recoveryReady=$true
 foreach($name in $assets){
  $target=Join-Path $live ('public\'+$name)
  Require-Tf (-not (Test-Path $target)) ('Asset already exists; refusing replacement: '+$name)
  Export-GitBlob ($sourceDir+$name) (Join-Path $staging $name)
  $blob=Repo-Git @('rev-parse',($ref+':'+$sourceDir+$name))
  Require-Tf ((Repo-Git @('hash-object',(Join-Path $staging $name))) -eq $blob) ('Blob hash mismatch: '+$name)
 }
 Say '[2] EXACT GITHUB MODULE EXPORTS: PASS'
 $original=[System.IO.File]::ReadAllText($room)
 $needle="import * as THREE from 'three';"
 Require-Tf ($original.StartsWith($needle)) 'Original import anchor differs'
 Require-Tf (-not $original.Contains('installExteriorWindowPreview')) 'Preview already installed'
 $injected=$original.Replace($needle,$needle+"`nimport {installExteriorWindowPreview} from './exterior-window-preview.mjs';")
 $injected+="`n// TF_REVERSIBLE_EXTERIOR_PREVIEW_V1`ntry{installExteriorWindowPreview({scene,THREE,window,document});}catch(error){console.warn('Window preview unavailable',error);}`n"
 Require-Tf ($injected.Contains('TF_REVERSIBLE_EXTERIOR_PREVIEW_V1')) 'Activation guard missing'
 $stagedRoom=Join-Path $staging 'staged-room.js'
 [System.IO.File]::WriteAllText($stagedRoom,$injected,[System.Text.UTF8Encoding]::new($false))
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $parse=Get-Content $stagedRoom -Raw | & $node --input-type=module --check 2>&1
 Require-Tf ($LASTEXITCODE -eq 0) ('room.js syntax error: '+($parse -join '; '))
 foreach($name in $assets){& $node --check (Join-Path $staging $name);Require-Tf ($LASTEXITCODE -eq 0) ('module syntax error: '+$name)}
 Say '[3] MINIMAL MODIFICATION / SOURCE SYNTAX: PASS'
 $mutated=$true
 foreach($name in $assets){[System.IO.File]::Copy((Join-Path $staging $name),(Join-Path $live ('public\'+$name)))}
 [System.IO.File]::Copy($stagedRoom,$room,$true)
 Require-Tf (Check-HttpParity 'http://127.0.0.1:4173/room.js?tfExteriorProbe=1' $room) 'room.js HTTP parity failed'
 foreach($name in $assets){
  Require-Tf (Check-HttpParity ('http://127.0.0.1:4173/'+$name+'?tfExteriorProbe=1') (Join-Path $live ('public\'+$name))) ('Module HTTP parity failed: '+$name)
 }
 Say '[4] LOCAL HTTP EXACT-BYTE PARITY: PASS'
 Say 'REVERT SOURCE: '+$prior
 Say 'PREVIEW URL: http://127.0.0.1:4173/room/team02?tfExteriorPreview=1'
 Say 'NORMAL URL: http://127.0.0.1:4173/room/team02'
 Say 'RESULT: EXPERIMENT INSTALLED; REAL 3D VISUAL QUALITY NOT YET ACCEPTED'
 Say 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 $success=$true
} catch {
 Say ('DEPLOYMENT BLOCKED / ERROR: '+$_.Exception.Message)
 if($mutated -and $recoveryReady){
  try{
   [System.IO.File]::Copy((Join-Path $staging 'original-room.js'),$room,$true)
   foreach($name in $assets){Remove-Item -LiteralPath (Join-Path $live ('public\'+$name)) -Force -ErrorAction SilentlyContinue}
   Say ('ROLLED BACK ORIGINAL ROOM SHA256: '+(Digest $room))
  }catch{Say ('ROLLBACK FAILED, retained recovery copy: '+(Join-Path $staging 'original-room.js'))}
 }
 Say 'DO NOT REFRESH FOR THIS UPGRADE'
} finally {
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
 if($recoveryReady){Write-Host ('ROLLBACK SNAPSHOT: '+(Join-Path $staging 'original-room.js'))}
 Write-Host ('STATUS: '+$(if($success){'EXPERIMENTAL LIVE PREVIEW INSTALLED'}else{'NOT INSTALLED / CHECK ROLLBACK'}))
}
