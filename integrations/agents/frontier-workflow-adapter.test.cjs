"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createOrchestrator}=require("./task-orchestrator.cjs");
const {createFrontierWorkflowAdapter}=require("./frontier-workflow-adapter.cjs");
function setup({status="PASS",mismatch=false,isolated=true}={}){
 const calls=[];
 const adapters={
  plan:async(req)=>{calls.push("plan");return {objective:req.objective,postconditions:["Projector opens on E","WASD preserved"],
   contracts:{SPECS:"E activates projector",DESIGN:"Working projector UI",PRESERVATION:"WASD navigation unchanged",API:"Run sandbox browser tests"}};},
  discover:async()=>{calls.push("discover");return {revision:"abc12345"};},
  prepare:async()=>{calls.push("prepare");return {isolated,workspaceId:"sandbox-demo"};},
  execute:async()=>{calls.push("execute");return {artifact:"artifact:projector-preview"};},
  collectEvidence:async(payload)=>{calls.push("collectEvidence");const stamp=()=>({status,method:"trusted-test-reporter",...(status!=="UNKNOWN"?{evidence:"test:independent-browser"}:{})});
   return {id:"trial-001",objective:payload.plan.objective,revision:mismatch?"wrong123":payload.discovery.revision,
    protocol:"demo-v1",startedAt:"2026-11-11T01:00:00Z",finishedAt:"2026-11-11T01:01:00Z",
    gates:{code:[{id:"requirements",...stamp()}],pattern:[{id:"interaction",...stamp()}],
    preservation:[{id:"wasd",...stamp()}]}};}
 };
 const driver=createFrontierWorkflowAdapter(adapters);
 const engine=createOrchestrator({adapters:{"repo.feature.integrate":driver},
  uuid:()=>"task-demo",clock:()=>Date.parse("2026-11-11T01:02:00Z"),
  canExecute:()=>true,canPublish:()=>false});
 return {engine,calls};
}
const request={skill:"repo.feature.integrate",
 objective:"Make the projector open on E and preserve existing WASD controls",
 idempotencyKey:"experiment001",workspace:"towerflow/frontier"};
test("existing orchestrator completes guarded functional engineering draft",async()=>{
 const {engine,calls}=setup();
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"VERIFIED_DRAFT");
 assert.equal(result.artifacts[0].gates.pattern.score,10);
 assert.deepEqual(calls,["plan","discover","prepare","execute","collectEvidence"]);
 assert.ok(result.events.some(e=>e.kind==="deferred"));
});
test("fail-closed evidence vetoes task when a gate fails",async()=>{
 const {engine}=setup({status:"FAIL"});
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"FAILED");
 assert.equal(result.artifacts.length,0);
});
test("unknown outcomes block completion rather than being scored",async()=>{
 const {engine}=setup({status:"UNKNOWN"});
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"FAILED");
});
test("evidence from another revision cannot complete this task",async()=>{
 const {engine}=setup({mismatch:true});
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"FAILED");
});
test("isolated execution required before sandbox adapter can run",async()=>{
 const {engine,calls}=setup({isolated:false});
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"FAILED");
 assert.equal(calls.includes("execute"),false);
});
test("unauthorized viewer cannot run engineering execution",async()=>{
 const {engine}=setup();
 await assert.rejects(engine.run(request,{userId:"viewer1",role:"viewer"}),/permissions/);
});
test("review required: no publish without explicit authorizer",async()=>{
 const {engine}=setup();
 const result=await engine.run(request,{userId:"engineer1",role:"contributor"});
 assert.equal(result.result,"VERIFIED_DRAFT");
 assert.ok(!result.events.some(e=>e.kind==="confirmed"&&e.phase==="PUBLISH"));
});
