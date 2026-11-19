# TowerFlow — IDE, Debugger & Room Integration Contract

**Status:** Implementation specification — not a claim of deployed functionality  
**Repository:** \`Cos229-239/2610_Team02\` · Target branch: \`dev\`  
**Scope:** Authenticated TowerFlow collaboration room, contributor workspaces, Git source control, project-aware IDE launch, debugging, validation, review, publication and in-room demonstrations  
**Budget:** Free/local-first; reuse Git, VS Code, Visual Studio Community, GitHub, Node.js, and existing TowerFlow services.

> **AI implementation directive:** Preserve → Decode → Inspect → Correlate → Implement → Verify → Refine. Preserve the existing room appearance, movement, authentication, audio, project files and user work. Do not bypass test failures or silently replace an active source tree. Differentiate **source parsed**, **launched**, **debugger attached**, **breakpoint hit**, **behavior verified**, **merged**, and **deployed**.

## 1. Mission and measurable outcome

A signed-in teammate enters the existing room, opens **Contribute**, selects a project (default based on their account), and gets one obvious action: **Open My Project**. TowerFlow then checks the contributor's authorized local workspace, opens the correct solution in the appropriate desktop IDE, and reports actionable readiness. The user can **Run / Debug / Test**, see *actual local Git changes*, submit a reviewable contribution to \`dev\`, and discover the verified result in the room. Complex branch operations, project paths, debugger selection, and deployment distinctions should be orchestrated by the system—not left as investigative work for the teammate.

**Success is not:** a launch URL, a copied PowerShell command, a Codespace creation link, a mocked breakpoint, a commit description, a green syntax check, or an unreviewed asset displayed as if deployed.

**First vertical-slice acceptance journey:** contributor A authenticates → opens their actual workspace → launches correct IDE → builds and reaches a real breakpoint → modifies a source file → sees it listed as changed → runs checks → commits/pushes with explicit consent → creates PR targeting \`dev\` → contributor B reviews → merge → TowerFlow recognizes new \`dev\` revision → native demo or web preview demonstrably reflects the change. Capture logs/screenshots/commit hashes at each gate.

## 2. Existing architecture — inspect before editing

As of the inspected \`dev\` revision \`4875b3939fb799003bcd924c28c91154deb29252\`:

| Existing file or integration | Role and constraint |
| --- | --- |
| \`collaboration-room/azure-bridge/desk.js\` | Adds **Contribute** and **Team updates** to the room. Keep original room entry and controls intact. |
| \`collaboration-room/azure-bridge/loadout.js\` | Contributor UI, project/branch view, Windows PowerShell command generator, PR handoff. Current “Changes” does **not** read the local working tree. |
| \`collaboration-room/azure-bridge/loadouts.cjs\` | Account mappings, starter project configurations, GitHub activity and branch discovery. Do not assume source-file heuristics prove the correct project. |
| \`collaboration-room/azure-bridge/studio.js\` | Browser preview, temporary window-sharing demo and saved images. Window sharing is **not** remote debugging. |
| \`collaboration-room/azure-bridge/server.cjs\` | Mounted HTTP contribution APIs, session/permission reuse. Do not expose the user's filesystem through the host. |
| \`collaboration-room/azure-bridge/merged-preview.cjs\` | Retrieves verified static bytes from merged \`dev\`; preview is not production publication. |
| \`collaboration-room/azure-bridge/team-updates.cjs\` | GitHub history and host-asset comparison; labels native and room modifications separately. |
| \`collaboration-room/azure-bridge/install.cjs\` | Installs bridge into existing room host; has preservation guards. Do not replace these with broad edits. |
| \`.vscode/launch.json\` | Profiles for web client, Node server and room tests. Confirm each profile actually launches and attaches on target machine. |
| \`CONTRIBUTING.md\` | Existing team workflow, host installation and publication guidance. Keep synchronized with tested functionality. |
| \`tools/towerflow-companion.cjs\` | **Feature-branch prototype** of a loopback, allowlisted local companion. Audit and test before using. Not assumed available on \`dev\` or on teammates' PCs. |
| \`tools/towerflow-companion.test.cjs\` | Companion protocol tests; validate with actual Node runner, not only syntax parsing. |

PR #22 and PR #23 were merged into \`dev\`; PR #24 was observed open when this contract was authored. Recheck current GitHub state and branch tip before changing existing files.

## 3. Mandatory UX

Present one **Contributor Workspace** panel inside the existing room, never a forest of IDE buttons. Initial state:

\`\`\`text
MY DEVELOPMENT WORKSPACE
GitHub: @signed-in-account    Project: [Detected ▼]    Working branch: [status]
Connection: ● Local companion connected / ○ Setup needed
Source:     ● Repository verified / ○ Needs attention
IDE:        ● Visual Studio or VS Code ready / ○ Missing dependency
Debug:      ● Session attached / ○ Not started

[ OPEN MY PROJECT ]   [ RUN ]   [ DEBUG ]   [ TEST ]

MY ACTUAL CHANGES
  modified: path/to/file   |   new: path/to/another-file
[ REVIEW CHANGES ] [ SUBMIT CONTRIBUTION ]

TEAM INTEGRATION
  PR #...: awaiting review | merged into dev: <sha>
  Room release: <sha or not published>
[ SEE RESULT ] [ TEAM UPDATES ]

[ Advanced diagnostics ▸ ]
\`\`\`

Display an honest state machine: **Not connected → Ready → Workspace prepared → IDE opened → Build completed → Debugger attached → Behavior tested → Changes reviewed → PR opened → PR merged → Preview available / Deployed.** Each stage requires its own evidence. A single failed stage must explain **what failed**, **why**, and **one safe next action**. Avoid generic “cannot load” statuses where useful diagnostic facts are known.

Do not require the teammate to type an arbitrary local path, memorize branch names, open VS Developer Command Prompt, or create a Codespace to debug a local Windows project. A browser-only user can use the existing web preview; clearly label capabilities unavailable without the local companion.

## 4. Integration architecture

\`\`\`text
Authenticated TowerFlow Room (browser)
    │
    ├── Existing Azure Bridge (host): account, project registry, team PRs,
    │     revision provenance, previews, demos, permission gates
    │
    └── Explicitly paired Local Development Companion (contributor PC)
          Bound to 127.0.0.1 ONLY; never opened to LAN or internet
          │
          ├── Workspace manager: fixed root + verified Git remote
          ├── IDE adapter: VS Code / Visual Studio Community
          ├── Debug adapter: project launch and attachment evidence
          ├── Git adapter: status, diff, branch, fetch, commit/push only by consent
          └── Check runner: allowlisted project-specific build and tests
\`\`\`

Use existing authenticated GitHub identity as the room identity. Pair the local companion explicitly with the browser session; a room identity does **not** silently grant filesystem access. Restrict origins, validate request bodies, use random short-lived pairing credentials, and require a clearly visible connection action. Never place the local pairing token in Git, logs, room history, URLs, screenshots, telemetry, or browser localStorage by default. The local companion must never accept arbitrary shell strings, executable paths, repository URLs, filesystem roots, or remote commands from the room. Implement CORS/Private Network Access checks where supported, and reject unpaired/cross-origin requests. On Windows, assess browser HTTPS-to-loopback requirements across supported browsers; supply an explicitly tested fallback if blocked.

The host **cannot directly open an IDE on every visitor's PC**. The local companion is required for controlled native OS access. Installing an IDE extension is optional, but a browser-only launch cannot honestly claim to have attached a debugger.

## 5. Project manifest — single source of truth

Introduce a versioned, reviewed \`collaboration-room/azure-bridge/projects.json\` or equivalent module. Each entry must include:

- Stable project ID and display name; eligible contributor(s) or discovery rules.
- Verified repository, allowed base branch, personal/feature branch policy, project type.
- Root-relative and repo-contained solution/project path.
- IDE adapter (VS Code, Visual Studio C#/C++/CMake), minimum required workload.
- Runtime/build/test commands specified by **audited allowlist**, not client input.
- Debug target/configuration and expected breakpoint behavior.
- Preview mode: \`web-static\`, \`native-demo\`, \`room-asset\`, \`backend\`, or \`documentation\`.
- Publication policy and required approval/host action.
- Example test input, expected output, and rollback strategy.

Cover at least: web app \`TowerFlow/\`; native portfolio \`TowerFlow/TowerFlow.Native/\`; Malik's CMake inventory project; Omarion's \`Towerflow_OW/\` solution; Dayna's shared header and tested CMake preview; William's Windows Forms project (verify its branch-specific availability); and room bridge/graphics code.

Project discovery should prefer an explicit valid selection, then a known account/active PR, then a best-effort heuristic. If ambiguous, show **two choices with reasons**, not a guessed “ready” state. Never assume every project exists on \`dev\`; if a project is only on a personal branch, do not silently replace it with files from \`dev\`.

## 6. Local workspace and Git lifecycle

- Default local root: \`%USERPROFILE%\\Documents\\TowerFlow Workspaces\\<login>\\<project-id>\`. Do **not** reuse the live host's graphics checkout as an editable teammate workspace.
- If no checkout exists, clone the verified team repository and create/resume an authorized work branch. If an existing checkout exists, verify canonical remote, current branch, uncommitted changes, and the selected manifest entry **before any branch switch/fetch/pull**.
- Never discard, hard-reset, clean, auto-stash, force checkout, amend, force-push or merge over uncommitted work. Show conflicts and safe resolution options.
- Reuse the same checkout for GitHub Desktop and the IDE; open existing checkout by local path rather than remote URL alone.
- The **Changes** view must show real \`git status --porcelain=v1\`, unstaged/staged diffs with bounded output, current branch, upstream and ahead/behind state. Clearly distinguish local, pushed, PR, merged and deployed changes.
- \`Summary\` and \`Description\` are **commit metadata**. Typing a feature idea there does not implement it.
- Submit workflow: show changed files → run required checks → user reviews diff → explicit commit/push confirmation → prepare PR targeting \`dev\` → provide PR URL/status. Follow GitHub role permissions and required review/CI. A failed check cannot be represented as passing.
- Display and track a normal \`dev\` PR; do not create another branch on each button click or change the user's active editor branch behind their back.

## 7. IDE/debugger lifecycle

**VS Code web app:** open the checked-out repository; select the existing \`TowerFlow — Run with F5\` launch configuration; start its permitted local server and attach Chrome/Edge debugging. Verify the exact port, expected debug source mapping, and real breakpoint hit within the actual app. Differentiate server debugging from client JavaScript debugging.

**VS Code room code:** use a dedicated test/debug launch configuration with Node's test runner. Ensure glob expansion works on Windows; inspect actual task and launch semantics. Running room tests is not the same as attaching to the live room.

**Visual Studio C++/CMake:** open the manifest-approved \`.sln\`, \`.slnx\` or CMake root; check required C++ workload, target architecture, active project, build configuration and generated binary. Validate a breakpoint hit on actual source—not only that Visual Studio opened.

**Visual Studio .NET/Windows Forms:** verify applicable .NET SDK and desktop workload, project file, target framework, actual form run, debugger attachment and editable sample interaction.

**Debugger status API:** return distinct values for \`ide_process_started\`, \`project_opened\`, \`build_passed\`, \`debugger_attached\`, \`breakpoint_observed\`, \`runtime_check_passed\`. A launch command that returns successfully must not set any unobserved state to true. If robust IDE automation is unsupported, provide user-visible “Confirm debugger attached” evidence workflow rather than inventing it.

The room's **Live debug demo** captures a user-selected window/tab and is strictly an opt-in visual stream. Never treat the stream as remote execution rights. Do not save secrets or captures automatically. Saving a screenshot to \`TowerFlow/demos\` requires an ordinary reviewed commit.

## 8. Room integration and publishing

Separate three concepts in UI: **Merged to dev**, **Available to try**, and **Published on the host**.

| Asset class | Safe post-merge action |
| --- | --- |
| Web app | Verify committed static bytes, permit isolated interactive preview, then publish by approved host release pipeline. |
| Native Windows app | Launch in contributor's Windows IDE; offer live window demo, saved reviewed demo, or a purpose-built API adapter. Do not pretend a \`.exe\` is a browser component. |
| Graphics/audio/room JS | Validate preservation of existing scene/assets, host installer/release gates and visual acceptance before serving. |
| Backend/OAuth | Separate controlled security review, process restart and runtime acceptance. |
| Docs | Make revision and review visible; no runtime deployment needed. |

Preserve the existing verified \`dev\` preview's revision hashing and sandbox isolation. Avoid automatically promoting an unreviewed PR to the live room. Host release receipts should record source commit SHA, file hashes, test status, release timestamp and rollback identifier. A user should see **why** a merged change has not yet appeared, with a clear action for an authorized host operator.

## 9. Mandatory evidence and test matrix

Run and record:

1. **Unit:** manifest parser, path/branch validation, Git status parsing, command allowlist, identity/pairing, expiry, origin rejection, errors and cross-platform behavior.
2. **Contract:** browser↔companion protocol, authorization denial, unsupported project, missing IDE, mismatched branch, dirty workspace, no network, existing workspace reopening, blocked OS process launch.
3. **Desktop integration (Windows):** actual IDE process opens exact solution, build succeeds, debugger attaches, real breakpoint hits and resumes, sample input changes real output. Test VS Code and at least one C++ and one C# project.
4. **Team acceptance:** two separate GitHub identities on separate sessions/devices; no personal account leakage or project crossover; PR review and merge visible in team history.
5. **Publishing:** merged SHA matches previewed bytes, host release receipt matches actually served assets, rollback works without losing unrelated graphics or authentication.
6. **Regression:** room entry/OAuth, WASD/world motion, existing graphics, audio, Azure desk, web/business app, quiet entry, contributor APIs, and preexisting tests.

For each check record command, platform, source SHA, expected/observed state, pass/fail, time and evidence location. Do not report an unexecuted Windows test as validated because Linux CI passed.

### Promotion gate

Define representative independent task cases **before testing**; target ≥80% verified end-to-end task success with no critical data-loss/security regression. The 80% target is a gate, **not a current measurement**. Preserve code, pattern and scene/workspace independently. Any critical preservation regression blocks promotion regardless of aggregate pass rate.

## 10. Execution plan for an implementing AI

**Phase A — Discover:** inspect current \`dev\` and open PRs, identify true project paths and launch configurations, run baseline tests, hash files that will be edited, record live host separation. Do not start by rewriting room.js or server.js.

**Phase B — Companion vertical slice:** implement the restricted local workspace manager and actual Git status response; pair safely from the current Contribute view. Show actual local modified files and meaningful connection errors. Add tests; preserve preexisting controls.

**Phase C — IDE path:** open the exact manifest-approved project in the right installed IDE; verify process creation and project availability. Validate desktop workload problems on Windows.

**Phase D — Debug path:** run one real web/client breakpoint and one native breakpoint with recorded evidence; add debug-status reporting that does not overclaim.

**Phase E — Git review:** enable explicit diff review, safe commit/push, PR creation and status tracking. Never silently merge or mutate other contributors' branches.

**Phase F — Team visibility:** show PR review/merged/released state with SHA provenance, preview and demo actions appropriate to each project type.

**Phase G — Independent acceptance:** two-user real-room rehearsal; collect errors, fix root causes, compare against prior workflow, and only then propose merge to \`dev\`.

## 11. Non-negotiable guardrails

- Avoid paid services or mandatory Codespaces; local desktop tools are first choice.
- No additional frameworks, databases, daemons, web sockets or long-running services unless necessary and justified.
- No arbitrary shell execution from the browser, no remote access to local developer files, no automatic sharing of a desktop.
- No extra zip/backup artifacts in the repo. Preserve existing user changes and rely on normal reviewed Git history; do not alter original room host without explicit deployment.
- Do not duplicate authorization paths, existing dev drivers, room components or hidden reset logic.
- Use targeted diffs and tests; report unknowns instead of claiming unobserved success.
- Keep advanced diagnostics collapsible. For contributors, primary controls are **Open My Project → Debug/Test → Review Changes → Submit**.
- Prefer read-only validation before any mutation. Fail closed on conflicts, unexpected sources, missing permissions or partial installation.

## 12. Delivery / acceptance checklist

- [ ] Project manifest audited against actual repository and all contributor branches.
- [ ] Local companion handles pairing securely and shows true Git status.
- [ ] Same local checkout opens consistently in IDE and GitHub Desktop.
- [ ] VS Code web debugging demonstrated with real breakpoint evidence.
- [ ] Native Visual Studio C++ and C# debug sessions demonstrated on Windows.
- [ ] Contributor sees actual changed files, diff, test and branch state in the room.
- [ ] Explicit, reviewable push/PR flow targets \`dev\` without data loss.
- [ ] Merged, previewed and published states are visibly distinct and revision-stamped.
- [ ] Two contributors complete an independent start-to-finish journey.
- [ ] Existing room functionality and graphics are regression checked.
- [ ] Measurements recorded; no invented reliability score.
- [ ] Source, tests, instructions and precise merge request supplied.

**Final instruction:** prioritize the smallest actually-working vertical slice over a broad dashboard. Do not call the integration complete until the real Windows and two-account acceptance tests pass.
