# TowerFlow Development Center — Contributor Guide

## Enter the Development Center

Inside the TowerFlow room, click the highlighted **◆ Contribute** button. Your GitHub account appears at the top and your original team tools are still available below the two choices.

### Choice 1 — Open & edit TowerFlow

Click the first large card, then choose **Dashboard**, **Markets**, **UI**, **Watchlist**, **Portfolio**, **Holdings**, **Trading**, **Analytics**, **Charts**, **Settings**, **Backend / API**, or **Collaboration Room**.

The button identifies the real source. If your local companion is paired on this PC, TowerFlow attempts to open VS Code directly at the matching file and line. If not, click the visible **Open code in GitHub browser editor** action and follow **Connect my PC** for the desktop pathway. A launched editor does not mean a debugger has been attached.

### Choice 2 — Describe a change

Click **Describe a change**. The page states which changes are currently supported (first prototype: dashboard headline). Choose a suggested headline or type a supported request. Click **Generate preview** and interact with the changed app in the isolated frame. Review the before/after summary.

If it looks right, select **Submit for Team Review**. With authorized GitHub write access, the backend creates a contributor branch and **draft PR** against `dev`, *not* a merge, and does not modify the live room. You can revise the request before submitting.

For unsupported requests the UI explains that a more capable authorized coding adapter is not yet connected; it does not pretend to have changed the app.

### Existing team controls

**Explore all App Integrations** leads to the existing Hub's Dashboard, Markets, Portfolio, Analytics, Native and Room contribution list. **Connection & other team tools** scrolls directly to the existing optional local companion, GitHub history, team collaboration, debug/demo, and PR controls.

## Preservation & limitations

No Gemini CLI required or bundled. No new GitHub identity is shared. Live room graphics, movement, sound and authentication code have not been replaced.

**Implementation status:** UI authored and tested in the repository's Chrome-based preview fixture; real signed-in host, physical VS Code launch, breakpoints, per-account draft PR permission, and multi-user acceptance are outstanding. PR is a draft and not on `dev`.

## Acceptance checklist

- New large cards and highlighted Contribute button are visible on desktop and narrow mobile widths.
- Selecting Markets displays a source target or an explicit fallback; never a false VS Code success.
- A supported headline request changes the actual app inside the sandboxed iframe.
- Unrecognized requests clearly report unsupported functionality without modifying shared files.
- PR submission uses the current member's identity and never merges/publishes automatically.
- Existing room graphics, Team Contributions, and App Integrations continue working.
