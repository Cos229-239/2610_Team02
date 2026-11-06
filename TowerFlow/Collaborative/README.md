# TowerFlow — Multiplayer Development Workspace

**Architecture status:** Approved baseline documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
**Implementation status:** The new runtime has not yet been built. The existing Supabase scaffold is superseded and must not be configured or deployed.

## Product direction

TowerFlow is a persistent, cross-platform 3D development room where invited collaborators enter together, move through a shared environment, and contribute to the same software project.

It supports two development modes:

1. **Shared simultaneous editing:** Monaco + Yjs, with live source changes, collaborator cursors, and persisted collaboration state.
2. **Individual development:** a separate self-hosted code-server session, terminal, and isolated Git worktree/branch for each participant.

Both modes connect to the same room project through explicit Git checkpoints, diffs, review, and merge. Individual workspaces do not share uncommitted files or processes.

## Room controls

| Key | Action |
|---|---|
| W / A / S / D | Move |
| I / K / J / L | Camera up / down / left / right |

Controls must not intercept typing while an editor, terminal, or form has focus.

## Selected architecture

- Three.js + TypeScript for the browser 3D room.
- Node.js + TypeScript modular monolith for HTTP APIs, authentication, room state, and WebSocket realtime.
- Monaco Editor + Yjs for simultaneous source editing.
- Self-hosted code-server in isolated per-participant containers for individual IDE sessions.
- Git repositories and worktrees as the durable source of truth and contribution workflow.
- Self-hosted PostgreSQL for accounts, rooms, invitations, activity, and persisted Yjs updates/snapshots.
- Docker Compose for repeatable local development.
- Vendor-neutral hybrid hosting later, only with explicit approval.

The complete architecture, data flow, permission boundaries, directory layout, build sequence, and acceptance tests are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Supabase direction retired

The prior Supabase-oriented files in this branch are retained temporarily as historical prototype material only. They are **not** the approved architecture, must not be configured, and must not be deployed. Do not add new features to that implementation. The next implementation phase should introduce the local Node.js/PostgreSQL/WebSocket foundation and then remove the superseded Supabase client/configuration/migrations from the active application path.

## Development and safety constraints

- Preserve the existing TowerFlow browser portfolio and separate native C++ project.
- No Supabase project, paid managed services, hosted workspaces, or deployment.
- No secrets in browser code or workspace files.
- Do not run participant commands on the main application server; use isolated workspace containers with quotas.
- Enforce room roles, invitation validation, and WebSocket authorization server-side.
- No silent overwrites between shared and individual development lanes.
- Do not claim collaboration, security, or deployment is verified until the acceptance tests are run.

## Current verified status

- Architecture document committed on the feature branch.
- No replacement Node.js runtime, Three.js room, Yjs editor, or code-server workspace manager has been implemented yet.
- Existing Supabase prototype has not been runtime-verified and is superseded.
- No database migrations or two-browser tests have been executed for the replacement architecture.
