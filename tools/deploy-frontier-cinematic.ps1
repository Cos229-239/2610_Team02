# Frontier ORIGINAL-ROOM cinematic release gate. Execute only in a reviewed, isolated worktree.
# Preserves existing server, cookies, OAuth, active teammates, Tailscale, workspaces and unrelated room code.
[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$OpenRoom,
  [string]$LiveRoom = (Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room')
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$hostRoot = [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room'))
$live = [IO.Path]::GetFullPath($LiveRoom)
if (-not $live.StartsWith($hostRoot + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing unrecognized original-room path.'
}
$room = Join-Path $live 'public\room.js'
$server = Join-Path $live 'server.js'
if (-not (Test-Path -LiteralPath $room -PathType Leaf) -or
    -not (Test-Path -LiteralPath $server -PathType Leaf)) {
    throw 'Original Windows room/server missing. No new room will be created.'
}
$node = (Get-Command node -ErrorAction Stop).Source
$required = @(
    'integrations/frontier/cinematic-fidelity.js',
    'integrations/frontier/cyber-ambience.js',
    'integrations/frontier/kinetic-pedestals.js',
    'integrations/frontier/neon-lighting.js',
    'integrations/frontier/team-chat-dock.js',
    'integrations/frontier/frontier-lobby.js',
    'tools/install-frontier-lobby.mjs'
)
$tests = @(
    'integrations/frontier/cinematic-fidelity.test.cjs',
    'integrations/frontier/cyber-ambience.test.cjs',
    'integrations/frontier/experience-upgrades.test.cjs',
    'integrations/frontier/projector-machine.test.cjs',
    'tools/install-frontier-lobby.test.mjs'
)
$start = '// TF_FRONTIER_LOBBY_V1_BEGIN'
$end = '// TF_FRONTIER_LOBBY_V1_END'
function Outside-ReviewedModule([string]$source) {
    $i = $source.IndexOf($start, [StringComparison]::Ordinal)
    $j = $source.IndexOf($end, [StringComparison]::Ordinal)
    if ($i -lt 0 -or $j -le $i -or
        $source.IndexOf($start,$i+$start.Length,[StringComparison]::Ordinal) -ge 0 -or
        $source.IndexOf($end,$j+$end.Length,[StringComparison]::Ordinal) -ge 0) {
        throw 'Original Frontier module missing or duplicated.'
    }
    return $source.Substring(0,$i) + '<REVIEWED_FRONTIER_MODULE>' +
        $source.Substring($j+$end.Length)
}
Write-Host '=== FRONTIER ORIGINAL-ROOM CINEMATIC RELEASE GATE ===' -ForegroundColor Cyan
Write-Host ('Existing live room: ' + $room)
$before = [IO.File]::ReadAllText($room)
$outsideBefore = Outside-ReviewedModule $before
$hashBefore = (Get-FileHash -LiteralPath $room -Algorithm SHA256).Hash
Write-Host ('Original SHA256: '+$hashBefore)
Push-Location $repo
try {
    foreach ($path in $required + $tests) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {throw 'Missing reviewed source: '+$path}
    }
    foreach ($path in $required) {
        & $node --check $path
        if ($LASTEXITCODE -ne 0) {throw 'Source syntax failed: '+$path}
    }
    & $node --test @tests
    if ($LASTEXITCODE -ne 0) {throw 'Contract tests failed. Original room unchanged.'}
    Write-Host 'CODE: PASS — tested source contracts' -ForegroundColor Green

    $installer = 'tools/install-frontier-lobby.mjs'
    & $node $installer --dry-run
    if ($LASTEXITCODE -ne 0) {
        throw 'PRESERVATION: BLOCKED. Existing Frontier module differs from reviewed versions. No live changes applied.'
    }
    Write-Host 'PRESERVATION: PASS — exact-version installer dry-run' -ForegroundColor Green

    if (-not $Apply) {
        Write-Host 'DRY RUN COMPLETE. Apply was not requested.' -ForegroundColor Yellow
        return
    }
    # Re-read just before writing: do not overwrite a teammate's live edit.
    if ([IO.File]::ReadAllText($room) -cne $before) {
        throw 'Original room changed since preflight. No live changes applied.'
    }
    & $node $installer --apply
    if ($LASTEXITCODE -ne 0) {throw 'Installation failed. See installer backup/rollback receipt.'}

    $after = [IO.File]::ReadAllText($room)
    if ((Outside-ReviewedModule $after) -cne $outsideBefore) {
        throw 'PRESERVATION REGRESSION: unrelated room bytes changed. Inspect installer backup.'
    }
    Write-Host 'PRESERVATION: PASS — all bytes outside Frontier region unchanged' -ForegroundColor Green
    Write-Host ('New SHA256: '+(Get-FileHash -LiteralPath $room -Algorithm SHA256).Hash)
    $health = Invoke-WebRequest 'http://127.0.0.1:4173/api/health' -UseBasicParsing -TimeoutSec 5
    if ([int]$health.StatusCode -ne 200) {throw 'Host health check failed; inspect current Node process.'}
    Write-Host 'HOST: HTTP 200. No Node restart or tunnel changes.' -ForegroundColor Green
    Write-Host 'GRAPHICS: SOURCE INSTALLED; browser visual/FPS acceptance still required.' -ForegroundColor Yellow
    if ($OpenRoom) {Start-Process 'https://dulsky.tail0ef7c0.ts.net/room/team02'}
} finally {Pop-Location}
