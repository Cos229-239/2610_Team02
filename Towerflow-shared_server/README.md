# TowerFlow Shared Server

This edition lets authorized teammates edit the **same inventory** from their browsers on one private network or VPN. It is an inventory app, not the 3D collaboration room. A single Node.js process owns the data; browser tabs receive live update notices and reload the latest stock. An edit begun before someone else's change is rejected for review instead of silently replacing their work.

## Start on the server computer

1. Install Node.js 20 or newer if necessary. Extract this ZIP into a folder you can write to, such as Documents.
2. In that folder, run `node server.js` as your normal user. Leave it running while teammates work. The default port is 4173; it needs no administrator/root permissions.
3. On the server computer, visit **http://127.0.0.1:4173/** and create the first owner account. Choose a unique username and a password of at least 12 characters. Initial owner setup works only from the server computer.
4. Open **Data & exports → Give someone access** and create an account for each teammate. Editors can manage inventory and their own password. Owners can also create/remove accounts, reset passwords, and restore a backup. Share each person's username and temporary password privately.
5. Teammates on the same private network or VPN visit **http://SERVER_PRIVATE_IP:4173/** and sign in. Replace `SERVER_PRIVATE_IP` with the host computer's IPv4 address shown in its network settings. If a firewall prompts, allow this server only on the private network.

The process listens on the computer's IPv4 network interfaces. It does not expose a collaboration room, source editor, arbitrary file API, command route, Win32 API, Registry access, or privilege-elevation feature. Do not expose this HTTP server directly to the public internet. HTTP does not encrypt passwords on a plain LAN; a trusted VPN is preferable if the network is not fully trusted.

## Shared work

- Products and parts: category, name, number, serial, revision, barcode, QR payload, price, minimum stock, search, exact scan, and six-digit serial generation.
- Stock by location: receive, remove, transfer, purchase, sale, bulk set/clear, low-stock alerts and movement history. A bulk set records the difference as a receipt or removal.
- Work orders plan jobs without changing stock. Purchase orders record pending supplier requests without changing stock; receiving once records a purchase and increases stock, while cancelling does not.
- Import older `parts.txt` and both `inventory.txt` formats, plus an optional `.business` name file. Existing data is previewed before import. An owner can restore a version 1 TowerFlow JSON backup; the shared server upgrades it to version 2 to retain orders and categories.
- Export JSON, CSV, and an offline HTML dashboard. Save `data/inventory.json`, `data/inventory.json.bak`, `data/accounts.json`, and `data/accounts.json.bak` when moving the server. Accounts use salted password hashes; live sign-in sessions are kept in memory and require signing in after a restart.

## Ask TowerFlow

Open **Assistant** in the sidebar to ask questions such as “Where is SKU-1?”, “What should we reorder?”, “Show recent movements”, or “Show pending purchase orders”. It reads the latest saved inventory and can suggest amounts needed to get above a product's minimum stock. It cannot create, edit, or delete anything. Questions are processed by this TowerFlow server but are not saved; the visible conversation exists only in that browser tab. If inventory changes after an answer, the panel asks you to run the question again.

This is a small **offline inventory assistant built from explicit rules**. It does not call a language model, require an API key, access the internet, or understand unrestricted questions. Answers are best checked against the inventory and order screens before making a decision.

The shared version 2 JSON file contains work and purchase orders. Older desktop or local-only editions do not understand those extra order fields, so **do not restore a shared backup into an older edition** if you need to keep the orders. Migrate from the older editions into this server instead.

`CONTRIBUTIONS.md` explains what was incorporated from each teammate. `SOURCE_AUDIT.csv` lists every file entry in the three supplied ZIPs and how it was treated. Run `npm test` for the included model and server checks.
