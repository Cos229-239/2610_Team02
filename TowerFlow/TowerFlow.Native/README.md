# TowerFlow Native — Initial C++ Foundation

## Build
Open `TowerFlow.Native.sln` in Visual Studio and select Debug | x64.
Build with Ctrl+Shift+B; run with F5.

The project uses the installed Windows SDK and Microsoft WebView2 Runtime.
The WebView2 SDK is a project-local NuGet package dependency.

## Architecture
- `src/main.cpp`: Windows application entry point.
- `src/TowerFlowApp.h/.cpp`: native application lifecycle and main window.
- `src/WebViewHost.h/.cpp`: WebView2 creation, sizing, and navigation.
- `packages/`: WebView2 SDK dependency.
- `bin/` and `obj/`: generated build outputs.

The host searches upward from its executable for the existing `index.html`.
Keep the original `index.html`, `app.js`, and `styles.css` together.

## Scope and limitations
This initial foundation hosts the existing interface inside a native Windows
application; it does not rewrite the business logic into C++. The separate
Node static server is not needed for local file navigation.

WebView2 stores browser data separately from the user's ordinary browser
profile. Export the existing TowerFlow portfolio JSON before switching, then
use TowerFlow's Import data feature to migrate that data.

A successful compile verifies the native host build, not complete feature
parity. The interface and financial workflows must still be tested.
