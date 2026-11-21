# TowerFlow AI Operator Instructions

Scope: collaboration-room/live-room and its browser assets. These are reusable instructions for AI coding assistants, not evidence that an untested deployment works.

## Preserve and inspect
- Inspect active Git branch, repo worktrees, unmerged index entries, live server path, and the precise source revision before acting.
- A desktop checkout, linked Git worktree, and the live Node server folder are separate. Never equate `git fetch` with live deployment.
- **Stop on an unmerged index** (`git status --porcelain` containing `UU`, `AA`, etc.). Do not checkout, merge, reset, clean, stash or write into conflicted files without a deliberate conflict-resolution plan.
- Keep shared `dev` review-gated; implement exploratory graphics on a dedicated feature branch. Do not modify authentication, teammate desktops, movement or server routing for graphics work.
- Do not claim screenshots, FPS, weather realism or live synchronization based on static source or mocked tests alone.

## Exterior weather: graphical causality
- Rain is exterior-only, never inside the collaboration/development rooms. Show visible consequences: wetted facades, reduced material roughness, puddles/road sheen, window rivulets, and pedestrians using umbrellas.
- Snow has falling flakes and accumulation on rooftops/streets; blizzards introduce lateral drift. Storm variants add clouds, driven precipitation, and flashes without arbitrary unrelated lights.
- Weather effects must react consistently for each destination and reset on dry/clear selection. Avoid claiming photographic city fidelity or meteorological authenticity from procedural archetypes.
- Preserve near-, mid-, and far-field depth, window geometry and ground/horizon relationship. Keep particles bounded, use instancing where possible, dispose resources.
- State/capital/world event selectors are user-controlled. Local preview must not silently overwrite room-wide authoritative state.

## Verification and operator handoff
- Record source hash, affected files, basic syntax, transitions, actual tests, and unknowns.
- Before instructing a viewer to refresh, independently establish that the **running server is serving the updated module** and that its loaded HTML/room JS references it. A successful Git commit alone is not ready for refresh.
- Once live route and source revision are verified, explicitly tell the user: **Press Ctrl + Shift + R** to hard-refresh TowerFlow. Do not prematurely claim the feature is live.
- Provide a **one-paste Windows PowerShell command that copies its console output to the clipboard** for every requested local check/recovery/deployment. Preferred: `Start-Transcript -Path $log; ...; Stop-Transcript; Get-Content -Raw $log | Set-Clipboard`, with a temporary log outside the repository and no secret output.
- Do not print, copy, or store tokens, `.env`, authentication cookies or confidential configuration in diagnostics. Preserve running services unless a change is explicitly authorized.
- Report IMPLEMENTED / TESTED / VERIFIED / NOT VERIFIED separately.
