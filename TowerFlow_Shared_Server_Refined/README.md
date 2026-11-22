# TowerFlow Shared Server

This edition lets authorized teammates edit the **same inventory** from their browsers on one private network or VPN. It is an inventory app, not the 3D collaboration room. A single Node.js process owns the data; browser tabs receive live update notices and reload the latest stock. An edit begun before someone else's change is rejected for review instead of silently replacing their work.

## Start on the server computer

1. Install Node.js 20 or newer if necessary. Extract this ZIP into a folder you can write to, such as Documents.
2. In that folder, run `node server.js` as your normal user. Leave it running while teammates work. The default port is 4173; it needs no administrator/root permissions.
3. On the server computer, visit **http://127.0.0.1:4173/** and create the first owner account **if the data directory is new**. Choose a unique username and a password of at least 12 characters. Initial setup works only from the server computer. **If an existing `data/accounts.json` is included**, the accounts are already initialized: use an existing account, or consult the workspace owner, instead of creating another first owner.
4. Open **Data & exports → Give someone access** and create an account for each teammate. Editors can manage inventory and their own password. Owners can also create/remove accounts, reset passwords, and restore a backup. Share each person's username and temporary password privately.
5. Teammates on the same private network or VPN visit **http://SERVER_PRIVATE_IP:4173/** and sign in. Replace `SERVER_PRIVATE_IP` with the host computer's IPv4 address shown in its network settings. If a firewall prompts, allow this server only on the private network.

The process listens on the computer's IPv4 network interfaces. It does not expose a collaboration room, source editor, arbitrary file API, command route, Win32 API, Registry access, or privilege-elevation feature. Do not expose this HTTP server directly to the public internet. HTTP does not encrypt passwords on a plain LAN; a trusted VPN is preferable if the network is not fully trusted.

## AI Advancement v1 — explainable inventory decision model

The **7-day outlook** quick action in **Azure Stock Guide** invokes `forecast`. Use `forecast bolt` or `forecast 115/902701` to narrow by product. This computes a **read-only**, reproducible planning estimate from the existing sales ledger. It does **not** call an LLM, does not train a statistical learner, does not change inventory, and does not automatically create purchase orders.

The model requires **14 days of recorded movement history for each product** and sales on **three distinct days** before estimating a constant seven-day demand rate. Without those minimum signals it returns `INSUFFICIENT_DATA` instead of making up a projection. It ignores movements such as transfers/removals when estimating demand. If evidence passes, it shows actual sales, observed time, projected units, suggested replenishment and the arithmetic behind the recommendation. These estimates are **not validated demand forecasts**, and no calibrated confidence is claimed.

Code: `lib/decision-model.js` (pure inference), `lib/azure-guide.js` (existing authenticated command route), `public/` (guide interface). Verification: `test/decision-model.test.js`, `test/decision-model-route.test.js`, existing `npm test`. See `CURRENT_HANDOFF.md` section 8 for evidence and Trello/Git workflow. This feature merged into shared `dev` through **PR #41**, merge commit `0c18aea9adcf3b24337f035b84f75adc50bafc6b`. Dedicated model CI and shared JavaScript checks passed. Separate native Linux inventory CI still has an existing unrelated failure; live browser acceptance remains outstanding.

## Shared work

- Products and parts: category, name, number, serial, revision, barcode, QR payload, price, minimum stock, search, exact scan, and six-digit serial generation.
- Stock by location: receive, remove, transfer, purchase, sale, bulk set/clear, low-stock alerts and movement history. A bulk set records the difference as a receipt or removal.
- Work orders plan jobs without changing stock. Purchase orders record pending supplier requests without changing stock; receiving once records a purchase and increases stock, while cancelling does not.
- Import older `parts.txt` and both `inventory.txt` formats, plus an optional `.business` name file. Existing data is previewed before import. An owner can restore a version 1 TowerFlow JSON backup; the shared server upgrades it to version 2 to retain orders and categories.
- Export JSON, CSV, and an offline HTML dashboard. Save `data/inventory.json`, `data/inventory.json.bak`, `data/accounts.json`, and `data/accounts.json.bak` when moving the server. Accounts use salted password hashes; live sign-in sessions are kept in memory and require signing in after a restart.

## Azure Stock Guide — Daniel Dulsky's contribution

Select **Azure Stock Guide** in the sidebar after signing in. This page integrates the behavior of Daniel Dulsky's supplied C# `AzureStockGuide.cs`, adapted for the shared Node.js server. The unchanged C# source is preserved in `reference/AzureStockGuide.cs` for attribution and is **not compiled or executed** by the server.

Supported commands:

- `help` — list guide commands.
- `summary` — show counts for active products, total units, low stock (≤ 5), and items at/below each product’s minimum.
- `reorder` — list products at or below their **configured minimum** and show suggested quantities to reach one unit above minimum.
- `low stock` — list products with **5 or fewer** total units (distinct from each product's configurable minimum-stock threshold).
- `find bolt`, `find BOLT-115`, `find 115/902701`, `sort name`, `sort quantity` — search by product name, category, barcode, QR code, part/serial pair or sort the current active catalog.
- `set 115/902701 to 10` — preview setting a numbered part/serial pair to 10 units.
- `add 115/902701 by 5` — preview adding 5 units to the identified part.

Use quick-action buttons to run common commands; search results have a **Prepare adjustment** link for eligible single-location numbered parts (it fills the command field without running or saving). The preview displays current, proposed and difference quantities. To save a change, choose **Confirm stock change** after reviewing the preview and accepting the confirmation dialog. Previews are valid for **five minutes**, are tied to the signed-in account, work **only once**, and fail if the inventory has changed. The guide never takes an arbitrary product name as a stock-change target; a unique part number and serial number are required. Parts stored in multiple locations must be adjusted using **Inventory → Set stock** so you can choose the location explicitly. Quantities are restricted to **0–1,000,000** within this guide; broader regular stock operations use the existing inventory validation rules.

Confirmed changes use the existing movement ledger (receive/remove), shared inventory file and normal live-update notices. No Azure account, cloud API, AI model, script runner or source-code editor is required. The older **Ask TowerFlow** assistant, its endpoint, and its code were intentionally removed. **Azure Stock Guide is the only inventory guidance panel**; it uses fixed commands, not unrestricted conversation.

The shared version 2 JSON file contains work and purchase orders. Older desktop or local-only editions do not understand those extra order fields, so **do not restore a shared backup into an older edition** if you need to keep the orders. Migrate from the older editions into this server instead.

`CONTRIBUTIONS.md` and `INTEGRATION.md` document what was incorporated from each teammate, including Daniel’s Azure Stock Guide. `SOURCE_AUDIT.csv` lists every file entry in the three supplied ZIPs and how it was treated. Run `npm test` for the included model and server checks.

## Azure one-click insights (proposed)

Select **Azure Stock Guide → Generate insights**. The default view contains three collapsed cards: **Inventory**, **Market · stocks & shares**, and **Recommended next step**. Existing stock search, preview, forecast and confirmation tools stay available in the collapsed **Stock Guide tools** section; nothing is removed or changed automatically.

Inventory and suggestions come directly from the server's authenticated inventory state and deterministic decision model. The button is **read-only**; no model, account, stock adjustment, purchase order or credentials are required.

Market context uses a small fixed example watchlist (SPY, AAPL, MSFT), **not the user's personal holdings**. An optional no-key Stooq daily CSV source is attempted only when the button is clicked, with a short timeout and 30-minute server-side cache. Data is labeled by the actual close date and provider; stale, blocked, malformed or unavailable quotes are **not presented as prices**. Stooq can restrict automated access or require credentials, so market availability is not guaranteed. This is neither real-time market data nor investment advice. No paid feed or key is installed.

Acceptance needed before promotion: full Node test suite, real browser click and no-clutter check, existing Azure stock preview/confirmation regression, authenticated route check, and market-source unavailable state. The new UI is proposed on a feature branch until reviewed and merged.
