# ADR-0001: Restore the existing Tailscale desktop client before altering TowerFlow network identity

- **Status:** Accepted for operational recovery (user-confirmed)
- **Date:** 2026-11-20 (America/New_York)
- **Scope:** TowerFlow collaboration room on Windows; Tailscale Funnel; GitHub OAuth callback
- **Decision type:** Operations / preservation
- **Baseline:** Team 02 repository `Cos229-239/2610_Team02`, shared integration branch `dev`

## Context and verified observations

The existing collaboration room runs from `%USERPROFILE%\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room`, with Node.js listening on `127.0.0.1:4173`. The host reported HTTP 200 for `/api/config`, `/api/health`, and `/room/team02`. Its configured repo was `Cos229-239/2610_Team02`, branch `dev`; the previously checked local checkout at `%USERPROFILE%\Documents\GitHub\2610_Team02` was at `4875b3939fb799003bcd924c28c91154deb29252`, matching the then-observed GitHub `dev` tip. A matching Git commit does **not** prove the standalone live room matches source control.

GitHub OAuth initiation returned HTTP 302 to `github.com`, with `redirect_uri=https://dulsky.tail0ef7c0.ts.net/auth/github/callback`. Browser login could not complete while that Tailscale hostname was inaccessible.

The Windows `Tailscale` service was Running; the `Tailscale Tunnel` adapter was Up; Windows services `Dnscache`, `iphlpsvc`, `netprofm`, and `WinHttpAutoProxySvc` were Running. Tailscale CLI version was 1.104.5. Despite a service restart and `tailscale up`, `tailscale status --json` reported `BackendState: NoState`, no device DNS, and health message `Tailscale is starting. Please wait.`. `tailscale funnel --bg --https=443 4173` failed with `unexpected state: NoState`. The test of `controlplane.tailscale.com:443` succeeded, which demonstrates TCP reachability only, not daemon health. Protected logs were inaccessible from a normal shell, and `tailscale debug daemon-logs` produced only `[logtap connected]` during a short capture.

Cloudflare was separately installed as an automatic Windows service using `cloudflared.exe tunnel run --token-file C:\ProgramData\cloudflared\token`. Starting that service did not fix the Tailscale-based OAuth callback. Cloudflare remains a separate transport, not a reason to replace the existing OAuth public identity.

## Decision

**For this specific `NoState` failure, check for and launch the existing per-user Tailscale desktop client (`tailscale-ipn.exe`) before repeating privileged service restarts, resetting adapters, replacing tunnels, or changing TowerFlow's `PUBLIC_URL` or GitHub OAuth registration.** Preserve the established Tailscale hostname and Funnel settings. Do not create another TowerFlow instance or alter Git state.

The user reported that the `tailscale-ipn.exe` launch/recovery procedure **worked**. This is a user-reported recovery observation, **not** a proven universal fix or an independently captured post-recovery backend/Funnel/OAuth test.

## Reproduction and recovery (PowerShell 7, normal user)

Run while the existing TowerFlow server is available; no Administrator elevation is required to launch the desktop client:

```powershell
$ts = 'C:\Program Files\Tailscale\tailscale.exe'
$gui = 'C:\Program Files\Tailscale\tailscale-ipn.exe'

if (-not (Get-Process tailscale-ipn -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path -LiteralPath $gui)) { throw 'Tailscale desktop client not found.' }
    Start-Process -FilePath $gui
}

$state = $null
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 2
    $json = & $ts status --json 2>$null
    if ($json) { $state = $json | ConvertFrom-Json }
    if ($state.BackendState -eq 'Running') { break }
}

if ($state.BackendState -ne 'Running') {
    Write-Warning "Still not connected: $($state.BackendState). Do not change Funnel."
    return
}

& $ts funnel --bg --https=443 4173
if ($LASTEXITCODE -ne 0) { throw 'Funnel activation failed.' }
& $ts funnel status
Invoke-WebRequest 'http://127.0.0.1:4173/api/health' -TimeoutSec 5 | Select-Object StatusCode
```

Then **verify independently** that (a) the expected Tailscale device DNS name is present, (b) the original Funnel hostname resolves and serves `/room/team02`, and (c) GitHub OAuth completes an authenticated round trip. Do not mark those gates passed based only on `BackendState: Running`, local HTTP 200, or a service reporting Running.

## Non-destructive troubleshooting gates

1. Confirm Node.js is healthy locally on `127.0.0.1:4173` and `/api/health` answers HTTP 200; do not kill a working server.
2. Read `tailscale status --json` and confirm `BackendState`; check the interactive `tailscale-ipn` process and launch it if absent.
3. When backend becomes `Running`, restore/check the **existing** Funnel mapping to port 4173; compare the advertised device DNS against `dulsky.tail0ef7c0.ts.net` instead of assuming it.
4. Verify external HTTPS and the full GitHub OAuth callback. Keep `PUBLIC_URL` and OAuth callback unchanged unless a separately approved transport migration is necessary.
5. If still `NoState`, stop repeated blind restarts. Collect a Tailscale diagnostic reference (`tailscale bugreport`) and inspect client/daemon state through supported diagnostics; never print tokens or protected log content into public issues.

## Rejected approaches and rationale

- Repeated service restart: was attempted and did not clear `NoState`.
- Repeated `tailscale up` or Funnel command while `NoState`: did not succeed.
- Switching `PUBLIC_URL` to Cloudflare or localhost immediately: changes GitHub OAuth redirect identity and risks breaking the established team login workflow.
- Reclone, reset, clean, or force-merge repository: unrelated to this networking fault and may destroy local work.
- New tunnel, new OAuth app, Administrator elevation for normal launches: unnecessary for the observed desktop-client recovery.

## Preservation and follow-up

- Keep the original collaboration-room files, 3D scene, OAuth secrets, GitHub branch, and server launcher intact.
- No secrets or `C:\ProgramData\cloudflared\token` contents belong in Git.
- If this failure recurs, capture whether `tailscale-ipn.exe` was absent before launch and the backend state immediately after; distinguish correlation from causation.
- A durable automated startup check may **launch the existing desktop client if missing**, but must not silently change Funnel settings or claim success until the backend, public route, and OAuth checks pass.

## Evidence classification

- **Observed in user-provided terminal output:** local server HTTP 200; OAuth callback on Tailscale hostname; `NoState`; service/adapter active; Funnel failure; TCP 443 reachable.
- **User-confirmed outcome:** the desktop-client recovery procedure worked.
- **Not independently verified afterward:** current backend state, public DNS resolution, Funnel reachability, full authenticated team login, Cloudflare public route.
