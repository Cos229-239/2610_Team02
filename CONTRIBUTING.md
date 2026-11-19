# Contributing to TowerFlow

Start from the latest dev in your preferred IDE. Make a small change on your
own branch and open a pull request targeting dev. Run:

    node tools/check-contributions.cjs

This checks tracked JavaScript syntax and runs the tracked Node tests. C++
builds and interactive browser behavior need their own verification. Include
what you tried and a screenshot for a visible change in the pull request.

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
