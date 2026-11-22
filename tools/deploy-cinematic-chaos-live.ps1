# Deploy real 3D cinematic chaos (storms + fictionalized disaster).
# Replaces ONLY experimental public .mjs files; preserves room.js and saves originals.
# All source exports are exact Git blobs. No services, OAuth, Git worktrees or room layout changed.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$room=Join-Path $live 'public\room.js'
$ref='origin/feature/preserved-exterior-integration-gates-20261121'
$gitdir='collaboration-room/live-room/public/'
$runtime=@('city-exterior-3d.mjs','cinematic-disaster-scenario.mjs','cinematic-storm-system.mjs','cinematic-zombie-outbreak.mjs')
$tests=@('cinematic-disaster-scenario.test.mjs','cinematic-storm-system.test.mjs','cinematic-zombie-outbreak.test.mjs')
$stage=Join-Path $env:TEMP ('tf-chaos-live-'+[guid]::NewGuid().ToString('N'))
$report=New-Object System.Collections.Generic.List[string]
$mutations=New-Object System.Collections.Generic.List[string]
$complete=$false
function Report([string]$s){Write-Host $s;[void]$report.Add($s)}
function Assert-OK([bool]$ok,[string]$error){if(-not $ok){throw $error}}
function Digest([string]$file){return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash}
function Export-Git([string]$name){
 $target=Join-Path $stage $name
 $p=[Diagnostics.ProcessStartInfo]::new()
 $p.FileName=(Get-Command git.exe -ErrorAction Stop).Source
 foreach($arg in @('-C',$repo,'show',($ref+':'+$gitdir+$name))){[void]$p.ArgumentList.Add($arg)}
 $p.UseShellExecute=$false;$p.RedirectStandardOutput=$true
 $proc=[Diagnostics.Process]::Start($p)
 try {
  $stream=[IO.File]::Create($target)
  try{$proc.StandardOutput.BaseStream.CopyTo($stream)}finally{$stream.Dispose()}
  $proc.WaitForExit()
  Assert-OK ($proc.ExitCode -eq 0) ('Cannot export '+$name)
 }finally{$proc.Dispose()}
 $blob=(& git.exe -C $repo rev-parse ($ref+':'+$gitdir+$name)).Trim()
 Assert-OK ($LASTEXITCODE -eq 0) ('Cannot read expected Git hash '+$name)
 $actual=(& git.exe -C $repo hash-object $target).Trim()
 Assert-OK ($blob -eq $actual) ('Git object mismatch '+$name)
}
function Http-Match([string]$url,[string]$expected){
 $tmp=Join-Path $stage ('web-'+[guid]::NewGuid().ToString('N'))
 try{
  Invoke-WebRequest -Uri $url -OutFile $tmp -TimeoutSec 12 | Out-Null
  return (Digest $tmp) -eq (Digest $expected)
 }finally{Remove-Item $tmp -Force -ErrorAction SilentlyContinue}
}
try{
 Report '=== TOWERFLOW CINEMATIC CHAOS / ZOMBIE OUTBREAK / THREE-AIRCRAFT SEQUENCE ==='
 Assert-OK (Test-Path (Join-Path $repo '.git')) 'Repository not found'
 Assert-OK (Test-Path $room) 'Live room.js not found'
 $current=[IO.File]::ReadAllText($room)
 Assert-OK ($current.Contains('TF_CITY3D_EXPERIMENT_V1')) 'Current live room lacks 3D city mount; stop'
 $roomHash=Digest $room
 New-Item -ItemType Directory -Path $stage | Out-Null
 $cfg=Invoke-RestMethod 'http://127.0.0.1:4173/api/config' -TimeoutSec 10
 Assert-OK ($cfg.owner -eq 'Cos229-239' -and $cfg.repo -eq '2610_Team02') 'Wrong process on port 4173'
 Assert-OK (Http-Match 'http://127.0.0.1:4173/room.js?chaos=baseline' $room) 'Live room byte parity failed'
 Report ('[1] EXISTING ROOM UNCHANGED: '+$roomHash)
 foreach($name in @($runtime)+@($tests)){Export-Git $name}
 Report '[2] SOURCE INTEGRITY: EXACT GIT BLOBS'
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 foreach($name in $runtime){
  $out=@(& $node --check (Join-Path $stage $name) 2>&1)
  Assert-OK ($LASTEXITCODE -eq 0) ('JS syntax failed '+$name+': '+($out -join '; '))
 }
 $testsOutput=@(& $node --test (Join-Path $stage $tests[0]) (Join-Path $stage $tests[1]) (Join-Path $stage $tests[2]) 2>&1)
 Assert-OK ($LASTEXITCODE -eq 0) ('Node tests failed: '+($testsOutput -join '; '))
 foreach($line in $testsOutput){if([string]$line -match '(tests |pass |fail |not ok)'){Report ('TEST '+([string]$line))}}
 Report '[3] MODULE SYNTAX AND SCENARIO CONTRACT TESTS: PASS'
 # Only mutate the experimental modules, never the user's 900KB room.js.
 foreach($name in $runtime){
  $dest=Join-Path $live ('public\'+$name)
  $backup=Join-Path $stage ('prior-'+$name)
  if(Test-Path $dest){[IO.File]::Copy($dest,$backup)}
  [void]$mutations.Add($name)
  [IO.File]::Copy((Join-Path $stage $name),$dest,$true)
 }
 Assert-OK ((Digest $room) -eq $roomHash) 'Unrelated room.js was changed'
 foreach($name in $runtime){
  $dest=Join-Path $live ('public\'+$name)
  Assert-OK (Http-Match ('http://127.0.0.1:4173/'+$name+'?chaos='+[guid]::NewGuid().ToString('N')) $dest) ('Live asset differs '+$name)
 }
 Report '[4] ALL FOUR RUNTIME MODULES HTTP PARITY: PASS'
 Report ('ROLLBACK DIRECTORY: '+$stage)
 Report 'CHAOS: severe tornado funnel + flying debris; hurricane/typhoon water surge, storm clouds, lightning'
 Report 'CINEMATIC DISASTER: three impacts (first 2 on tower 1, third on tower 2), sequential collapses, smoke, rubble'
 Report 'ZOMBIE OUTBREAK: patient zero -> contagious tagging -> 420-character street crowd, responders, crash damage and indoor red alarms'
 Report 'EXTERIOR PREVIEW = PROCEDURAL FICTIONAL SCENARIO, NOT DOCUMENTARY RECONSTRUCTION'
 $url='http://127.0.0.1:4173/room/team02?tfCity3D=1'
 if($cfg.roomUrl){$b=[UriBuilder]::new($cfg.roomUrl);$b.Query='tfCity3D=1';$url=$b.Uri.AbsoluteUri}
 Report ('PREVIEW: '+$url)
 Report 'REAL WEBGL FIDELITY: PENDING BROWSER INSPECTION'
 Report 'PRESS CTRL + SHIFT + R IN YOUR BROWSER'
 $complete=$true
 try{Start-Process $url}catch{Report ('BROWSER OPEN ERROR: '+$_.Exception.Message)}
}catch{
 Report ('DEPLOYMENT ERROR: '+$_.Exception.Message)
 # A partial copy must never be left active if all runtime modules did not pass.
 foreach($name in $mutations){
  try{
   $before=Join-Path $stage ('prior-'+$name)
   $dest=Join-Path $live ('public\'+$name)
   if(Test-Path $before){[IO.File]::Copy($before,$dest,$true)}
   else{Remove-Item $dest -Force -ErrorAction SilentlyContinue}
  }catch{Report ('ROLLBACK FAILED '+$name+': '+$_.Exception.Message)}
 }
 Report 'DO NOT REFRESH FOR THIS UPGRADE'
}finally{
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
 Write-Host ('STATUS: '+$(if($complete){'MODULES SERVED; VISUAL ACCEPTANCE PENDING'}else{'BLOCKED OR ROLLED BACK'}))
}
