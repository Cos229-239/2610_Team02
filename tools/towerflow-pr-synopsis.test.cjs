"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {synopsis,bucket,approvedBase}=require("./towerflow-pr-synopsis.cjs");
test("classifies product, room, mediator and tests without inventing execution",()=>{
 assert.equal(bucket("TowerFlow/index.html"),"TowerFlow business application");
 assert.equal(bucket("integrations/world/world-state.cjs"),"3D multiplayer room / AURA");
 assert.equal(bucket(".devcontainer/devcontainer.json"),"Developer environment and mediator");
 const output=synopsis([{status:"M",path:"TowerFlow/index.html"},{status:"A",path:"integrations/frontier/frontier-lobby.js"}],["abc12 Add inventory"]);
 assert.match(output,/TowerFlow business application/);
 assert.match(output,/3D multiplayer room/);
 assert.match(output,/abc12 Add inventory/);
 assert.match(output,/Merging does not deploy/);
 assert.match(output,/Reviewer approves merge/);
 assert.doesNotMatch(output,/TESTED|VERIFIED/);
});

test("stacked Frontier PR uses only reviewed integration branch, never untrusted targets",()=>{
  for(const base of ["dev","main","master","feature/frontier-execution-evidence-20261111"])
    assert.equal(approvedBase(base),true);
  for(const base of ["feature/unreviewed","refs/heads/dev","dev..main","../../main","feature/photo-grounded-3d-studio-20261112"])
    assert.equal(approvedBase(base),false);
});
