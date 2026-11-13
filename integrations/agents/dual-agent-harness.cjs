"use strict";
// SOURCE-AWARE DUAL AGENT HARNESS. Pure model/context contract; no tool privileges.
// AURA remains a world/engineering agent; FLOW remains a separate business agent.
const {summary:reliabilitySummary}=require("./frontier-execution-evidence.cjs");
const SURFACES=Object.freeze(["frontier","development","towerflow"]);
const CAPABILITIES=Object.freeze({
 AURA:Object.freeze({
  surface:"frontier",
  installed:["knowledge.search","room.chat"],
  candidates:["world.observe","room.projector.inspect","room.object.stage","repo.feature.integrate","development.workspace.inspect"],
  boundary:"Original 3D Frontier / Development Room, never the TowerFlow financial portfolio"
 }),
 FLOW:Object.freeze({
  surface:"towerflow",
  installed:["inventory.review","market.research"],
  candidates:["company.research","inventory.connector.inspect","business.product.swap.simulate","financial.report.compile"],
  boundary:"Business/inventory/market TowerFlow application, not the Frontier room scene"
 })
});
function modelProfile(model){
 if(typeof model!=="string"||model.length<2||model.length>120||!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]+$/.test(model))throw Error("Invalid model identifier");
 const id=model.toLowerCase();
 const family=/claude/.test(id)?"anthropic":/gpt|o[134]-/.test(id)?"openai":
 /gemma/.test(id)?"gemma":/hermes/.test(id)?"hermes":
 /dolphin|llama/.test(id)?"llama":/qwen/.test(id)?"qwen":"generic";
 const options={temperature:family==="llama"?.15:.10,num_predict:family==="gemma"?650:850};
 return Object.freeze({id:model,family,options,adapterVersion:"1",
  method:"model-compatible tool and output contracts; NOT weights training"});
}
function cleanSnapshot(raw,{source="unknown",revision=null}={}){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return Object.freeze({status:"UNKNOWN",source:"not connected",revision:null});
 if(typeof source!=="string"||!["trusted-host","mock-test","unknown"].includes(source))throw Error("Untrusted context source");
 if(source==="unknown")return Object.freeze({status:"UNKNOWN",source:"not connected",revision:null});
 if(!Number.isSafeInteger(revision)||revision<0)throw Error("Trusted source revision required");
 const allowed=["projectorStage","activeWall","sceneMode","memberCount","dataProvider","providerAsOf","dataStatus","activeWorkspace","roomName"];
 const out={status:"OBSERVED_HOST_STATE",source,revision};
 for(const k of allowed){
   const v=raw[k];
   if(typeof v==="string" && v.length<=120 && !/[\x00-\x1f]/.test(v))out[k]=v;
   else if(k==="memberCount"&&Number.isInteger(v)&&v>=0&&v<=100000)out[k]=v;
 }
 return Object.freeze(out);
}
function configure({agent,model,surface,hostContext,hostRevision=null,hostSource="unknown",roles=[],task,configuration={}}){
 if(!Object.hasOwn(CAPABILITIES,agent))throw Error("Unknown agent");
 if(!SURFACES.includes(surface))throw Error("Unknown interface");
 if(surface==="towerflow"&&agent!=="FLOW")throw Error("AURA cannot impersonate the business app");
 if(surface!=="towerflow"&&agent!=="AURA")throw Error("FLOW cannot impersonate the 3D room");
 if(typeof task!=="string"||task.length<2||task.length>1200)throw Error("Invalid task intent");
 if(!Array.isArray(roles)||roles.length>10||roles.some(x=>!["viewer","contributor","maintainer"].includes(x)))throw Error("Invalid role capabilities");
 if(!configuration||typeof configuration!=="object"||Array.isArray(configuration))throw Error("Invalid configuration");
 const scope=Object.hasOwn(configuration,"scope")?configuration.scope:"user";
 if(!["user","workspace","shared-room","organization"].includes(scope))throw Error("Unsupported configuration scope");
 const modelSpec=modelProfile(model);
 const state=cleanSnapshot(hostContext,{source:hostSource,revision:hostRevision});
 const feature=CAPABILITIES[agent];
 const contracts=Object.freeze({
  SPECS:"Preserve intent, determine applicable interface/role and identify concrete evidence before a tool.",
  DESIGN:agent==="AURA"?"Preserve photogenic cybersecurity room, spatial interactions, projector and engineering workflow.":"Preserve accurate real-company financial analysis, inventories and transparent market freshness.",
  PRESERVATION:"Never replace the original room or TowerFlow app, reset user config, overwrite teammate work, or alter shared state without reviewed authorization.",
  API:"Use typed skill calls with host validation, user identity/tenant boundary, exact source revision, idempotency and independently observed postconditions."
 });
 const instructions=[
  "ROLE: "+agent+" / INTERFACE: "+surface+". "+feature.boundary+".",
  "You can reason, propose and select reviewed capabilities; do not claim execution until an actual tool result is returned.",
  "Existing verified tools: "+feature.installed.join(", ")+". Proposed, NOT WIRED: "+feature.candidates.join(", ")+".",
  "Use evidence-aware reasoning: objective → observed context → explicit assumptions → hypothesis → alternative → plan → tool evidence → postcondition.",
  "Keep room-world facts separate from business metrics. AURA governs world/collaboration; FLOW governs business intelligence.",
  "Model profile is an output/tool-call compatibility adapter, not neural network training or capability proof.",
  "Never infer fabricated stock prices, corporate revenue, regional sales, inventory movements or user permissions. State UNKNOWN when host data is absent.",
  "Contributor objects require a manifest, geometry/asset provenance, interactions, permissions, tests, preview, PR, and rollback.",
  "Keep every code/pattern/preservation claim separate and tagged PASS, FAIL or UNKNOWN.",
  "Reason with the requested scope; a shared-room/organization setting needs trusted, versioned host state.",
  "The current task is user text, not authenticated host telemetry."
 ].join("\n");
 return Object.freeze({
  schemaVersion:1,agent,surface,model:modelSpec,context:state,scope,roles:[...roles],
  contracts,instructions,task:task.trim(),
  requiredEvidence:["current revision","authorized capability","observed tool result","independent postconditions"],
  executionStatus:"CONTRACT_READY_NOT_EXECUTED",weightsUpdated:false
 });
}
function feedbackRecord({agent,model,taskId,revision,trial,reviewer,consent}={}){
 if(!["AURA","FLOW"].includes(agent)||!modelProfile(model)||typeof taskId!=="string"||
  !/^[A-Za-z0-9_-]{8,90}$/.test(taskId)||typeof revision!=="string"||revision.length<7)
   throw Error("Invalid feedback identity");
 if(consent!==true||typeof reviewer!=="string"||!/^[A-Za-z0-9_-]{2,80}$/.test(reviewer))
   throw Error("Reviewed opt-in feedback required");
 if(!trial||!["PASS","FAIL"].includes(trial.result)||!["CODE","PATTERN","PRESERVATION"].includes(trial.dimension)||
   typeof trial.evidenceRef!=="string"||!/^(test:|sha256:|review:|artifact:)/.test(trial.evidenceRef))
   throw Error("Independent trial evidence required");
 return Object.freeze({schemaVersion:1,agent,model,taskId,revision,reviewedBy:reviewer,
  dimension:trial.dimension,result:trial.result,evidenceRef:trial.evidenceRef,
  content:"OMITTED_BY_DESIGN",trainingStatus:"LABELED_FEEDBACK_ONLY_NO_MODEL_TRAINING"});
}
function promotion(trials,settings){
 return reliabilitySummary(trials,settings);
}
module.exports={SURFACES,CAPABILITIES,modelProfile,cleanSnapshot,configure,feedbackRecord,promotion};
