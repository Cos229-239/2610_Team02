# TOWERFLOW_LOCAL_IDE_BOOTSTRAP_V1
# Per-device, user-controlled onboarding. Run on the contributor's Windows PC.
# Does not read host desktop paths, change an existing checkout, restart Node, or auto-install IDEs.
[CmdletBinding()]
param(
  [string]$Repository = '',
  [string]$RelativeFile = '',
  [switch]$DetectOnly
)
$ErrorActionPreference = 'Stop'
$remotePattern = '^(https://github\.com/Cos229-239/2610_Team02(\.git)?|git@github\.com:Cos229-239/2610_Team02(\.git)?)$'
$repoUrl = 'https://github.com/Cos229-239/2610_Team02.git'

function Read-RepoOrigin([string]$Path) {
  $origin = (& git -C $Path remote get-url origin 2>$null) -join ''
  if ($LASTEXITCODE -ne 0 -or $origin -notmatch $remotePattern) {
    throw "Folder is not the approved Team02 repository: $Path"
  }
}
function Select-Folder([string]$Title) {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = [System.Windows.Forms.FolderBrowserDialog]::new()
  $dialog.Description = $Title
  $dialog.ShowNewFolderButton = $true
  try {
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
      throw 'Folder selection canceled; nothing changed.'
    }
    return $dialog.SelectedPath
  } finally { $dialog.Dispose() }
}
function Find-Code {
  $bin = Get-Command code.cmd -ErrorAction SilentlyContinue
  if ($bin) { return $bin.Source }
  $bin = Get-Command code -ErrorAction SilentlyContinue
  if ($bin) { return $bin.Source }
  foreach ($path in @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe')
  )) {
    if (Test-Path -LiteralPath $path) { return $path }
  }
  return $null
}
Write-Host '=== TOWERFLOW LOCAL CONTRIBUTOR IDE ===' -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host 'Git is required. Opening the official installer page.' -ForegroundColor Yellow
  if (-not $DetectOnly) { Start-Process 'https://git-scm.com/downloads/win' }
  throw 'Install Git for Windows, then rerun this bootstrap.'
}
$code = Find-Code
if (-not $code) {
  Write-Host 'Visual Studio Code is not installed. Opening official download page.' -ForegroundColor Yellow
  if (-not $DetectOnly) { Start-Process 'https://code.visualstudio.com/download' }
  throw 'Install VS Code and sign into your GitHub account; rerun this bootstrap.'
}
Write-Host "IDE: $code"
if ($DetectOnly) {
  Write-Host 'Detection-only mode. No repository selection or IDE launch.'
  return
}
# Explicit -Repository is for a caller that already knows THIS DEVICE's chosen folder.
if (-not $Repository) {
  $answer = Read-Host 'Already have a local Team02 checkout? Enter Y for yes, N to choose a clone location'
  if ($answer -match '^[Yy]') {
    $Repository = Select-Folder 'Select your existing Team02 repository folder on this computer'
  } elseif ($answer -match '^[Nn]') {
    $parent = Select-Folder 'Choose where YOUR OWN Team02 checkout will be stored'
    $destination = Join-Path $parent '2610_Team02'
    if (Test-Path -LiteralPath $destination) {
      throw "Destination already exists: $destination. Nothing overwritten; choose your existing checkout instead."
    }
    Write-Host "Proposed destination: $destination"
    $confirmation = Read-Host 'Clone approved Team02 dev branch here? Type CLONE to proceed'
    if ($confirmation -cne 'CLONE') { throw 'Clone not approved; nothing changed.' }
    & git clone --branch dev --single-branch -- $repoUrl $destination
    if ($LASTEXITCODE -ne 0) { throw 'Git clone failed. Check network and GitHub account access.' }
    $Repository = $destination
  } else { throw 'Selection canceled; nothing changed.' }
}
$Repository = (Resolve-Path -LiteralPath $Repository).Path
if (-not (Test-Path -LiteralPath (Join-Path $Repository '.git'))) {
  throw "Not a Git checkout: $Repository"
}
Read-RepoOrigin $Repository
$target = $Repository
if ($RelativeFile) {
  if ([IO.Path]::IsPathRooted($RelativeFile)) { throw 'File must be a relative path within the checkout.' }
  $target = [IO.Path]::GetFullPath((Join-Path $Repository $RelativeFile))
  $rootWithSeparator = $Repository.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
  if (-not $target.StartsWith($rootWithSeparator,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'File path escapes the approved checkout.'
  }
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw "Requested file does not exist: $target"
  }
  # Reject reparse points in file/folder chain to avoid escaping checkout via junctions.
  $cursor = Get-Item -LiteralPath $target -Force
  while ($cursor -and $cursor.FullName -ne $Repository) {
    if (($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw "Symbolic links and junctions are not opened by this bootstrap: $($cursor.FullName)"
    }
    $cursor = $cursor.Parent
  }
}
Write-Host "Local repository: $Repository" -ForegroundColor Green
Write-Host "Current branch: $((& git -C $Repository branch --show-current) -join '')"
Write-Host "Opening: $target"
# Use argument array for ordinary paths; no arbitrary shell input from browser.
if ($code.EndsWith('.cmd',[StringComparison]::OrdinalIgnoreCase)) {
  & $code --new-window -- "$target"
} else {
  Start-Process -FilePath $code -ArgumentList @('--new-window', ('"' + $target + '"'))
}
Write-Host 'IDE open requested on THIS computer. No host server or branch modified.'
