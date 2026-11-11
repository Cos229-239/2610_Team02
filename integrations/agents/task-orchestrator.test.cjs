"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createOrchestrator,validateRequest}=require("./task-orchestrator.cjs");
function driver({verify=true,isolate=true,publish=true}={}){
 const calls=[];
 const adapter={
  plan:async()=>{calls.push("plan");return {postconditions:["feature working with 2 users"]};},
  discover:async()=>{calls.push("discover");return {files:["public/room.js"]};},
  prepare:async()=>{calls.push("prepare");return {isolated:isolate,branch:"agent/isolated"};},
  execute:async()=>{calls.push("execute");return {diff:"mock-only"};},
  verify:async()=>{calls.push("verify");return {passed:verify,evidence:verify?[{test:"multi-user",passed:true}]:[]};},
  publish:async()=>{calls.push("publish");return {confirmed:publish,reference:"pr:42"};},
  rollback:async()=>{calls.push("rollback");}
 };
 return {adapter,calls};
}
const task={skill:"room.whiteboard.create",objective:"Implement account-colored collaborative whiteboard",idempotencyKey:"whiteboard-task-123"};
test("full task progression creates verified draft but never silently publishes",async()=>{
 const {adapter,calls}=driver();
 const engine=createOrchestrator({adapters:{"room.whiteboard.create":adapter},clock:()=>10,uuid:()=>"TASK1"});
 const result=await engine.run(task,{userId:"github_writer",role:"contributor"});
 assert.equal(result.result,"VERIFIED_DRAFT");assert.equal(result.stage,"COMPLETE");
 assert.deepEqual(calls,["plan","discover","prepare","execute","verify"]);
 assert.equal(result.artifacts[0].test,"multi-user");
 assert.ok(result.events.some(x=>x.kind==="deferred"));
 assert.deepEqual(engine.status("TASK1",{userId:"github_writer"}),result);
 assert.throws(()=>engine.status("TASK1",{userId:"outsider"}),/unauthorized/);
});
test("policy-gated publication requires independent acknowledgment",async()=>{
 const {adapter,calls}=driver();
 const engine=createOrchestrator({adapters:{"room.whiteboard.create":adapter},canPublish:async()=>true});
 const result=await engine.run(task,{userId:"github_writer",role:"contributor"});
 assert.equal(result.result,"PUBLISHED");assert.ok(calls.includes("publish"));
});
test("rejects model mistakes, invalid skill, over-permission attempts and duplicates",async()=>{
 assert.throws(()=>validateRequest({...task,skill:"shell.run"}),/Unsupported/);
 assert.throws(()=>validateRequest({...task,workspace:"../../host"}),/Invalid sandbox/);
 const {adapter}=driver();
 const engine=createOrchestrator({adapters:{"room.whiteboard.create":adapter}});
 await assert.rejects(()=>engine.run(task,{userId:"u",role:"viewer"}),/Insufficient/);
 await engine.run(task,{userId:"u",role:"contributor"});
 await assert.rejects(()=>engine.run(task,{userId:"u",role:"contributor"}),/Duplicate/);
});
test("fails closed if no adapter, no isolated workspace or no passing evidence",async()=>{
 const missing=createOrchestrator();
 await assert.rejects(()=>missing.run(task,{userId:"u",role:"contributor"}),/No reviewed task adapter/);
 for(const opts of [{isolate:false},{verify:false},{publish:false}]){
  const {adapter,calls}=driver(opts);
  const engine=createOrchestrator({adapters:{"room.whiteboard.create":adapter},canPublish:()=>true});
  const result=await engine.run(task,{userId:"u",role:"contributor"});
  assert.equal(result.result,"FAILED");
  assert.ok(calls.includes("rollback"));
 }
});
