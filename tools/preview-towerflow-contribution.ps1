# TowerFlow contribution reviewer: isolated static preview of a pinned PR head.
# Never checks out or modifies the active Team2 branch or the live Node process.
param(
  [Parameter(Mandatory=$true)][ValidateRange(1,999999)] [int]$PullRequest,
  [string]$Repository="C:\Users\dulsk\Desktop\Team2",
  [ValidateRange(1024,65535)][int]$Port=5188
)
$ErrorActionPreference="Stop"
$Repository=(Resolve-Path -LiteralPath $Repository).Path
$origin=(& git -C $Repository remote get-url origin) -join ""
if($LASTEXITCODE -ne 0 -or $origin -notmatch "Cos229-239/2610_Team02(\.git)?$"){throw "Refusing unrelated repository"}
$base=Join-Path $env:USERPROFILE "Desktop\Towerflow_Contribution_Previews"
New-Item -ItemType Directory -Force -Path $base | Out-Null
$ref="refs/pull/$PullRequest/head"
Write-Host "Fetching PR #$PullRequest at its current GitHub head (never the live room)"
& git -C $Repository fetch --no-tags origin $ref
if($LASTEXITCODE -ne 0){throw "PR source fetch failed"}
$sha=(& git -C $Repository rev-parse FETCH_HEAD) -join ""
if($sha -notmatch "^[a-f0-9]{40}$"){throw "Invalid PR revision"}
$directory=Join-Path $base "PR-$PullRequest-$($sha.Substring(0,12))"
if(-not (Test-Path -LiteralPath $directory)){
  & git -C $Repository worktree add --detach -- $directory $sha
  if($LASTEXITCODE -ne 0){throw "Isolated worktree creation failed"}
}
$preview=Join-Path $directory "tools\serve-portfolio-preview.cjs"
if(-not (Test-Path -LiteralPath $preview)){throw "The PR revision lacks a TowerFlow static preview server"}
Write-Host ""
Write-Host "AUTHOR OWNERSHIP: This preview never deletes or closes the contributor PR."
Write-Host "PINNED REVISION: $sha"
Write-Host "ISOLATED DIRECTORY: $directory"
Write-Host "SOURCE DIFF: https://github.com/Cos229-239/2610_Team02/pull/$PullRequest/files"
Write-Host "ISOLATED VIEW: http://127.0.0.1:$Port/"
Write-Host "VIEWER SAFETY: Treat PR code as untrusted and review the diff before opening it."
Write-Host "NO GITHUB MERGE; NO LIVE SERVER RESTART; NO APP DEPLOYMENT."
Push-Location $directory
try {
  $env:TF_PREVIEW_PORT="$Port"
  & node $preview
}
finally {Pop-Location}
