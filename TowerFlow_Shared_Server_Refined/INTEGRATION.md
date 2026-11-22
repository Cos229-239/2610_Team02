# TowerFlow integration map and team contributions

## At a glance: all five contributors

| Team member | Original contribution | How it is represented in this edition | Integration status |
| --- | --- | --- | --- |
| **Dayna Perez Colon** | Inventory item and input prototypes; validation, item display, category/price/quantity/minimum-stock ideas, and persistent-storage patterns. | Validated product forms and inventory model, category and price fields, minimum-stock settings, low-stock reporting, and saved inventory state. | **Adapted/reimplemented** — functionality retained, rather than shipping prototype code with syntax problems. |
| **Malik Brown** | Historical bulk-inventory and operations work: setting/clearing stock, work orders, supplier purchase orders, receipt handling, and oversell protection. | Bulk stock adjustment, work-order planning, pending purchase orders, one-time purchase-order receipt, cancellation, and prevention of sales beyond available stock. | **Adapted/reimplemented from historical work** — recovered through the Team 02 repository history rather than the visible final ZIP tree. |
| **Omarion Walter** | Newer C++ inventory system: products, barcode/QR handling, multiple locations, stock movement, purchases/sales, business identity, reporting, and dashboards. | Core product/stock/location/movement flow; barcode and QR payload lookup; purchasing and sales; company name; exports; offline HTML dashboard; older inventory import. | **Adapted/reimplemented** — platform-dependent Win32 and C++ UI code not shipped. |
| **William Jones** | Parts command-line system and Windows Forms app: creating/editing/searching parts, quantities/totals, part and serial/revision fields, serial generation, and parts-file storage. | Part/product editing and search, product number/serial/revision, stock totals, six-digit serial generator, and `parts.txt` import. | **Adapted/reimplemented** — console and WinForms screens replaced by browser screens. |
| **Daniel Dulsky** | Collaboration room, team workflows and the separately supplied `AzureStockGuide.cs` (offline parts guidance, low-stock search, sorting, and previewed quantity updates). | **Azure Stock Guide is now integrated** as a dedicated browser page and safe Node.js route, with read-only lookup and confirmed stock adjustments. His original C# is preserved under `reference/`. His 3D collaboration room/Git editor remain separate. | **Azure guide: adapted/reimplemented and tested.** **Collaboration room: reviewed/credited, not bundled.** |

## Detailed integration by person

### Dayna Perez Colon — inventory foundations and validation

- **Original work reviewed:** `InputVailidation.h`, `DisplayHelper.h`, `Logger.h`, `MainMenu.cpp`, and historical item/storage prototypes identified during the source review.
- **Integrated behaviors:** product name and category capture, price and stock-related fields, minimum-stock thresholds, input checks, persistent stock data, and clear inventory feedback in the browser.
- **Current implementation:** `lib/inventory.js` validates product and inventory inputs; `public/app.js` and the HTML pages present the forms and feedback; `server.js` saves the shared state.
- **Boundary:** terminal menus and prototype implementations were not shipped verbatim. Where original prototypes had syntax issues, their intended functionality was rebuilt in working Node/browser code.

### Malik Brown — bulk operations and ordering safeguards

- **Original work reviewed:** historical bulk-stock and operations code recovered in the Team 02 repository history, including work-order and supplier-order concepts.
- **Integrated behaviors:** bulk **set/clear** stock, work orders that plan activity without consuming stock, pending purchase orders, receipt of a purchase order **once**, purchase-order cancellation, and stock-safe sales.
- **Current implementation:** `lib/inventory.js` contains stock-setting, work-order, purchase-order, and inventory-movement operations. Their routes and UI are implemented in `server.js` and `public/app.js`.
- **Boundary:** the feature logic was reimplemented for the shared Node inventory model; the historical source was not included as an executable component. Pending purchase orders do not increase stock until received.

### Omarion Walter — inventory workflows, tracking, and reporting

- **Original work reviewed:** the newer C++ TowerFlow implementation, including `Product.h`, `Inventory.cpp`, `Inventory.h`, `Movement.h`, `FileStorage.cpp`, `Report.cpp`, `Report.h`, `DashboardPage.h`, and the application/UI code.
- **Integrated behaviors:** product records; barcodes and QR payloads; multiple stock locations; receiving, removal, transfer, purchase and sale movements; movement history; low-stock information; business identity; dashboard and export flows; legacy TowerFlow inventory import.
- **Current implementation:** `lib/inventory.js`, `lib/import-legacy.js`, `lib/report.js`, `server.js`, and the browser pages in `public/`.
- **Boundary:** original Windows-specific interfaces and build artifacts are not included. Reporting was recreated as exports and an offline HTML dashboard rather than carrying over the native UI.

### William Jones — parts workflows and legacy compatibility

- **Original work reviewed:** parts CLI and Windows Forms files, including `Part.cpp`, `PartActions.cpp`, `PartData.h`, `InputCheck.cpp`, `TowerFlow.cpp`, `TowerFlowGUI.cpp`, and the `TowerFlowWindow/TowerFlowWinForm/` project.
- **Integrated behaviors:** create/edit/search parts, track quantity and totals, keep part/product identifiers plus serial and revision fields, generate six-digit serials, and import legacy `parts.txt` records.
- **Current implementation:** the product/parts flows in `lib/inventory.js` and `public/app.js`, with legacy parsing in `lib/import-legacy.js`.
- **Boundary:** native WinForms controls, console menu code, executables, and direct Win32 APIs were not bundled; their inventory workflows are accessible in the browser.

### Daniel Dulsky — Azure Stock Guide and collaboration workstream

- **Original work reviewed:** Daniel's separately uploaded `AzureStockGuide.cs`, whose source header identifies Dulskinator96, plus the earlier `collaboration-room/` workstream (room UI/server, team updates, code/Git desk and tests).
- **Azure guide contribution:** the C# guide provides deterministic local commands: `help`, `low stock` (quantity ≤ 5), `find <name>`, `sort name`, `sort quantity`, `set <part#>/<serial#> to <quantity>`, and `add <part#>/<serial#> by <quantity>`. It specifies a **preview and confirmation** rather than executing changes on first request. Its original `Apply` routine checks the exact part identity, expected name, revision and quantity before calling William's `PartData.EditPart`.
- **Integrated behavior:** the **Azure Stock Guide** sidebar page supports these commands for shared inventory data. The adapter reads active products, including those without a part number for search/sort/low-stock results. Changes require a part and serial number, show a preview, and are applied only after a separate user confirmation. The shared-server port refuses ambiguous multi-location adjustments rather than guessing the location, and uses the normal inventory stock movement ledger instead of writing legacy `parts.txt` files.
- **Implementation files:** `lib/azure-guide.js` (server-side command interpreter and stock-change checks), `server.js` (`POST /api/azure-guide` and `POST /api/azure-guide/apply`), `public/index.html`, `public/app.js`, `public/styles.css` (sidebar, command entry, results, confirmation UI), `test/azure-guide.test.js` (unit and authenticated integration checks). The unchanged original is retained at `reference/AzureStockGuide.cs` for provenance; it is **not executed as C# by Node.js**.
- **Refinements in this edition:** `summary` for overall stock totals; `reorder` for items at/below their configured minimum plus suggested replenishment; broader `find` by name, category, part/serial, barcode, or QR; quick-action shortcuts; a clearer quantity preview; and an optional prepare-adjustment action in search results. These are shared-server enhancements based on, but not attributed as original source features of, Daniel’s C# guide. The old Ask TowerFlow panel, endpoint, source file and tests were removed.
- **Additional shared-server safeguards:** one-time preview identifiers tied to the signed-in user; five-minute preview expiry; server-side storage of proposed changes; conflict checks against the inventory revision; and movement history for quantity changes. These are compatibility/security adaptations of the shared-server implementation, not claims that Daniel authored this exact JavaScript source or the shared-server account system.
- **Collaboration room boundary:** Daniel's 3D collaboration room, Git editor, graphics/audio components and room server are still **not integrated** into this inventory edition. Their contribution remains acknowledged as a distinct workstream.
- **No cloud dependency:** despite its name, the Azure Stock Guide runs locally and does not require Microsoft Azure, a language model or external API. The former Ask TowerFlow/AURA-style assistant was removed at the user’s request; Azure Stock Guide is the only inventory guidance panel.

## Shared-server features created for this edition

These are **new consolidation-layer implementations**, not claimed as direct contributions from any one of the five original codebases:

| Feature | Current implementation | Purpose |
| --- | --- | --- |
| Private-network shared server | `server.js` | One server hosts the inventory for teammates using the same private network or VPN. |
| Accounts and permissions | `lib/accounts.js`, `server.js` | First-owner setup, user accounts, salted password hashes, sign-in sessions, and access control. |
| Concurrent edits and live notices | `server.js`, `public/app.js` | Revision checks help prevent stale edits; connected clients are notified when inventory changes. |
| Integration tests | `test/integration.test.js`, `test/azure-guide.test.js` | Verify shared-server workflows, absence of the removed assistant endpoint, and Daniel’s refined stock-guide port. |

## Feature-to-contributor reference

| Feature area | Contributor whose work informed it | Main current files |
| --- | --- | --- |
| Product fields, validation, categories, low-stock rules | Dayna Perez Colon; Omarion Walter | `lib/inventory.js`, `public/app.js` |
| Parts, serial/revision details, serial generator, `parts.txt` migration | William Jones | `lib/inventory.js`, `lib/import-legacy.js`, `public/app.js` |
| Bulk stock set/clear; work orders; supplier purchase orders | Malik Brown | `lib/inventory.js`, `server.js`, `public/app.js` |
| Barcodes/QR, locations, movements, purchases/sales, business data | Omarion Walter | `lib/inventory.js`, `server.js`, `public/app.js` |
| Exports and offline HTML dashboard | Omarion Walter | `lib/report.js`, `server.js` |
| Azure Stock Guide: low-stock, find, sorting and confirmed stock adjustments | Daniel Dulsky (original C# guide); shared-server port | `reference/AzureStockGuide.cs`, `lib/azure-guide.js`, `server.js`, `public/index.html`, `public/app.js`, `public/styles.css`, `test/azure-guide.test.js` |
| Collaboration room, Git/editor desk, room-based team workflows | Daniel Dulsky | **Reviewed upstream in `collaboration-room/`; intentionally not bundled here** |
| Shared accounts, revision protection, live notices | New shared-server consolidation | `lib/accounts.js`, `server.js`, `public/app.js` |

## Provenance, scope, and attribution notes

1. **Every teammate is recognized** for the work that can be supported by the reviewed sources; inclusion in the runtime is not the measure of a person's overall contribution.
2. **Adapted** means workflows or concepts were carried forward into new working code. It does not claim the current source is identical to, or exclusively authored by, the named teammate.
3. **Reviewed but excluded** means the source was examined and the contribution is documented, while the feature itself was deliberately left out of the shared inventory runtime.
4. The earlier archive review covered `2610_Team02.zip`, `Towerflow_OW.zip`, and `TowerFlowWinForm.zip`. The new `AzureStockGuide.cs` was supplied separately for this integration and is preserved in `reference/`; it is not part of the earlier archive-by-archive audit.
5. Generated build output, Windows-native interfaces, the separate collaboration-room system, and administrator/root-level actions are not bundled with this edition. Daniel’s original C# guide is included **only as non-executable reference source**, alongside its tested JavaScript adaptation.

