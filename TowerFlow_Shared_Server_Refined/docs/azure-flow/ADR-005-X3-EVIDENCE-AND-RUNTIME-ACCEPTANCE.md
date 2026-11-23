# ADR-AF-005 — X3 evidence workflow and live-runtime acceptance

**Status:** SCOPE CORRECTED — X3 is an assistant operating method, not a TowerFlow product feature  
**Date:** 2026-11-22  
**Repository:** `Cos229-239/2610_Team02`  
**Branch:** `feature/azure-flow-frontier-v1-20261122` · **PR #47 remains draft**  
**Scope:** Historical investigation only. X3 belongs to the assistant's interaction protocol, NOT TowerFlow source, runtime, accounts, login, or UI. This ADR does not authorize merging, trading, autonomous edits, or server restarts.

## Decision question

**Does an integrated three-process diagnostic measurably reduce repetitive user/AI exchanges and increase useful, verified Azure Flow progress per execution without reducing preservation or evidence quality?**

The requirement is more than a wrapper around three unrelated logs. A single operator-initiated command should execute (1) the primary objective, (2) independent real-source/backend checks with concrete results, and (3) a structured decision report with prioritized next measures, all automatically copied to the clipboard. Failures must not silently become a PASS.

## Context and competing hypotheses

Earlier iterations repeatedly validated source, tests, temporary HTTP fixtures, live static assets and real running backend as if interchangeable. A signed-in browser eventually returned HTTP 404 even while source-level tests were green. Multiple separate PowerShell prompts and SEC operator-identity requirements slowed recovery; SEC is optional, not a prerequisite for TowerFlow startup.

- **H1 — efficiency:** one X3 execution reduces the number of operator copy/paste cycles and AI follow-up turns needed to identify the next blocker.
- **H2 — reliability:** the integrated checks expose discrepancies between source, isolated authenticated HTTP behavior, actual upstream provider responses and the long-running host more reliably than unit tests alone.
- **H3 — preservation:** zero unapproved changes to the running application, shared inventory, account records, existing uncommitted changes or `dev`.
- **Null / alternative explanations:** this run worked because a known fault was easy to detect, because prior commands established a baseline, or because the user provided unusually complete logs. One success cannot establish sustained improvement.
- **Unknown:** no controlled A/B time-per-task baseline, repeated unseen failures, browser-render verification or calibrated reliability measurement yet.

## Implementation and boundaries

`tools/azure-flow-triple-pass.ps1`, committed on the feature branch at `3aa249c`, runs:

1. **Primary objective:** checks branch/local status and executes complete native `npm.cmd test`, recording counts, failed tests and exit code.
2. **Actual results:** creates an isolated, disposable localhost Node app using `createApp({directory: temp})`; verifies unauthenticated **401**, absent external consent **400** and authorized **200**; the authorized request invokes the **real** Coinbase Exchange public ticker adapter (not mock prices). Captures symbol, price, bid/ask, source time and age. The isolated account directory is removed.
3. **Evaluation/report:** inspects actual port 4173 PID/start time, compares its creation time with the current on-disk `server.js`, checks live HTML/JS/CSS parity and emits prioritized next steps. Full report is copied automatically using `Set-Clipboard`.

**Critical separation:** The real-provider authenticated test in process 2 is on a *disposable server*. It does **not** prove that the original process on 4173 or its signed-in browser can use the market endpoint. A server start time preceding the file modification is evidence consistent with stale in-memory code, not proof of its precise working directory. An unauthenticated 401 alone does not prove a route exists because auth executes before route matching.

## Observations — owner-run X3, 2026-11-22

| Gate | Recorded observation | Interpretation |
|---|---|---|
| Version | Feature commit `3aa249c` | Local operator report; branch isolated from `dev` |
| Tests | **113/113 PASS**, failed 0, exit 0 | The tested source passes native Node suite |
| Isolated HTTP security | 401 unauthenticated; 400 no consent; 200 authorized | Expected gating observed on the disposable app |
| Real upstream provider | **3/3** observed, Coinbase Exchange | Actual source response through authenticated disposable HTTP app |
| BTC-USD | USD **61,018.46**; bid 61,017.24; ask 61,017.25; exchange timestamp 2026-11-22 23:18:32 (reported) | Historical snapshot only; note the price lies **above the reported ask**, so preserve this raw observation and investigate exchange microstructure / asynchronous fields; do not treat bid/ask arithmetic as a verified synchronized market state |
| ETH-USD | USD **1,722.43**; bid 1,722.06; ask 1,722.30; exchange timestamp 2026-11-22 23:18:32 (reported) | Historical snapshot only; price also exceeds reported ask; do not silently correct |
| SOL-USD | USD **70.47**; bid 70.47; ask 70.48; exchange timestamp 2026-11-22 23:18:30 (reported) | Historical snapshot only |
| Runtime before recovery | PID **24972**, start **17:58:33**, `server.js` on-disk timestamp **18:10:09** | `STALE_SUSPECTED` |
| Assets before recovery | HTTP 200, live HTML/JS/CSS matched local | Static-file parity, not Node in-memory source parity |
| Local state | Four existing local modifications reported preserved; accounts present | Reported preservation; no disk-level before/after hash proof of every record |

Times above reproduce the user-supplied report. The quote UTC-to-local relationships and retrieval clock are not independently validated beyond the output. These are **crypto spot snapshots**, not equities, predictions or advice.

### Follow-up recovery — same date, owner-run

The user subsequently performed a **controlled restart** of verified PID 24972 after confirming stale-source suspicion. Reported results:

| Check | Reported result |
|---|---|
| Old PID | 24972 stopped |
| New PID | **19492**, bound to 4173 |
| Backend | Health PASS |
| Accounts initialized | True |
| Live HTML/JS/CSS | All match repository files |
| Config route | Unauthenticated GET returned **401** |
| Expected source-route strings | Present in `server.js` |
| Existing app records | Reported not replaced |

**Do not infer from these checks** that the running production market route returns authorized 200, that Coinbase quotes are visibly rendered in the actual signed-in browser, or that a refresh/stop sequence works. An unauthenticated config 401 and matching assets do not close that gap.

## Three-role challenge

**Devil's Advocate:** The X3 pass demonstrates multiple checks per command but **does not prove a productivity gain** or a complete production result. Coincidentally passing mock and source checks can still miss actual user failures. Provider bid/ask and last-trade prices need not reflect one atomic order-book snapshot; disagreement should be documented rather than hidden.

**Diagnostic Investigator:** The strongest supported cause of the prior 404 is a process started before source modification. Recovery switched the Node PID to 19492. The remaining specific observation required is an *authenticated browser call to the real 4173 market endpoint*, showing exactly the reported provider results with timestamps and source links.

**Adversarial Collaboration / Blind Spots:** Test a stale process with current static assets, invalid consent, expired session, unavailable exchange, stale timestamp, one out-of-three missing quotes, rapid double-click, tab hiding, server restart during polling and wrong-process port ownership. Confirm every failure stops or displays uncertainty without fabricated prices or unauthorized mutation.

## Measurable trial protocol (no invented reliability percentage)

Log every future X3 run with a unique timestamp, source commit and **actual** values for:

| Metric | Definition | Promotion target |
|---|---|---|
| Code accuracy | Native test PASS / total + correct live endpoint behavior | No critical failures |
| Source fidelity | Valid provider observations / required observations, with timestamps | Report fraction, don't blend with code accuracy |
| Runtime correctness | Production signed-in browser request + rendered result + pause/resume behavior | Required for product acceptance |
| Preservation | Before/after hashes or revisions of account/inventory records; git diff; host PID | Zero unapproved mutations |
| Process coverage | Processes 1, 2 and 3 all produce actionable, nonduplicated evidence | 3/3 |
| Operator cost | Count distinct commands, manual interventions and assistant turns to reach a verified outcome | Compare with an explicitly recorded previous baseline |
| Reliability | Pass rate on independent runs, including failures/negative cases | **≥80% demonstrated**, zero critical evidence/security/preservation failures before promoting the X3 *method* |

**No first-attempt accuracy, time savings or reliability confidence is claimed for one run.** Retain failed attempts in the denominator, track repeated executions separately from independent unseen scenarios, and compare against an explicitly measured legacy procedure.

## Next experiment / acceptance

1. In the **already running production** app at `http://127.0.0.1:4173/`, log into the existing account, enable external research consent, start the live feed and capture actual response status, source timestamps and rendered prices. **Do not restart again merely to collect this evidence.**
2. Verify exactly three live responses or explicitly record partial/unavailable, confirm visible cards reflect real HTTP response, and observe an additional timed refresh. Stop the feed, hide the Azure Flow tab, and confirm no continuing quote polling and no stale quote displays.
3. Compare inventory/account file hashes or stable state revision before vs after, test denied consent and expired session on the real endpoint, and preserve the four preexisting local WinForms modifications.
4. Run X3 on at least several independent subsequent tasks and at least one *deliberate failure condition*. Record start/end times, prompts required, pass/fail and prevention of false greens. Judge against an actual baseline before concluding that X3 materially improves productivity.
5. If the browser acceptance or preservation check fails, keep **NOT_QUALIFIED**, investigate root cause and amend this ADR; do not merge to `dev` based on 113 passing unit tests or an isolated provider proof.

## Decision and follow-up

**Decision:** Retain X3 as an **experimental evidence/diagnostic workflow** because the first run provided the test baseline, real authorized source observations, and a concrete stale-runtime signal without stopping the production server. Follow-up restart restored source/runtime freshness according to local diagnostics.

**Verdict: METHOD_TRIAL_PASS; PRODUCTION_BROWSER_UNVERIFIED; IMPROVEMENT_UNMEASURED.** PR #47 remains draft. Update the evidence ledger after actual browser acceptance and several independent runs; only then evaluate promotion.

## Scope correction — 2026-11-22 (owner feedback)

The user clarified that the three-process command/report/clipboard pattern was **intended for the assistant's workflow**, not as a TowerFlow capability. Integrating general assistant orchestration into the team's application was a scope error. The production-login HTTP 401 from the attempted X3 acceptance is **not evidence that TowerFlow user authentication is broken**; it only establishes that the separately supplied CLI credentials were rejected or authentication could not be established on that call. No credential values were retained in evidence.

**Remediation:** Removed `tools/azure-flow-triple-pass.ps1` and `tools/azure-flow-production-x3.ps1` from this feature branch. The historical observations in this ADR remain for audit only; they are not instructions to install or reintroduce those scripts. The existing market-data adapter, authentication, frontend, and business logic are unchanged. The assistant must implement X3 by organizing its own work and reporting, without expanding the user's application or requesting credentials unless intrinsic to the user's product objective. The previous conclusion `METHOD_TRIAL_PASS` is narrowed to **FIRST DIAGNOSTIC CYCLE OBSERVED; PROCESS BENEFIT UNVERIFIED**.
