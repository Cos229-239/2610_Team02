"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base=__dirname,read=n=>fs.readFileSync(path.join(base,n),"utf8");
test("five original and contributor workspaces remain wired",()=>{
 const html=read("index.html"),ui=read("inventory-ui.js");
 for(const tab of ["inventory","revenue","finance","business","contributions"]){
  assert.match(html,new RegExp('data-tf-app-tab="'+tab+'"'));
  assert.match(html,new RegExp('data-tf-app-panel="'+tab+'"'));
  assert.ok(ui.includes('"'+tab+'"'));
 }
 for(const src of ["app.js","inventory-core.js","inventory-ui.js","flow-core.js","flow-ui.js","flow-agent-ui.js","contributions.js"])
  assert.ok(html.includes('src="'+src+'"'),src);
});
test("contribution UI has source-bound previews and no destructive controls",()=>{
 const html=read("index.html"),js=read("contributions.js"),manifest=JSON.parse(read("contributions.json"));
 assert.match(html,/TEAM CONTRIBUTIONS/);
 assert.match(js,/Review exact source change/);
 assert.match(js,/preview-towerflow-contribution.ps1/);
 assert.doesNotMatch(js,/\.delete\s*\(|fetch\([^\n]*DELETE|method:\s*["']DELETE["']/);
 assert.ok(manifest.records.every(x=>x.url==="https://github.com/Cos229-239/2610_Team02/pull/"+x.pullRequest));
});
test("agent execution is explicit and its evidence UI cannot silently run",()=>{
 const html=read("index.html"),ui=read("flow-agent-ui.js");
 for(const id of ["tfAgentInspect","tfAgentInventory","tfAgentMarket","tfAgentStatus","tfAgentTrace"])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(ui,/confirm\(/);
 assert.match(ui,/\/api\/agents\/run/);
 assert.match(ui,/result\.trace/);
 assert.doesNotMatch(ui,/eval\(|new Function\(|child_process/);
});
