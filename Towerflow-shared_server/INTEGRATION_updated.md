# TowerFlow integration map and team contributions

## At a glance: all five contributors

| Team member | Original contribution | How it is represented in this edition | Integration status |
| --- | --- | --- | --- |
| **Dayna Perez Colon** | Inventory item and input prototypes; validation, item display, category/price/quantity/minimum-stock ideas, and persistent-storage patterns. | Validated product forms and inventory model, category and price fields, minimum-stock settings, low-stock reporting, and saved inventory state. | **Adapted/reimplemented** — functionality retained, rather than shipping prototype code with syntax problems. |
| **Malik Brown** | Historical bulk-inventory and operations work: setting/clearing stock, work orders, supplier purchase orders, receipt handling, and oversell protection. | Bulk stock adjustment, work-order planning, pending purchase orders, one-time purchase-order receipt, cancellation, and prevention of sales beyond available stock. | **Adapted/reimplemented from historical work** — recovered through the Team 02 repository history rather than the visible final ZIP tree. |
| **Omarion Walter** | Newer C++ inventory system: products, barcode/QR handling, multiple locations, stock movement, purchases/sales, business identity, reporting, and dashboards. | Core product/stock/location/movement flow; barcode and QR payload lookup; purchasing and sales; company name; exports; offline HTML dashboard; older inventory import. | **Adapted/reimplemented** — platform-dependent Win32 and C++ UI code not shipped. |
| **William Jones** | Parts command-line system and Windows Forms app: creating/editing/searching parts, quantities/totals, part and serial/revision fields, serial generation, and parts-file storage. | Part/product editing and search, product number/serial/revision, stock totals, six-digit serial generator, and `parts.txt` import. | **Adapted/reimplemented** — console and WinForms screens replaced by browser screens. |
| **Daniel Dulsky** | Collaboration-room work and team contribution workflows, including room/server, Git/code-desk, team-updates, and collaboration tooling. | **Recognized in the project documentation and source audit.** His collaboration-room features were reviewed as a separate workstream; the shared inventory application does **not** embed the 3D room or Git editor. | **Reviewed and credited; separate/not bundled** — not presented as if his room code is part of the inventory server. |

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

### Daniel Dulsky — collaboration and team workflow workstream

- **Original work reviewed:** the substantial `collaboration-room/` workstream in the Team 02 archive: room UI and server, input/movement code, team-update features, editor/Git desk and supporting tests. The source audit links this workstream to Daniel using repository history.
- **Contribution to the project:** development of a distinct collaboration experience and teamwork/contribution workflow, which remains important work even though the inventory edition has a narrower scope.
- **Integration decision:** **the 3D collaboration room, Git source editor, graphics/audio layers, and its room server are not integrated into this inventory application**. This avoids misrepresenting those components as functional features of the shared stock server.
- **Related but new functionality:** `lib/accounts.js` and `server.js` provide inventory-specific account access, revision checks, and live stock-update notices. They were built as part of the shared-server consolidation and should **not** be attributed to Daniel's room code without evidence of a direct port.
- **Future integration boundary:** the collaboration-room system may be maintained as a separate application or considered for future integration, but it is not part of this ZIP's current runtime.

## Shared-server features created for this edition

These are **new consolidation-layer implementations**, not claimed as direct contributions from any one of the five original codebases:

| Feature | Current implementation | Purpose |
| --- | --- | --- |
| Private-network shared server | `server.js` | One server hosts the inventory for teammates using the same private network or VPN. |
| Accounts and permissions | `lib/accounts.js`, `server.js` | First-owner setup, user accounts, salted password hashes, sign-in sessions, and access control. |
| Concurrent edits and live notices | `server.js`, `public/app.js` | Revision checks help prevent stale edits; connected clients are notified when inventory changes. |
| Offline AURA-style inventory assistant | `lib/assistant.js`, `server.js`, `public/app.js` | Rule-based, read-only answers about products, stock, locations, movements, reorders, and orders. No external model or API key. |
| Integration tests | `test/integration.test.js`, `test/assistant.test.js` | Verify shared-server workflows and offline assistant behavior. |

## Feature-to-contributor reference

| Feature area | Contributor whose work informed it | Main current files |
| --- | --- | --- |
| Product fields, validation, categories, low-stock rules | Dayna Perez Colon; Omarion Walter | `lib/inventory.js`, `public/app.js` |
| Parts, serial/revision details, serial generator, `parts.txt` migration | William Jones | `lib/inventory.js`, `lib/import-legacy.js`, `public/app.js` |
| Bulk stock set/clear; work orders; supplier purchase orders | Malik Brown | `lib/inventory.js`, `server.js`, `public/app.js` |
| Barcodes/QR, locations, movements, purchases/sales, business data | Omarion Walter | `lib/inventory.js`, `server.js`, `public/app.js` |
| Exports and offline HTML dashboard | Omarion Walter | `lib/report.js`, `server.js` |
| Collaboration room, Git/editor desk, room-based team workflows | Daniel Dulsky | **Reviewed upstream in `collaboration-room/`; intentionally not bundled here** |
| Shared accounts, revision protection, live notices | New shared-server consolidation | `lib/accounts.js`, `server.js`, `public/app.js` |
| Offline stock assistant | New shared-server consolidation | `lib/assistant.js`, `test/assistant.test.js` |

## Provenance, scope, and attribution notes

1. **Every teammate is recognized** for the work that can be supported by the reviewed sources; inclusion in the runtime is not the measure of a person's overall contribution.
2. **Adapted** means workflows or concepts were carried forward into new working code. It does not claim the current source is identical to, or exclusively authored by, the named teammate.
3. **Reviewed but excluded** means the source was examined and the contribution is documented, while the feature itself was deliberately left out of the shared inventory runtime.
4. The archive review covered `2610_Team02.zip`, `Towerflow_OW.zip`, and `TowerFlowWinForm.zip`. `SOURCE_AUDIT.csv` records dispositions of individual archived files; `CONTRIBUTIONS.md` summarizes the five-person review. Some ownership evidence comes from repository history rather than a filename alone.
5. Generated build output, teaching/reference material, Windows-native interfaces, the separate collaboration-room system, and administrator/root-level actions are not bundled with this edition.

For runtime setup and limits, see `README.md`. For individual file-by-file dispositions and evidence, see `SOURCE_AUDIT.csv`.
