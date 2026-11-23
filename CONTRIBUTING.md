# Contributing to Team 02 TowerFlow

## One shared team project

**Shared integration branch: `dev`.** Teammates retain their own branches and original contributions. Changes to the shared inventory application must be reviewed through a pull request targeting `dev`.

The **refined shared inventory application** is in `TowerFlow_Shared_Server_Refined/`. This is the team’s combined browser/Node.js inventory system. It is **not** a C++ or Windows Forms executable, and the original native contributions remain separately in the repository or their personal branches.

### Make a contribution to the refined inventory app

1. In GitHub Desktop, fetch the repository and switch to your personal or feature branch. Pull `dev` first if you are starting a new feature, taking care not to overwrite uncommitted changes.
2. Open `TowerFlow_Shared_Server_Refined/` in VS Code or another editor. Install **Node.js 20+**.
3. From a terminal in that folder, run `npm test`. To use the app locally, run `npm start` and visit `http://127.0.0.1:4173/` unless its configured port differs. Use test data; do not overwrite another teammate's inventory or accounts.
4. Modify and test the relevant source (`server.js`, `lib/`, `public/`, `test/`). Preserve the work of all five contributors and clearly note any feature that has been adapted rather than copied verbatim.
5. Commit and push your branch. Open a pull request **into `dev`**, describe the behavior and the test results, and request a teammate's review.
6. Only approved/merged code becomes part of the shared repository; deploying the running server is a separate owner-controlled action.

### Original teammate implementations

- **Malik Brown:** His CMake inventory project and `run-tests.cmd` are verified on `MalikPersonal` at `TowerFlow Files/TowerFlow (Malik modified)/`. They are **not present at this path on `dev`**. Use the correct branch when opening the project in Visual Studio.
- **Omarion Walter:** `Towerflow_OW/TowerFlow.slnx` is a Visual Studio C++ solution; see `Towerflow_OW/README.md`.
- **William Jones / KuroKage:** `TowerFlowWindow/TowerFlowWinForm/TowerFlowWinForm.slnx` is a Windows-only C# .NET 10 WinForms solution. See `Instructions.md` and `TowerFlowWindow/TowerFlowWinForm/AZURE_FOR_KUROKAGE.md`.
- **Dayna Perez Colon:** Her inventory and validation work remains in the team’s repository and the refined shared app's contribution records.
- **Daniel Dulsky:** Azure Stock Guide is available in the refined shared inventory app, with attribution and source reference in `TowerFlow_Shared_Server_Refined/CONTRIBUTIONS.md`.

The refined app's `INTEGRATION.md` distinguishes original source from functionality adapted into Node.js. Do not claim an original native application executes inside the browser app.

## Boundaries

The separate 3D collaboration room and its room-only helpers were relocated to the **private** `Dulskinator96/AscendenceAgent007` repository. They are **not part of Team 02's shared source or contributor workflow**. Team membership, inventory contributions, original implementations, and the refined server remain with Team 02.

Team 02 does not require `tools/towerflow*` to contribute: no such script exists on the shared branch.

## Checks

From the repository root:

```sh
node tools/check-contributions.cjs
bash tools/check-inventory.sh
```

The second command expects a Linux shell and a C++ compiler. Windows-only native interfaces require their own Visual Studio build and manual UI verification. A passing GitHub check is evidence of the checks it actually ran, not proof that every platform or desktop window works.
