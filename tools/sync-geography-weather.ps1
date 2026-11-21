# TowerFlow reviewed geography deployment — PowerShell 7.
# No room.js writes, no repo merge, no permanent backups.
param([Parameter(Mandatory=$true)][string]$Revision)
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$public=Join-Path $room 'public'
$renderer=Join-Path $public 'room.js'
$modules=@('geo-capitals-coordinates.mjs','geo-capital-mesh.mjs','geo-capital-photo.mjs','geo-scene-compositor.mjs','geo-environments.mjs')
$encoding=[Text.UTF8Encoding]::new($false)
if($Revision.Length -ne 40){throw 'Expected full reviewed commit SHA.'}
if(!(Test-Path (Join-Path $repo '.git'))){throw 'Repository not found.'}
if(!(Test-Path $renderer)){throw 'Live renderer not found.'}
$roomBytes=[IO.File]::ReadAllBytes($renderer)
if(![Text.Encoding]::UTF8.GetString($roomBytes).Contains("import {installGeography} from './geo-environments.mjs'")){
 throw 'Geography bootstrap missing. Live renderer preserved.'
}
function Source([string]$ref,[string]$name){
 $p=[Diagnostics.ProcessStartInfo]::new('git')
 $p.UseShellExecute=$false
 $p.RedirectStandardOutput=$true
 $p.RedirectStandardError=$true
 foreach($arg in @('-C',$repo,'show',($ref+':collaboration-room/live-room/public/'+$name))){
  [void]$p.ArgumentList.Add($arg)
 }
 $process=[Diagnostics.Process]::Start($p)
 try{
  $buffer=[IO.MemoryStream]::new()
  $process.StandardOutput.BaseStream.CopyTo($buffer)
  $err=$process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw "Source unavailable: $name $err"}
  return [Text.Encoding]::UTF8.GetString($buffer.ToArray())
 }finally{$process.Dispose()}
}
function Normal([string]$s){
 return $s.Replace(([string][char]13+[char]10),[string][char]10).TrimEnd([char]10)
}
function Digest([byte[]]$b){
 return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($b))
}
$entries=[Collections.Generic.List[object]]::new()
$temps=[Collections.Generic.List[string]]::new()
Write-Host '=== TOWERFLOW REVIEWED GEOGRAPHY SYNC ===' -ForegroundColor Cyan
try{
 foreach($name in $modules){
  $target=Join-Path $public $name
  $fresh=Source $Revision $name
  if(Test-Path $target){
   $original=[IO.File]::ReadAllBytes($target)
   $current=[Text.Encoding]::UTF8.GetString($original)
   if((Normal $current) -ceq (Normal $fresh)){
    Write-Host "CURRENT: $name" -ForegroundColor Green
    continue
   }
   $path='collaboration-room/live-room/public/'+$name
   $history=@(git -C $repo log '-n' '150' '--format=%H' $Revision -- $path)
   if($LASTEXITCODE -ne 0){throw "Git history unavailable: $name"}
   $recognized=$false
   foreach($oldRevision in $history){
    if($oldRevision.Length -ne 40){continue}
    $previous=Source $oldRevision $name
    if((Normal $current) -ceq (Normal $previous)){
     $recognized=$true
     Write-Host "REVIEWED BASELINE: $name ($($oldRevision.Substring(0,10)))" -ForegroundColor Green
     break
    }
   }
   if(!$recognized){throw "PRESERVATION STOP: unrecognized customization: $name. No files written."}
  }else{
   $original=$null
  }
  $entries.Add([pscustomobject]@{Path=$target;Name=$name;Text=$fresh;Before=$original;Hash=$(if($null -eq $original){$null}else{Digest $original})})
 }
 foreach($item in $entries){
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('tf-geo-'+[guid]::NewGuid().ToString('N')+'.mjs')
  $temps.Add($temp)
  [IO.File]::WriteAllText($temp,$item.Text,$encoding)
  & node --check $temp
  if($LASTEXITCODE -ne 0){throw "Syntax failed: $($item.Name); no files written."}
 }
 if((Digest ([IO.File]::ReadAllBytes($renderer))) -cne (Digest $roomBytes)){
  throw 'Live renderer changed during staging. No files written.'
 }
 foreach($item in $entries){
  if($null -eq $item.Before){
   if(Test-Path $item.Path){throw "Concurrent new module: $($item.Name)"}
  }elseif((Digest ([IO.File]::ReadAllBytes($item.Path))) -cne $item.Hash){
   throw "Concurrent module change: $($item.Name)"
  }
 }
 $written=[Collections.Generic.List[object]]::new()
 try{
  foreach($item in $entries){
   $written.Add($item)
   [IO.File]::WriteAllText($item.Path,$item.Text,$encoding)
   Write-Host "INSTALLED: $($item.Name)" -ForegroundColor Green
  }
 }catch{
  foreach($item in $written){
   if($null -eq $item.Before){Remove-Item -LiteralPath $item.Path -Force -ErrorAction SilentlyContinue}
   else{[IO.File]::WriteAllBytes($item.Path,$item.Before)}
  }
  throw
 }
 Write-Host "SOURCE DEPLOYED: $Revision" -ForegroundColor Green
 Write-Host 'Customized room.js, IDE settings and Git branches untouched.'
 foreach($name in @('geo-environments.mjs','geo-capital-photo.mjs','geo-scene-compositor.mjs')){
  try{
   $r=Invoke-WebRequest ('http://127.0.0.1:4173/'+$name) -TimeoutSec 5
   if($r.StatusCode -ne 200){throw 'Unexpected HTTP status'}
   Write-Host "HTTP 200: $name" -ForegroundColor Green
  }catch{Write-Warning "HTTP unverified: $name (check existing room server)"}
 }
}finally{
 foreach($temp in $temps){Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}
}
