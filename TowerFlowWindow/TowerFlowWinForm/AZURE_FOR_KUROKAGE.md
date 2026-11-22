# KuroKage TowerFlow — Azure Stock Guide
**Contributor:** Dulskinator96 — Azure  
**Owner / application:** Lopobunnie (William), `TowerFlowWindow/TowerFlowWinForm`  
**Status:** Source integrated into GitHub `dev`. Windows build and GUI acceptance still need verification.

## Quickest route: already using team dev

1. In **GitHub Desktop**, open `Cos229-239/2610_Team02`. Select **dev** under Current Branch, then **Fetch origin → Pull origin**.
2. In **Visual Studio Community** (with **.NET desktop development** and **.NET 10**), open `TowerFlowWindow/TowerFlowWinForm/TowerFlowWinForm.slnx`.
3. Press **F5** (debug) or **Ctrl+F5** (run). Look for the panel at the **bottom** titled **KuroKage — Azure Stock Guide | Dulskinator96: Azure**. You do **not** need to paste code, install a package, run a server, or edit the Registry.

> Save or commit your own local changes before changing branches. If GitHub Desktop reports conflicts, stop and resolve them—do not discard anyone's work.

## If you're developing on WilliamPersonal instead of dev

1. Commit and push your current `WilliamPersonal` work (if you have any).
2. **Fetch origin**, select `WilliamPersonal`, then use **Branch → Merge into current branch… → origin/dev** in GitHub Desktop.
3. Review any merge conflicts in `Form1.cs`; preserve your newer form code and keep the Azure integration. Push `WilliamPersonal` only after the solution builds. **Do not merge your own branch into dev merely to get Azure**—Azure is already in dev.

## What to try in Azure's single command field

| Enter | Expected behavior |
| --- | --- |
| `help` | Show available instructions. |
| `find Adapter` | Show matching parts in the existing inventory table. |
| `low stock` | Show items with quantity **5 or less**. |
| `sort name` | Sort the inventory grid alphabetically. |
| `sort quantity` | Sort the inventory grid by stock amount (ascending). |
| `set 123/456789 to 8` | **Preview** changing the exact part/serial pair to quantity 8. Click **Yes** to save. |
| `add 123/456789 by 5` | **Preview** adding five units to that exact part/serial pair. Click **Yes** to save. |

Replace sample part/serial numbers with an **existing part and serial number shown in the grid**. Part number and serial number identify the same record. The code checks identity and original quantity again immediately before writing.

**Fast functional check:** Add a disposable sample part using William's existing `CreatePart` form (note its generated serial number); run `find <name>`, `low stock`, and `sort quantity`; preview `set <part>/<serial> to 8` and click **No** (should remain unchanged); repeat and click **Yes** (should show 8). Remove the sample part with William's existing Delete button if desired.

## What changed / what was preserved

- `AzureStockGuide.cs`: small **offline, deterministic** interpreter; supports search, sorting, low-stock view, and two quantity edits with confirmation and bounds checks.
- `Form1.cs`: adds the Azure panel **at runtime** after existing `InitializeComponent()`. It does not replace the designer or existing inventory actions.
- `PartData.cs`, `Form1.Designer.cs`, `Program.cs`, and `TowerFlowWinForm.csproj`: **not changed** for this contribution.
- All writes use the existing `PartData.EditPart` method, which saves to William's local `parts.txt`. The guide does not connect to the collaboration room, cloud services, Azure subscriptions, or external AI models.
- **Sorting only changes the table's display order.** There are no warehouses, bin locations, or stock-transfer records in this specific WinForms implementation, so Azure does not pretend to relocate physical stock.

## If it doesn't appear

- Confirm the current source contains `AzureStockGuide.cs` and that `Form1.cs` calls `InstallAzureGuide();`.
- Confirm you opened **`TowerFlowWinForm.slnx`**, not another TowerFlow project in the same repository.
- Check **View → Solution Explorer**, then **Build → Build Solution** and inspect the **Error List**.
- No desktop compilation or screenshot acceptance has been completed on the contributor's behalf; report actual build errors instead of treating source publication as runtime verification.

**Scope:** KuroKage's Windows Forms inventory app only. **Contribution credit:** Dulskinator96 — Azure.
