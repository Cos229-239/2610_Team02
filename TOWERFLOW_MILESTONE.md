# Towerflow Milestone — Business Product + Real Development + Shared World

Status: **feature branch implemented; GitHub CI testing; live deployment requires host action and browser acceptance.**
No feature in this milestone authorizes arbitrary remote terminal commands against the live multiplayer Node server.

## Preserved product foundation

The original tracked `TowerFlow/index.html`, `app.js`, `styles.css` financial portfolio (holdings, cash, transactions, allocation, market clock, watchlist, theme picker, import/export) remains in the **STOCK MARKET & FINANCE** tab. Existing local browser storage key `towerflow-state-v1` is unchanged. The market clock is informational, not evidence of live quote subscriptions.

Added **INVENTORY INTELLIGENCE** with SKU, stock, weekly sales, cost, price, footprint and days in stock; detects no-selling/slow stock, calculates on-hand inventory capital, weekly sales and gross profit, and compares repricing scenarios. Authorized users can pause and relist *local catalog records*; this does NOT affect external marketplaces. Data defaults to a clearly labeled synthetic demo and can be imported/exported as JSON. Separate storage key `towerflow-business-inventory-v1`. **BUSINESS REVENUE** derives totals from the same local catalog and shows per-product sales bars. **BUSINESS & CORP START HERE** displays pricing *concept* ($0/$500/$100000)—no payment processor or tier enforcement yet.

`tools/serve-portfolio-preview.cjs` serves a **reviewed tracked product preview** at `127.0.0.1:5187`. `tools/install-towerflow-business-product.mjs` safely stages those assets under the live room's `public/towerflow`; after host deploy, use `/towerflow/index.html?tab=inventory`. Because the live server already uses static public files, a restart is not needed for these static assets. This static prototype currently has **no organization account database and is publicly fetchable if the room's Funnel is public; do not put real confidential business information in the example or the repo.** Browser localStorage is per browser and not shared across employees.

## Development and contributor workflow

`tools/open-towerflow-ides.ps1` opens whichever of the four IDEs are actually installed **on the user's own Windows device**, pointing to that user's Git checkout. It neither installs software nor controls another person's workstation. An opt-in `.vsconfig` proposes C++, .NET desktop and web workloads; use the VS Installer to review and apply. Export/import `.vssettings` separately for user-specific IDE settings (can contain sensitive data). No exact equivalent of desktop Visual Studio Community runs inside the browser.

`.devcontainer/devcontainer.json`: focused JS/TS development profile with Node 22 and private portfolio preview port 5187.
`.devcontainer/full-stack/devcontainer.json`: opt-in multi-language universal Codespaces profile (Node, Python, Java, C/C++, .NET, Go, etc; check actual installed commands on launch). **GitHub Codespaces requires an eligible account/policy and may incur costs**; no allocation has been requested by this repo change.

Use `https://codespaces.new/Cos229-239/2610_Team02` or the actual IDE links inside the four existing Development Room stations. Run `node --test TowerFlow/inventory-core.test.cjs tools/serve-portfolio-preview.test.cjs` then `node tools/serve-portfolio-preview.cjs`. Local port 5187 is not the production room's port 4173. Use feature branches and PRs. `tools/towerflow-pr-synopsis.cjs` generates a read-only, path-classified list of changes in GitHub Actions job summary. The host reviews/merges using GitHub rights; **merge and deployment remain separate**. Unapproved contributions remain on their own branches; no feature code deletes another contributor's work.

## In-world changes

Frontier interactive wall now opens the **real business product in an immersive HTML panel**, with tabs in the actual application; accessible full-tab fallback. A button returns to Frontier control center. **The original Development Room, its portal `dev-room`, four `dev-ide-*` workstations, and return portal are retained**, and workstations offer Codespaces and PR links. A physical wall is not a native Windows IDE or an OS remote desktop. The business dashboard is an HTML app in a 3D-attached interaction panel; a shader-textured 3D wall reproducing every DOM interaction has not been implemented.

`integrations/world/world-state.cjs` provides the approved/authoritative scene-state service: private JSON state outside public webroot, revisions, last 100 audit entries, optimistic concurrency, restricted scene modes, same-origin mutations and GitHub maintainer-only publishing. `integrations/world/world-sync-client.js` polls protected state every 8 seconds and aligns animated sky phase to the recorded approval time. `tools/install-shared-world-from-git.mjs` stages the protected API into source-matched private Express server files and appends the optional browser client. **This new protected backend route will NOT work until a planned controlled Node restart.** No restart is performed by the installer.

`integrations/mediator/configuration-mediator.cjs` is a fail-closed typed contract for IDE profiles, world previews and contribution work, **not a currently mounted executor or orchestration service**. Code execution stays in each contributor's isolated Codespace/local machine. Never mount production credentials or the live room directory into a shared untrusted runner.

## Research and next production requirements

- Live financial/competitor feeds require verified licensed providers, API contracts, data provenance, account access, metering and caching. A synthetic pricing scenario must not be mistaken for a buy/sell recommendation or a connected marketplace.
- Real corporate inventory/revenue collaboration requires private authenticated tenant data, POS connectors, role-aware database, product catalog audit, backup, privacy review, billing/stripe compliance and a formal release process.
- Photographic realism requires licensed multi-view reference data, measurements/scale, validated glTF/GLB PBR assets and tests from multiple camera angles. Procedural sunset/aurora/solar-system effects are not literal photographic reconstructions or astronomically to scale.
- Visual regression checks still require authenticated browser testing for Dev Room portal, first-person WASD, interactive product, HUD, voice/WebSocket presence, connected AURA, sky scenes, mobility/accessibility and low-end GPUs. CI syntax/unit tests do not prove these experiences.
- Future scene publication should record approved asset hashes, rights, geometry/material fidelity metrics and author identity, and use a reviewable non-destructive PR deployment process.

## Host deployment

A one-file PowerShell driver `tools/deploy-towerflow-milestone.ps1` fetches reviewed source files from the feature branch, retains source backups, runs unit/tests and dry-run preservation checks, then applies static business product + Frontier + world-emulator updates and **stages** the protected shared-world backend. **It never restarts Node, pushes code, merges PRs or launches native IDEs.** Review the output and stored backup manifests. If a preservation check fails, stop: do not force patch a drifted live server.
