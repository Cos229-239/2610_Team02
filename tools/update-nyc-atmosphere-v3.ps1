# TowerFlow NYC V3 — upgrade ONLY the already installed NYC module.
# No changes to the 3D room, Azure Bridge, project files, server or credentials.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$file=Join-Path $room 'public\nyc-atmosphere.mjs'
$roomFile=Join-Path $room 'public\room.js'
$branch='feature/team02-member-desks-preservation-20261120'
$path='collaboration-room/live-room/public/nyc-atmosphere.mjs'
$accepted=@(
  'e33cf8300fd64fd616fdc9e192d062cf5e1d3ea2',  # reviewed V1
  'dad2e5d3ef5541af22bef4032a52c43fbc2d52c0'   # reviewed V2
)
if(!(Test-Path (Join-Path $repo '.git'))){throw 'Team Git checkout missing'}
if(!(Test-Path -LiteralPath $file) -or !(Test-Path -LiteralPath $roomFile)){
  throw 'NYC module or original room missing; no files changed'
}
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$branch"
if($LASTEXITCODE -ne 0){throw 'GitHub fetch failed'}
$revision=(& git -C $repo rev-parse FETCH_HEAD).Trim()
if($revision -notmatch '^[a-f0-9]{40}$'){throw 'Invalid fetched commit'}
function ReadGit([string]$commit) {
  $spec=$commit+':'+$path
  $text=@(& git -C $repo show $spec)
  if($LASTEXITCODE -ne 0){throw "Reviewed source unavailable: $commit"}
  return ($text -join [Environment]::NewLine)
}
function Canonical([string]$text) {
  return (($text -replace '`r`n','`n').TrimEnd([char[]]@([char]13,[char]10)))
}
$currentBytes=[IO.File]::ReadAllBytes($file)
$current=[IO.File]::ReadAllText($file)
$updated=ReadGit $revision
if((Canonical $current) -ceq (Canonical $updated)){
  Write-Host 'NYC V3 already installed. No changes needed.' -ForegroundColor Green
  return
}
$match=$false
foreach($baseline in $accepted){
  if((Canonical $current) -ceq (Canonical (ReadGit $baseline))){$match=$true;break}
}
if(!$match){throw 'Local NYC module has unreviewed customizations. Preserved; no files changed.'}
if($updated.Contains('new THREE.PlaneGeometry(270,150)') -or
   !$updated.Contains('TF_NYC_GROUNDED_STREETS_V3') -or
   !$updated.Contains('frameMatrices') -or
   !$updated.Contains('ARCGIS_URL')){
 throw 'V3 safety contract not satisfied. No changes installed.'
}
# The independent live room remains unchanged, verified by SHA-256.
$liveBefore=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($roomFile)))
$encoding=[Text.UTF8Encoding]::new($false)
$temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-nyc-v3-syntax-'+[guid]::NewGuid().ToString('N')+'.mjs')
try{
 [IO.File]::WriteAllText($temp,$updated,$encoding)
 & node --check $temp
 if($LASTEXITCODE -ne 0){throw 'V3 module syntax failed; no files changed'}
}finally{
 if(Test-Path -LiteralPath $temp){Remove-Item -LiteralPath $temp -Force}
}
$hashNow=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($file)))
$hashBefore=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($currentBytes))
if($hashNow -cne $hashBefore){throw 'Local NYC module changed during validation; no files changed'}
try{
 [IO.File]::WriteAllText($file,$updated,$encoding)
 & node --check $file
 if($LASTEXITCODE -ne 0){throw 'Installed module syntax failed'}
}catch{
 [IO.File]::WriteAllBytes($file,$currentBytes)
 throw
}
$liveAfter=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($roomFile)))
if($liveBefore -cne $liveAfter){
 [IO.File]::WriteAllBytes($file,$currentBytes)
 throw 'Original room changed concurrently; NYC module restored'
}
Write-Host 'NYC PHOTO RECONSTRUCTION V3 — INSTALLED' -ForegroundColor Green
Write-Host "Reviewed Git revision: $revision"
Write-Host 'Original room.js hash unchanged; no server, geometry, team desks or OAuth changes.'
Write-Host 'Press Ctrl+Shift+R to refresh TowerFlow, then toggle NYC ON/OFF for visual A/B.'
