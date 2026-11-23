# Azure Flow domain glossary

This is vocabulary only. Architecture and behavioral requirements belong in the blueprint and ADRs.

- **TowerFlow** — Team 02's shared inventory application for catalog, stock by location, movements, orders, accounts and reporting.
- **Azure Stock Guide** — Existing deterministic inventory command and controlled stock-adjustment interface. It is not Microsoft's Azure cloud.
- **Azure Flow** — A separate, business-facing intelligence workspace that consumes the shared TowerFlow inventory record without changing existing tabs' functions.
- **Status quo** — The application's observed current features and verified operational constraints, not a promise of future functionality.
- **Capability harness** — A small, bounded controller that selects from enumerated actions, validates inputs and limits outputs.
- **Evidence** — A specific recorded business fact or reproducible calculation that supports a conclusion.
- **Evidence hash** — A SHA-256 fingerprint of a returned analysis; it detects changed results but is not a signed certification of truth.
- **Sales trajectory** — Historical recorded gross sales grouped by month; not profit and not an automatic future forecast.
- **Market observation** — A price and observation date supplied by the user or legitimately imported from a licensed source; not a live quote unless sourced and verified as live.
- **Holding** — An entry containing share quantity and cost/observation prices for analysis. It is not a brokerage position or executable trade.
- **Recommendation** — A contextual action to review; it does not authorize changes to stock, purchases, advertising or securities.
- **Business scale band** — Product roadmap grouping for smaller businesses, growing enterprises or multi-location market franchises. Not a subscription price or proof of annual revenue.
- **Consent-based campaign** — Advertising based on data customers or organizations intentionally provide with appropriate permission; not passive telephone surveillance.
- **Read-only frontier** — An intelligence experience that can analyze but cannot mutate other tabs' records through its harness.
