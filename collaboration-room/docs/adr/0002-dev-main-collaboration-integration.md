# ADR-0002 — TowerFlow Dev-to-Main Integration Through the Collaboration Room

- **Status:** Proposed architecture; implementation and live verification pending
- **Date:** 2026-11-20
- **Scope:** Team 02 application integration, contributor workstations, release promotion
- **Preservation requirement:** Preserve existing room visuals, OAuth, Azure Bridge, all team source, and original implementation languages. Never disable/comment out a teammate's implementation to claim compatibility.

## Observed repository baseline

Repository `Cos229-239/2610_Team02` currently has `main` at `68b10e2a62d501507f08e01965d9c69131caa840` and `dev` at `4875b3939fb799003bcd924c28c91154deb29252`. GitHub compare `main...dev` shows **98 commits ahead**, **zero behind**, **159 files changed**. Both GitHub branch metadata objects currently say `protected:false`. Thus *the intended owner-only main promotion is not technically enforced by these branch settings*. This ADR does not modify repository rules or merge branches.

The existing `dev` collaboration application already includes:
- Azure Bridge per-account `/loadout` and shared team update feed.
- Verified-hash, sandboxed read-only static web preview of `TowerFlow/` from `dev` (`merged-preview.cjs`).
- Read-only debug-window sharing and manual reviewed web publishing.
- Source-specific Windows launcher instructions for Malik's native C++, Omarion's native C++, Dayna's C++ utilities, and William's C# Windows Forms source on `WilliamPersonal`.

These are useful **discovery, source, review and preview capabilities**. They do **not** constitute a unified runnable native application or an automatic native-code deployment.

## Decision: collaboration room mediates promotion, not GitHub authorization

```text
Contributor's own GitHub identity + isolated checkout
       │ commits / pushes feature or direct dev change
       ▼
GitHub dev (integration source of truth)
       │ read-only ingestion of exact commit SHA + files
       ▼
TowerFlow collaboration room — integration workspace
       │ inventory → classify → build/test → sandbox preview
       │ reviewer sees running behavior and evidence
       │ adapters compose without rewriting original languages
       ▼
Candidate release (exact dev SHA + compatibility evidence)
       │ owner review; required CI + approval + branch policy
       ▼
GitHub pull request dev → main
       │ owner-authorized merge; main remains unchanged until approval
       ▼
Versioned release of room / web / optional native services
```

**Rule:** A teammate's push to `dev` becomes **visible for integration review**, not automatically active executable logic in the production room. The user expects actual functionality: promotion requires a running, testable behavior delivered through an adapter or verified web bundle—not commented-out source, a GitHub link, or an untested claims panel.

## Runtime contracts by implementation language

| Work | Original source | Runtime mechanism | Integration proof |
| --- | --- | --- | --- |
| Shared web/business UI | HTML/CSS/JavaScript under `TowerFlow/` | Existing integrity-checked preview, then reviewed static-app publisher | Exact SHA, interactive acceptance and published build receipt |
| Malik inventory/Windows GUI | C++ and Win32 | Preserve native solution; build on Windows; expose restricted versioned JSON endpoints through a separate local adapter when needed; stream interactive demo only with user consent | CMake build/test, GUI action observed, contract test, no host room mutation |
| Omarion inventory/reporting | C++ | Separate native process and adapter over loopback IPC/HTTP with validated data schemas | Build, inventory/reporting tests, real output/schema verification |
| Dayna shared headers/utilities | C++ | Compile/link into a consuming native target; no fake browser 'execution' | Native compile and input/output regression tests |
| William inventory form | C# Windows Forms on `WilliamPersonal` until merged | Preserve .NET/WinForms application; use a .NET adapter or separate Windows process, not raw browser execution | Windows .NET build, grid behavior, adapter contract, then dev merge |

**Compatibility-first rule:** Never directly copy or merge unrelated data models into one program. Define a versioned inventory contract and explicit adapters; keep each contributor's own source, build system, and ownership. Sample contract entities can include `Part`, `StockMovement`, `Sale`, `Report` with validated identifiers, quantities and amounts; schema is NOT approved until the actual native types and semantics are reviewed.

## Safety gates

1. **Discover:** classify changed source paths and author; resolve merge commits and branches separately. GitHub author filter is incomplete where emails/merge identities differ.
2. **Preserve:** hash known-good room and all candidate changed files. Fail closed on drift; do not reset/clean/switch a dirty running host.
3. **Build:** compile and run language-specific tests in **isolated** checkouts/workers. Never execute arbitrary `dev` code in the OAuth/Node room process. Use least privilege, no secret mounts, constrained network/CPU/time, explicit dependencies and teardown.
4. **Contract:** adapters handle versioned schemas, authorization, read/write boundaries, failures and timeouts. Read-only defaults; no contribution can inherit the host's GitHub account, shared token, or private source.
5. **Preview:** render actual result in existing room panel through a sandboxed web build or consented native debug view. Keep preview isolated from published production.
6. **Verify:** record exact commit SHA, build/functional/integration results, reviewer and timestamp. A successful syntax check alone is not functional evidence.
7. **Promote:** owner reviews `dev → main` PR only after required checks and approvals; GitHub enforces through repository rulesets/branch protection and permissions.
8. **Release:** publish approved exact SHA to the appropriate runtime adapter. Reload only when a deployment actually changes served files and passes health checks; tell user to **Ctrl+Shift+R** only then. Support rollback to the previous approved release without discarding teammate code.

## Repository authorization observation

Both `main` and `dev` currently report `protected:false` in GitHub branch metadata. Branch intent (**contributors into dev, owner into main**) is not equivalent to enforced permissions. Configure `main` branch rules/ruleset requiring pull request, authorized approval, and passing test checks; restrict bypass and direct pushes where supported by the repository plan and administration capabilities. Do not assume policy exists or claim it was installed.

## Acceptance / non-claims

- A newly merged `dev` commit appears at the right desk with exact hash: **pending browser test**.
- Exact `dev` web revision can be previewed independently: existing mechanism, **needs current runtime verification**.
- C++ and C# functions execute and interact through real adapters: **not yet implemented**; links and static views do not qualify.
- Equivalent contribution tooling uses each member's own OAuth/account: existing design; **needs multi-account test**.
- Production room remains unchanged by an unsuccessful build/test: required gate.
- Owner-only promotion enforced by GitHub rules: **not configured/verified**.
- `main` integration and deployment: **not performed**.

**No automatic merging, native code execution, or live-room replacement is authorized by this ADR.**
