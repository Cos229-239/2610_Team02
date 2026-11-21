# TowerFlow NYC V2 — replace ONLY the separately installed NYC module.
# Local 947-KB room.js, Azure server, original towers, sound and OAuth untouched.
$ErrorActionPreference = 'Stop'
$repo = Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$city = Join-Path $room 'public\nyc-atmosphere.mjs'
$roomJs = Join-Path $room 'public\room.js'
$branch = 'feature/team02-member-desks-preservation-20261120'
$baseline = 'e33cf8300fd64fd616fdc9e192d062cf5e1d3ea2'
$path = 'collaboration-room/live-room/public/nyc-atmosphere.mjs'
if (!(Test-Path (Join-Path $repo '.git'))) { throw 'Team repository checkout missing' }
if (!(Test-Path -LiteralPath $city)) { throw 'Existing NYC V1 module missing: no changes installed' }
if (!(Test-Path -LiteralPath $roomJs)) { throw 'Original room missing: no changes installed' }
& git -C $repo fetch --no-tags 'https://github.com/Cos229-239/2610_Team02.git' "refs/heads/$branch"
if ($LASTEXITCODE -ne 0) { throw 'Reviewed branch fetch failed' }
$head = (& git -C $repo rev-parse FETCH_HEAD).Trim()
if ($head -notmatch '^[a-f0-9]{40}$') { throw 'Invalid revision' }
function ReadGit([string]$commit) {
  $spec = $commit + ':' + $path
  $lines = @(& git -C $repo show $spec)
  if ($LASTEXITCODE -ne 0) { throw "Cannot read $spec" }
  return ($lines -join [Environment]::NewLine)
}
function Canonical([string]$src) {
  return (($src -replace "`r`n","`n").TrimEnd([char[]]@([char]13,[char]10)))
}
$expectedOld = ReadGit $baseline
$updated = ReadGit $head
$original = [IO.File]::ReadAllBytes($city)
$current = [IO.File]::ReadAllText($city)
if ((Canonical $current) -ceq (Canonical $updated)) {
  Write-Host 'NYC V2 already installed — no files changed.' -ForegroundColor Green
  return
}
if ((Canonical $current) -cne (Canonical $expectedOld)) {
  throw 'NYC module contains local customizations. Preserved; no files changed.'
}
if ($updated.Contains('TF_NYC_SKY_BACKGROUND_V1') -or !$updated.Contains('facadeBands') -or
    !$updated.Contains('actual footprint edge')) {
  throw 'Reviewed V2 contract invalid; no files changed.'
}
$encoding = [Text.UTF8Encoding]::new($false)
$temp = Join-Path ([IO.Path]::GetTempPath()) ('tf-nyc-v2-check-' + [guid]::NewGuid().ToString('N') + '.mjs')
try {
  [IO.File]::WriteAllText($temp,$updated,$encoding)
  & node --check $temp
  if ($LASTEXITCODE -ne 0) { throw 'NYC V2 syntax invalid; no files changed' }
  Write-Host 'PASS: NYC V2 JavaScript syntax' -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
}
$beforeSha = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($original))
$liveSha = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($city)))
if ($beforeSha -cne $liveSha) { throw 'NYC module changed while checking; preserved' }
try {
  [IO.File]::WriteAllText($city,$updated,$encoding)
  & node --check $city
  if ($LASTEXITCODE -ne 0) { throw 'Installed source failed syntax' }
} catch {
  [IO.File]::WriteAllBytes($city,$original)
  throw
}
Write-Host 'NYC V2 INSTALLED: removed black background card, added near/mid/far facades, rooftops and correctly aligned windows.' -ForegroundColor Green
Write-Host 'Original TowerFlow room.js unchanged.'
Write-Host 'Press Ctrl+Shift+R in the TowerFlow browser to inspect the skyline.'
