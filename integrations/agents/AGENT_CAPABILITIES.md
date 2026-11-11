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

## Prediction experiment harness — isolated research implementation (2026-11-10)

Research grounding: NIST AI RMF MEASURE (https://airc.nist.gov/airmf-resources/playbook/measure/); scikit-learn calibration and proper scoring rules (https://scikit-learn.org/stable/modules/calibration.html); DeepMind AlphaEvolve's candidate/evaluator architecture (https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/).

- Experimental branch: `experiment/prediction-calibration-harness-20261110`, not merged or deployed.
- Pure, no-storage module: `integrations/agents/prediction-experiment.cjs`. Inputs: precommitted binary forecast, probability, timestamp, later observed actual, independently supplied evidence reference and experiment protocol. Outputs: exact-outcome accuracy, Brier score, log loss, calibration bins and confidently incorrect count. Compares a baseline against a candidate over identical observed cases.
- Tests: `node --test integrations/agents/prediction-experiment.test.cjs`. **Not yet executed on host**. No measurements of model performance yet.
- An evidence reference is not proof of independence. Production tooling must actually verify immutable sources, timestamp ordering, protocol version, holdout partition, and evaluator integrity.
- Brier/log loss measure forecast quality **only for the defined binary event**. Perfect scores on a finite experiment cannot establish universal 100% predictability. Keep untouched holdout cases and test on unseen environments before claiming generalization.
- No model/provider selection, model training, autonomous execution, DB writes, server routes, dashboard, or production deployment was added. Qwen3 is not selected as the benchmark.
- Next safe experiment: identify one reproducible Towerflow task (e.g., whether a targeted visual edit preserves Development Room interaction), pre-register predicted pass/fail and confidence, run an isolated deterministic test, independently record result, and compare subsequent revisions on held-out variants.
