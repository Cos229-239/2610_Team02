# Team 02 contribution review

| Teammate | Reviewed work | What the shared inventory uses |
| --- | --- | --- |
| **Dayna Perez Colon** | Created inventory item, input validation, display, and storage prototypes. The app carries forward category, price, quantity, low-stock threshold, validation, and persistent storage as new working code. |
| **Malik Brown** | Built bulk stock and operations code. The app includes set/clear stock, work orders, pending supplier orders, receiving an order once, and checks against selling more stock than is available. |
| **Omarion Walter** | Built the newer C++ inventory system: products, barcodes and QR codes, locations, stock movements, purchases and sales, business identity, reports, and dashboard features. These form much of the app’s inventory workflow. |
| **William Jones** | Worked on the parts console and Windows Forms version. The app includes part creation and editing, search, totals, part/serial/revision fields, six-digit serial generation, and import of the older parts file. |
| **Daniel Dulsky** | Worked extensively on the team’s collaboration room and contribution workflow. |
He is credited in the app, but the room and Git editing features remain separate because it was too diffcult to mix the inventory application and collaboration room into one program. The shared app’s account access and live updates were built for inventory use.

The app contains no direct Win32 binding, OS command execution, Registry access, or administrator/root requirement. Accounts and real-time notices are for shared stock editing, not for the collaboration room.
