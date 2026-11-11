"use strict";
// FRONTIER_EXECUTION_EVIDENCE_V1
// Strict pure evaluator for independently collected observations.
// This module NEVER executes a model, trusts a claimed score, authenticates a
// remote evidence reference, changes project state, or deploys anything.
const GATES=Object.freeze(["code","pattern","preservation"]);
const STATES=new Set(["PASS","FAIL","UNKNOWN"]);
function isObject(x){return x!==null&&typeof x==="object"&&!Array.isArray(x);}
function textField(x,min=1,max=256){return typeof x==="string"&&x.length>=min&&x.length<=max&&x.trim()===x;}
function validateTrial(t){
 if(!isObject(t)||!textField(t.id,3,80)||!textField(t.objective,8,1200)||
    !textField(t.revision,7,128)||!textField(t.protocol,3,100)||
    !textField(t.startedAt,20,40)||!textField(t.finishedAt,20,40))
   throw Error("Invalid trial identification");
 const start=Date.parse(t.startedAt),end=Date.parse(t.finishedAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error("Invalid chronological order");
 if(!isObject(t.gates))throw Error("Missing gates");
 for(const gate of GATES){
  const checks=t.gates[gate];
  if(!Array.isArray(checks)||checks.length===0||checks.length>100)throw Error("Missing/oversized "+gate+" checks");
  const seen=new Set();
  for(const check of checks){
   if(!isObject(check)||!textField(check.id,2,100)||seen.has(check.id)||
      !STATES.has(check.status)||!textField(check.method,3,100))
    throw Error("Invalid "+gate+" check");
   seen.add(check.id);
   if(check.status!=="UNKNOWN"&&(!textField(check.evidence,8,400)||
       !/^(sha256:|artifact:|test:|review:)/.test(check.evidence)))
    throw Error("Passing/failing checks require a qualifying evidence reference");
   if(check.status==="UNKNOWN"&&check.evidence!==undefined)
    throw Error("Unknown check cannot claim observed evidence");
  }
 }
 return t;
}
function evaluate(t){
 validateTrial(t);
 const scores={};
 for(const gate of GATES){
  const checks=t.gates[gate],fail=checks.some(c=>c.status==="FAIL"),unknown=checks.some(c=>c.status==="UNKNOWN");
  scores[gate]={state:fail?"FAIL":unknown?"UNKNOWN":"PASS",passed:checks.filter(c=>c.status==="PASS").length,
    total:checks.length,score:!fail&&!unknown?10:0};
 }
 const passed=GATES.every(g=>scores[g].state==="PASS");
 return Object.freeze({id:t.id,revision:t.revision,protocol:t.protocol,passed,gates:scores,
  classification:passed?"SOURCE-ATTESTED_PASS":"NOT_PASSED",
  caution:"Evidence identifiers are supplied, not authenticated by this library; an independent trusted collector and actual live-artifact tests are required."});
}
function wilson(successes,n,z=1.959963984540054){
 if(!Number.isInteger(n)||n<1||!Number.isInteger(successes)||successes<0||successes>n)
  throw Error("Invalid Wilson inputs");
 const p=successes/n,z2=z*z,denom=1+z2/n;
 return (p+z2/(2*n)-z*Math.sqrt((p*(1-p)+z2/(4*n))/n))/denom;
}
function summary(trials,{minTrials=30,minimumRate=.8}={}){
 if(!Array.isArray(trials)||!trials.length||trials.length>10000||
 !Number.isInteger(minTrials)||minTrials<1||!Number.isFinite(minimumRate)||
 minimumRate<=0||minimumRate>1)throw Error("Invalid promotion inputs");
 const ids=new Set();
 const results=trials.map(t=>{
  const r=evaluate(t),key=r.protocol+"\0"+r.id;
  if(ids.has(key))throw Error("Duplicate trial");
  ids.add(key);return r;
 });
 const n=results.length,passed=results.filter(r=>r.passed).length;
 const lower=wilson(passed,n);
 return Object.freeze({n,passed,observedRate:passed/n,confidenceLower95:lower,
  gateFailures:Object.fromEntries(GATES.map(g=>[g,results.filter(r=>r.gates[g].state!=="PASS").length])),
  readyForPromotion:n>=minTrials&&lower>=minimumRate,
  caution:"Not a proof of independent samples, unmodified ground truth, generalization, or a real-world 80% chance of project success. Require isolated held-out trials and external authenticated evidence."});
}
module.exports={GATES,validateTrial,evaluate,wilson,summary};
