# TowerFlow 51-capital environment: scoped, fail-closed source deployment.
# No zip, backups, branch switches, destructive Git commands or server edits.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$roomJs=Join-Path $room 'public\room.js'
$serverJs=Join-Path $room 'server.js'
$branch='feature/team02-member-desks-preservation-20261120'
if(!(Test-Path (Join-Path $repo '.git'))){throw "Repository not found: $repo"}
if(!(Test-Path $roomJs) -or !(Test-Path $serverJs)){throw 'Existing TowerFlow server/room not found'}
$server=[IO.File]::ReadAllText($serverJs)
if(!$server.Contains("express.static(path.join(__dirname,'public'))")){
 throw 'Unable to prove new modules will be served. No files changed.'
}
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$branch"
if($LASTEXITCODE -ne 0){throw 'Failed to fetch reviewed environment branch'}
$revision=(& git -C $repo rev-parse FETCH_HEAD).Trim()
if($revision -notmatch '^[0-9a-f]{40}$'){throw 'Unexpected Git commit ID'}
$modules=@('geo-capitals-coordinates.mjs','geo-capital-mesh.mjs','geo-environments.mjs')
$utf8=[Text.UTF8Encoding]::new($false)
function GitSource([string]$name){
 $spec=$revision+':collaboration-room/live-room/public/'+$name
 $value=@(& git -C $repo show $spec)
 if($LASTEXITCODE -ne 0){throw "Reviewed module unavailable: $name"}
 return ($value -join [Environment]::NewLine)+[Environment]::NewLine
}
$edits=[System.Collections.Generic.List[object]]::new()
foreach($name in $modules){
 $path=Join-Path $room ('public\'+$name)
 $content=GitSource $name
 if(Test-Path $path){
  if([IO.File]::ReadAllText($path) -ne $content){
   throw "A locally customized $name exists; no files changed."
  }
 }else{$edits.Add([pscustomobject]@{Path=$path;Bytes=$utf8.GetBytes($content)})}
}
$existing=[IO.File]::ReadAllBytes($roomJs)
$text=[IO.File]::ReadAllText($roomJs)
$begin='// TF_51_DESTINATIONS_FOUNDATION_V1_BEGIN'
$bootstrap=@'
// TF_51_DESTINATIONS_FOUNDATION_V1_BEGIN
// Additive, single-owner environment integration; original room preserved.
import {installGeography} from './geo-environments.mjs';
try { installGeography({THREE,scene}); }
catch(error) { console.warn('TowerFlow geographic environment unavailable:',error); }
// TF_51_DESTINATIONS_FOUNDATION_V1_END
'@
if(!$text.Contains($begin)){
 if(!$text.Contains("import * as THREE from 'three'") -or !$text.Contains('const $=id=>')){
  throw 'Live renderer differs from the reviewed import/scene contract; no files changed.'
 }
 $append=$utf8.GetBytes([Environment]::NewLine+$bootstrap+[Environment]::NewLine)
 $total=[byte[]]::new($existing.Length+$append.Length)
 [Array]::Copy($existing,0,$total,0,$existing.Length)
 [Array]::Copy($append,0,$total,$existing.Length,$append.Length)
 $edits.Add([pscustomobject]@{Path=$roomJs;Bytes=$total})
}else{
 if(!$text.Contains("import {installGeography} from './geo-environments.mjs'")){
  throw 'Existing geography integration differs; no files changed.'
 }
}
# Check syntax using staged extension-correct files. Node must NOT execute stdin.
$stage=[System.Collections.Generic.List[string]]::new()
try{
 foreach($edit in $edits){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geo-parse-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $stage.Add($temp)
  [IO.File]::WriteAllBytes($temp,$edit.Bytes)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "Syntax check failed: $($edit.Path). No files changed."}
 }
 # Ensure the current live room was not altered during staging.
 $beforeHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($existing))
 $currentHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($roomJs)))
 if($beforeHash -cne $currentHash){throw 'Concurrent room edit detected. No files changed.'}
 $old=@{}
 try{
  foreach($edit in $edits){
   $old[$edit.Path]=if(Test-Path $edit.Path){[IO.File]::ReadAllBytes($edit.Path)}else{$null}
   [IO.File]::WriteAllBytes($edit.Path,$edit.Bytes)
  }
 }catch{
  foreach($item in $old.GetEnumerator()){
   if($null -eq $item.Value){Remove-Item -LiteralPath $item.Key -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Key,$item.Value)}
  }
  throw
 }
}finally{
 foreach($temp in $stage){Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}
}
Write-Host "GEOGRAPHY SOURCE SYNC COMPLETE — $revision" -ForegroundColor Green
Write-Host 'Original room.js contents preserved; only bootstrap bytes appended if needed.'
Write-Host 'No Node restart is needed for these static modules. Press Ctrl+Shift+R in TowerFlow.'
Write-Host 'Open STATES · CAPITALS; select D.C. or a state, then switch MORNING/DAY/NIGHT.'
