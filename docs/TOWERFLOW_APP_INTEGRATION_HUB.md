# TowerFlow — One App Integration Hub

This implementation adds **App integrations** to the existing collaboration room toolbar, without altering room graphics, movement, sign-in, or the portfolio app runtime.

## Why

There are several app areas but they live in common files: the Dashboard layout is in `TowerFlow/index.html`; market clock, watchlist, portfolio, trading and projections share `TowerFlow/app.js`. Native applications live under separate projects. It is **not safe to claim a particular screen has been integrated just because a PR edits `app.js`**.

The hub therefore offers an explicit destination for each contribution:

- Dashboard
- Markets & Watchlist
- Portfolio & Trades
- Analytics & Projection
- Shared Web App
- Collaboration Room
- Native & Desktop

## User flow

1. Enter the room with your individual authorized GitHub account and click **App integrations**.
2. Select the intended area. The hub shows the real source path, latest matching pull requests, review state and host-published app receipt (when available).
3. Make changes in your **own repository checkout** through your preferred IDE or authorized AI coding agent. The hub does not paste source files into the web page or grant an AI GitHub access automatically.
4. Push your feature branch under your own account; return to the hub.
5. Fill **Feature title**, **My pushed branch**, and **What changed / how to test it**; click **Prepare PR to dev**.
6. On GitHub, review the actual diff and create the PR. The hub includes `TowerFlow-Area: <area>` in PR body to associate shared `app.js` work with the relevant section.
7. Review/merge to `dev` under existing repository permissions. The hub will show its observed review status. **Try merged web app** opens a revision-pinned, isolated preview. Publication to the host remains a separate controlled step.
8. Re-open the hub to compare the published app release receipt with the reviewed PR. The receipt alone does not prove an individual contribution is live.

## Source and evidence

- `collaboration-room/azure-bridge/app-hub.js`: in-room user interface.
- `collaboration-room/azure-bridge/app-hub.cjs`: authenticated, bounded GitHub PR index.
- `collaboration-room/azure-bridge/app-hub.test.cjs`: area classification, server access and PR status tests.
- `collaboration-room/azure-bridge/server.cjs`: mount endpoint and static script.
- `collaboration-room/azure-bridge/install.cjs`: include new scripts in the existing preservation-aware installer.
- `collaboration-room/azure-bridge/desk.js`: permit reuse of the existing sandboxed merged-web-preview action.
- `collaboration-room/azure-bridge/loadout.css`: scoped panel layout.

**Evidence boundaries:** The API reports the latest 18 pull requests targeting `dev`, not all repository history. File-path inference labels generic `app.js` PRs as **Shared Web App** unless the PR body declares an area. A declared area expresses intent, not successful deployment. If GitHub activity or the host release receipt is unavailable, the UI reports that explicitly. No automation writes source, pushes commits, merges or publishes in this change.

## Regression plan

- Run `node tools/check-contributions.cjs`, `node tools/check-azure-desk.cjs` and `node tools/check-contribution-studio.cjs` in the existing CI environment.
- Verify signed-in teammate A sees **App integrations** while teammate B has a different identity.
- Test module switching, genuine published branch PR preparation, submission and review states, and `Try merged web app`.
- Confirm the existing `Contribute`, `Team updates`, OAuth, 3D scene, WASD and graphics are preserved.
- No live server deployment or two-account acceptance is claimed from CI alone.

**Review requirement:** Do not deploy to the production room or merge solely on syntax checks. Check existing bridge PRs, verify release installer behavior against the actual running host, and compare room/graphics bytes before promotion.
