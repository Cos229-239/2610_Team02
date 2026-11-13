"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createEvidenceLearner}=require("./online-evidence-learner.cjs");
test("Only reviewed evidence updates an online skill policy; no LLM weight training",()=>{
 const policy=createEvidenceLearner({minTrials:30,promotionFloor:.8});
 const before=policy.rank({agent:"FLOW",model:"dolphin-llama3:8b",surface:"towerflow",skills:["market.research"]});
 assert.equal(before[0].sampleSize,0);
 const obs=policy.observe({agent:"FLOW",model:"dolphin-llama3:8b",surface:"towerflow",skill:"market.research",
  taskId:"task_000001",consent:true,reviewedBy:"Dan01",evidenceRef:"test:market-verified",
  gates:{code:"PASS",pattern:"PASS",preservation:"PASS"}});
 assert.equal(obs.trials,1);
 assert.equal(obs.eligibleForReview,false);
 assert.equal(policy.snapshot().weightsUpdated,false);
 assert.equal(policy.rank({agent:"FLOW",model:"llama3.1:8b",surface:"towerflow",skills:["market.research"]})[0].sampleSize,1);
});
test("Independent label and actor consent required; repeated trial rejected",()=>{
 const policy=createEvidenceLearner();
 const input={agent:"AURA",model:"dolphin-llama3:8b",surface:"frontier",skill:"room.chat",
  taskId:"task_000002",consent:true,reviewedBy:"Reviewer1",evidenceRef:"review:ticket-555",
  gates:{code:"PASS",pattern:"FAIL",preservation:"PASS"}};
 assert.equal(policy.observe(input).passed,0);
 assert.throws(()=>policy.observe(input),/already learned/);
 assert.throws(()=>policy.observe({...input,taskId:"task_000003",consent:false}),/consent/);
 assert.throws(()=>policy.observe({...input,taskId:"task_000003",gates:{code:"PASS",pattern:"UNKNOWN",preservation:"PASS"}}),/labels/);
 assert.throws(()=>policy.observe({...input,taskId:"task_000004",surface:"towerflow"}),/Cross-application/);
});
test("Promotion requires independent >=30 trials and conservative statistical lower bound",()=>{
 const policy=createEvidenceLearner({minTrials:30,promotionFloor:.8});
 let last;
 for(let i=0;i<100;i++)last=policy.observe({agent:"AURA",model:"gemma4:4b",surface:"development",
  skill:"repo.feature.integrate",taskId:"task_"+String(i).padStart(7,"0"),
  consent:true,reviewedBy:"Reviewer1",evidenceRef:"test:isolated-"+i,
  gates:{code:"PASS",pattern:"PASS",preservation:"PASS"}});
 assert.equal(last.eligibleForReview,true);
 assert.ok(last.lower95>.8);
 const rank=policy.rank({agent:"AURA",model:"gemma4:4b",surface:"development",skills:["repo.feature.integrate","room.chat"]});
 assert.equal(rank[0].skill,"repo.feature.integrate");
 assert.equal(rank[1].sampleSize,0);
});
