# TowerFlow Development Room — Release Gate (No Blind Installation)

## Why this gate exists

The physical Development Room IDE stations only work when **both** the Azure Bridge scripts **and** the actual host scene at `public/room.js` contain the source-backed station adapter. Previous host diagnostics demonstrated that files were installed without being served, including a 404 from the new JavaScript route. Running an installer does not itself prove the scene and web server were updated.

This release gate is **read-only**; it neither replaces files nor restarts a server.

## Recommended Windows PowerShell preflight

Paste as one block into PowerShell on the TowerFlow host:

```powershell
& {
  $ErrorActionPreference = 'Stop'
  $branch = 'feature/ide-stations-capability-bridge-20261119'
  $room = Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
  $stage = Join-Path $env:TEMP ('TowerFlow-Preflight-' + [guid]::NewGuid().ToString('N'))
  try {
    if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git not available.' }
    if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node not available.' }
    git clone --quiet --depth 1 --single-branch --branch $branch https://github.com/Cos229-239/2610_Team02.git $stage
    if ($LASTEXITCODE -ne 0) { throw 'Feature checkout unavailable.' }
    node (Join-Path $stage 'tools\towerflow-dev-preflight.cjs') $room 'http://127.0.0.1:4173'
    $result = $LASTEXITCODE
    if ($result -eq 0) { Write-Host 'READ-ONLY PREFLIGHT PASS' -ForegroundColor Green }
    else { Write-Host 'NOT READY. Do not deploy or overwrite the room.' -ForegroundColor Yellow }
    # Never mistake a successful source test for proven VS Code launch or debugger attachment.
  } finally {
    if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
  }
}
```

### Blocking states and corrective actions

| Preflight result | Meaning | Next action |
| --- | --- | --- |
| `bridge-mounted: BLOCK` | The host's `server.js` does not mount the new bridge | Review the exact hook against this repo; do not blindly inject another server hook |
| `installed-ide-workstations.js: BLOCK` | The frontend file is not present | Stage/verify the bridge as a controlled update of only the exact missing files |
| `version-ide-workstations.js: BLOCK` | Host bridge differs from this reviewed release | Inspect the diff and reconcile customizations; never overwrite without review |
| `scene-dev-station-routing: BLOCK` | Your physical IDE objects still call legacy placeholders | Compare the *existing* `public/room.js` with this branch's precisely scoped `window.tfOpenIDEStation` intercept; integrate without replacing room graphics |
| `scene-business-projector: BLOCK` | The second Dev/Business Studio projector is absent | Review and selectively integrate `TF_DEV_BUSINESS_PROJECTOR_V1` only; preserve original room and projector |
| `http-...: BLOCK` | The running server did not serve expected bytes at its local origin | Verify the actual PID/port, middleware, cache, restart behavior and script response before touching Cloudflare |
| All checks pass | Basic host files and web routes match acceptance markers | Conduct Windows click/E, desktop IDE, and two-account authentication tests |

## Physical acceptance steps

1. Sign in as two distinct team members on two distinct PCs, with their own GitHub credentials. Neither user should see the other user's personal checkout.
2. Enter the development room. Check that the second physical projector is present, and the first projector, WASD movement, audio and existing furniture remain unchanged.
3. Click the Visual Studio Code computer (and press E at close range). Verify the IDE-specific panel appears with **Connect This Computer**, a source selector, and the fallback browser editor.
4. In Contribute, start and pair the local Node companion on that user's PC. Never share the pairing token.
5. Choose Markets, press **Open in VS Code**, and verify on that PC that `TowerFlow/app.js` is actually visible. Record IDE version, targeted line and source hash. A process-spawn receipt alone is insufficient.
6. Repeat with installed Visual Studio Community, Cursor and Antigravity. Explicitly mark missing apps and unsupported launch flags instead of claiming success.
7. Verify a real app breakpoint on Windows; then exercise draft PR creation with each member's own authorized GitHub session. Do not auto-merge or deploy.
8. Only after browser and scene preservation, two-account security, real IDE behavior and a reviewed release diff pass should the experimental branch be considered for promotion.

**No Gemini CLI or paid external AI service is part of this release gate.** Provider-specific AI connections and private AscendenceAgent007 remain isolated.
