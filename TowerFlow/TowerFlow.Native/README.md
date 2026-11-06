# TowerFlow Native — CLI Portfolio Foundation

## Build
Open `TowerFlow.Native.sln` in Visual Studio, select **Debug | x64**, build with **Ctrl+Shift+B**, and run with **F5**.

## Current working layer
- `src/main.cpp`: command-line portfolio menu and local save/load.
- `src/Portfolio.h/.cpp`: portfolio operations, valuation, and versioned persistence.
- `src/Asset.h`: asset and position valuation data.
- `src/Transaction.h/.cpp`: transaction history records.
- `bin/` and `obj/`: generated build output.

The CLI stores its portfolio in `towerflow.dat` in the process working directory. The current persistence feature is local-only; it is not yet a remote API or cloud database.

## Phased progression
See [PMP3 TowerFlow Phased Development](../../Documents/PMP3_TowerFlow_Phased_Development.md) for the planned CLI → API/service → cloud backend → web/GUI sequence, API contract, security boundaries, and phase acceptance gates.

## Scope and verification
The active project file currently builds the CLI portfolio sources. The separate browser dashboard and any WebView host code are not yet proven to share the same portfolio service. Do not treat a successful compile as proof of API integration, cloud deployment, or full feature parity.

After building, verify that a deposit or trade is saved and that the cash, positions, cost basis, and transaction history reload correctly after closing and relaunching the CLI.
