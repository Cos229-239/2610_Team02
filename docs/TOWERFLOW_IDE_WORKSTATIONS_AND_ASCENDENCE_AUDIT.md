# Development Room: real IDE workstations and AscendenceAgent007 reuse audit

## What the contributor sees

Click a physical **Visual Studio Community**, **VS Code**, **Cursor**, or **Google Antigravity** workstation in the TowerFlow Development Room, or approach its screen and press **E**. The existing 3D object opens a specific IDE panel with an app component picker, local detection state, an **Open in [IDE]** action, a **Connect This Computer** action, and a GitHub browser editor fallback.

The choice is explicit: `Dashboard`, `Markets`, `Watchlist`, `Portfolio`, `Trading`, `Analytics`, `Room`, or another audited source category. **Visual Studio Community** additionally supports the audited native portfolio solution. No arbitrary filesystem path is supplied by a remote user.

The browser **never runs an IDE on the shared Windows host for another team member**. Each user pairs the optional localhost Node companion on *their own computer* using the existing private token and exact TowerFlow origin. The companion independently re-reads their authorized GitHub login, chooses the allowlisted IDE binary, validates their personal repository branch and source path, opens the selected workspace, and reports the source SHA-256 and observed process spawn.

- VS Code: `--new-window <workspace> --goto <canonical-file>:<line>`
- Cursor: `--classic --new-window <workspace> --goto <canonical-file>:<line>` (actual CLI behavior must be checked on installed Windows Cursor)
- Visual Studio: resolved via the installed `vswhere` and opens either a native solution or `/Edit <canonical-file>`
- Google Antigravity: attempts to launch its locally detected Windows IDE executable with the personal workspace; direct symbol navigation and agent capabilities are **not** claimed

All launch receipts explicitly mark `debuggerVerified=false`. A started process does not demonstrate that the window, code view or debugger is functioning. If no IDE or bridge is available, the UI reports that and links to GitHub's browser editor; it does not fake success.

## Independent review: private AscendenceAgent007

Inspected `Dulskinator96/AscendenceAgent007` on its main branch: `README.md`, `laura_mcp.py`, `controller.py`, `knowledge.py` and `LAURA_HANDOFF.md`.

| Candidate | Source evidence | TowerFlow decision |
| --- | --- | --- |
| Allowlisted operations | `controller.py` enumerates bounded commands; `laura_mcp.py` exposes only approved tools | **Reuse principle**: the companion accepts only four specific IDE identities and fixed source areas, not arbitrary commands or paths |
| Source provenance | `knowledge.py` stores content hashes and verifies preserved source, with checkpoint integrity | **Reuse principle**: IDE launch receipt includes SHA-256 of the actually inspected source; independent GitHub PR and live host revision remain separate |
| Explicit proposal vs execution | `controller.py` defaults to proposal and requires explicit execution | **Reuse principle**: user-initiated IDE launch and reviewed PR, no autonomous merge/deploy; direct user action is required |
| Durable checkpoint / task ledger | `knowledge.py` and the Laura README describe SQLite-backed objective checkpoints and event evidence | **Defer**: TowerFlow already has Git commits, source revisions and PR review. A second persistent task ledger is unjustified until recovery requirements are tested |
| Local Python/Ollama runtime | Laura's Windows backend is loopback-only and may require Ollama and token provisioning | **Do not import**: adds a separate host model/orchestrator, private credentials and unnecessary load; no reason to expose it to teammates |
| Laura MCP service | `laura_mcp.py` is STDIO with a fixed local backend, not a public endpoint | **Do not bridge to the room**: another member's browser must not gain access to a private Laura backend |

**Preservation:** No source files or credentials from AscendenceAgent007 were copied into TowerFlow, and that private repository was not modified. No Gemini CLI. No free-tier assumptions about Cursor/Antigravity account features. Existing TowerFlow room scene, projector machinery, login and multiplayer handlers are preserved outside the reviewed IDE station interception.

## Verification gates

1. CI: JavaScript syntax, allowlist tests, cross-account local companion checks, browser contribution checks, inventory and header tests must pass.
2. Windows: Pair two distinct GitHub accounts on distinct machines; each must launch their own IDE/worktree. Try arbitrary IDE names, source traversal, invalid origin, shared token and unauthorized user requests.
3. Observe actual VS Code source line, Cursor editor, Visual Studio solution, and Antigravity folder. Record installed versions; do not assume process spawn proves GUI launch.
4. Use real debugger breakpoints; capture debugger attach/pass separately from opening a file.
5. Validate the physical 3D click/E triggers and the Business Studio projector, while confirming original projector and avatar controls remain intact.
6. Preserve production until a reviewed integration commit and host deployment are verified separately.

## Release state

Draft PR stacked on the preceding Azure AI/projector and contributor UI candidates. **Not deployed, not merged to dev**, and real Windows GUI acceptance is not yet established.
