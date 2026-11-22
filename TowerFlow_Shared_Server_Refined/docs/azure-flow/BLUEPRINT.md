# Azure Flow — frontier blueprint and build contract

## 1. Primary source research
- Matt Pocock's engineering skills: https://github.com/mattpocock/skills — the `grill-with-docs` workflow links domain modeling, a glossary, hard-to-reverse ADRs, specification, tickets, tests and review. We **adapt the discipline**, without copying/installing another framework or representing it as already executed.
- Matt Pocock's `grill-me` is a clarification interview, **not an autonomous model**; `domain-modeling` resolves vocabulary and records consequential decisions.
- TowerFlow's `README.md`, `CURRENT_HANDOFF.md`, `lib/inventory.js`, `lib/azure-guide.js`, `lib/decision-model.js`, `public/index.html` and `server.js` establish the real current mission.

## 2. Verified mission and preserved status quo
TowerFlow is the team's private-network multi-user inventory manager. It keeps products/parts, quantities and locations, historical stock movements, work orders and purchase orders, local accounts, imports/exports, an inventory revision fence and an account-bound, one-time Azure Stock Guide stock-change preview/confirm flow. The Stock Guide is a deterministic command interpreter. The seven-day decision model is a read-only statistical planning estimate, **not a validated prediction or trained AI**.
Azure Flow is a new isolated tab; it does not replace the stock guide or the business ledger. Its first vertical slice is evidence-based business pulse and manually-entered market position analysis.

## 3. Special-purpose harnesses
| Harness | Current contract | Evidence gate | Status |
|---|---|---|---|
| Boundary | Authenticated `POST /api/azure-flow/evaluate`, enumerate allowed capabilities | Auth + same-origin header, reject unknown capability | Implemented |
| Inventory | Read current products, counts, stock thresholds, list-value | Existing validated state | Implemented |
| Sales | Aggregate recorded sale movement values by month | Real stored sale events only | Implemented |
| Evidence | Timestamp, source revision, SHA-256 result fingerprint | Repeatable same-input results | Implemented, not signed |
| Market | Evaluate user-supplied holdings and observed prices | Required symbol, shares, price and observation date | Implemented (no live feeds) |
| Scenario | Compare reorder, transfers, vendor lead time and cash consequences | Requires validated history and cost/lead-time fields | Not implemented |
| Partner matching | Rank vendors and business partners with provenance | Consented, verifiable vendor records | Not implemented |
| Local language | Explain verified tool outputs using local model through governed contracts | Model test + grounding/abstention evaluation | Not connected on this branch |
| Advertising | Draft campaigns from opt-in keywords, local product catalog | Consent, approval, channel permissions | Not implemented |
| Securities execution | Place trades, settle orders or issue real company shares | Broker/legal compliance, explicit financial authorization | Not implemented |

The harness only exposes explicit, tested capabilities. The LLM is **not necessary** to calculate numbers and must never invent prices, vendors, customer identities or returns. Any LLM introduction requires adversarial tests before an additional write-capable tool is considered.

## 4. Boundary and information flow
`TowerFlow inventory state (authoritative)` → `authenticated Azure Flow boundary` → `allowlisted read-only harness` → `evidence checks + results` → `isolated Azure Flow view`.

The existing TowerFlow pages remain source-of-truth for edits. Azure Flow may navigate users back to native tabs for native operations, but is not permitted to overwrite their state, build new login systems or reconfigure Windows.

The current market input is **manual**: no external API calls, no credentials, no inferred real-time share prices and no securities trading. Importing CSV from a licensed/public market source is a future enhancement subject to provenance, freshness and licensing checks. A strictly offline app cannot independently fetch current market prices.

## 5. Business scale strategy, not functioning paid entitlements
- **Foundation (under $50k business scale)**: local operational visibility, stock alerts, sales trajectory and evidence-backed next steps; preserve a zero-cost hosting path.
- **Growth ($50k scale)**: actual business proposals, vendor comparisons, margins, opportunity pipeline, outreach and discounts. Needs contract and account models, permissions and business ROI evaluation.
- **Franchise/investor ($1m scale)**: multi-business organizational graph, capital/ownership ledger, scenarios, profit-and-loss projection, sourced supply partnerships and customer-approved marketing operations. Issuing shares and trading securities require compliant external systems and legal review, not simulated claims.
Business-scale amounts are **design segmentation**, not verified revenue, fees, licensing or performance promises.

## 6. UI contract
One prominent **Analyze my business** action. Three progressively disclosed result cards: Business Health, Sales Trajectory, Next Move. Optional Market & Shares analysis, optional roadmap details. The royal palette (magenta + platinum + gold) applies **only** to `#azureFlow`. Minimum accessible contrast, visible focus, reduced-motion compatibility.
Current typography uses CSS perspective and layered depth shading, **not actual extruded 3D font geometry**. True geometric glyph extrusion would require font outlines, triangulation and WebGL rendering/validation as a separate performance-budgeted milestone.

## 7. Verification and promotion
Tests: JS syntax of both app scripts (prevents the previous login outage), login-bound route, no-write guarantee, deterministic output, accurate gross sales vs profit labelling, invalid portfolio rows rejected, baseline TowerFlow `node --test`.
Acceptance remains incomplete until running Windows checkout, actual browser login, cards, dark-theme contrast and all team regression checks are observed. Target >=80% unseen-scenario end-to-end reliability before promoting experiment-driven capabilities. Security: zero unauthorized mutations; zero fabricated quotes in the acceptance suite.

## 8. The decisions not yet made
Whether business scale refers to annual sales, funding, valuation or customer tier; what entities can own securities; where authorized portfolio imports persist; what data may leave the host; and which licensed market information, campaign channels and consent systems can be used. These are deliberately **not** decided by a speculative implementation.

## 9. Next vertical slices
(1) browser acceptance and accessibility; (2) replayable scenarios with backtesting; (3) real audited profit/cost data; (4) governed local language adapter; (5) user-authorized historical-market CSV import; (6) business partners/marketing consent workflows. No external API dependency until the owner explicitly changes this boundary.

## 10. Approved governance decisions (2026-11-22)
The owner approved these recommendations:
1. **Model policy:** reuse the installed Ollama host and model from the private AscendenceAgent007 collaboration-room lineage, with `dolphin-llama3:8b` as the explicitly named baseline. `qwen3:8b` and `hermes3:latest` are eligible **only if already installed**. An opt-in five-case local calibration screen measures bounded JSON selection performance but does not claim blind evaluation or promote models automatically. Any high-performing replacement requires broader held-out acceptance.
2. **Harness hierarchy:** one Azure Flow orchestrator, bounded internal inventory/sales/evidence/market harnesses, no delegated arbitrary shell or repository editing. The existing local Ollama connector uses loopback HTTP as an internal process protocol; no external AI APIs or credentials.
3. **Autonomy:** prepare **read-only recommendations for human review**, not automatic inventory writes, securities trades or outreach. A future approved-write adapter must retain the native TowerFlow confirmation and revision controls.
4. **Market sources:** free public information is allowed if source, reuse rights, observation date, provider downtime, and freshness are transparently surfaced. Market networking cannot be mandatory. No source has yet passed an end-to-end real-price verification on this branch, so current implemented portfolio valuation remains user-supplied/offline.
5. **Scale labels:** the $50k and $1m bands refer to **verified annual business revenue**, not software charges, stock valuation or investment capital. The app does not currently have audited annual revenue data, so no user may be assigned a verified revenue band by the harness.
6. **Code privacy:** only the *interface idea* from private AscendenceAgent007 was adapted: local Ollama `/api/tags` and structured `/api/chat`, allowlist, hard timeout, output schema validation and fail-closed response. The private source implementation and credentials are not copied.

### Harness-of-harnesses state
`Session auth` → `read-only source snapshot` → `inventory + sales + evidence` → `optional locally installed LLM proposes one of already-verified findings` → `validate model JSON` → `present review-only recommendation`. Model failure returns baseline evidence without changing the app.

### Evidence maturity
- Static JavaScript parsing: performed against remote branch files.
- Model calibration unit test: authored, but not executed here.
- Real local model installed/active: **UNKNOWN** on Windows until operator check.
- Live market access: **UNKNOWN / optional**.
- All browser/login regression checks: pending local end-to-end verification.
- Approval to merge: not granted.

## 11. Optional no-key market source: narrow allowance
The owner's clarification allows **free public** market observations while prohibiting paid AI APIs, model downloads, and cloud AI services. The separate `azure-flow-market.js` harness supports one manually requested U.S. ticker at a time, using Stooq's daily CSV download page. It enforces a fixed host, ticker allowlist, four-second timeout, bounded CSV parsing, seven-day observation freshness, 30-minute per-symbol cache and a truthful **UNAVAILABLE** state. Output is always a dated historical closing observation, not a trade, current quote, or investment recommendation. This is an external HTTP source, but not a provider API key requirement. Providers may deny scripted access or change licensing; commercial reuse and live availability are not established. No model is given raw external web text.

## 12. Review-before-action contract
`reviewActions` uses recorded quantities, product-specific minimum thresholds and any pending purchase order quantities. Actions show proposed shortfall to **minimum + 1** and a location in TowerFlow's existing Orders or Inventory tab. They are **never** purchase orders and are **never** executed by Azure Flow. Any user action proceeds through the existing native workflow, with its own authentication, review and revision safeguards. This is an approval preparation, not autonomous stock control.

## 13. Calibration and performance budget
Only the owner can manually trigger local Ollama screening; editor-level users retain read-only business inference. The five canned cases screen only `dolphin-llama3:8b`, `qwen3:8b` and `hermes3:latest` if already installed and cap simultaneous candidates at two. Correctness and observed elapsed time are reported, including invalid outputs as failures. A fixed five-case gate is **not** a blind benchmark or general reliability proof. No replacement model is automatically promoted to Azure's live default. More comprehensive held-out evaluation will be required.

**Source references**
- Ollama local API and structured outputs: https://docs.ollama.com/api
- Stooq daily CSV interface and common denial modes: https://stooq.com/ and https://github.com/HKUDS/Vibe-Trading/blob/main/agent/backtest/loaders/stooq_loader.py
- Private source consulted for design only: AscendenceAgent007 / projects/towerflow-collaboration-room / branch-preservation / azure-harness / collaboration-room / azure-bridge / azure-local-reasoner.cjs. This path documents the source relationship; its private implementation is **not copied** into Team 02.

## 14. Observed user-acceptance feedback and corrective integration
Observed screenshot (2026-11-22): the original Azure Flow tab rendered, but it showed **zero active products and no recorded sales**, treated a typed `Sony` as invalid five-field CSV in the advanced holdings form, and reported that local LLM analysis was unavailable or unvalidated. An HTTP 200 and a CSS-rendered dashboard are not proof of an operational business AI system.

Corrections built on the feature branch:
1. A first-class **Ask Azure Flow** input routes exact known company aliases (including `Sony` → `SONY`) and explicit ticker requests to the bounded free, dated market-observation harness; sale and stock questions route to recorded TowerFlow data. Unknown requests receive honest follow-up suggestions instead of fabricated company profiles.
2. The LLM can classify previously unresolved requests into only `inventory`, `sales`, or `unresolved`; a structured response schema and independent validator prevent it from inventing executable tools, security symbols, or raw numerical business facts.
3. The model-health panel provides actionable `MODEL_INSTALLED`, `MODEL_NOT_INSTALLED` and `OLLAMA_UNREACHABLE` diagnostics against the existing 127.0.0.1:11434 Ollama installation. No network model downloads or API keys.
4. Corrected an identified performance flaw: the previous adapter set `keep_alive:0` and 9-second model deadlines, which could unload and reload a cold 8B model for every calibration case. Current adapter allows up to 45 seconds for initial inference, retains weights for 60 seconds between calls and limits context to 1024 tokens. This is a reasoned optimization, **not measured Windows performance**.
5. Source-aware business results link back to native Inventory and Movements tabs; no cross-tab mutation. There is no synthetic sample business data.
6. Manual holdings CSV remains available as an **advanced** tool. Company inquiries do not require holdings CSV.

### Verification requirements before merging
- Run all Node regression tests on the user's actual Windows checkout and capture pass/fail evidence.
- Confirm browser sign-in, tab navigation, query text examples, actual data, market unavailable behavior and all legacy tab flows.
- Check `GET /api/azure-flow/model-health`, verify installed model name and perform one actual bounded model call. A model being installed is not proof that it can answer correctly.
- Owner-triggered calibration must report real answers/latency; the five visible cases cannot establish 80% reliability on unseen tasks. Add a blind and varied scenario suite before any model is considered production-qualified.
- Confirm no paid API keys, unapproved downloads, external model calls, inventory writes, securities trades or private code copied from AscendenceAgent007.
- Retain draft PR #47 until all acceptance evidence is available. Existing TowerFlow data cannot be replenished from invented values.
