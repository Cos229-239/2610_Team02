# NYC Atmosphere V1: scoped, reversible install into existing TowerFlow host.
# Preserve all original room bytes; append a single ES module bootstrap only.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$roomFile=Join-Path $room 'public\room.js'
$cityFile=Join-Path $room 'public\nyc-atmosphere.mjs'
$ref='feature/team02-member-desks-preservation-20261120'
$marker='// TF_NYC_ATMOSPHERE_V1_BOOTSTRAP'
$utf8=[Text.UTF8Encoding]::new($false)
if(!(Test-Path (Join-Path $repo '.git'))){throw "Repository missing: $repo"}
if(!(Test-Path $roomFile)){throw "Live TowerFlow room missing: $roomFile"}
if(Test-Path $cityFile){throw 'NYC module already exists. Preserve and audit before replacement.'}
$serverPath=Join-Path $room 'server.js'
if(!(Test-Path $serverPath)){throw 'TowerFlow server missing'}
$server=[IO.File]::ReadAllText($serverPath)
if(!$server.Contains("express.static(path.join(__dirname,'public'))")){throw 'Static asset serving differs; do not install blindly'}
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$ref"
if($LASTEXITCODE -ne 0){throw 'GitHub fetch failed'}
$revision=(& git -C $repo rev-parse FETCH_HEAD).Trim()
if($revision -notmatch '^[a-f0-9]{40}$'){throw 'Unexpected Git revision'}
$spec=$revision+':collaboration-room/live-room/public/nyc-atmosphere.mjs'
$module=@(& git -C $repo show $spec) -join [Environment]::NewLine
if($LASTEXITCODE -ne 0 -or !$module.Contains('export function installNYCAtmosphere')){throw 'Reviewed NYC module unavailable'}
$before=[IO.File]::ReadAllBytes($roomFile)
$source=[IO.File]::ReadAllText($roomFile)
if($source.Contains($marker) -or $source.Contains('nyc-atmosphere.mjs')){throw 'NYC bootstrap already present. No overwrite.'}
if(!$source.Contains("import * as THREE from 'three'") -or !$source.Contains('const camera=') -or !$source.Contains('const $=id=>')){
 throw 'The customized Three.js room no longer matches the approved bootstrap contract.'
}
$bootstrap=@'
 
// TF_NYC_ATMOSPHERE_V1_BOOTSTRAP
// Reversible additive skyline. No original scene, camera or workstation is removed.
import {installNYCAtmosphere} from './nyc-atmosphere.mjs';
try {
  installNYCAtmosphere({THREE,scene,renderer,camera,
    position:{x:62,z:-83},autoEnable:true,fetchData:true});
} catch (error) {
  console.warn('NYC atmosphere failed safely; original TowerFlow scene preserved',error);
}
// TF_NYC_ATMOSPHERE_V1_BOOTSTRAP_END
'@
$append=$utf8.GetBytes([Environment]::NewLine+$bootstrap)
$nextBytes=[byte[]]::new($before.Length+$append.Length)
[Array]::Copy($before,0,$nextBytes,0,$before.Length)
[Array]::Copy($append,0,$nextBytes,$before.Length,$append.Length)
$stageRoom=Join-Path ([IO.Path]::GetTempPath()) ('tf-nyc-check-'+[guid]::NewGuid().ToString('N')+'.mjs')
$stageCity=Join-Path ([IO.Path]::GetTempPath()) ('tf-nyc-module-'+[guid]::NewGuid().ToString('N')+'.mjs')
try{
 [IO.File]::WriteAllBytes($stageRoom,$nextBytes)
 [IO.File]::WriteAllText($stageCity,$module,$utf8)
 & node --check $stageRoom
 if($LASTEXITCODE -ne 0){throw 'Live room syntax invalid; nothing installed'}
 & node --check $stageCity
 if($LASTEXITCODE -ne 0){throw 'NYC module syntax invalid; nothing installed'}
 Write-Host 'SYNTAX PASS: original 3D room + NYC bootstrap and module' -ForegroundColor Green
}finally{
 Remove-Item -LiteralPath $stageRoom,$stageCity -Force -ErrorAction SilentlyContinue
}
# Prevent changing the host after it was checked; restore original bytes on any failed write.
$hashBefore=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($before))
$hashCurrent=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($roomFile)))
if($hashBefore -cne $hashCurrent){throw 'Room was edited during validation. Nothing installed.'}
$installedCity=$false
try{
 [IO.File]::WriteAllText($cityFile,$module,$utf8)
 $installedCity=$true
 [IO.File]::WriteAllBytes($roomFile,$nextBytes)
}catch{
 [IO.File]::WriteAllBytes($roomFile,$before)
 if($installedCity){Remove-Item -LiteralPath $cityFile -Force -ErrorAction SilentlyContinue}
 throw
}
Write-Host 'NYC MODULE INSTALLED — existing room graphics and configurations preserved.' -ForegroundColor Green
Write-Host "Git source: $revision"
Write-Host 'Restart existing TowerFlow Node server, hard-refresh Ctrl+Shift+R.'
Write-Host 'Use NYC: ON/OFF to compare. The browser must confirm live NYC data or simulated fallback.'
