# TowerFlow — Frontier Live Intelligence + AURA/FLOW Model Harness
**Status:** Repository implementation candidate, not a live-host certification.

## Transcribed requirements, preserved verbatim in intent
Keep the ORIGINAL premium cyber/computer-science Frontier collaboration room with its cinematic ambience, projector, Earth globe, Development Room, sound, multiplayer, GitHub teammate contributions and AURA. Keep the SEPARATE TowerFlow financial and inventory application with FLOW. Add real market and company data; model-aware situational and configuration awareness; evidence-driven reasoning; a genuine incremental learning component; and functional, contributor-owned 3D object modules. Never replace either application, downgrade visual/interactive fidelity or invent live success.

## Four contracts
**SPECS:** AURA exclusively operates within Frontier/Development; FLOW exclusively operates within TowerFlow business. Public-company CIK filings and authenticated real stock quotes have source, timestamp, data quality and rights. Components require GLB, measured dimensions, rights, owner and behavior handlers.
**DESIGN:** Retain the existing graphite/metallic azure-violet photogenic room—not another dashboard. Business market feed and SEC CIK input are only added to the existing TowerFlow app. 3D interactions use authentic host-registered functions and never decorative placeholders.
**PRESERVATION:** Never silently modify the active Windows host, branch, worktree, teammates' authored files, persisted room settings, world controls, voice, login, inventory or finance; no Node restarts on staging. No unauthorized public execution route.
**API:** Reuse authenticated /api/market/quote and /api/agents/status, /api/agents/plan, /api/agents/run. New FLOW skill company.research accepts CIK and uses a server-side SEC connector. Existing projector/world/agent modules are reused, not replaced.

## Code correlation
- "Real/live stock data" → Alpaca Market Data IEX latest trade endpoint; timestamp, cache, ageSeconds, IEX-only coverage; optional 12-second user-initiated polling. This is NOT all-exchange SIP or a WebSocket stream.
- "Real businesses" → official SEC EDGAR companyfacts CIK financial data; actual filing/date/form/metric and no invented real-time location sales.
- "Two brilliant AI agents" → model family adapters, specialized tool sets, explicit interface boundaries, typed output contracts, evidence and postcondition reporting. Capability is measured, not asserted from fluency.
- "Situational awareness" → AURA reads the server-private authoritative world-state revision and scene configuration IF available; FLOW sees host provider-configuration truth and tool-returned data. Missing projector/multiplayer telemetry remains UNKNOWN.
- "Configurational awareness" → user/workspace/shared-room/organization scope is validated separately. Room config not conflated with personal preference or business tenant settings.
- "Machine learning" → reviewed CODE/PATTERN/PRESERVATION trial labels update a Bayesian success-estimation policy per agent, model family, skill and surface. It does not retrain underlying LLM neural weights. Training/fine-tuning neural weights needs real approved data, train/eval code, compute and a checkpoint.
- "Collaborators integrate anything" → versioned module manifest, author ownership, licensed real GLB, interactions, handler IDs, trusted role checks, isolated branch/PR, tests and rollback.
- "No degradations" → optimize resource budgets while preserving original renderer, user flows and auth; block promotion if measured runtime performance or interaction regressions worsen.

## Implemented source in this branch
- integrations/market/alpaca-iex.cjs: real credentialed IEX last-trade lookup, selectable before the existing Alpha Vantage fallback.
- integrations/market/sec-company-facts.cjs: real issuer SEC XBRL 10-K/10-Q facts by CIK, fair-use User-Agent, cache and timestamps.
- integrations/agents/towerflow-agent.cjs: company.research real SEC skill alongside preserved market.research and inventory.review.
- integrations/agents/flow-planner.cjs and agent-handler.cjs: FLOW model-aware planning with server-attested provider readiness; reviewed skill execution remains a separate user action.
- integrations/aura/aura-service.cjs: model-aware AURA system instructions, optional private versioned scene context (not a browser-asserted world snapshot).
- integrations/agents/dual-agent-harness.cjs: four contracts, interface boundaries and model-family profile.
- integrations/agents/online-evidence-learner.cjs: genuine opt-in statistical skill-quality updates, held-out evaluation not yet collected; no LLM weight training claims.
- integrations/contributions/object-contract.cjs: validates and invokes object capabilities only through trusted host-installed handlers.
- TowerFlow/index.html + flow-agent-ui.js: original business page gains a SEC CIK action and explicitly source-labeled optional quote feed.
- tools/install-shared-world-from-git.mjs and tools/install-towerflow-aura-from-git.mjs: stage known dependencies using existing guarded source/baseline checks. No automatic restart.
- CI: frontier-live-intelligence.yml tests Windows and Linux source contracts and original room preservation.

## Real data and provider configuration
Optional server environment variables, NEVER committed to GitHub or embedded in browser:
- TOWERFLOW_ALPACA_KEY_ID — Alpaca key ID (required for IEX)
- TOWERFLOW_ALPACA_SECRET_KEY — Alpaca secret (required for IEX)
- TOWERFLOW_ALPHA_VANTAGE_KEY — existing dated quote fallback
- TOWERFLOW_SEC_USER_AGENT — real application identity and monitored contact address (e.g. CompanyProduct engineer@example.org; example is NOT a valid deployed identity)
- TOWERFLOW_AURA_MODEL / TOWERFLOW_FLOW_MODEL — separate local model choices, else TOWERFLOW_AI_MODEL shared fallback, then dolphin-llama3:8b default.

SEC needs no API key but does require a properly identifying request header and fair-use access. Alpaca Basic is IEX-only and may have a subscription/redistribution license boundary. SEC filing figures are periodic disclosures, not true inventory or minute-by-minute sales. Neither provides real per-region sales for the existing Earth globe; an authenticated corporate POS/ERP source is needed before populating globe colors. No credentials or real provider responses have been observed through this GitHub-only workflow.

## Accuracy, ML and preservation gates
CODE: Node syntax, provider-contract unit tests, authenticated agent/market handler tests, projector and cyber preservation tests, contributor interaction tests.
PATTERN: actual browser feed/status, live logged-in AURA/FLOW, room cinematography, projector/movement, object action click results, two-client dev flow and visual screenshot evidence.
PRESERVATION: original finance, inventory, auth, voice, Tailscale, team ownership, data, source and frame-time baselines. No promotion with unknown or worsened metrics.

For model-quality advancement, record independent consented trials with objective, exact model/version, task context, real tool outputs, three-gate evidence and human review. Use 30+ trials and Wilson 95% lower bound >= 0.80 BEFORE declaring a routing policy eligible for promotion. A routing-policy update is machine learning; it does not change LLM weights.

## Remaining work and deployment boundary
The actual Windows-hosted server.js and public/room.js are not fully accessible through GitHub. Source installation scripts may reject diverged host code: that is preservation, not a reason to overwrite. Real client audio, runtime frame-time, projector E/wall interaction, quote-provider entitlement, SEC contact details, GLB author contributions, separate workstation IDE, multiplayer persistence and live model inference require host-side integration and observation. Full-scale production deploy is NOT verified and must not be claimed.

Approved sequence: inspect authoritative live source → identify exact reviewed revision → execute suite → dry-run gated installers → targeted backup → stage → planned Node restart with teammates → verify /api/health, member permissions, AURA and FLOW, real provider timestamps, original room and real 2-client workflow → record rollback receipt. Never auto-replace the original room.

## Original-room guarded one-command staging (Windows)
From a local checkout containing this reviewed branch, with authorized credentials configured only in the host environment:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\launch-original-frontier.ps1 -ApplyCyber -StageIntelligence

This command starts from the original live server.js/public/room.js (never creates a substitute); validates reviewed source; dry-runs all installers before staging; preserves unknown/diverged host source; avoids interrupting existing Node/Tailscale sessions; and opens the original room at http://127.0.0.1:4173/room/team02.

Running this command is NOT implied by a GitHub commit or chat reply. If the original room or companion checkout is absent/diverged, it stops. If Node was already running, new server modules are STAGED only and require a separately coordinated restart; existing participants are not disconnected by the script. Source/pattern/preservation and real provider authorization remain independent gates.



## Authoritative sources
- SEC EDGAR APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Alpaca IEX coverage: https://docs.alpaca.markets/us/docs/about-market-data-api
- Alpaca latest trade: https://docs.alpaca.markets/us/reference/stocklatesttradesingle-1
- Alpaca WebSocket (future streaming): https://docs.alpaca.markets/us/docs/real-time-stock-pricing-data
- OpenAI agent definition/handoff: https://developers.openai.com/api/docs/guides/agents/define-agents
- Anthropic tool-use contract: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- Original repo evidence: TOWERFLOW_PRODUCT_DIRECTION_AND_HANDOFF.md; integrations/agents/AGENT_CAPABILITIES.md; integrations/frontier/FRONTIER_CYBER_EXECUTION.md; integrations/world/world-state.cjs.
