# TowerFlow Collaborative Development Architecture

**Status:** Approved architectural baseline, 2026-11-06  
**Supersedes:** The Supabase-based collaborative scaffold in this branch.  
**Implementation status:** Architecture only; the replacement runtime has not yet been built or tested.

## 1. Product outcome

TowerFlow is a persistent, cross-platform 3D development room in which invited people can enter the same room, see one another, navigate the environment, communicate, and contribute to a shared software project.

A room has two first-class development modes:

1. **Shared editing:** multiple participants edit the same source file simultaneously. Everyone sees live content changes, selections, and collaborator cursors.
2. **Individual development:** each participant has an independent IDE session, terminal, debug process, and isolated working branch/worktree.

Both modes operate on the room's project repository. Work is preserved through Git, reviewable contributions, checkpoints, and recoverable history. The room is not a decorative chat lobby; it is the entry point to actual project work.

## 2. User experience

### 2.1 Join and spawn

1. A room owner creates a private room and generates an invitation link.
2. The invitation is an opaque, random, revocable, expiring token. The server stores only a token hash and enforces its role, expiry, use limit, and revocation.
3. The recipient opens the link and authenticates. The server validates the invite and authorizes room membership.
4. The server creates or resumes that participant's room session and spawns their avatar at a safe room location.
5. The room client loads room state, participant presence, and available workstations.

Rooms are private by default. Share links are invitations, not authorization bypasses. Owner/editor/viewer permissions are checked by the server for every protected operation.

### 2.2 Navigation controls

Initial desktop controls:

| Key | Action |
|---|---|
| W | Move forward |
| A | Move left |
| S | Move backward |
| D | Move right |
| I | Camera up |
| K | Camera down |
| J | Camera left |
| L | Camera right |

The controls must be configurable and must not capture keystrokes while a text editor, terminal, form, or other text input has focus. Pointer camera control and touch controls are secondary accessibility paths; the requested keyboard layout remains the default.

### 2.3 Room workstations

Interactive workstations open tools without removing the user from the room:
- Shared Code workstation: collaborative Monaco editor with live cursors and selections.
- Personal IDE workstation: the participant's isolated VS Code-compatible browser IDE session.
- Project/Git workstation: branches, diffs, commits, reviews, checkpoints, and restore history.
- Optional communication workstation: room chat and, later, voice.

The interface must work on desktop first, remain usable on tablets, and provide a simplified touch navigation path on iOS/Android. Full terminal and IDE usability on small phones is a progressive-enhancement concern, not an assumed guarantee.

## 3. Selected technical direction

Use a self-hostable, vendor-neutral modular monolith initially. Local development must run without a paid cloud service. Hybrid hosting remains the target: local development and testing, with an independently deployable hosted room service when explicitly approved.

| Layer | Direction | Responsibility |
|---|---|---|
| 3D client | Three.js + TypeScript | Room scene, avatars, camera, movement, interactive workstations |
| Room application | TypeScript web client | Room UI, member controls, shared editor, individual IDE launch |
| API and realtime | Node.js + TypeScript, HTTP API + WebSocket | Authentication, room lifecycle, authorization, presence, collaboration transport |
| Shared editing | Monaco Editor + Yjs + Monaco binding | Concurrent source editing, cursor/selection awareness, CRDT merge |
| Individual IDE | Self-hosted code-server session per participant | Independent editor, terminal, extensions, debugging, filesystem |
| Project source of truth | Git repository + isolated worktrees/branches | Durable source, independent contributions, reviews, rollback |
| Persistence | Self-hosted PostgreSQL | Accounts, rooms, membership, invite hashes, activity, Yjs updates/snapshots, workspace metadata |
| Execution isolation | Per-user/per-workspace containers | Build/test/debug commands, resource limits, process isolation |
| Local orchestration | Docker Compose | Repeatable local development and integration tests |
| Hosting | Vendor-neutral Linux host initially | HTTPS, reverse proxy, application, database, workspace runner |

This is a proposed implementation stack selected for the requirements; no services have been provisioned and no paid service has been approved.

### Why these components

- **Yjs** is a network-agnostic CRDT. Its shared types can merge concurrent edits and support awareness/presence. The editor still needs a network provider and persistence; Yjs alone does not deliver a complete collaboration service. See https://docs.yjs.dev/ and https://docs.yjs.dev/getting-started/a-collaborative-editor.
- **Monaco** supplies the browser code-editing surface used by VS Code. Pair it with the Yjs Monaco binding for simultaneous editing.
- **code-server** provides a self-hosted VS Code-in-the-browser experience for individual sessions. Each participant gets an isolated workspace; this is not itself the shared-editing mechanism. See https://coder.com/docs/user-guides/workspace-access/code-server/.
- **Three.js** supplies the browser 3D scene without requiring Unreal Engine or a native client. See https://threejs.org/docs/.

Do not introduce microservices, Kubernetes, or a managed collaboration platform for the initial build. Keep the first runtime as a modular monolith with explicit internal boundaries.

## 4. Two-mode source and workspace model

### 4.1 Shared editing lane

- A room project has a canonical shared collaboration branch/worktree.
- Each open file is represented by a Yjs document identified by project, branch, and normalized file path.
- The room server authenticates and authorizes every WebSocket connection before joining a document channel.
- Monaco binds to the Yjs document; Yjs synchronizes edits and awareness state.
- The server persists Yjs updates and periodic snapshots in PostgreSQL.
- A controlled file bridge writes the current shared document state to the canonical shared worktree using safe path validation and atomic file replacement.
- Save/checkpoint operations create Git commits with contributor attribution and activity metadata.
- File rename/delete, binary assets, large files, and generated artifacts use explicit file operations and Git diffs rather than pretending all content is plain collaborative text.

### 4.2 Individual development lane

- Each participant receives a separate workspace container and Git worktree/branch.
- Each IDE session has its own filesystem view, terminal, processes, extension state, and resource quota.
- Participants can pull the room's latest shared branch or submit their branch for review/merge.
- One participant's uncommitted files, terminal commands, or debug process must not mutate another participant's workspace.
- Workspace containers are stopped when idle and can be resumed from persistent project storage.

### 4.3 Integration and conflict policy

The shared lane and individual lane do not write directly into one another's working directories.

- Shared-lane checkpoints become commits on the shared collaboration branch.
- Individual work becomes commits on the participant's branch.
- Merging an individual branch into the shared branch requires a diff and explicit merge action.
- Conflicts are shown to a human for resolution; no silent overwrite.
- The shared branch can be restored to a prior commit or Yjs snapshot, with the actor and reason recorded.
- Git is the durable source of truth for project files. Yjs is the live collaboration state for open text documents, not a replacement for Git.

## 5. Server boundaries and authorization

The server is authoritative. Hiding a button in the client is not security.

Initial roles:
- **Owner:** room settings, invitations, member roles/removal, project administration.
- **Editor:** shared editing, personal workspace, Git contributions, chat.
- **Viewer:** read-only room/project access unless explicitly granted a narrower preview capability.

Server-enforced boundaries:
- Room membership and role checks on REST and WebSocket operations.
- Invite token hashing, expiry, revocation, and use-count enforcement.
- Workspace container isolation and per-user filesystem boundaries.
- Strict path normalization; reject traversal and symlink escapes in file bridge operations.
- Resource quotas, process/time limits, and safe shutdown for terminals/builds.
- No arbitrary host filesystem mount or host Docker socket access from user workspaces.
- No service credentials, AI-provider secrets, or market-data secrets in browser code or project workspaces.
- Audit events for invitations, membership changes, workspace lifecycle, file checkpoints, Git operations, and permission failures.

## 6. Initial repository layout

Keep the current portfolio application and native C++ project untouched. Build the new system in a dedicated directory:

```text
TowerFlow/
  Collaborative/
    client/
      room/                 # Three.js room and controls
      editor/               # Monaco + Yjs shared editing
      ide/                  # Individual IDE session integration
      ui/
    server/
      api/                  # HTTP routes and auth
      realtime/             # WebSocket rooms, presence, Yjs provider
      workspaces/           # Container lifecycle and isolation
      projects/             # Git, worktrees, file bridge, checkpoints
    shared/                 # Contracts and types
    infra/
      compose.yaml           # Local-only development stack
      postgres/
    tests/
      unit/
      integration/
      e2e/
    docs/
      ARCHITECTURE.md
```

The existing top-level static scaffold is a prior prototype and must not be treated as the new runtime.

## 7. Build sequence and acceptance gates

### Phase 0 — Retire the old backend direction
- Mark the Supabase implementation as superseded.
- Preserve the current prototype for reference until the replacement is in place.
- Do not provision or configure Supabase.

### Phase 1 — Local server and room identity
- Node/TypeScript API, local PostgreSQL, authentication/session model, room membership, invite creation/acceptance/revocation.
- Acceptance: two authenticated local browser sessions can join one private room; outsiders cannot; revoked links fail.

### Phase 2 — Multiplayer 3D room
- Three.js scene, avatars, server-authoritative presence, requested WASD movement and IJKL camera controls.
- Acceptance: two browsers see each other's movement; reconnect restores identity; controls do not hijack editor typing.

### Phase 3 — Shared code editor
- Monaco + Yjs + authenticated WebSocket provider + persisted Yjs state.
- Acceptance: two browsers edit one file simultaneously; live cursors appear; concurrent edits converge; refresh/reconnect restores content; unauthorized users cannot subscribe.

### Phase 4 — Individual IDE workspaces
- Per-participant code-server container, isolated worktree/branch, terminal and process limits.
- Acceptance: two participants can independently run commands and modify files without crossing filesystem/process boundaries.

### Phase 5 — Git integration and safe handoffs
- Shared-lane checkpoints, personal branches, diff/review/merge, conflict resolution, restore.
- Acceptance: contributions are attributable, reviewable, reversible, and never silently overwrite another branch.

### Phase 6 — Product capabilities
- AI room participant, public corporate intelligence, inventory/simulation, equities provider, and cross-domain analysis.
- Keep public facts, user-supplied company data, and hypothetical simulation values distinct.

### Phase 7 — Hybrid deployment and SaaS readiness
- HTTPS deployment, backups/restore, monitoring, resource controls, subscription tiers, operational security.
- Requires explicit owner approval before creating paid resources or deploying.

## 8. Required test strategy

Automated tests are required before claiming the capability exists.

- Unit tests: invite hashing/expiry/revocation, role checks, path safety, workspace authorization, Git state transitions.
- Integration tests: PostgreSQL migrations, HTTP authorization, WebSocket room isolation, Yjs persistence/reconnect, container lifecycle.
- Browser tests: two independent browser contexts, room join/spawn, movement/presence, simultaneous edits, independent terminals, Git contribution handoff.
- Security tests: guessed room IDs, expired/revoked invites, cross-room WebSocket subscription, path traversal, symlink escape, container boundary, command/resource exhaustion.
- Recovery tests: server restart, workspace resume, Yjs snapshot recovery, Git rollback.

A test is not passed merely because its source file exists. Record exact command, environment, exit code, and assertions.

## 9. Explicit non-goals for the first implementation

- No Supabase dependency or Supabase project.
- No paid managed workspace or hosted collaboration service.
- No Kubernetes or microservice split.
- No arbitrary shell execution on the main application server.
- No claim that code-server alone provides simultaneous editing.
- No claim that Yjs alone provides authentication, persistence, or a complete IDE.
- No deployment, paid resources, or credentials without explicit approval.
- No changes to existing TowerFlow portfolio files or the separate native C++ project.

## 10. Reference documentation

- Yjs: https://docs.yjs.dev/
- Yjs collaborative editor guide: https://docs.yjs.dev/getting-started/a-collaborative-editor
- Yjs shared types: https://docs.yjs.dev/getting-started/working-with-shared-types
- code-server: https://coder.com/docs/user-guides/workspace-access/code-server/
- Three.js: https://threejs.org/docs/
