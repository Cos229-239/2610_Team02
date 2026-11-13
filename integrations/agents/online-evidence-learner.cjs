"use strict";
// Incremental Bayesian skill-quality learner. It genuinely updates a learned
// routing policy from independent, consented outcome labels; it NEVER changes
// weights of Ollama/Claude/OpenAI models or grants new tool privileges.
const {wilson}=require("./frontier-execution-evidence.cjs");
const {modelProfile,CAPABILITIES}=require("./dual-agent-harness.cjs");
const VALID=new Set(["PASS","FAIL"]);
function createEvidenceLearner({minTrials=30,promotionFloor=.8}={}){
 if(!Number.isInteger(minTrials)||minTrials<20||!Number.isFinite(promotionFloor)||promotionFloor<.5||promotionFloor>1)
  throw Error("Invalid sample and promotion gates");
 const buckets=new Map(),seen=new Set();
 function key(agent,family,skill,surface){
  if(!Object.hasOwn(CAPABILITIES,agent))throw Error("Unknown agent");
  if(![CAPABILITIES[agent].surface,"development"].includes(surface)||
    (agent==="FLOW"&&surface!=="towerflow"))throw Error("Cross-application learning rejected");
  if(![...CAPABILITIES[agent].installed,...CAPABILITIES[agent].candidates].includes(skill))
   throw Error("Unregistered skill");
  return [agent,family,skill,surface].join("|");
 }
 function observe({agent,model,surface,skill,taskId,consent,reviewedBy,gates,evidenceRef}={}){
  const family=modelProfile(model).family,bucket=key(agent,family,skill,surface);
  if(consent!==true||typeof reviewedBy!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(reviewedBy))
   throw Error("Human feedback consent and reviewer required");
  if(typeof taskId!=="string"||!/^[a-zA-Z0-9_-]{8,100}$/.test(taskId)||seen.has(taskId))
   throw Error("Task identifier missing or already learned");
  if(!gates||!["code","pattern","preservation"].every(g=>VALID.has(gates[g])))
   throw Error("Independent CODE/PATTERN/PRESERVATION labels required");
  if(typeof evidenceRef!=="string"||!/^(test:|review:|artifact:|sha256:)/.test(evidenceRef)||evidenceRef.length>250)
   throw Error("Independently reviewed evidence reference required");
  const pass=Object.values(gates).every(v=>v==="PASS");
  const prior=buckets.get(bucket)||{n:0,passed:0};
  const record={n:prior.n+1,passed:prior.passed+Number(pass)};
  buckets.set(bucket,record);seen.add(taskId);
  return {agent,modelFamily:family,skill,surface,
   trials:record.n,passed:record.passed,learnedPosteriorMean:(record.passed+1)/(record.n+2),
   lower95:record.n?wilson(record.passed,record.n):0,
   eligibleForReview:record.n>=minTrials&&wilson(record.passed,record.n)>=promotionFloor,
   modelWeightsUpdated:false,automaticPermissions:false};
 }
 function rank({agent,model,surface,skills}={}){
  if(!Array.isArray(skills)||skills.length>25)throw Error("Invalid skill selection");
  const family=modelProfile(model).family;
  return skills.map(skill=>{
   const record=buckets.get(key(agent,family,skill,surface))||{n:0,passed:0};
   const lower=record.n?wilson(record.passed,record.n):0;
   return {skill,sampleSize:record.n,passed:record.passed,
    estimatedPassRate:(record.passed+1)/(record.n+2),lower95:lower,
    qualified:record.n>=minTrials&&lower>=promotionFloor};
  }).sort((a,b)=>b.estimatedPassRate-a.estimatedPassRate||b.sampleSize-a.sampleSize);
 }
 function snapshot(){
  return {schemaVersion:1,statistics:[...buckets].map(([k,v])=>({bucket:k,n:v.n,passed:v.passed})),
   labelsAccepted:seen.size,contentStored:false,weightsUpdated:false,trainingMode:"ONLINE_BAYESIAN_POLICY_ONLY"};
 }
 return Object.freeze({observe,rank,snapshot});
}
module.exports={createEvidenceLearner};
