"use strict";
// TOWERFLOW_PREDICTION_EXPERIMENT_V1
// Pure evaluators: no storage, model calls, training, production changes or invented evidence.
// Inputs must be pre-registered predictions and independently observed binary outcomes.
function assertRecord(x){
 if(!x||typeof x!=="object"||Array.isArray(x))throw Error("Invalid record");
 if(typeof x.caseId!=="string"||!/^[-a-zA-Z0-9_.]{1,100}$/.test(x.caseId))throw Error("Invalid caseId");
 if(typeof x.predicted!=="boolean")throw Error("Prediction must be binary");
 if(typeof x.actual!=="boolean")throw Error("Actual outcome must be binary");
 if(typeof x.probability!=="number"||!Number.isFinite(x.probability)||x.probability<0||x.probability>1)
  throw Error("Probability must be finite in [0,1]");
 if(typeof x.predictedAt!=="string"||!Number.isFinite(Date.parse(x.predictedAt)))throw Error("Prediction timestamp required");
 if(typeof x.observedAt!=="string"||!Number.isFinite(Date.parse(x.observedAt)))throw Error("Observation timestamp required");
 if(Date.parse(x.observedAt)<=Date.parse(x.predictedAt))throw Error("Outcome must postdate prediction");
 if(typeof x.evidenceRef!=="string"||x.evidenceRef.trim().length<8||x.evidenceRef.length>300)
  throw Error("Independent outcome reference required");
 if(typeof x.protocol!=="string"||x.protocol.trim().length<4||x.protocol.length>120)
  throw Error("Experiment protocol required");
 return x;
}
function score(records,{minSamples=30}={}){
 if(!Array.isArray(records)||records.length===0||records.length>10000)throw Error("Expected 1–10000 records");
 if(!Number.isInteger(minSamples)||minSamples<1||minSamples>10000)throw Error("Invalid sample threshold");
 const seen=new Set();
 let hits=0,loss=0,logLoss=0,confidentErrors=0;
 const bins=Array.from({length:10},(_,i)=>({low:i/10,high:(i+1)/10,count:0,probabilitySum:0,outcomeSum:0}));
 for(const row of records){
  const x=assertRecord(row),key=x.protocol+"\0"+x.caseId;
  if(seen.has(key))throw Error("Duplicate case in protocol");
  seen.add(key);
  const y=Number(x.actual),p=x.probability;
  if(x.predicted===x.actual)hits++;
  loss+=(p-y)**2;
  logLoss+=-(y*Math.log(Math.max(p,1e-15))+(1-y)*Math.log(Math.max(1-p,1e-15)));
  if(x.predicted!==x.actual && (p>=.9||p<=.1))confidentErrors++;
  const bin=bins[Math.min(9,Math.floor(p*10))];bin.count++;bin.probabilitySum+=p;bin.outcomeSum+=y;
 }
 const n=records.length;
 return Object.freeze({
  n,ready:n>=minSamples,
  exactOutcomeAccuracy:hits/n,
  brierScore:loss/n,
  logLoss:logLoss/n,
  confidentErrors,
  calibrationBins:bins.map(({low,high,count,probabilitySum,outcomeSum})=>({
   low,high,count,meanConfidence:count?probabilitySum/count:null,observedFrequency:count?outcomeSum/count:null
  })),
  caveat:"Tests only the stated binary outcomes and protocol. Low score is not proof of general intelligence; observational references are not independently authenticated by this function."
 });
}
function compare(baseline,candidate,{minSamples=30}={}){
 if(!Array.isArray(baseline)||!Array.isArray(candidate)||baseline.length!==candidate.length)throw Error("Paired trials required");
 const a=new Map();
 for(const row of baseline){assertRecord(row);const key=row.protocol+"\0"+row.caseId;if(a.has(key))throw Error("Duplicate baseline");a.set(key,row);}
 const b=new Map();
 for(const row of candidate){assertRecord(row);const key=row.protocol+"\0"+row.caseId;if(b.has(key))throw Error("Duplicate candidate");b.set(key,row);}
 if(a.size!==b.size)throw Error("Mismatched cases");
 for(const [key,old] of a){
  const newer=b.get(key);
  if(!newer||old.actual!==newer.actual||old.observedAt!==newer.observedAt||old.evidenceRef!==newer.evidenceRef)
   throw Error("Paired cases must share the same independently observed outcome");
 }
 const before=score(baseline,{minSamples}),after=score(candidate,{minSamples});
 const delta=before.brierScore-after.brierScore;
 return Object.freeze({baseline:before,candidate:after,brierImprovement:delta,
  improved:before.ready&&after.ready&&delta>0,
  caution:"Paired improvement is descriptive, not statistically conclusive; evaluate independent holdout cases and uncertainty before promotion."});
}
module.exports={score,compare,assertRecord};
