# Towerflow enabling technology — researched decisions (2026-11-10)

This document distinguishes **recommended external technologies** from **implemented Towerflow functionality**. Nothing here means a hosted service or integration is configured.

## Decision A — Local contributor setup first

**Adopt:** VS Code as the default local IDE, Git/GitHub for source control, and a per-device bootstrap with user-selected storage. Microsoft documents `code <folder>` and `code --goto <file:line>` from a local CLI. The GitHub CLI supports `gh repo clone <repo> <directory>`; vanilla Git works without an extra GitHub CLI dependency.

Official sources:
- https://code.visualstudio.com/docs/configure/command-line
- https://cli.github.com/manual/gh_repo_clone
- https://code.visualstudio.com/download

**Now implemented on feature branch:** `tools/onboard-towerflow-contributor.ps1` prompts for local IDE installation (official site), existing local checkout or a selected destination folder, verifies expected Team02 remote, then opens the chosen local file/folder. `tools/preview-towerflow-contribution.ps1` now resolves its repository relative to its own location rather than `C:\Users\dulsk\Desktop\Team2`. No live room deployment.

**Missing:** a browser-to-native companion protocol, per-user/device workspace registry, post-install resumption, IDE login automation, secure consent handshake, cross-platform installers and a proper in-world launch affordance. A browser cannot silently install desktop applications, inspect files, or launch privileged local commands; use a signed native bridge or user-launched bootstrap, not a dangerous web-to-shell endpoint.

**Acceptance:** a contributor with no checkout selects D:\\Projects (or another arbitrary folder), clones without touching host, opens VS Code, signs into their own GitHub account; second contributor on another PC chooses a different folder. Existing checkout is validated before opening; no hardcoded Team2 paths.

## Decision B — Scoped coding agents, not unchecked chat

**Evaluate OpenHands Software Agent SDK** as a *candidate* implementation engine for AURA's engineering jobs, because it exposes Python/TypeScript APIs, agent workspaces, custom tools, and isolated agent-server execution. It supports ephemeral workspace operation; prefer that to letting an LLM execute on the live host.

- https://github.com/OpenHands/software-agent-sdk
- https://docs.openhands.dev/sdk
- https://github.com/OpenHands/docs/blob/main/sdk/arch/overview.mdx

**Do not install blindly:** assess license, supported operating systems, production support, attack surface, memory/CPU needs, and end-to-end task success with the actual room. Preserve the current AURA/FLOW protected endpoints. Build a deterministic task broker: job ID → scoped plan → sandbox branch → allowlisted tools → tests → preview → independent verifier → PR → CI-gated integration. Unknown input or failed test must return a failure, not a success claim. The user has approved automatic *low-risk integration after team-defined protection checks*, not permission to alter production unreviewed.

**Initial benchmark:** the collaborative whiteboard. Validate real code written; 2 users can edit simultaneously; contributor color is tied to account identity; notes persist; unauthorized user cannot overwrite others; room movement/voice unchanged; restart/reconnect behavior verified. Record agent pass rates, remediation loops, tool traces and costs. No endorsement based only on a demo.

## Decision C — Dependable team voice

**Evaluate LiveKit** as an optional WebRTC SFU and voice/agent infrastructure. Its documented server supports signaling and WebRTC transport and can run self-hosted or managed; its agent framework supports voice participants. For 2–3 peers a simple P2P system may work, but reliable multi-user voice with channels and NAT traversal often benefits from an SFU. Use the observed failure modes of existing voice first; don't replace a working transport without evidence.

- https://docs.livekit.io/intro/about/
- https://docs.livekit.io/reference/internals/livekit-sfu/

**Required features:** authenticated team rooms, PTT, mute/deafen, device selectors, per-user gain, speaking indicators, optional distance attenuation, reconnect behavior; STUN/TURN validation, real headsets and cross-network client trials. Keep existing browser voice available until a replacement passes two- and three-client tests. Voice traffic and media-provider credentials must not pass through the coding-agent prompt channel.

## Decision D — Protected team integration

**Use GitHub rulesets and required status checks** for `dev` / production branches; do not rely solely on a checkbox inside Towerflow. GitHub documents rule settings for mandatory successful checks and protection from unsafe merges.

- https://github.com/github/docs/blob/main/content/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets.md

Recommended required gates: formatting/type/security scan, unit/integration tests, per-feature task contracts, isolated browser-room E2E preview, credential/secrets scan, human maintainer sign-off for defined high-risk scopes. Team leads can merge ordinary passing PRs. Models can author, test, and open PRs under least-privilege service identities; do not grant them production deploy/repo-admin privileges.

## Decision E — Projection and enterprise app

Keep the existing Three.js room until the wall-only projector state machine is specified and verified. Evaluate real GLTF/PBR assets with correct license, reflections and physically reasonable lighting; the selected wall should host one interactive render surface and a separate portal-entry trigger. Do not create an automatic iframe browser tab; accessible keyboard alternative required. Test angle and wall target calibration with current room geometry.

Tier 1 = existing free app. Tier 2 = same base with verifiable paid commercial tools. Tier 3 = separate gold/magenta/royal-blue executive environment with real source-backed data, file viewers, scenario simulation, audited receipts and actual authorization before inventory/order/shipping writes. Three swaps per year is an organization rule, **not universal tax law**.

## Delivery tracker

| Work | State | Evidence |
|---|---|---|
| Direction / handoff | Documented | `TOWERFLOW_PRODUCT_DIRECTION_AND_HANDOFF.md` |
| Per-contributor folder chooser + VS Code bootstrap | Source added; local Windows validation pending | `tools/onboard-towerflow-contributor.ps1` |
| Broken PR preview default Team2 path | Source fixed; execution pending | `tools/preview-towerflow-contribution.ps1` |
| In-world native companion invocation | Not built | Requires secure native bridge / protocol |
| Coding agent SDK sandbox + verifier | Researched, not installed | See OpenHands links |
| Team voice SFU integration | Researched, not installed | See LiveKit links |
| Projector state machine, legacy floor objects and Tier 3 | Specified, not fixed | Handoff document |
| Live host deployment | Not performed in this research/implementation pass | Never assume GitHub == production |

### Near-term release sequence
1. Validate new bootstrap on a non-host Windows PC, including folder picker / no IDE / no checkout / bad remote / file path escape.
2. Build secure opt-in native companion, in-room launch UI, and contributor-owned workspace registry; test with teammate before merging.
3. Whiteboard feature via strict AI sandbox task broker, evaluated tool provider; PR pipeline and two-client acceptance.
4. Headset voice reliability trial and optional LiveKit migration.
5. Fix projector-only-on-click and synchronized portal, then Tier 3 product engineering in independent subprojects.

**No claim of shipping until on-host acceptance passes.**
