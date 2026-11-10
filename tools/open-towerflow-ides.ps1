# Open the same Team 02 Git checkout in all installed IDEs.
# No installs, restarts, git checkout, commit, push, or credential reads.
[CmdletBinding()]
param(
  [string]$Repo = 'C:\Users\dulsk\Desktop\Team2',
  [switch]$DetectOnly
)
$ErrorActionPreference = 'Stop'
$report = [System.Collections.Generic.List[string]]::new()
$report.Add('=== TOWERFLOW FOUR-IDE INTEGRATION ===')
try {
  $Repo = (Resolve-Path -LiteralPath $Repo).Path
  if (-not (Test-Path -LiteralPath (Join-Path $Repo '.git'))) { throw 'Git checkout not found.' }
  $remote = (& git -C $Repo remote get-url origin 2>$null) -join ''
  if ($remote -notmatch '(^|/|:)Cos229-239/2610_Team02(\.git)?$') { throw "Unexpected Git remote: $remote" }
  $report.Add("Repository: $Repo")
  $report.Add("Branch: $((& git -C $Repo branch --show-current) -join '')")
  $report.Add('No Git changes will be made.')
  $solution = Join-Path $Repo 'Towerflow-Team02.sln'
  $workspace = Join-Path $Repo 'Towerflow-Team02.code-workspace'
  $vswhere = Join-Path "${env:ProgramFiles(x86)}" 'Microsoft Visual Studio\Installer\vswhere.exe'
  $vsExe = $null
  if (Test-Path -LiteralPath $vswhere) {
    $found = & $vswhere -latest -products '*' -property productPath 2>$null
    if ($found -and (Test-Path -LiteralPath $found)) { $vsExe = $found }
  }
  if (-not $vsExe) {
    foreach ($ver in @('2026','2022','2019')) {
      foreach ($edition in @('Community','Professional','Enterprise')) {
        $candidate = Join-Path "${env:ProgramFiles}" "Microsoft Visual Studio\$ver\$edition\Common7\IDE\devenv.exe"
        if (Test-Path -LiteralPath $candidate) { $vsExe = $candidate; break }
      }
      if ($vsExe) { break }
    }
  }
  function Find-Executable([string]$name, [string[]]$paths) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in $paths) { if ($p -and (Test-Path -LiteralPath $p)) { return $p } }
    return $null
  }
  $code = Find-Executable 'code.cmd' @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe')
  )
  $cursor = Find-Executable 'cursor.cmd' @(
    (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\bin\cursor.cmd'),
    (Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'),
    (Join-Path $env:ProgramFiles 'Cursor\Cursor.exe')
  )
  $antigravity = Find-Executable 'antigravity.cmd' @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Antigravity\Antigravity.exe'),
    (Join-Path $env:ProgramFiles 'Google\Antigravity\Antigravity.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Google Antigravity\Antigravity.exe')
  )
  $targets = @(
    @{ Label='Visual Studio Community'; Exe=$vsExe; Arg=$solution; Ready=(Test-Path -LiteralPath $solution) },
    @{ Label='Visual Studio Code'; Exe=$code; Arg=$(if (Test-Path $workspace) {$workspace} else {$Repo}); Ready=$true },
    @{ Label='Cursor'; Exe=$cursor; Arg=$Repo; Ready=$true },
    @{ Label='Google Antigravity'; Exe=$antigravity; Arg=$Repo; Ready=$true }
  )
  foreach ($t in $targets) {
    if (-not $t.Exe) { $report.Add("$($t.Label): NOT DETECTED (no installation changed)"); continue }
    if (-not $t.Ready) { $report.Add("$($t.Label): FOUND but solution missing ($solution)"); continue }
    $report.Add("$($t.Label): FOUND ($($t.Exe))")
    if (-not $DetectOnly) {
      try {
        Start-Process -FilePath $t.Exe -ArgumentList @("`"$($t.Arg)`"") -ErrorAction Stop | Out-Null
        $report.Add("$($t.Label): OPEN COMMAND SENT")
      } catch { $report.Add("$($t.Label): OPEN FAILED: $($_.Exception.Message)") }
    }
  }
  $report.Add('Live Node server: UNCHANGED')
  $report.Add('Tailscale Funnel: UNCHANGED')
  $report.Add('Do not edit the same file concurrently in multiple IDEs.')
} catch { $report.Add("ERROR: $($_.Exception.Message)") }
$output = $report -join [Environment]::NewLine
try { $output | Set-Clipboard } catch {}
Write-Host $output
