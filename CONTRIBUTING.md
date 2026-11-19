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

## Your Azure desk

Use the same room invite as the rest of the team. Sign in with your own GitHub account and choose **Contribute** in the menu or **Azure** in the toolbar. The desk shows your GitHub handle, repository, branch, Changes and History. In **Open in GitHub Desktop**, use the same account under File → Options → Accounts. Your desk uses your signed-in GitHub account. An open feature PR targeting dev takes precedence over a recent source commit on dev or your personal branch. Build output and merge commits are skipped. If GitHub activity is unavailable, Azure labels the recorded project starter. Choose a different workspace to try another teammate's template. Pin it on this browser or choose **Follow my work** to restore automatic selection.

**Resume feature** opens the source in the browser editor. **Open Windows workspace…** copies a PowerShell command that clones a separate checkout on first use and opens the local project. Subsequent launches reopen that checkout and preserve local edits. Each Windows checkout lives under your own GitHub login in Documents/TowerFlow Workspaces. Use Fetch/Pull in your IDE to bring it up to date. Forms debugging requires Visual Studio with the project's Windows desktop workload. The room cannot observe a desktop breakpoint.

**Submit feature** suggests pushed branches with work ahead of dev. A single match is filled in for you. **New feature** prepares an editable title, sample, expected result and observed-result field. Push your branch and use **Prepare pull request** to open the draft text on GitHub for review. Entering the chamber is silent. Sound Garden, voice chat and the explicit Help voice retain their controls.

## Windows host installation

On the Team 02 host, run this block in PowerShell once to install the desk from the team’s shared default branch, dev. Teammates only need the room invite. It uses a temporary export and copies the install result to the clipboard. The installed bridge loads from the existing TowerFlow server on its next restart.

```powershell
& {
    $repo = Join-Path $env:USERPROFILE 'Documents/GitHub/2610_Team02'
    $room = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room/Towerflow_Collaboration_Room'
    $temp = Join-Path ([IO.Path]::GetTempPath()) ('towerflow-desk-' + [guid]::NewGuid())
    $log = @()
    try {
        if (!(Test-Path -LiteralPath (Join-Path $room 'server.js'))) { throw "Room missing at $room" }
        git -C $repo fetch --no-tags https://github.com/Cos229-239/2610_Team02.git refs/heads/dev
        if ($LASTEXITCODE) { throw 'Could not fetch the desk.' }
        $rev = git -C $repo rev-parse FETCH_HEAD
        git -C $repo cat-file -e "${rev}:collaboration-room/azure-bridge/team-updates.cjs"
        if ($LASTEXITCODE) { throw 'The team desk has not reached dev yet.' }
        New-Item -ItemType Directory -Path $temp -ErrorAction Stop | Out-Null
        $zip = Join-Path $temp 'desk.zip'
        git -C $repo archive --format=zip -o $zip $rev collaboration-room/azure-bridge
        if ($LASTEXITCODE) { throw 'Could not export the desk.' }
        Expand-Archive -LiteralPath $zip -DestinationPath $temp -ErrorAction Stop
        $log += & node (Join-Path $temp 'collaboration-room/azure-bridge/install.cjs') $room 2>&1
        if ($LASTEXITCODE) { throw 'Installer failed.' }
        $log += "Installed desk from $rev. Restart the existing TowerFlow host with its usual launcher."
    } catch { $log += "FAILED: $_" }
    finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force } }
    $log | Out-Host
    ($log -join [Environment]::NewLine) | Set-Clipboard
}
```

After restarting, hard refresh the hosted team room and enter with your team account. Check that Azure opens your project and **Team updates** opens the shared dev history. To confirm which code the room used, inspect the room document's module URL in the browser Network panel. The Azure bridge serves the current graphics file at `/towerflow-entry.mjs` with the two legacy entry audio calls removed.

## Submit for review

1. Use your IDE's source control to review changed files, commit the feature and push your branch. Include the source and intentional assets. Leave generated Debug, bin and obj output out of the change.
2. In the room's Development Desk choose **Submit feature**, then select your pushed branch under **compare**. You can also [open the same comparison here](https://github.com/Cos229-239/2610_Team02/compare/dev...dev). Keep the base on **dev**. If GitHub shows an existing pull request, open it.
3. Title the pull request with the behavior, such as **Show low-stock parts on the inventory dashboard**. Fill in the short handoff once. One teammate follows the steps, checks the result and reviews the diff. Merge the reviewed change into `dev` using the team's repository permissions.

The contribution workflow checks tracked JavaScript syntax and Node tests, runs the C++ parts and operations tests, and checks saving and reopening an inventory item. A Windows UI change still needs a Windows run. Note any check left for a reviewer.

## See what changed

Click **Team updates** in the room toolbar. The titles open the exact changes on GitHub. The feed includes direct pushes, direct merges and pull-request merges, and refreshes once a minute while open. **Open published web app** appears when the changed browser files on the host match the GitHub version. Later edits can cause an older entry to show a difference. Windows and room-server changes have their own run or installation steps. Click **Merged pull requests and test notes** for the reviewer's instructions. Use **Full dev history** for earlier changes.

- [Awaiting review](https://github.com/Cos229-239/2610_Team02/pulls?q=is%3Apr+is%3Aopen+base%3Adev) shows proposed features and their check results.
- [Merged features](https://github.com/Cos229-239/2610_Team02/pulls?q=is%3Apr+is%3Amerged+base%3Adev) keeps the handoff with each reviewed change. [Dev history](https://github.com/Cos229-239/2610_Team02/commits/dev/) also includes direct commits.
- For a browser-app feature, the host publishes the reviewed revision below. In the desk, open the published commit, refresh the room, and repeat the PR's steps in the business panel. Record the outcome against that PR. Native features run in their own applications until someone connects them to the room.

## Publishing the business app inside the room

The collaboration room embeds its own public/towerflow copy of the business
application. Merging a PR updates GitHub. The host imports the reviewed commit
into that directory. The publisher fetches the shared dev revision and reads its committed browser files directly. You can leave your personal branch and local edits open. From an updated copy of this repository, preview first:

    node tools/import-room-app.cjs "C:\Users\dulsk\Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room"

Review the commit and files printed by the preview. Use the --apply and --revision flags printed by the preview to publish that same revision.
Checks run in a temporary checkout of the exact shared revision. Additional room assets are retained. Previously published assets removed on dev are removed if their host copy still matches its last receipt. One previous
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
