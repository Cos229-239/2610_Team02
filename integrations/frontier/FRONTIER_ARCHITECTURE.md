# Towerflow Frontier — Projector dashboard + shared browser IDE

## Delivered in PR #8 (feature branch)
- Original **atrium becomes FRONTIER**, the entry lobby. The large TOWERFLOW entrance sign remains clickable and is moved above the projected dashboard.
- **Three in-room destinations:** interactive projected Frontier dashboard, Development IDE, World Studio/AURA. These are in the original room; the existing separate four-station Development Room at scene X ≈ 62 remains.
- A modeled projector physically lowers from the ceiling and shines at a new front-wall canvas dashboard. The wall is visual; clicking it or pressing E opens the interactive HTML dashboard with **Overview / Repository / Team / Tasks / AURA** tabs.
- The in-room browser IDE lists real tracked repository files using the existing authenticated APIs, loads editable file content, and saves changes to the host working tree only with explicit confirmation and a pre-save conflict check. The server enforces collaborator write permission. **This is not a desktop Visual Studio/Cursor/Antigravity process.**
- **github.dev** opens a VS Code-style web IDE connected to the actual GitHub repository for collaborators who need to commit on branches and propose pull requests. Access depends on their GitHub repository permissions.
- Team panel provides member listing/invitation (admin) and voice. Local task board is not shared across teammates in this release.
- AURA World Emulation Vault is a separate, hidden behind-the-scenes procedural scene asset library: photo-inspired sunset descending into the horizon, illustrative 8-planet celestial display against stars, colorful drifting aurora, and requested colored text centered in the ceiling. The `towerflow-knowledge/object-reference-vault.json` manifest records evidence/reference URLs and the limits of accuracy.

## Verify before deployment
The actual live app still resides outside tracked GitHub files. These modifications are **applied locally** after fetching the reviewed feature branch. Install the two feature scripts in this order after fetching their dependencies:

```powershell
node .\tools\install-frontier-lobby.test.mjs
node .\tools\install-aura-world-emulation.test.mjs
node .\tools\install-frontier-lobby.mjs --dry-run
node .\tools\install-aura-world-emulation.mjs --dry-run
node .\tools\install-frontier-lobby.mjs --apply
node .\tools\install-aura-world-emulation.mjs --apply
```

Each installer validates both copies of `room.js`, checks the verified first-person movement formula, writes independent rollback snapshots and preserves the existing backend. **No Node restart is needed** for these browser JavaScript changes. Refresh only the affected browser tab.

## Expected limitations
- This is a stylized 3D scene enhancement; it is not a live embedded copy of the separate personal portfolio dashboard in `TowerFlow/index.html`. The original finance dashboard has not been exposed publicly and would need an explicit approved data/privacy integration.
- The projector screen reflects the current UI tab through a canvas texture; keyboard/mouse controls for the tabs live in a full-size accessible HTML panel triggered by the in-world screen. Full spatial HTML-on-mesh input is not used.
- Source editing saves to the host working tree and not automatically to GitHub. Collaborators can contribute via GitHub PRs using github.dev, provided GitHub authorization is configured.
- The native desktop IDEs cannot be streamed or launched remotely by public browser code; full desktop bridges remain out of scope because of security and client-device differences.
- The sky and planets are procedural, **not literal NASA photographic textures**, not physically accurate orbital positions, and not to scale. Reference source URLs should be checked when expanding the knowledge vault.
- World scene state is browser-local and opt-in; changing the sky doesn't silently change other collaborators' view. Shared room-wide design state requires separate authorized backend and review.
- Rendering varies by GPU/browser. Static CI tests do not certify immersive visual quality or all user flows; visually inspect the deployed scenes.
