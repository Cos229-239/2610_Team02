# TowerFlow

TowerFlow is a C++20 console application for tracking physical inventory across business locations. It records stock movements and business purchases and sales in a local inventory file.

## Build and run

**Windows** — Extract the ZIP, open `TowerFlow.slnx` in Visual Studio with the Desktop development with C++ workload and the project's v145 toolset, then build and press **Ctrl+F5**. From a Developer Command Prompt, you can also build the source directly.

```bat
cl /std:c++20 /EHsc /W4 /Fe:TowerFlow.exe TowerFlow\TowerFlow.cpp TowerFlow\Inventory.cpp TowerFlow\UserInterface.cpp TowerFlow\FileStorage.cpp TowerFlow\Report.cpp
TowerFlow.exe inventory.txt
```

**Linux** — Run these commands from the folder containing the solution.

```sh
g++ -std=c++20 -Wall -Wextra -Wpedantic TowerFlow/*.cpp -o ./towerflow
./towerflow inventory.txt
```

The inventory file defaults to `inventory.txt` in the working directory. Pass an explicit path to open a different file. Use the same path each time for the same inventory. One TowerFlow session can open a given inventory file at a time.

## Everyday workflow

| Menu | Use |
| --- | --- |
| **1, 4** | Add or edit a product, its barcode, USD list price, and overall low-stock threshold. |
| **14, 8** | Assign an optional QR payload, then scan either code to see the product and its location balances. Use a scanner that types the decoded value and sends Enter, or enter the value manually. |
| **5, 6, 7** | Receive, remove, and transfer units. Enter a location name to establish a new location on receipt or transfer. Reuse location names exactly to keep quantities together. |
| **10, 11** | Record a completed purchase or sale with its supplier or customer, unit cost or sale price, and optional invoice or order reference. The same save also updates on-hand stock. |
| **12** | Review saved movement history, optionally by product ID. |
| **9, 13** | View the console inventory report or export a dashboard to a new HTML filename. |

Stock actions accept a product ID, barcode, or QR payload. If a numeric code also matches another product's ID, TowerFlow prompts you to choose the product before proceeding. Purchase and sale prices are saved with each movement. The on-hand valuation uses the product's current list price. The low-stock threshold compares a product's total units across locations.

## Dashboard and CSV

Choose **13** and open the generated HTML file in a modern browser. Filter the snapshot by product, location, stock status, and movement type. The stock CSV includes one row per displayed product and location. The movement CSV includes the full filtered history, with timestamps in UTC and trade prices in USD. Export a fresh snapshot after making changes.

## Existing inventory files

Pass your previous `inventory.txt` path when launching TowerFlow. The first successful change upgrades the file format. To use the old executable again, keep a separate copy of the original data file before making the first change. Historical movements begin with the first stock change recorded by this release.
