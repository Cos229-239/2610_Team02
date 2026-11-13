"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {modelProfile,configure,cleanSnapshot,feedbackRecord}=require("./dual-agent-harness.cjs");
test("Model adaptations are explicit and never imply neural training",()=>{
 for(const [name,family] of [["dolphin-llama3:8b","llama"],["hermes3:8b","hermes"],["gemma4:4b","gemma"],["claude-opus","anthropic"],["gpt-6","openai"]])
  assert.equal(modelProfile(name).family,family);
 assert.throws(()=>modelProfile("http://localhost:11434"),/Invalid/);
});
test("AURA / FLOW know which app they inhabit; impossible cross-app context rejected",()=>{
 const a=configure({agent:"AURA",model:"dolphin-llama3:8b",surface:"frontier",task:"Inspect projector stage"});
 const f=configure({agent:"FLOW",model:"dolphin-llama3:8b",surface:"towerflow",task:"Review this company"});
 assert.equal(a.context.status,"UNKNOWN");
 assert.equal(f.context.status,"UNKNOWN");
 assert.ok(a.instructions.includes("never the TowerFlow financial portfolio"));
 assert.ok(f.instructions.includes("not the Frontier room scene"));
 assert.throws(()=>configure({agent:"FLOW",model:"gpt-6",surface:"frontier",task:"Inspect projector"}),/FLOW/);
 assert.throws(()=>configure({agent:"AURA",model:"gpt-6",surface:"towerflow",task:"Trade shares"}),/AURA/);
});
test("Only host-attested world data receives observed status; browser claims remain UNKNOWN",()=>{
 const state={projectorStage:"IDLE",activeWall:"front",memberCount:2,privateToken:"secret"};
 const untrusted=configure({agent:"AURA",model:"llama3.1:8b",surface:"development",task:"Report live room status",hostContext:state,hostRevision:19,hostSource:"unknown"});
 assert.equal(untrusted.context.status,"UNKNOWN");
 const trusted=cleanSnapshot(state,{source:"trusted-host",revision:19});
 assert.equal(trusted.projectorStage,"IDLE");assert.equal(trusted.memberCount,2);
 assert.equal("privateToken" in trusted,false);
 assert.throws(()=>cleanSnapshot(state,{source:"trusted-host",revision:null}),/revision/);
});
test("Feedback is an evidence-linked candidate, not model-training success",()=>{
 const x=feedbackRecord({agent:"FLOW",model:"dolphin-llama3:8b",taskId:"task_12345678",revision:"abc123456789",
  reviewer:"testreviewer",consent:true,trial:{dimension:"CODE",result:"PASS",evidenceRef:"test:ci/source"}});
 assert.equal(x.trainingStatus,"LABELED_FEEDBACK_ONLY_NO_MODEL_TRAINING");
 assert.equal(x.content,"OMITTED_BY_DESIGN");
 assert.throws(()=>feedbackRecord({agent:"AURA",model:"llama3.1:8b",taskId:"task_12345678",revision:"1234567",
  reviewer:"reviewer",consent:false,trial:{dimension:"CODE",result:"PASS",evidenceRef:"test:ci"}}),/consent/);
});
