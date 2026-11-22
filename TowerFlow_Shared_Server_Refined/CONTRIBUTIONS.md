# TowerFlow Team 02 — Contributions and integration

This document recognizes all five team members and explains how their work relates to the **TowerFlow Shared Server**. *Adapted/reimplemented* means the team’s features or design were carried into working Node.js/browser code; it does not mean their earlier source files were copied verbatim or that the named contributor authored all subsequent integration code.

| Team member | Work contributed | In the shared server | Status |
| --- | --- | --- | --- |
| **Dayna Perez Colon** | Inventory item foundations, display/input validation, category, price, quantity, low-stock threshold and storage ideas. | Product data validation, category and minimum-stock fields, browser forms and persistent inventory. | **Adapted/reimplemented** |
| **Malik Brown** | Bulk inventory controls and business operations, including planned work, supplier orders and oversell safeguards. | Bulk set/clear stock, work orders, pending purchase orders, receive-once behavior, safe sales. | **Adapted/reimplemented** |
| **Omarion Walter** | C++ inventory system with products, barcode/QR scanning, locations, movements, purchasing/sales, dashboards and reports. | Main stock/location ledger, codes and scanning, trade movements, dashboard, exports and legacy imports. | **Adapted/reimplemented** |
| **William Jones** | Parts CLI and Windows Forms inventory manager: part and serial identifiers, revisions, add/edit/search, totals and parts storage. | Part/serial/revision fields, parts management, serial generator and `parts.txt` imports. | **Adapted/reimplemented** |
| **Daniel Dulsky** | Collaboration room and team collaboration workflows **plus the supplied `AzureStockGuide.cs`**, a local stock guide supporting low-stock detection, search, sorting and previewed quantity changes. | Dedicated **Azure Stock Guide** browser page, supported by `lib/azure-guide.js` and authenticated server routes. Confirmed adjustments are recorded in stock history. | **Azure guide integrated/adapted**; 3D collaboration room/Git desk remain separate and credited. |

## Daniel Dulsky — new Azure Stock Guide integration

The separately provided `AzureStockGuide.cs` was written for William’s WinForms parts manager and uses `Part` and `PartData` types that do not exist in the shared Node.js application. Rather than shipping nonfunctional C# inside a JavaScript runtime, its command behavior has been **ported and made usable** in the browser:

- `help`, `low stock` (5 units or fewer), `find <name>`, `sort name` and `sort quantity` provide local inventory guidance without an external AI service.
- `set <part#>/<serial#> to <quantity>` and `add <part#>/<serial#> by <quantity>` prepare a preview for a uniquely identified active part, never immediately saving it.
- A separately confirmed request applies the change through the existing stock system, recording a **receive** or **remove** movement. The shared server rechecks product identity and quantity, requires the current inventory revision, uses a one-time user-bound preview valid for five minutes, and rejects ambiguous multi-location edits.
- Source and verification: `reference/AzureStockGuide.cs` (Daniel’s unchanged source, for reference), `lib/azure-guide.js` (Node port), `server.js` (authenticated routes), `public/index.html` / `public/app.js` / `public/styles.css` (UI), and `test/azure-guide.test.js` (tests).

**Attribution distinction:** Daniel provided the stock-guide behavior and its C# preview/confirm design. The HTTP routes, browser implementation and additional revision/expiry safeguards were created to integrate that design into this edition. Those integrations are not presented as Daniel’s unmodified original code.

Daniel’s earlier **collaboration-room/server, Git editor and team workflow** contribution continues to be recognized. Those components remain outside this ZIP; they have not been portrayed as stock-server functionality.

## Other integrated work and shared-server additions

Dayna, Malik, Omarion and William’s contributions remain in the working shared inventory, as listed above. Shared accounts, live-update notifications, centralized storage and revision protection were built for this edition. The former **Ask TowerFlow** assistant has been removed. **Azure Stock Guide** is now the only inventory guidance panel. The shared-server adaptation adds `summary`, `reorder`, search by part/serial or barcode, better quick actions, and a clearer preview; these additions are integration work, not claims about Daniel’s original C# implementation.

