# TowerFlow desktop

TowerFlow is a C++20 inventory manager. On Windows it opens as a branded desktop workspace with inventory totals, stock alerts, and movement history. It uses the same inventory data and stock rules as the original console version. It does not need an external GUI framework or internet access.

## Build in Visual Studio

1. Extract this ZIP and open **TowerFlow.slnx** in Visual Studio.
2. Install the **Desktop development with C++** workload if Visual Studio asks for it. The project uses its **v145** toolset and the Windows 10 SDK.
3. Select **x64 / Debug**, build the solution, and press **F5** or **Ctrl+F5**. The TowerFlow window opens directly.

By default the app uses `inventory.txt` in its working directory. In Visual Studio this is normally the `TowerFlow` project folder. You can pass another inventory path in **Project Properties → Debugging → Command Arguments**, or choose **File → Open inventory** inside the app. Your existing inventory files still work.

## Use the window

| Control | What it does |
| --- | --- |
| **+ Add product** | Add a name, unique barcode, list price, minimum stock, and optional QR payload. |
| **Edit product / Set QR code** | Select a product row first; double-clicking a row also opens its editor. |
| **Stock movement** | Receive, remove, or transfer stock; record purchases and sales with unit prices, supplier/customer, and reference. |
| **Find / scan** | Type a name, ID, barcode, or QR payload. USB scanners that type into the focused field work here. Search also filters movement history by product. |
| **Inventory / Movement history** | Browse current stock by location or saved transactions, newest first. |
| **Open inventory / File menu** | Open an existing file or start a new inventory at a new path. |
| **Business identity** | Enter the business name shown in the header, window title, and exported dashboards. Each inventory file remembers its own name. |
| **Export dashboard** | Create a new HTML report with filters and CSV download buttons; optionally open it in a browser. |

Each successful edit saves the inventory file before the window displays the change. An inventory can be opened by only one TowerFlow session at a time. A new inventory file is created when its first change is saved. Dashboard exports require a new HTML filename; existing files are never overwritten.

Business identity is stored in a small companion file, such as `inventory.txt.business`, in the same folder as the inventory file. It only contains the display name and does not alter inventory data. Keep this companion file with the inventory if you want its branding on another computer.

If you previously used the console version, choose the **same** inventory file path to continue with your existing products. The first change to a legacy inventory file upgrades its format; keep a separate copy if you plan to reopen it with the old executable.

## Linux console fallback

The original command-line interface remains available on Linux:

```sh
g++ -std=c++20 -Wall -Wextra -Wpedantic TowerFlow/*.cpp -o towerflow
./towerflow inventory.txt
```

The Windows project builds only its desktop interface. The Linux command above includes the original console interface.
