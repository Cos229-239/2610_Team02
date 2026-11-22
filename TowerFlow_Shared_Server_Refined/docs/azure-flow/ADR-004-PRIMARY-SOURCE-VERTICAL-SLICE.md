# ADR-AF-004 — First complete primary financial evidence vertical slice
**Status:** PROPOSED / NOT MERGED · 2026-11-22  
**Repository:** `Cos229-239/2610_Team02` feature `feature/azure-flow-frontier-v1-20261122` (draft PR #47)

## Context
The user's business-investment intelligence objective requires an observable, evidenced result, not a JSON-only tool selector. Actual Dolphin routing failed 10/14 cases under a strict source-fitness rubric, 0/4 registry-order metamorphic probes, and 3/4 isolated source-fitness experiments. Previous SEC harness supplied only issuer identity and 10-K locators; it could not support any financial numbers. More prompts alone do not solve a missing evidence adapter.

## Decision under review
Extend the existing **authenticated Node.js** source harness with a **free, read-only, official SEC XBRL companyfacts** adapter. When a user deliberately selects **Official SEC** and checks external-research consent, the server bypasses the known-unreliable automatic harness router and executes the authorized SEC harness directly. Public research never transmits authenticated inventory or account state. The original adaptive AI path remains available as an explicitly experimental mode; no team dev merge.

The model may synthesize *provisional* source-linked hypotheses only. Numerical observations are extracted deterministically from official SEC companyfacts payloads with CIK match, `us-gaap` concept, USD unit, fiscal period, filing date and accession. Report a missing source explicitly. A user-selected tool is not a verified fact or buy/sell authorization.

## Implemented vertical slice
- `lib/azure-flow-sec-fundamentals.js`: SEC `data.sec.gov/api/xbrl/companyfacts/CIK##########.json` read-only data. Extract only supported annual `10-K` USD facts: reported revenue, net income, year-end assets and annual operating cash flow. Preserve actual tag, unit, period, filed date, accession and exact source receipt. Wrong CIK, future filing, abbreviated duration, missing format or malformed values produce no financial fact.
- `lib/azure-flow-capabilities.js`: include official facts *ahead of* locators in a bounded evidence/synthesis context; registry remains consent-gated. If the provider is inaccessible, return limitations, not invented valuations.
- `lib/azure-flow-evidence-audit.js`: separately classify `ISSUER_REPORTED_XBRL` vs a filing locator. Neither proves suitability, audited truth, model entailment or investment outcome.
- `server.js`, `public/index.html`, `public/azure-flow.js`: opt-in source mode `official-sec` alongside `adaptive`; consent required before any external request; source receipts displayed with links to SEC record.
- `test/azure-flow-sec-fundamentals.test.js` and `test/azure-flow-sec-ui.test.js`: positive and negative controls for source values, date/unit/report boundaries, CIK, explicit consent and readonly endpoint.

## Rejected alternatives
- **Keep trying prompts on unfinished harnesses:** rejected because semantic accuracy cannot replace missing official source data.
- **Hardcode named firms/tickers or investment answers:** rejected for poor generalization.
- **Move full TowerFlow server to Express:** rejected as unrelated to source evidence and a regression risk.
- **Provide free quote/valuation from filings:** rejected; companyfacts is issuer reporting, not a live market-price or valuation service.
- **Install unverified financial packages or paid data providers:** rejected to preserve light/free stack.

## Open limitations
- This first adapter is for SEC `us-gaap` annual reports only. It does not cover foreign IFRS filings, all fiscal transition periods, current quotes, comparability adjustments, financial ratios, filings' narrative risk sections, auditor opinions, or full filing-text verification.
- Different tags/filing years can represent overlapping concepts or be restated; selected values must not be added blindly or compared across mismatched periods.
- The existing SEC locator uses a simple dataset-driven entity-token resolver. Complex natural-language requests and ambiguous company names need independent negative tests and explicit CIK/ticker disambiguation.
- An actual identifiable SEC User-Agent is required via `TOWERFLOW_SEC_USER_AGENT`. The code **does not insert a fabricated owner email**. Live network success cannot be asserted without running on a properly configured host.
- Public research consent is user-facing; production validation must verify browser behavior, session and source result in the running Windows app.

## Acceptance contract before promotion
1. Run updated Windows `npm.cmd test`; none of the previous 87/87 passes automatically certify this change.
2. Test an actual issuer using user-approved SEC access: retrieve an issuer with correct CIK and at least one numeric reported fact from SEC `companyfacts`; preserve exact accession, period, tag, timestamp, unit and source URL.
3. Exercise no-contact, network-blocked, wrong-CIK, stale/future, malformed and issuer ambiguity cases without any invented financial numbers.
4. Verify source and original user question are visible in signed-in browser, and that another account cannot read saved research drafts.
5. Run three-role review against the outcome; source correctness, code correctness and preservation are separate gates.
6. Require an unseen-case gate and >=80% demonstrated reliability plus zero critical security/evidence errors; no automatic model promotion.

## Evidence at authoring
7 relevant JS scripts parsed in remote source inspection; isolated source-selector XBRL smoke checks passed 3/3 using mocked hash and payload. **No updated full Windows Node suite or real SEC network request or browser acceptance has yet been observed.** This decision is still proposed and PR stays draft.

## Post-ADR validation update — real provider succeeded, browser still unverified
User's Windows proof command returned official Microsoft CIK 789019, four FY2026 reported numeric values and `PRIMARY_SOURCE_SCREEN_PASS`: revenue USD 331839000000; net income USD 133749000000; total assets USD 758376000000; operating cash flow USD 182935000000. User's updated Node suite: **105/105 PASS**. These prove a live SEC data source response and tested module behavior, not a browser session.

**Integration bridge added:** `test/azure-flow-sec-http-integration.test.js` boots the actual `createApp()` Node server with an isolated test accounts directory and injected, fixed evidence provider. It checks that the real HTTP page serves Azure Flow, serves the JS adapter, unauthenticated SEC research is rejected, consent and origin are enforced, an authenticated official-SEC request reaches the source route with `research.sec` and a concrete reported numeric evidence receipt, and inventory remains unchanged. The injected provider is a **mock**; it does not prove real SEC networking through the logged-in application or visual browser rendering. Production `createApp()` continues to use the real `researchAzure` implementation; no new public endpoint or config file is created.

**Required real browser check:** The existing running Node process must be the correct feature branch and must receive its genuine `TOWERFLOW_SEC_USER_AGENT` in the server process environment **before startup**. A temporary PowerShell variable used only for a one-off proof process is erased afterward and does not configure an already-running TowerFlow process. Do not kill or restart any existing server without checking its executable, command line, active sessions and owners. On the signed-in application select Azure Flow → Research strategy "Official SEC" → authorize external research → ask "Microsoft" → verify actual displayed evidence and official URL. Verify no workspace edits and confirm auth/session protections. Until actual host/browser evidence is returned, mark **BROWSER_UNVERIFIED** and PR DRAFT.
