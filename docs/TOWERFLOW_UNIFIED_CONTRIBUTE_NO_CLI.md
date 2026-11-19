# TowerFlow Unified Contribution System — No Gemini CLI

## Scope

This branch integrates three existing workstreams into the Team 02 room:

1. **Develop in VS Code:** the two-choice Contribute desk includes twelve source tabs and navigates to audited files/anchors in the signed-in contributor's local TowerFlow checkout using the optional per-user Node companion. If the companion is unavailable, the contributor gets a browser editor link. Opening an editor does not prove that the debugger has attached.
2. **Integrate directly into TowerFlow:** a controlled, source-verified dashboard headline transformation generates an isolated executable web-app preview. After explicit user confirmation, the room can attempt to create a contributor-specific branch and draft PR to `dev` using the contributor's existing GitHub authorization. It cannot merge or publish.
3. **App integrations:** retains Dashboard, Markets, Watchlist, Portfolio, Analytics, Room and Native section links, project source references, and actual pull-request statuses.

**Gemini CLI is not required, installed, invoked or exposed.** The generic prompt-to-code AI capability is not implemented. Requests other than the audited dashboard-headline change are rejected with a clear explanation. This avoids simulating an AI feature that cannot perform source edits.

## Local companion

Optional for VS Code navigation. It uses Node.js already available on the contributor PC, listens only on localhost, requires explicit session pairing and exact room origin, and limits source navigation to audited repository paths.

## Preservation and validation

No `dev` merge or live host deployment is part of this PR. The existing room's 3D graphics, movement, audio and OAuth logic are unchanged in the repository. Before deploying, check the running host's existing bridge customizations and authenticate real users; run `node tools/check-contributions.cjs` on this branch and validate Windows VS Code launches and controlled PR permissions.

The branch is an isolated draft release candidate. The user-provided PowerShell script from an earlier step still included a Gemini planner test path; **remove that path from the preflight test list**, or use the current repository-wide contribution checks.
