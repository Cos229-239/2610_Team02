# Contributing to TowerFlow

## Start or resume a feature

Already pushed your feature? Skip to **Submit for review**. Already editing on a
personal branch? Continue there. For a new feature, fetch the latest `dev` in
your IDE and create a branch from it, such as `feature/stock-alert`.

| Where the feature belongs | Open this project | How to try it |
| --- | --- | --- |
| Business app shown inside the room | [Web app](TowerFlow/index.html) in VS Code | Press F5 with **TowerFlow — Debug server / Codespaces**. Open port 4174 and try the affected screen. For client breakpoints use the preview browser's developer tools or the desktop **TowerFlow — Run with F5** profile. |
| Inventory operations and Windows GUI | [Malik's CMake project](TowerFlow%20Files/TowerFlow%20%28Malik%20modified%29/CMakeLists.txt) in Visual Studio on Windows | Run `run-tests.cmd` in that project's Visual Studio Developer Command Prompt. For a window change, open the inventory window and exercise the control. |
| Inventory, barcodes, sales and reports | [Omarion's solution](Towerflow_OW/TowerFlow.slnx) in Visual Studio on Windows | Press F5. Try the changed menu action with a sample inventory file. [Build instructions](Towerflow_OW/README.md) |
| Native portfolio | [Portfolio solution](TowerFlow/TowerFlow.Native/TowerFlow.Native.sln) in Visual Studio on Windows | Select Debug and x64, then press F5 and exercise the portfolio action. |
| Room stations, graphics or audio | [Collaboration room](collaboration-room/) | Use the preview or installer for that component. State which build you tried. For a shared interaction, repeat the action with a second participant. |

Windows Forms work on `WilliamPersonal` has its own [C# solution](https://github.com/Cos229-239/2610_Team02/tree/WilliamPersonal/TowerFlowWindow/TowerFlowWinForm).
Open it on that branch in Visual Studio with .NET desktop development and .NET 10 support. Press F5 and try the changed form.

## Submit for review

1. Use your IDE's source control to review changed files, commit the feature and push your branch. Include the source and intentional assets. Leave generated Debug, bin and obj output out of the change.
2. In the room's Development Desk choose **Submit feature**, then select your pushed branch under **compare**. You can also [open the same comparison here](https://github.com/Cos229-239/2610_Team02/compare/dev...dev). Keep the base on **dev**. If GitHub shows an existing pull request, open it.
3. Title the pull request with the behavior, such as **Show low-stock parts on the inventory dashboard**. Fill in the short handoff once. One teammate follows the steps, checks the result and reviews the diff. Merge the reviewed change into `dev` using the team's repository permissions.

The contribution workflow checks tracked JavaScript syntax and Node tests, runs the C++ parts and operations tests, and checks saving and reopening an inventory item. A Windows UI change still needs a Windows run. Note any check left for a reviewer.

## See what changed

- [Awaiting review](https://github.com/Cos229-239/2610_Team02/pulls?q=is%3Apr+is%3Aopen+base%3Adev) shows proposed features and their check results.
- [Merged features](https://github.com/Cos229-239/2610_Team02/pulls?q=is%3Apr+is%3Amerged+base%3Adev) keeps the handoff with each reviewed change. [Dev history](https://github.com/Cos229-239/2610_Team02/commits/dev/) also includes direct commits.
- For a browser-app feature, the host publishes the reviewed revision below. In the desk, open the published commit, refresh the room, and repeat the PR's steps in the business panel. Record the outcome against that PR. Native features run in their own applications until someone connects them to the room.

## Publishing the business app inside the room

The collaboration room embeds its own public/towerflow copy of the business
application. Merging a PR updates GitHub. The host imports the reviewed commit
into that directory using a clean checkout. Preview first:

    node tools/import-room-app.cjs "C:\Users\dulsk\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room"

Review the commit and files printed by the preview. Add --apply to import.
Checks run before deployment. Additional room assets are retained. One previous
app copy is kept at public/towerflow.previous. Review or remove that directory
before a subsequent import. For rollback, stop serving requests, move the new
public/towerflow aside and rename public/towerflow.previous to public/towerflow.

After import, inspect /towerflow/towerflow-build.json on the room host and reopen
the business panel. Test with another participant before marking the feature
verified in the live room. Deployment can briefly interrupt app requests during
the directory swap. Run one host import at a time.

This importer publishes browser assets from TowerFlow. Server-side features,
OAuth, graphics installers and native C++ changes use their own deployment
paths. The syntax checks do not establish end-to-end functionality.
