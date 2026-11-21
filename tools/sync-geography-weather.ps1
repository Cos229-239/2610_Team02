# TowerFlow geography and city weather sync (PowerShell 7).
# Scoped: no room.js replacement, branch switching, repository merging or backups.
param([Parameter(Mandatory=$true)][string]$Revision)
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$public=Join-Path $room 'public'
$liveRoom=Join-Path $public 'room.js'
$enc=[Text.UTF8Encoding]::new($false)
$modules=@('geo-capitals-coordinates.mjs','geo-capital-mesh.mjs','geo-capital-photo.mjs','geo-scene-compositor.mjs','geo-environments.mjs')
$baselines=@('23fd8195b2f4ad0c0eca36d68872ac3976e349c1','f3988e01f13499ee482a69c4afbf003f40a08839','eb34710130c48075033700b95bc0eb912694f24c')
if($Revision -notmatch '^[0-9a-f]{40}$'){throw 'Invalid reviewed commit.'}
if(!(Test-Path (Join-Path $repo '.git'))){throw "Repository missing: $repo"}
if(!(Test-Path $liveRoom)){throw 'Original room renderer missing.'}
if(!(Test-Path (Join-Path $room 'server.js'))){throw 'TowerFlow server missing.'}
$originalRoom=[IO.File]::ReadAllBytes($liveRoom)
$roomText=[Text.Encoding]::UTF8.GetString($originalRoom)
if(!$roomText.Contains("import {installGeography} from './geo-environments.mjs'")){
 throw 'Existing geographic bootstrap not found; original room preserved.'
}
function GitBlob([string]$commit,[string]$name){
 $psi=[Diagnostics.ProcessStartInfo]::new()
 $psi.FileName='git'
 $psi.UseShellExecute=$false
 $psi.RedirectStandardOutput=$true
 $psi.RedirectStandardError=$true
 $psi.CreateNoWindow=$true
 foreach($arg in @('-C',$repo,'show',($commit+':collaboration-room/live-room/public/'+$name))){
  [void]$psi.ArgumentList.Add($arg)
 }
 $p=[Diagnostics.Process]::Start($psi)
 try{
  $mem=[IO.MemoryStream]::new()
  $p.StandardOutput.BaseStream.CopyTo($mem)
  $errorText=$p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if($p.ExitCode -ne 0){throw "Git module unavailable: $name :: $errorText"}
  return [Text.Encoding]::UTF8.GetString($mem.ToArray())
 }finally{$p.Dispose()}
}
function Normalize([string]$s){
 $linefeed=[string][char]10
 $return=[string][char]13
 return ($s.Replace($return+$linefeed,$linefeed).TrimEnd([char]10))
}
function AsciiProjection([string]$s){
 return [regex]::Replace((Normalize $s),'[^\x00-\x7F]','')
}
function ByteHash([byte[]]$b){
 return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($b))
}
$updates=[Collections.Generic.List[object]]::new()
$tempFiles=[Collections.Generic.List[string]]::new()
Write-Host '=== TOWERFLOW 51 CAPITALS / NYC WEATHER SYNC ===' -ForegroundColor Cyan
try{
 foreach($name in $modules){
  $target=Join-Path $public $name
  $new=GitBlob $Revision $name
  if(Test-Path $target){
   $oldBytes=[IO.File]::ReadAllBytes($target)
   $old=[Text.Encoding]::UTF8.GetString($oldBytes)
   if((Normalize $old) -ceq (Normalize $new)){
    Write-Host "CURRENT: $name" -ForegroundColor Green
    continue
   }
   # Verify the existing module against ANY version of this specific file
   # in the reviewed branch ancestry. Do not assume a three-commit shortlist:
   # users may have installed intermediate updates from this conversation.
   # The file history is read-only and bounded to 120 commits.
   $relative='collaboration-room/live-room/public/'+$name
   $history=@(git -C $repo log '--format=%H' '-n' '120' $Revision -- $relative)
   if($LASTEXITCODE -ne 0){throw "Cannot inspect reviewed history: $name. No files written."}
   $matched=$false
   foreach($baseline in $history){
    if($baseline -notmatch '^[0-9a-f]{40}   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$oldBytes;Hash=(ByteHash $oldBytes)})
   Write-Host "STAGED UPGRADE: $name" -ForegroundColor Cyan
  }else{
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$null;Hash=$null})
   Write-Host "STAGED MODULE: $name" -ForegroundColor Cyan
  }
 }
 foreach($item in $updates){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geography-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $tempFiles.Add($temp)
  [IO.File]::WriteAllText($temp,$item.Text,$enc)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "JavaScript syntax failed: $($item.Path). Nothing installed."}
 }
 if((ByteHash ([IO.File]::ReadAllBytes($liveRoom))) -cne (ByteHash $originalRoom)){
  throw 'Original room changed during validation. No files written.'
 }
 foreach($item in $updates){
  if($null -ne $item.Hash){
   if((ByteHash ([IO.File]::ReadAllBytes($item.Path))) -cne $item.Hash){
    throw "Concurrent change detected: $($item.Path). No files written."
   }
  }elseif(Test-Path $item.Path){
   throw "Module appeared during staging: $($item.Path). No files written."
  }
 }
 $installed=[Collections.Generic.List[object]]::new()
 try{
  foreach($item in $updates){
   $installed.Add($item)
   [IO.File]::WriteAllText($item.Path,$item.Text,$enc)
   Write-Host "INSTALLED: $(Split-Path $item.Path -Leaf)" -ForegroundColor Green
  }
 }catch{
  foreach($item in $installed){
   if($null -eq $item.Before){Remove-Item -LiteralPath $item.Path -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Path,$item.Before)}
  }
  throw
 }
 Write-Host "DEPLOYED SOURCE: $Revision" -ForegroundColor Green
 Write-Host 'Original room.js and customized Visual Studio integration untouched.'
 Write-Host 'Scene compositor connects all selected weather and city changes to the visible viewport.'
 Write-Host 'Browser: Ctrl+Shift+R, then STATES / CITIES; Esc dismisses the list.'
 Write-Host 'Time: MORNING / DAY / SUNSET / NIGHT.'
 Write-Host 'Manual sky: SUNNY / PARTLY CLOUDY / OVERCAST / FOG / RAIN / HEAVY RAIN / THUNDERSTORM / SNOW.'
 try{
  $origin='http://127.0.0.1:4173'
  foreach($pair in @(
   @('geo-environments.mjs','installSceneCompositor'),
   @('geo-scene-compositor.mjs','tf-geo-scene-effects'),
   @('geo-capital-photo.mjs','environmentPalette')
  )){
   $url=$origin+'/'+$pair[0]
   $result=Invoke-WebRequest $url -TimeoutSec 5
   if($result.StatusCode -ne 200 -or !$result.Content.Contains($pair[1])){
    throw "HTTP content mismatch: $url"
   }
   Write-Host "HTTP VERIFIED: $($pair[0])" -ForegroundColor Green
  }
 }catch{Write-Warning 'HTTP scene module verification failed; confirm the room server is running and serves the current public folder.'}
}finally{
 foreach($temp in $tempFiles){
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
 }
}
){continue}
    try{$earlier=GitBlob $baseline $name}catch{continue}
    if((Normalize $old) -ceq (Normalize $earlier)){
     $matched=$true
     Write-Host "REVIEWED ANCESTOR MATCH: $name at $($baseline.Substring(0,12))" -ForegroundColor Green
     break
    }
   }
   if(!$matched){
    throw "PRESERVATION STOP: $name contains changes not identical to reviewed Git history. No files written."
   }
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$oldBytes;Hash=(ByteHash $oldBytes)})
   Write-Host "STAGED UPGRADE: $name" -ForegroundColor Cyan
  }else{
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$null;Hash=$null})
   Write-Host "STAGED MODULE: $name" -ForegroundColor Cyan
  }
 }
 foreach($item in $updates){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geography-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $tempFiles.Add($temp)
  [IO.File]::WriteAllText($temp,$item.Text,$enc)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "JavaScript syntax failed: $($item.Path). Nothing installed."}
 }
 if((ByteHash ([IO.File]::ReadAllBytes($liveRoom))) -cne (ByteHash $originalRoom)){
  throw 'Original room changed during validation. No files written.'
 }
 foreach($item in $updates){
  if($null -ne $item.Hash){
   if((ByteHash ([IO.File]::ReadAllBytes($item.Path))) -cne $item.Hash){
    throw "Concurrent change detected: $($item.Path). No files written."
   }
  }elseif(Test-Path $item.Path){
   throw "Module appeared during staging: $($item.Path). No files written."
  }
 }
 $installed=[Collections.Generic.List[object]]::new()
 try{
  foreach($item in $updates){
   $installed.Add($item)
   [IO.File]::WriteAllText($item.Path,$item.Text,$enc)
   Write-Host "INSTALLED: $(Split-Path $item.Path -Leaf)" -ForegroundColor Green
  }
 }catch{
  foreach($item in $installed){
   if($null -eq $item.Before){Remove-Item -LiteralPath $item.Path -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Path,$item.Before)}
  }
  throw
 }
 Write-Host "DEPLOYED SOURCE: $Revision" -ForegroundColor Green
 Write-Host 'Original room.js and customized Visual Studio integration untouched.'
 Write-Host 'Scene compositor connects all selected weather and city changes to the visible viewport.'
 Write-Host 'Browser: Ctrl+Shift+R, then STATES / CITIES; Esc dismisses the list.'
 Write-Host 'Time: MORNING / DAY / SUNSET / NIGHT.'
 Write-Host 'Manual sky: SUNNY / PARTLY CLOUDY / OVERCAST / FOG / RAIN / HEAVY RAIN / THUNDERSTORM / SNOW.'
 try{
  $origin='http://127.0.0.1:4173'
  foreach($pair in @(
   @('geo-environments.mjs','installSceneCompositor'),
   @('geo-scene-compositor.mjs','tf-geo-scene-effects'),
   @('geo-capital-photo.mjs','environmentPalette')
  )){
   $url=$origin+'/'+$pair[0]
   $result=Invoke-WebRequest $url -TimeoutSec 5
   if($result.StatusCode -ne 200 -or !$result.Content.Contains($pair[1])){
    throw "HTTP content mismatch: $url"
   }
   Write-Host "HTTP VERIFIED: $($pair[0])" -ForegroundColor Green
  }
 }catch{Write-Warning 'HTTP scene module verification failed; confirm the room server is running and serves the current public folder.'}
}finally{
 foreach($temp in $tempFiles){
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
 }
}
){continue}
    try {
     $earlier=GitBlob $baseline $name
    }catch {
     continue
    }
    if((Normalize $old) -ceq (Normalize $earlier)){
     $matched=$true
     Write-Host "REVIEWED ANCESTOR MATCH: $name at $($baseline.Substring(0,12))" -ForegroundColor Green
     break
    }
   }
   if(!$matched){
    throw "PRESERVATION STOP: $name differs from all reviewed Git versions. No files written."
   }
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$oldBytes;Hash=(ByteHash $oldBytes)})
   Write-Host "STAGED UPGRADE: $name" -ForegroundColor Cyan
  }else{
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$null;Hash=$null})
   Write-Host "STAGED MODULE: $name" -ForegroundColor Cyan
  }
 }
 foreach($item in $updates){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geography-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $tempFiles.Add($temp)
  [IO.File]::WriteAllText($temp,$item.Text,$enc)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "JavaScript syntax failed: $($item.Path). Nothing installed."}
 }
 if((ByteHash ([IO.File]::ReadAllBytes($liveRoom))) -cne (ByteHash $originalRoom)){
  throw 'Original room changed during validation. No files written.'
 }
 foreach($item in $updates){
  if($null -ne $item.Hash){
   if((ByteHash ([IO.File]::ReadAllBytes($item.Path))) -cne $item.Hash){
    throw "Concurrent change detected: $($item.Path). No files written."
   }
  }elseif(Test-Path $item.Path){
   throw "Module appeared during staging: $($item.Path). No files written."
  }
 }
 $installed=[Collections.Generic.List[object]]::new()
 try{
  foreach($item in $updates){
   $installed.Add($item)
   [IO.File]::WriteAllText($item.Path,$item.Text,$enc)
   Write-Host "INSTALLED: $(Split-Path $item.Path -Leaf)" -ForegroundColor Green
  }
 }catch{
  foreach($item in $installed){
   if($null -eq $item.Before){Remove-Item -LiteralPath $item.Path -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Path,$item.Before)}
  }
  throw
 }
 Write-Host "DEPLOYED SOURCE: $Revision" -ForegroundColor Green
 Write-Host 'Original room.js and customized Visual Studio integration untouched.'
 Write-Host 'Scene compositor connects all selected weather and city changes to the visible viewport.'
 Write-Host 'Browser: Ctrl+Shift+R, then STATES / CITIES; Esc dismisses the list.'
 Write-Host 'Time: MORNING / DAY / SUNSET / NIGHT.'
 Write-Host 'Manual sky: SUNNY / PARTLY CLOUDY / OVERCAST / FOG / RAIN / HEAVY RAIN / THUNDERSTORM / SNOW.'
 try{
  $origin='http://127.0.0.1:4173'
  foreach($pair in @(
   @('geo-environments.mjs','installSceneCompositor'),
   @('geo-scene-compositor.mjs','tf-geo-scene-effects'),
   @('geo-capital-photo.mjs','environmentPalette')
  )){
   $url=$origin+'/'+$pair[0]
   $result=Invoke-WebRequest $url -TimeoutSec 5
   if($result.StatusCode -ne 200 -or !$result.Content.Contains($pair[1])){
    throw "HTTP content mismatch: $url"
   }
   Write-Host "HTTP VERIFIED: $($pair[0])" -ForegroundColor Green
  }
 }catch{Write-Warning 'HTTP scene module verification failed; confirm the room server is running and serves the current public folder.'}
}finally{
 foreach($temp in $tempFiles){
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
 }
}
){continue}
    try{$earlier=GitBlob $baseline $name}catch{continue}
    if((Normalize $old) -ceq (Normalize $earlier)){
     $matched=$true
     Write-Host "REVIEWED ANCESTOR MATCH: $name at $($baseline.Substring(0,12))" -ForegroundColor Green
     break
    }
   }
   if(!$matched){
    throw "PRESERVATION STOP: $name contains changes not identical to reviewed Git history. No files written."
   }
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$oldBytes;Hash=(ByteHash $oldBytes)})
   Write-Host "STAGED UPGRADE: $name" -ForegroundColor Cyan
  }else{
   $updates.Add([pscustomobject]@{Path=$target;Text=$new;Before=$null;Hash=$null})
   Write-Host "STAGED MODULE: $name" -ForegroundColor Cyan
  }
 }
 foreach($item in $updates){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geography-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $tempFiles.Add($temp)
  [IO.File]::WriteAllText($temp,$item.Text,$enc)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "JavaScript syntax failed: $($item.Path). Nothing installed."}
 }
 if((ByteHash ([IO.File]::ReadAllBytes($liveRoom))) -cne (ByteHash $originalRoom)){
  throw 'Original room changed during validation. No files written.'
 }
 foreach($item in $updates){
  if($null -ne $item.Hash){
   if((ByteHash ([IO.File]::ReadAllBytes($item.Path))) -cne $item.Hash){
    throw "Concurrent change detected: $($item.Path). No files written."
   }
  }elseif(Test-Path $item.Path){
   throw "Module appeared during staging: $($item.Path). No files written."
  }
 }
 $installed=[Collections.Generic.List[object]]::new()
 try{
  foreach($item in $updates){
   $installed.Add($item)
   [IO.File]::WriteAllText($item.Path,$item.Text,$enc)
   Write-Host "INSTALLED: $(Split-Path $item.Path -Leaf)" -ForegroundColor Green
  }
 }catch{
  foreach($item in $installed){
   if($null -eq $item.Before){Remove-Item -LiteralPath $item.Path -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Path,$item.Before)}
  }
  throw
 }
 Write-Host "DEPLOYED SOURCE: $Revision" -ForegroundColor Green
 Write-Host 'Original room.js and customized Visual Studio integration untouched.'
 Write-Host 'Scene compositor connects all selected weather and city changes to the visible viewport.'
 Write-Host 'Browser: Ctrl+Shift+R, then STATES / CITIES; Esc dismisses the list.'
 Write-Host 'Time: MORNING / DAY / SUNSET / NIGHT.'
 Write-Host 'Manual sky: SUNNY / PARTLY CLOUDY / OVERCAST / FOG / RAIN / HEAVY RAIN / THUNDERSTORM / SNOW.'
 try{
  $origin='http://127.0.0.1:4173'
  foreach($pair in @(
   @('geo-environments.mjs','installSceneCompositor'),
   @('geo-scene-compositor.mjs','tf-geo-scene-effects'),
   @('geo-capital-photo.mjs','environmentPalette')
  )){
   $url=$origin+'/'+$pair[0]
   $result=Invoke-WebRequest $url -TimeoutSec 5
   if($result.StatusCode -ne 200 -or !$result.Content.Contains($pair[1])){
    throw "HTTP content mismatch: $url"
   }
   Write-Host "HTTP VERIFIED: $($pair[0])" -ForegroundColor Green
  }
 }catch{Write-Warning 'HTTP scene module verification failed; confirm the room server is running and serves the current public folder.'}
}finally{
 foreach($temp in $tempFiles){
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
 }
}
