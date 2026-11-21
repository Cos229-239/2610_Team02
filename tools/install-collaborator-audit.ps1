$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$ref='feature/team02-member-desks-preservation-20261120'
$roomFile=Join-Path $room 'public\room.js'
$serverFile=Join-Path $room 'azure-bridge\server.cjs'
$auditFile=Join-Path $room 'azure-bridge\collaborator-audit.cjs'
$nl=[Environment]::NewLine
function ExactlyOnce([string]$text,[string]$anchor) {
 if($text.Split([string[]]@($anchor),[StringSplitOptions]::None).Count -ne 2){throw "Missing or duplicate anchor: $anchor"}
}
function ReviewedBlock([string]$text,[string]$start,[string]$end){
 $a=$text.IndexOf($start,[StringComparison]::Ordinal)
 $b=$text.IndexOf($end,$a+[Math]::Max(0,$start.Length),[StringComparison]::Ordinal)
 if($a -lt 0 -or $b -le $a){throw "Missing reviewed snippet $start"}
 return $text.Substring($a,$b+$end.Length-$a)
}
if(!(Test-Path (Join-Path $repo '.git'))){throw 'Missing Git checkout'}
foreach($p in @($roomFile,$serverFile)){if(!(Test-Path $p)){throw "Missing $p"}}
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$ref"
if($LASTEXITCODE){throw 'Fetch failed'}
$revision=(& git -C $repo rev-parse FETCH_HEAD).Trim()
if($revision -notmatch '^[0-9a-f]{40}$'){throw 'Bad revision'}
function FromGit([string]$path){
 $spec=$revision+':collaboration-room/'+$path
 $result=@(& git -C $repo show $spec)
 if($LASTEXITCODE){throw "Cannot read $path"}
 return ($result -join [Environment]::NewLine)
}
$source=FromGit 'live-room/public/room.js'
$serverSource=FromGit 'azure-bridge/server.cjs'
$auditSource=FromGit 'azure-bridge/collaborator-audit.cjs'
$live=[IO.File]::ReadAllText($roomFile)
$server=[IO.File]::ReadAllText($serverFile)
$snippet=ReviewedBlock $source '        // Read-only, on-demand project-file audit for this collaborator' '        content.append(auditView);'
$first='// TF_TEAM02_MEMBER_DESKS_V1_HANDLER_BEGIN'
$last='// TF_TEAM02_MEMBER_DESKS_V1_HANDLER_END'
$a=$live.IndexOf($first,[StringComparison]::Ordinal)
$b=$live.IndexOf($last,[StringComparison]::Ordinal)
if($a -lt 0 -or $b -le $a){throw 'Existing teammate handler missing'}
$handler=$live.Substring($a,$b-$a)
if($handler.Contains('collaborator-audit?member=') -or $handler.Contains('Inspect project files')){throw 'Audit already exists; nothing overwritten'}
$anchor='        refreshDesk();'
ExactlyOnce $handler $anchor
$updated=$handler.Replace($anchor,$snippet+$nl+$anchor)
$newLive=$live.Substring(0,$a)+$updated+$live.Substring($b)
$importAnchor="const {makeIntegrationIntake} = require('./integration-intake.cjs');"
$import="const {makeCollaboratorAudit,makeCollaboratorSource} = require('./collaborator-audit.cjs');"
$initAnchor='    const intake = makeIntegrationIntake();'
$init='    const auditCollaborator = makeCollaboratorAudit();'
$init2='    const readCollaboratorSource = makeCollaboratorSource();'
$route=ReviewedBlock $serverSource '    // Read-only per-contributor source coverage; no branch checkout or code execution.' '    });'
$route2=ReviewedBlock $serverSource "    app.get(prefix + '/collaborator-source'" '    });'
$routeAnchor='    // Authenticated, read-only dev integration manifest.'
if($server.Contains('/collaborator-audit') -or $server.Contains($import)){throw 'Audit route already exists; nothing overwritten'}
ExactlyOnce $server $importAnchor
ExactlyOnce $server $initAnchor
ExactlyOnce $server $routeAnchor
$newServer=$server.Replace($importAnchor,$importAnchor+$nl+$import)
$newServer=$newServer.Replace($initAnchor,$initAnchor+$nl+$init+$nl+$init2)
$newServer=$newServer.Replace($routeAnchor,$route+$nl+$route2+$nl+$routeAnchor)
if(Test-Path $auditFile){throw 'Existing audit module; nothing overwritten'}
$edits=@(
 [pscustomobject]@{Path=$roomFile;Content=$newLive},
 [pscustomobject]@{Path=$serverFile;Content=$newServer},
 [pscustomobject]@{Path=$auditFile;Content=$auditSource}
)
$node=(Get-Command node -ErrorAction Stop).Source
foreach($edit in $edits){
 $args=if($edit.Path -eq $roomFile){@('--input-type=module','--check')}else{@('--check')}
 $edit.Content | & $node @args 2>&1 | Out-Host
 if($LASTEXITCODE){throw "JS syntax failed: $($edit.Path). No files installed"}
}
$before=@{}
$encoding=[Text.UTF8Encoding]::new($false)
try{
 foreach($edit in $edits){
  $before[$edit.Path]=if(Test-Path $edit.Path){[IO.File]::ReadAllBytes($edit.Path)}else{$null}
  $temp=$edit.Path+'.staged-'+[guid]::NewGuid().ToString('N')
  try{
   [IO.File]::WriteAllText($temp,$edit.Content,$encoding)
   Move-Item -LiteralPath $temp -Destination $edit.Path -Force
  }finally{if(Test-Path $temp){Remove-Item -LiteralPath $temp -Force}}
 }
}catch{
 foreach($item in $before.GetEnumerator()){
  if($null -eq $item.Value){Remove-Item -LiteralPath $item.Key -Force -ErrorAction SilentlyContinue}
  else{[IO.File]::WriteAllBytes($item.Key,$item.Value)}
 }
 throw
}
Write-Host "COLLABORATOR AUDIT INSTALLED $revision" -ForegroundColor Green
Write-Host 'Restart your existing TowerFlow server. Then Ctrl+Shift+R in the browser.'
