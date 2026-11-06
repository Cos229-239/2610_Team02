# TowerFlow — Collaborative Production Workspace

**Architecture:** [Approved architecture](docs/ARCHITECTURE.md)  
**Current runnable deliverable:** [production-desk.html](production-desk.html) — a lightweight task and goals workspace that runs directly in a modern browser.  
**Important:** This first deliverable is a local/browser prototype. It stores data in that browser and supports JSON export/import; it is not yet a live multi-user server, 3D room, or integrated IDE. The former Supabase prototype is retired and must not be configured or deployed.

## Product vision

TowerFlow is a shared, browser-accessible production environment for building the Towerflow application itself. Invited collaborators enter a persistent 3D room, see one another as simple colored orbs, and open the tools they need to contribute real work.

**The 3D room is the shared workspace and presence layer—not the product's main purpose.** We do not need human-shaped avatars, character customization, animations, or a game-like character system. Each participant is represented by a clearly distinguishable colored orb with a name/identity label. The room should feel spatial and collaborative while keeping attention on creating and improving the application.

The room provides access to two connected work areas:

1. **Development IDE:** A VS Code-compatible environment for code contributions, with both simultaneous shared editing and individual development sessions.
2. **Towerflow application workspace:** The actual application being built, available inside the room so collaborators can inspect it, run previews, contribute interface designs, add assets and other production materials, and validate how changes appear in the product.

The objective is an end-to-end production workspace—not simply a 3D chat room or a code editor.

## Run the current product

1. Open [production-desk.html](production-desk.html) in a modern desktop browser.
2. Add a goal describing an outcome the team is trying to achieve.
3. Add tasks using the short task form: deliverable, success outcome, why it matters, acceptance check, owner, goal, status, and priority.
4. Click any task to update it or move it between To do, In progress, and Done.
5. Use **Export workspace** to create a JSON backup and share it with teammates. Teammates can use **Import** to load that workspace in their own browser.

No installation, database, API key, or Supabase setup is needed for this first product slice. Data is saved in the browser's local storage. Export/import is the current team handoff mechanism; changes made by different people do not synchronize automatically.

## Task-writing standard

Keep work items concise and actionable:
- **Task:** the deliverable or change.
- **Success outcome:** what will exist or be possible when finished.
- **Why:** optional context, one or two sentences.
- **Done when:** an observable acceptance check.
- **Owner:** one person accountable for moving it forward.
- **Goal:** the larger outcome it supports.

Avoid turning every task into a long requirements document. Add detail only when it prevents ambiguity or rework.

## Core experience

- Open a private invitation link, authenticate, and enter/spawn into the shared room.
- See other participants as differently colored orbs, with clear names and live presence.
- Navigate the room using the keyboard controls below.
- Open the shared IDE to contribute code together.
- Open an individual IDE session when separate work, terminals, debugging, or branches are needed.
- Open the live Towerflow application within the workspace to inspect the current product and its changes.
- Contribute designs, layouts, images, icons, documents, and other production assets through an organized project asset workflow.
- Preview, review, checkpoint, and integrate contributions into the actual application.

### Room controls

| Key | Action |
|---|---|
| W / A / S / D | Move through the room |
| I / K / J / L | Move the camera up / down / left / right |

Controls must not intercept keystrokes while an editor, terminal, form, or other text input has focus. Mouse and touch alternatives may supplement the requested keyboard layout.

## Two development modes

1. **Simultaneous shared editing:** Monaco + Yjs, with synchronized edits, live cursors/selections, and persisted collaboration state.
2. **Individual development:** A separate self-hosted code-server session, terminal, and isolated Git worktree/branch for each participant.

Both modes contribute to the same project through explicit Git checkpoints, diffs, review, and merge. Individual workspaces do not share uncommitted files or processes. No silent overwrites.

## Towerflow application and production assets

The application is a first-class part of the room experience, not an external afterthought.

- Provide an application preview/workbench that runs the current Towerflow application.
- Make it possible to move between the room, IDE, and application preview without losing room presence.
- Support a structured contribution path for UI designs, visual assets, content, documents, and other production files.
- Keep source files and assets in the project repository with version history.
- Provide previews and review before integrating contributed designs or assets.
- Preserve existing TowerFlow browser portfolio and separate native C++ project; do not overwrite or repurpose them without an explicit decision.

The initial design should favor a practical web application preview and a clear asset/project browser. A full visual design editor or advanced asset pipeline can be added when actual production needs justify it.

## Selected technical direction

- **Three.js + TypeScript:** lightweight 3D room, colored orb presence markers, camera, movement, and interactive workstations.
- **Node.js + TypeScript modular monolith:** application API, authentication, room lifecycle, permissions, and realtime services.
- **WebSockets:** room presence, orb positions, and collaboration transport.
- **Monaco Editor + Yjs:** simultaneous shared code editing.
- **Self-hosted code-server:** individual VS Code-compatible IDE sessions.
- **Git repositories/worktrees:** durable source of truth, contributions, review, checkpoints, and recovery.
- **Towerflow app preview:** isolated development preview of the actual application.
- **Project asset workflow:** versioned design and production assets, previews, and review.
- **Self-hosted PostgreSQL:** accounts, rooms, invitations, activity, and persisted Yjs state.
- **Docker Compose:** repeatable local development and integration tests.
- **Vendor-neutral hosting:** choose and approve hosting before external deployment.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the component boundaries, data flows, permission model, build sequence, and acceptance tests.

## Supabase direction retired

The previous Supabase-oriented implementation is historical prototype material only. It is **not** the approved architecture, must not be configured or deployed, and must not receive new features. The replacement will use a self-hosted Node.js/PostgreSQL/WebSocket foundation. Supabase client/configuration/migrations must be removed from the active application path as the replacement is introduced.

## Safety and contribution rules

- Private rooms and server-enforced owner/editor/viewer permissions.
- Invitation links must be expiring, revocable, and validated server-side.
- No secrets in browser code, shared editor documents, or participant workspaces.
- Run participant commands only in isolated workspaces with resource limits—not on the main application server.
- Keep individual workspaces isolated.
- Require explicit review/merge for changes moving between individual branches and the shared branch.
- Keep Git history and recoverable checkpoints for source and production assets.
- Preserve the existing portfolio and native C++ project.
- No Supabase, paid managed services, or external deployment without explicit approval.

## Build milestones

1. Local server, accounts, private rooms, invitations, and role authorization.
2. 3D room with colored orb participants, presence, WASD movement, and IJKL camera controls.
3. Shared Monaco/Yjs editor with simultaneous edits and live cursors.
4. Individual code-server workspaces with isolated terminals and Git branches.
5. Towerflow application preview/workbench accessible from the room.
6. Production asset contribution workflow for designs and other project materials.
7. Git checkpoints, review, merge, recovery, and two-browser end-to-end tests.
8. External hosting and broader production readiness, only after explicit approval.

## Current verified status

- The architecture and product direction are documented on this feature branch.
- A runnable browser-based Production Desk exists with goal creation, task creation/edit/delete, status board, priority, owner, goal association, search/filter, local persistence, and JSON import/export.
- The Production Desk is not yet connected to a shared server; teammates exchange workspace exports manually.
- No multiplayer 3D room, live orb presence, Yjs editor, code-server workspace manager, integrated application preview, or live asset collaboration has been implemented yet.
- The former Supabase prototype is superseded and not runtime-verified.
- No replacement database migrations or two-browser integration tests have been executed.
