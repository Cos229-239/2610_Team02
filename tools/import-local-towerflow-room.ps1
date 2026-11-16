# Imports the EXISTING local Towerflow room into the GitHub checkout for review in VS Code.
# Does not copy .env, tokens, logs, backups, or installed dependencies.
# Does not stage, commit, push, merge, or deploy files.
[CmdletBinding()]
param(
    [string]$LocalRoom = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'),
    [switch]$OpenVSCode
)
$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $PSScriptRoot
$Destination = Join-Path $Repo 'collaboration-room\live-room'
$Report = [System.Collections.Generic.List[string]]::new()
try {
    if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "This must run from a Git checkout; missing $Repo\.git" }
    if (-not (Test-Path (Join-Path $LocalRoom 'server.js'))) { throw "Cannot find the existing local room's server.js at $LocalRoom" }
    if (-not (Test-Path (Join-Path $LocalRoom 'public'))) { throw "Cannot find the existing local room's public directory." }
    $Report.Add("LOCAL SOURCE: $LocalRoom")
    $Report.Add("REPOSITORY: $Repo")
    $Report.Add("TARGET: $Destination")
    # Create an offline backup if re-importing, without touching any original source.
    if (Test-Path $Destination) {
        $BackupRoot = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Import_Backups'
        New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
        $BackupPath = Join-Path $BackupRoot ('live-room-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
        Copy-Item $Destination $BackupPath -Recurse -Force
        $Report.Add("Previous imported copy backed up to $BackupPath")
    }
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    # Strictly allowlist files to avoid accidentally uploading private credentials.
    foreach ($Name in @('server.js','package.json','package-lock.json')) {
        $SourceFile = Join-Path $LocalRoom $Name
        if (Test-Path $SourceFile) {
            Copy-Item -LiteralPath $SourceFile -Destination (Join-Path $Destination $Name) -Force
            $Report.Add("Copied: $Name")
        }
    }
    # Public web assets are intended to be browser-visible, but review them before committing.
    $PublicSource = Join-Path $LocalRoom 'public'
    $PublicDest = Join-Path $Destination 'public'
    New-Item -ItemType Directory -Path $PublicDest -Force | Out-Null
    Get-ChildItem -LiteralPath $PublicSource -Recurse -File | ForEach-Object {
        $Relative = $_.FullName.Substring($PublicSource.Length).TrimStart('\','/')
        $Parts = $Relative -split '[\\/]'
        if ($Parts | Where-Object { $_ -in @('node_modules','.git','logs','.env','secrets','backups') }) { return }
        if ($_.Name -match '(?i)(^\.env|\.pem$|\.key$|\.p12$|secret|token|\.backup|\.log$)') { return }
        $Target = Join-Path $PublicDest $Relative
        New-Item -ItemType Directory -Path (Split-Path $Target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $Target -Force
        $Report.Add("Copied public: $Relative")
    }
    $Report.Add('---')
    $Report.Add('Import complete. NO credentials, .env, node_modules, or logs intentionally copied.')
    $Report.Add('Review changes in VS Code Source Control BEFORE committing or pushing.')
    $Report.Add('Git status:')
    $Report.Add((& git -C $Repo status --short | Out-String).Trim())
    if ($OpenVSCode) {
        $Code = Get-Command code -ErrorAction SilentlyContinue
        if ($Code) {
            & $Code.Source (Join-Path $Repo 'Towerflow-Team02.code-workspace')
            $Report.Add('Opened VS Code workspace.')
        } else { $Report.Add('VS Code command not in PATH; open Towerflow-Team02.code-workspace manually.') }
    }
} catch { $Report.Add("ERROR: $($_.Exception.Message)") }
$Output = $Report -join [Environment]::NewLine
$Output | Set-Clipboard
Write-Host $Output
