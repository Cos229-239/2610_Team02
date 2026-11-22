# TowerFlow Shared Server

This edition lets authorized teammates edit the **same inventory** from their browsers on one private network or VPN. It is an inventory app, not the 3D collaboration room. A single Node.js process owns the data; browser tabs receive live update notices and reload the latest stock. An edit begun before someone else's change is rejected for review instead of silently replacing their work.

## Start on the server computer

1. Install Node.js 20 or newer if necessary. Extract this ZIP into a folder you can write to, such as Documents.
2. In that folder, run `node server.js` as your normal user. Leave it running while teammates work. The default port is 4173; it needs no administrator/root permissions.
3. On the server computer, visit **http://127.0.0.1:4173/** and create the first owner account **if the data directory is new**. Choose a unique username and a password of at least 12 characters. Initial setup works only from the server computer. **If an existing `data/accounts.json` is included**, the accounts are already initialized: use an existing account, or consult the workspace owner, instead of creating another first owner.
4. Open **Data & exports → Give someone access** and create an account for each teammate. Editors can manage inventory and their own password. Owners can also create/remove accounts, reset passwords, and restore a backup. Share each person's username and temporary password privately.
5. Teammates on the same private network or VPN visit **http://SERVER_PRIVATE_IP:4173/** and sign in. Replace `SERVER_PRIVATE_IP` with the host computer's IPv4 address shown in its network settings. If a firewall prompts, allow this server only on the private network.

The process listens on the computer's IPv4 network interfaces. It does not expose a collaboration room, source editor, arbitrary file API, command route, Win32 API, Registry access, or privilege-elevation feature. Do not expose this HTTP server directly to the public internet. HTTP does not encrypt passwords on a plain LAN; a trusted VPN is preferable if the network is not fully trusted.

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
