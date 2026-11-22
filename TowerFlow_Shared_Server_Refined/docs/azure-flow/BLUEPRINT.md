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
