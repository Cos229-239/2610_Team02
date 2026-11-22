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

## 15. Azure Flow reactive presence and preserved TF orb
The TF orb's existing magenta/gold spherical core, ring geometry, proportions and central **TF** identity are retained. A dedicated `public/azure-flow-motion.js` controller and CSS scoped to `#azureFlow` add:
- Gentle floating motion and two independent ring sweeps; no texture or 3D engine dependency.
- Pointer-responsive tilt on the orb only; positions are clamped and handled via `requestAnimationFrame`.
- State-linked glow for working, ready, unavailable and focused UI, observing actual status elements rather than presenting fake AI success.
- Reduced-motion support and pause on hidden browser/section.
- Subtle card interaction and response reveal animation, with no modifications to other TowerFlow tabs.
- No model or API calls initiated by the motion controller.
Visual motion is NOT evidence of model availability. Smoke test with pointer, keyboard, reduced-motion and tab visibility on the real browser.

## 16. Reproducible local model screen
`node tools/azure-flow-live-calibration.cjs dolphin-llama3:8b [qwen3.5:4b]` runs **20 authored cases** (10 intent-routing cases, 10 read-only reorder/abstention cases) on installed localhost models. Outputs expected vs observed labels, schema validity, time and errors; returns nonzero on failure and never selects, downloads or promotes a model. This is a reproducible screening suite, not hidden benchmarks or certified business reasoning. It never creates purchase orders or uses user business data.

## 17. Adaptive learning, RAG and investment-research frontier (2026-11-22)
The user's later feedback rejected the hardcoded Sony/Microsoft keyword-and-symbol response pattern as an intelligence architecture. Preserve it only as historical prototype context; the **Ask Azure Flow** interface is now routed to `/api/azure-flow/research`, not the old `/api/azure-flow/query` endpoint.

**Implemented on this feature branch:**
- `azure-flow-intelligence.js`: locally installed Ollama selects an allowed capability plan from a dynamic registry. Every plan is validated before execution and can perform one bounded evidence-driven second pass with explicit public-research consent.
- `azure-flow-capabilities.js`: typed inventory, sales, local Markdown RAG, owner-only prior findings, public background and SEC issuer/filing metadata harnesses. Individual permissions and sources remain separate.
- `azure-flow-retrieval.js`: bounded BM25-style local Markdown passage retrieval and owner-scoped historic draft retrieval, content hashes, no arbitrary filesystem paths.
- `azure-flow-public-research.js`: opt-in free public encyclopedia retrieval for background, clearly flagged community-edited and **not primary financial evidence**.
- `azure-flow-sec-filings.js`: official free SEC issuer mapping and recent filing-metadata URLs without hardcoded company names. Requires explicit user opt-in and `TOWERFLOW_SEC_USER_AGENT` containing an actual operator name/contact email; without this it abstains. Do not invent a contact or attempt high-volume access. SEC filings themselves are **not** yet parsed, so no claims about a company's financial performance are supported by that adapter.
- `azure-flow-synthesis.js`: model hypothesis must carry exact quotations with matching source IDs. Substring verification is a provenance check, **not proof of logical or factual correctness**.
- `azure-flow-evidence-audit.js`: checks evidence coverage, source classes, duplicate IDs, failed harnesses, and identifies unverified financing claims without fabricated confidence scores.
- `azure-flow-evidence-record.js`: only an explicit owner action saves Markdown findings and proposed ADR into the existing local data folder, scoped by user identity. The ADR records limitations, hypotheses and evidence; no Git commit or approval inferred.
- `azure-flow-learning.js`: explicitly submitted owner feedback (useful/incorrect/needs-more-evidence) becomes append-only episodic memory. **Only useful reviewed cases** inform future routing as non-factual precedents; the same capability-authorization gate applies at recall time. Incorrect or uncertain cases are recorded for evaluation, not treated as facts or automatic policy updates.
- `azure-flow-express-bridge.js`: optional Express adapter for an **already existing** authenticated Express collaboration-room host. Not mounted or added as a dependency in the native Node inventory server. No separate port, account system, migration or npm install is required for the current runtime.
- `docs/azure-flow/knowledge/LEARNING_AND_INVESTMENT.md` and `docs/azure-flow/ADR-002-INTELLIGENCE-LEARNING.md`: reference material, knowledge hierarchy, scope and reviewable architecture decision.

**Not implemented or not certified:** model fine-tuning, gradient descent/reinforcement-learning policy updates, real-time market prices, SEC filing financial-statement extraction, verified valuation, knowledge graph entity disambiguation beyond SEC metadata, simulation-certified returns, independent contradiction detection, automated trading, hidden-holdout reliability >=80%, or a live mounted Express collaboration bridge. Their absence is a known gap, not a silent feature.

**Acceptance criteria before promotion:** `npm test`, actual local Dolphin structured plan/synthesis, strict source-line verification, Wikipedia and SEC blocked-provider behavior, owner/editor memory isolation, repeat-feedback prevention, public-search opt-in, actual browser UX/TF orb response, and differential evaluation against unseen research tasks. Explicitly verify `dev` remains unchanged.

## 18. Detection-oriented evaluation after an observed false green (2026-11-22)
Operator live observation: `dolphin-llama3:8b` returned **schema-valid** JSON selecting `workspace.inventory`, `workspace.sales` and `knowledge.markdown` when asked about **Microsoft's public financial filings, investment fundamentals and business risks**. The tester reported "SCHEMA AND ALLOWLIST: PASS", but the selected sources cannot directly establish issuer filing facts; the critical `research.sec` capability was omitted. This is an observed **semantic routing failure** and a false positive in the earlier acceptance metric.

Do not equate syntactic or authorization validity with task success. The documented test harness must distinguish:
- **Parsing / schema compliance:** The output is syntactically valid, no unauthorized tools.
- **Scope and source fitness:** A selected harness can actually answer the user's question; personal inventory != unrelated issuer filings.
- **Source existence and provenance:** A provider returned actual records with identifiers, dates, original URLs and receipts.
- **Answer support:** The conclusion is supported by those records, not an irrelevant quote.
- **Contradictions and uncertainty:** Missing or conflicting evidence remains unresolved rather than being averaged or concealed.
- **Behavioral safety:** Explicit public consent and owner/editor boundaries hold in every route.
- **Resource cost:** Response latency and model memory, measured on actual hardware.
- **Generalization:** Blind, withheld and previously unseen company names, industries, financial questions, irrelevant distractors, adversarial instructions and changed capability registries.

A new `azure-flow-route-evaluation.js` rubric scores omissions and inappropriate harness selections, not merely whether a response parses. The independent `tools/azure-flow-route-audit.cjs` exercises the **real local** planner on 14 labeled, varied cases; it fails if any primary-source case is missed, even when an overall accuracy percentage is high. The same observed incorrect route is retained as an explicitly identified regression case (`F01`). Positive and negative controls detect false positives. These 14 disclosed cases are **NOT blind**, so the >=80% gate cannot establish general intelligence; qualification requires separately created hidden cases and live browser behavior.

The runtime now explicitly marks `plan.semanticFit=NOT_INDEPENDENTLY_VERIFIED`; `MODEL_PLAN_VALIDATED` means **format and permission only**. Results must not claim competent source selection solely from this status. A revised natural-language planner instruction asks the model to distinguish workspace/private source scopes from outside-company primary evidence; this is an open source-authority rule, not a hardcoded company-specific answer.

**Current live observation:** 1/1 identified semantic routing case failed, even though schema check passed. No actual rerun of Dolphin after the prompt improvement has yet been observed. Do not promote the model or merge.

## 19. Three-role evaluator actually integrated with the live route audit
The user-approved triad is preserved separately in the private `AscendenceAgent007/projects/towerflow-collaboration-room/docs/AZURE_FLOW_THREE_ROLE_ADVERSARIAL_EVALUATION.md`. The public/team Azure Flow branch contains only its independent implementation and nonsensitive regression methods:

- **Role 1 Devil's Advocate:** challenge source authority, seductive structural PASS results, assumptions and proof gaps.
- **Role 2 Diagnostic Investigator:** compare expected vs observed capabilities; identify missing/extra sources; root causes remain *UNKNOWN_PENDING_TRACE* unless reproduced.
- **Role 3 Adversarial Collaboration + Blind-Spot Analysis:** mutate routes with irrelevant extras, required omissions, false abstentions and unauthorized capabilities, then test whether the grader rejects them.

`lib/azure-flow-three-role-audit.js` executes these roles on each `tools/azure-flow-route-audit.cjs` case. The grader now rejects unapproved extras, missing or repeated case IDs and apparently valid abstention if the model was unavailable. The three-role decision is not production authorization. Regression tests include previously falsely accepted F06/F07, offline empty-list abstention, duplicate IDs and critical omissions.

**Additional metamorphic probe:** `node tools/azure-flow-metamorphic-audit.cjs` exercises four disclosed cases twice with the authorized harness list in normal and reverse order. It fails if changing only registry ordering changes the selected capability set, or if either route is semantically invalid. This is an **optional** real-Ollama check that performs no research provider requests, writes, downloads or model promotion. It is not a protected blind holdout; models may legitimately propose alternative equivalent routes, so strict invariance should be treated as an initial diagnostic, with false rejection reviewed rather than as proof of general competence.

**Evidence boundary:** The most recent observed Windows full test suite (before these later changes) was 67/67 passed; actual Dolphin routing was 10/14 initially, NOT_QUALIFIED. Replaying those same model outputs against the stricter grade gave 4/14. This is retrospective regrading rather than a new live measurement; do not present it as an observed model regression. Run updated Windows tests and the live route and metamorphic audits before any acceptance claim.

## 20. Actual live three-role adversarial results — source-scope failure (2026-11-22)
The user ran the upgraded Windows tests and actual Dolphin model evaluations:
- Native Node regression tests **82/82 PASS**.
- Live source-fitness screen **4/14 (28.57%), NOT_QUALIFIED**; failures F01, F04, F05, F06, F07, F08, F10, F12, F13, F14. New strict oracle exposed irrelevant extra selections that the old 10/14 grader accepted. This is actual fresh live inference, unlike the earlier retrospective replay.
- Capability-registry order test **0/4 PASS**: F01/F04/F08/F12 all changed selections when only the registry order changed; both orders failed the existing fitness criterion. Observed model outputs suggest positional/over-selection bias, but this is a **hypothesis**, not a proven internal root cause.
- The three-role mechanism correctly refused model promotion (Devil's Advocate: source-selection plausibility is not grounded research; Investigator: unrelated capability over-selection; Adversarial Analyst: order sensitivity and false-acceptance concerns). It did **not** retrieve real SEC filings, independently validate citations or demonstrate production reliability.

**Next controlled experiment (not a production fix):**
`lib/azure-flow-planner-lab.js` and `tools/azure-flow-source-fit-lab.cjs` test one authorization-qualified capability at a time with an actual local model. Each capability receives an isolated structured verdict (DIRECT/SUPPORTING/NONE/UNCERTAIN) plus a source-scope explanation. The diagnostic does not use a quota that forces three picks. Any UNCERTAIN or malformed response blocks the entire proposal; source ranking is canonicalized to minimize order bias. The experimental workflow makes *no harness calls*, market/provider requests, inventory writes, local files, model installation, or promotions. It is deliberately not mounted in production, pending measured validation against the existing plan on unseen questions.

**Known limitations:** A model's verbal source-fit reasons can still be wrong or influenced by the same model's bias. More model calls increase latency/CPU/RAM cost. Static case oracle allowed sets may be too narrow for legitimate multi-source investigations, requiring independent human review of false rejects. A per-harness model opinion is not factual verification. Avoid claiming general intelligence even if this experimental diagnostic passes.
