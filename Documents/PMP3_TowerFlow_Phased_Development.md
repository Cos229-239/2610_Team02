# PMP3 TowerFlow: Phased API and Cloud Development

## Purpose

Build forward from the working portfolio CLI without destabilizing the daily-driver version. The meeting review called for a phased migration: prove functionality in the CLI first, then add service/API and web layers. Keep each phase independently runnable and reviewable; do not build the CLI, server, and GUI simultaneously.

## Current evidence and boundary

**Implemented in the current branch:** a C++ CLI portfolio foundation and a versioned local-file persistence change in `towerflow.dat`.

**Not yet implemented or verified:** an HTTP API, external market-data provider, cloud database, hosted deployment, multi-user SaaS authentication, or a web/GUI client connected to the C++ portfolio. This document is a development contract, not a claim that these systems already exist.

## Target architecture

```text
CLI client ───────┐
                  ├──> Portfolio API/service ──> Portfolio repository ──> Database
Web/GUI client ───┘              │
                                 ├──> Market-data provider adapter (optional)
                                 └──> Health, audit, and operational logs

Local development: API + local database/file, no cloud dependency required.
Hosted phase: TLS + authenticated API + managed database + secret configuration.
```

The service becomes the single authority for portfolio rules. Clients request actions and display returned state; they do not maintain separate competing copies of cash, holdings, or transaction truth.

## Phase 1 — Stabilize the CLI (current)

**Goal:** prove the portfolio rules and data survive normal use before adding network complexity.

- Keep buy, sell, deposit, price update, valuation, and transaction history available through the CLI.
- Persist cash, positions, cost basis, current prices, and transaction history.
- Reject invalid values and trades that exceed available cash or held shares.
- Verify saved state across close/relaunch; verify invalid save files are not silently overwritten.
- Keep the current build runnable while the next phase is developed separately.

**Exit gate:** build succeeds; a repeatable smoke test proves deposit/buy/sell, valuation, and history survive a relaunch. Record any known calculation limitations.

## Phase 2 — Introduce a local API/service

**Goal:** expose the same business rules through a documented interface before introducing cloud deployment or a GUI rewrite.

Use a versioned REST-style contract. These routes are proposed and are **not implemented yet**:

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Service health and version; no secrets |
| GET | `/api/v1/portfolio` | Cash, market value, invested cost, total value, unrealized P/L |
| GET | `/api/v1/positions` | Current positions, quantities, prices, cost basis, valuation |
| GET | `/api/v1/transactions` | Ordered transaction history with timestamps |
| POST | `/api/v1/transactions` | Validated buy, sell, or deposit command |
| PATCH | `/api/v1/positions/{symbol}/price` | Update a price from an explicitly identified source |

### Contract rules

- Use JSON requests and responses with consistent error objects, such as `{ "error": { "code": "INSUFFICIENT_CASH", "message": "..." } }`.
- Validate finite, positive prices and quantities server-side; never trust client-supplied totals or balances.
- The service calculates cash movements, cost basis, portfolio value, and transaction totals.
- Use a unique request/idempotency key for transaction writes before clients retry network requests, so a retry cannot duplicate a trade.
- Keep market quotes separate from trade transactions: a quote refresh changes valuation, not cash or share quantity.
- Make the data repository a replaceable boundary so local storage can be replaced with a database without rewriting portfolio rules.
- Select and document the HTTP framework only when Phase 1 passes; prefer the smallest maintainable option compatible with the existing C++/Visual Studio project.

**Exit gate:** automated local API tests prove health, read operations, valid writes, invalid writes, and repeated-request safety. CLI behavior remains usable and agrees with API-returned state.

## Phase 3 — Add external API integrations

**Goal:** allow optional market data without making the core portfolio depend on a provider.

- Define a `MarketDataProvider` boundary (symbol → price, provider, quote timestamp, status).
- Start with a deterministic fake/mock provider for offline tests.
- Add a real provider only after choosing its terms, limits, symbols, and credentials.
- Read API keys from environment/secret configuration; never commit keys, tokens, or private endpoints.
- Handle timeouts, rate limits, unavailable symbols, stale quotes, and provider errors without corrupting portfolio state.
- Label provider prices with their source and retrieval time. Do not represent mock prices as live market data.

**Exit gate:** tests pass offline with the mock provider, and provider failures leave cash, holdings, and transaction history unchanged.

## Phase 4 — Cloud backend and durable database

**Goal:** make the service accessible beyond one machine while preserving ownership and data integrity.

- Move the API behind HTTPS/TLS and a controlled deployment environment.
- Replace local file persistence with a transactional database through the repository boundary; choose a managed SQL database only after the local API contract is stable.
- Store credentials in the hosting platform's secret store/environment configuration, never in source control.
- Add authentication before exposing private portfolios. Enforce authorization on every portfolio and transaction request.
- For future SaaS/multiple users, scope every portfolio row and request to an authenticated owner/tenant; do not rely on a client-supplied owner ID.
- Add schema migrations, backup/restore testing, structured logs with sensitive data redacted, health checks, and documented recovery steps.
- Set resource limits and request validation; avoid exposing administrative or database ports publicly.

**Exit gate:** a deployed test environment passes authenticated read/write tests, denies cross-user access, survives service restart, and proves backup restoration. Cloud deployment is not considered complete just because a URL responds.

## Phase 5 — Web/GUI client

**Goal:** move the interface to the service rather than maintaining separate business logic.

- Keep the existing dashboard as the visual reference and migrate one workflow at a time.
- Replace client-side portfolio mutations with calls to the same API used by the CLI.
- Keep loading, empty, validation, offline, authentication, and server-error states visible.
- Do not remove or replace the CLI until the web client passes the same portfolio acceptance tests.
- Avoid duplicating the portfolio calculation rules in JavaScript and C++; the service remains authoritative.

**Exit gate:** the CLI and web/GUI show the same portfolio after the same actions; refresh/relogin does not lose committed data; error paths are tested.

## Phase 6 — Operational readiness and review

- Add integration tests across client → API → database.
- Add a reproducible build/test procedure and a small deployment checklist.
- Capture review evidence for working behavior, not merely screenshots of source code or a successful build.
- Keep a short change log and demonstrate the phase's acceptance gate at build reviews.
- Continue the PMP2 process: daily stand-ups, Trello tracking, Git commits on `DanielPersonal`, and build reviews. Merge upward only through the team's agreed review process.

## Immediate next actions

1. Build and smoke-test Phase 1 persistence locally; do not claim it passed until the saved state is reloaded and compared.
2. Write tests around the portfolio rules and persistence format.
3. Choose the smallest local API implementation path and implement Phase 2 against the proposed contract.
4. Only after local API tests pass, select the external quote provider and cloud deployment/database options.
5. Connect the GUI after it can consume the stable API.

**Non-goal for the immediate step:** do not introduce cloud hosting, paid API dependencies, or a parallel GUI rewrite before the local CLI and service boundaries are verified.
