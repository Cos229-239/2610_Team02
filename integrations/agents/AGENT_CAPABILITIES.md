# TowerFlow — Agent Capability & Evidence Contract

## Product topology

**AURA = world and collaboration knowledge assistant.** Existing authenticated `/api/aura/chat` talks to a loopback Ollama model and can explain or propose but currently cannot execute arbitrary actions or program the IDE. Its status and private memory are already implemented. Its model-generated output must be treated as a suggestion unless independently corroborated.

**FLOW = business intelligence and task specialist.** `integrations/agents/towerflow-agent.cjs` is a bounded **tool-using execution engine**, not yet an autonomous LLM planning agent. `/api/agents/status` reports the exact reviewed skill catalog and connected provider status; `/api/agents/run` executes explicit tasks with idempotency, source-stamped evidence and deterministic summary. The browser displays returned trace and sources. No task is launched without a user click; sending catalog details requires another explicit consent.

| FLOW skill | Tools executed in order | Real outcome | Dependencies | Limits |
| --- | --- | --- | --- | --- |
| `inventory.review` | `inventory.analyze` → `report.brief` | Normalized inventory, SKU count, calculated weekly revenue, capital at risk, categories and trace | User-supplied JSON inventory | 250 items/run; no independent ERP/POS observation |
| `market.research` | `market.quote` → `report.brief` | One ticker quote with source, provider timestamp and freshness caveat | Authorized server-side Alpha Vantage credential | May be delayed/EOD, rate-limited; not an entry-phase algorithm |
| `AURA chat` | Ollama generation, reviewed knowledge, opted-in memory | Natural-language interpretation with model name and limitations | Active AURA endpoint and reachable local Ollama | No automatic code writes, tool execution or verified external sources |
| `FLOW → AURA` | User-approved aggregate financial report → AURA chat | AI interpretation of deterministic metrics | Authenticated AURA endpoint | Model output is NOT verified; no private inventory records sent by the aggregate route |

**Optional model planning:** `/api/agents/plan` sends a bounded question to the same **loopback-only Ollama** family used by AURA. The response is parsed as strict JSON and can propose only `inventory.review` or `market.research`. The browser shows the proposed skill **without executing it**. Execution requires a separate explicit user click and confirmation; the later `/api/agents/run` supplies actual evidence. The planner does not have arbitrary tool access, multi-step autonomous loops, code execution, contribution control, payments, or permission to purchase stock. Planner responses may be unsupported or unavailable, and no host inference reliability has yet been measured.

Each task result reports `taskId`, `skill`, `summary`, `trace`, `sources`, `evidence`, `elapsedMs`, and disclaimer. `modelAutonomy:false` distinguishes audited tool execution from a fully agentic planner. Product UI must never label an unchecked model statement as externally verified.

## Skill-to-tool boundary

- Authentication: verified existing GitHub user session and `ensureMember` middleware on every call.
- Authorization: server derives role; the browser cannot choose user ID or role.
- CSRF: mutating task launch requires exact configured `Origin`, JSON and body size cap.
- Network: only preconfigured provider endpoint and loopback Ollama; no user-supplied URLs.
- No shell, filesystem mutations, Git pushes, PR deletion, payments, brokerage transactions, desktop bridging, or automatic server restarts.
- No provider key leaks to the browser; no synthetic market quotes after upstream errors.
- Idempotency key reuse for the same user is refused for 60 seconds.
- Provider timing is monitored on server by timeout; request returns errors when unavailable.

## Minimum performance gates

**Source-level tests that CI can verify:** unknown skill denied, prompt-like shell operations denied, invalid tickers denied, untrusted user identity denied, unknown origin denied, oversized tasks denied, duplicate idempotency denied, inventory math equals reference engine, source/trace returned, market quote stale-date explicitly labeled, missing provider fails closed.

**Host acceptance that is NOT covered by CI:** a live Ollama inference response, authenticated real user sessions, actual Alpha Vantage entitlement, rate-limit behavior under load, observed model hallucination rate, licensed-provider legal rights, front-end integration and browser usability. Collect 30+ task prompts per skill, expected evidence sources, pass/fail and latency from the actual host before claiming commercial readiness. Record p50/p95 latency, completion rate, denied-invalid-request rate, and human-verified answer precision, with model/version and provider-freshness tags. No currently measured p95 or accuracy is claimed.

## Future autonomous workflow (not already implemented)

Introduce task planning only after strict JSON-schema tool call validation, deterministic allowlist execution, approval checkpoints for state changes, isolated job workers, per-user quotas, tool-call budgets, result replay, cancel/timeout, and human review. Do not treat a free-form model answer as a tool call.

## Contribution integrity

- A person contributes via branch and PR with author and pinned commit. AI-produced changes are attributable to the human prompter as PR author or designated owner.
- The reviewer sees the exact diff at that commit and, if needed, launches `tools/preview-towerflow-contribution.ps1 -PullRequest NUMBER`. This is a separate localhost static preview, **not** a live-room deployment.
- `TowerFlow/contributions.json` is an annotated, static list of verified PR metadata, not a live account or ownership database.
- Reviewer actions can request changes or leave PRs unmerged. No preview or review action ever executes branch deletion or deletes contributor work.
- GitHub repository administrators may retain platform-level control; application UI cannot guarantee deletion immunity against an administrator.
- Never execute untrusted PR code on the live Windows host; use Codespaces or an isolated sandbox for code execution and debugger access.

## References

The implementation is reviewed under PR #8. Source tests: `integrations/agents/*.test.cjs`, `integrations/market/*.test.cjs`, `TowerFlow/flow-core.test.cjs`. This document is a capability assertion only where executable tests and deployment evidence support it.

## Evidence-to-knowledge feedback loop (review branch, not live)

- `integrations/agents/evidence-learning-loop.cjs` offers `propose → independent maintainer review → verified/rejected → query/exportReviewed` for bounded operational claims, observations, next actions and evidence references.
- The purpose is compounding **reviewed external knowledge**, not autonomous model weight updates or unbounded self-modification. A model-generated suggestion remains **untrusted** until supported by evidence and independently reviewed.
- Contributions remain attributable to their author. Rejections remain discoverable to prevent repeat mistakes. Queries default to verified knowledge.
- **Not production connected:** current implementation is in-memory and per-process; no database persistence, server route, role binding, model retrieval, automatic evaluation, or scheduled optimization exists. The reviewer role is a trusted caller input for tests only and must be derived by a server-side authenticated authorization adapter before any live use.
- Next implementation gates: durable per-team tenant-separated append-only event storage, versioned knowledge revisions, independent evidence verification, retrieval provenance, model quality benchmark and regression comparisons, feedback drift checks, PR-based optimization proposals and human-controlled release.
- Verification command: `node --test integrations/agents/evidence-learning-loop.test.cjs`. GitHub commit alone is not proof that tests or host integration passed.
- Security: no unrestricted shell, repo mutations, credential ingestion, arbitrary model-supplied tool execution or production deployment is introduced by this module.
