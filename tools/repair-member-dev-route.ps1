# Add ONLY the missing authenticated member-dev route to the customized Azure server.
$ErrorActionPreference='Stop'
$repo=Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$live=Join-Path $room 'azure-bridge\server.cjs'
$ref='feature/team02-member-desks-preservation-20261120'
if(!(Test-Path (Join-Path $repo '.git'))){throw 'Git checkout not found'}
if(!(Test-Path $live)){throw 'Azure Bridge server not found'}
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$ref"
if($LASTEXITCODE -ne 0){throw 'Unable to fetch reviewed synchronization route'}
$revision=(& git -C $repo rev-parse FETCH_HEAD).Trim()
if($revision -notmatch '^[a-f0-9]{40}$'){throw 'Invalid Git revision'}
$spec=$revision+':collaboration-room/azure-bridge/server.cjs'
$reviewed=(& git -C $repo show $spec) -join [Environment]::NewLine
if($LASTEXITCODE -ne 0){throw 'Cannot read reviewed Azure route'}
$start='    // Read-only, account-independent view of *merged dev* contributions.'
$end="    app.get(prefix + '/branches', auth, ensureMember,"
$a=$reviewed.IndexOf($start,[StringComparison]::Ordinal)
$b=$reviewed.IndexOf($end,$a+[Math]::Max(0,$start.Length),[StringComparison]::Ordinal)
if($a -lt 0 -or $b -le $a){throw 'Reviewed route bounds unavailable'}
$block=$reviewed.Substring($a,$b-$a)
if(!$block.Contains("app.get(prefix + '/member-dev'") -or !$block.Contains('auth, ensureMember')){
 throw 'Reviewed route failed authorization validation'
}
$before=[IO.File]::ReadAllText($live)
$needle="    // Authenticated, read-only dev integration manifest."
if($before.Contains("app.get(prefix + '/member-dev'")){
 Write-Host 'Member-dev route already installed. No source edit required.' -ForegroundColor Yellow
} else {
 if($before.Split([string[]]@($needle),[StringSplitOptions]::None).Count -ne 2){
  throw 'Customized server route position differs. No files changed.'
 }
 $newline=if($before.Contains("`r`n")){"`r`n"}else{"`n"}
 $candidate=$before.Replace($needle,($block -replace "`r?`n",$newline)+$needle)
 # Parse a staged .cjs file, never execute CommonJS from stdin.
 $tmp=Join-Path ([IO.Path]::GetTempPath()) ('tf-member-dev-'+[guid]::NewGuid().ToString('N')+'.cjs')
 $encoding=[Text.UTF8Encoding]::new($false)
 try {
  [IO.File]::WriteAllText($tmp,$candidate,$encoding)
  & node --check $tmp
  if($LASTEXITCODE -ne 0){throw 'Syntax failed; no source changed'}
  if([IO.File]::ReadAllText($live) -cne $before){
    throw 'Live Azure server changed during verification. No source changed.'
  }
  [IO.File]::WriteAllText($live,$candidate,$encoding)
  Write-Host 'PASS: Missing member-dev API route installed; other source preserved.' -ForegroundColor Green
 }finally{
  if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Force}
 }
}
Write-Host 'The running Node process still needs restarting through the existing TowerFlow launcher.'
Write-Host 'After restart, Ctrl+Shift+R and check the collaborator desks.'
