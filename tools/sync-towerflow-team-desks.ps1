# TowerFlow team workstation sync (PowerShell 7+, non-destructive).
# Fetch and selectively install the reviewed feature; no checkout switches or Git merges.
$ErrorActionPreference = 'Stop'
$repo = Join-Path $env:USERPROFILE 'Documents\GitHub\2610_Team02'
$room = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$feature = 'feature/team02-member-desks-preservation-20261120'
$prefix = 'collaboration-room/'
$remote = 'https://github.com/Cos229-239/2610_Team02.git'
$liveJs = Join-Path $room 'public\room.js'
$bridge = Join-Path $room 'azure-bridge'
$files = @('azure-bridge\server.cjs','azure-bridge\desk.js','azure-bridge\integration-intake.cjs')
$read = { param($revision,$file)
    $path = $prefix + $file.Replace('\','/')
    $lines = @(& git -C $repo show "${revision}:$path" 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Cannot read Git revision $path" }
    ($lines -join "`n") + "`n"
}
$normalize = {param([string]$value) $value -replace "`r`n","`n" }
Write-Host '=== TOWERFLOW SAFE DESKTOP SYNC ===' -ForegroundColor Cyan
if (!(Test-Path (Join-Path $repo '.git'))) { throw "Repository missing: $repo" }
if (!(Test-Path $liveJs)) { throw "Live room missing: $liveJs" }
if (!(Test-Path (Join-Path $room 'server.js'))) { throw 'Live server.js missing' }
$origin = @(& git -C $repo remote get-url origin) -join ''
if ($origin -notmatch '(?i)(?:Cos229-239/2610_Team02(?:\.git)?$|Cos229-239[/:]2610_Team02(?:\.git)?$)') {
    throw "Unexpected repository origin. No changes installed: $origin"
}
$server = [IO.File]::ReadAllText((Join-Path $room 'server.js'))
if ($server -notmatch 'azure-bridge/server\.cjs') {
    throw 'Existing Azure Bridge mount not confirmed. No changes installed.'
}
& git -C $repo fetch --no-tags $remote "refs/heads/dev:refs/remotes/origin/dev" "refs/heads/$feature"
if ($LASTEXITCODE -ne 0) { throw 'Feature fetch failed' }
$revision = (@(& git -C $repo rev-parse FETCH_HEAD) -join '').Trim()
if ($revision -notmatch '^[a-f0-9]{40}$') { throw 'Unexpected Git commit' }
Write-Host "Reviewed GitHub revision: $revision"
$working = [IO.File]::ReadAllText($liveJs)
$source = & $read $revision 'live-room/public/room.js'
$markers = @(
    @('// TF_TEAM02_MEMBER_DESKS_V1_BEGIN','// TF_TEAM02_MEMBER_DESKS_V1_END','// Return portal on the opposite wall.'),
    @('// TF_TEAM02_MEMBER_DESKS_V1_HANDLER_BEGIN','// TF_TEAM02_MEMBER_DESKS_V1_HANDLER_END',"if (id.startsWith('dev-ide-')) {")
)
foreach ($marker in $markers) {
    $start,$end,$anchor = $marker
    $a = $source.IndexOf($start,[StringComparison]::Ordinal)
    $b = $source.IndexOf($end,[StringComparison]::Ordinal)
    if ($a -lt 0 -or $b -le $a) { throw "Reviewed block missing: $start" }
    $block = $source.Substring($a,$b + $end.Length - $a)
    $existingA = $working.IndexOf($start,[StringComparison]::Ordinal)
    $existingB = $working.IndexOf($end,[StringComparison]::Ordinal)
    if ($existingA -ge 0 -or $existingB -ge 0) {
        if ($existingA -lt 0 -or $existingB -le $existingA) { throw "Incomplete existing marker: $start" }
        $oldBlock = $working.Substring($existingA,$existingB + $end.Length - $existingA)
        if ((& $normalize $oldBlock) -cne (& $normalize $block)) {
            throw "Desktop customization differs inside $start. Preserved; manual reconcile required."
        }
        continue
    }
    if ($working.Split([string[]]@($anchor),[StringSplitOptions]::None).Count -ne 2) {
        throw "Safe insertion anchor missing/duplicate: $anchor"
    }
    $working = $working.Replace($anchor,$block+"`n`n"+$anchor)
}
# No geometry or auth code outside the marked blocks is replaced.
$updates = @()
if ((& $normalize ([IO.File]::ReadAllText($liveJs))) -cne (& $normalize $working)) {
    $updates += [pscustomobject]@{Path=$liveJs; Text=$working}
}
foreach ($file in $files) {
    $rel = $file.Replace('\','/')
    $destination = Join-Path $room $file
    $new = & $read $revision $rel
    if (Test-Path $destination) {
        $current = [IO.File]::ReadAllText($destination)
        $baseline = & $read 'origin/dev' $rel
        if ((& $normalize $current) -cne (& $normalize $baseline) -and
            (& $normalize $current) -cne (& $normalize $new)) {
            throw "Local bridge customization detected: $file. No changes installed."
        }
        if ((& $normalize $current) -cne (& $normalize $new)) {
            $updates += [pscustomobject]@{Path=$destination;Text=$new}
        }
    } else {
        if ($file -ne 'azure-bridge\integration-intake.cjs') {
            throw "Missing preexisting Azure Bridge component: $file"
        }
        $updates += [pscustomobject]@{Path=$destination;Text=$new}
    }
}
$node = (Get-Command node -ErrorAction Stop).Source
foreach ($update in $updates) {
    $isModule = $update.Path.EndsWith('room.js')
    $check = if ($isModule) { @('--input-type=module','--check') } else { @('--check') }
    if ($isModule) {
        $update.Text | & $node @check 2>&1 | Out-Host
    } else {
        # node --check requires a filename for CommonJS; use stdin in CommonJS mode.
        $update.Text | & $node --check 2>&1 | Out-Host
    }
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $($update.Path). No files installed." }
}
Write-Host "Ready to update $($updates.Count) scoped file(s)."
$original = @{}
$encoding = [Text.UTF8Encoding]::new($false)
try {
    foreach ($update in $updates) {
        $path = $update.Path
        $original[$path] = if (Test-Path $path) { [IO.File]::ReadAllBytes($path) } else { $null }
        $folder = Split-Path -Parent $path
        if (!(Test-Path $folder)) { [IO.Directory]::CreateDirectory($folder) | Out-Null }
        $temp = $path + '.tf-stage-' + [Guid]::NewGuid().ToString('N')
        try {
            [IO.File]::WriteAllText($temp,$update.Text,$encoding)
            Move-Item -LiteralPath $temp -Destination $path -Force
        } finally {
            if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Force }
        }
        Write-Host "Installed: $path" -ForegroundColor Green
    }
} catch {
    foreach ($pair in $original.GetEnumerator()) {
        if ($null -eq $pair.Value) { Remove-Item -LiteralPath $pair.Key -Force -ErrorAction SilentlyContinue }
        else { [IO.File]::WriteAllBytes($pair.Key,$pair.Value) }
    }
    throw
}
Write-Host 'SOURCE SYNC COMPLETE. New Azure endpoint requires a normal TowerFlow Node restart.' -ForegroundColor Green
Write-Host 'After starting/restarting your existing TowerFlow launcher, press Ctrl + Shift + R in the browser.'
