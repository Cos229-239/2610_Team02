# Malik Brown — shared inventory operations handoff

## What this changes

Adds **Malik’s operations** to the shared browser app’s sidebar. It groups terminal options 6–15 and opens the existing authenticated forms with the selected product. It does not create another inventory database or replace teammates’ modules.

The baseline is Team 02 `dev` commit `58c459af362590ce1359340a2efcdcb7b6586011`, read on November 22, 2026. The baseline’s contribution records already credit Malik’s bulk stock, work orders, supplier requests and stock-safe sales as adapted JavaScript implementations. This change makes that work easier to find and exercise.

Only these files change:

- `public/index.html`: sidebar entry and operations panel with product selector and dashed product list.
- `public/app.js`: shortcuts into existing stock, movement and order forms; supplier-form save feedback fix.
- `public/styles.css`: scoped panel and selector styling.
- `test/malik-operations.test.js`: shared API regression tests.
- `MALIK-HANDOFF.md`: this handoff.

## Feature map

| Terminal option | Shared browser action | Stock effect |
| --- | --- | --- |
| 6 Create bulk | Add units | Adds units after saving a Receive movement. |
| 7 List bulk | List stock / available products | Read only; shows stock by location. |
| 8 Edit bulk | Set / clear stock | Sets the chosen location to the entered total. |
| 9 Delete bulk | Set / clear stock, quantity 0 | Clears that location, retaining product and movement history. |
| 10 Create work order | Plan a job | Planning only; no reservation or deduction. |
| 11 Edit work order | Manage orders → Edit | Changes planned work only. |
| 12 Delete work order | Manage orders → Delete | Deletes a plan only, after confirmation. |
| 13 Purchase part | Receive purchase | Adds units and records the supplier and price. |
| 14 Purchase order | Request goods | No stock change until Orders → Receive; receiving once adds stock. Cancel adds nothing. |
| 15 Create sale | Record sale | Deducts available units at the selected location; overselling is rejected. |

## Bug fixed and why

The supplier request handler accessed `event.currentTarget` after awaiting the network response. DOM events clear `currentTarget` after dispatch, so a successful save could be followed by a reset error. The handler now captures the form before awaiting and resets that saved reference. This is a browser feedback fix; no server stock rules changed.

## Try it with test data

1. Start the app with `node server.js` from this project folder using a new local data directory. Create a local owner account with a password of at least 12 characters. This account belongs only to your preview data.
2. In **Inventory**, add a sample product with barcode `CABLE42`; leave optional numeric part/serial fields empty if they are not needed.
3. Open **Malik’s operations**. Select the product and **Add units**. Receive 10 into `Main`.
4. **Set / clear stock** to 12. Open it again, enter 99 and Cancel. Stock must remain 12.
5. **Plan a job** for 3 units. Create/edit/delete it in Orders; stock must remain 12.
6. **Request goods** for 5 units. Creating the request leaves stock at 12. Receiving it once into Main makes 17; a second receipt is not offered.
7. **Receive purchase** for 2 units makes 19. **Record sale** for 3 from Main makes 16. A sale of 100 must fail without changing inventory.
8. Reload and open a second signed-in browser session against the same preview server. Both should see the same server-owned stock.

## Validation

- All **19** Node tests passed, including all 17 existing tests and two new shared API workflow tests.
- Isolated headless-browser checks passed for the operations entry, product selection, bulk add/set, dialog cancellation, work create/edit, purchase-order creation/receipt, direct purchases, sales/oversales, reload persistence, independent sessions/live updates, and mobile layout.
- Browser checks used only localhost, temporary accounts and temporary data; external requests were blocked.
- The original 17-test baseline passed before the new tests were added. No C++ or Windows GUI checks were performed for this browser-only patch.

Run `npm test` or the equivalent `node --test` from `TowerFlow_Shared_Server_Refined/`. Node.js 20+ is required; the app has no npm package dependencies.

## Compatibility still to address

- The shared app uses internal numeric product IDs and numeric legacy part/serial fields. Its barcode/SKU supports text such as `CABLE42`, but this patch does **not** migrate Malik’s alphanumeric Part ID field or preserve a 20-digit serial in the numeric serial field. Do not convert long serials to JavaScript numbers. That needs a separately reviewed schema/legacy-guide compatibility change.
- The previous browser-only `towerflow-inventory-v1` JSON is a different schema. Do not use it as a shared-server restore file. No migration of existing local inventory is included.
- Native `/back` text handling is not copied into every shared form. Existing modal forms support Cancel and Escape; inline order forms retain the shared app’s existing behavior.
- The quick actions do not send supplier requests or process payments outside TowerFlow.

## Private-room boundary

The private 3D collaboration room is separate from this shared inventory app. This work does not access or modify it, its repository, credentials, scripts, deployment or network settings. Loading this authenticated Node application in that room would be a later room-owner decision, including its URL, authentication and embedding policy. A static-file import is not a deployment of this shared server.

Submit this change on its feature branch through a pull request targeting `dev`. A teammate should review and repeat the demonstration before merging. Deployment remains a separate inventory-server-owner action; this change does not deploy anything or access the private room.
