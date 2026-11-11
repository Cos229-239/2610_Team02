"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {score,compare}=require("./prediction-experiment.cjs");
const row=(id,probability,actual,protocol="fixed-v1")=>({
 caseId:String(id),protocol,predicted:probability>=.5,probability,actual,
 predictedAt:"2026-11-09T10:00:00Z",observedAt:"2026-11-09T11:00:00Z",
 evidenceRef:"sha256:independent-measurement-"+id
});
test("perfect predictions have exact accuracy and zero Brier loss",()=>{
 const result=score([row(1,1,true),row(2,0,false)],{minSamples:2});
 assert.equal(result.ready,true);
 assert.equal(result.exactOutcomeAccuracy,1);
 assert.equal(result.brierScore,0);
 assert.equal(result.logLoss,0);
});
test("confident, incorrect predictions are penalized",()=>{
 const s=score([row(1,.99,false)],{minSamples:3});
 assert.equal(s.ready,false);
 assert.equal(s.exactOutcomeAccuracy,0);
 assert.equal(s.confidentErrors,1);
 assert.ok(s.brierScore>.9);
});
test("independent paired comparison detects genuine Brier improvement",()=>{
 const before=[row(1,.8,false),row(2,.2,true)];
 const after=[row(1,.2,false),row(2,.8,true)];
 const value=compare(before,after,{minSamples:2});
 assert.equal(value.improved,true);
 assert.ok(value.brierImprovement>.5);
});
test("incompatible or duplicate outcome claims fail closed",()=>{
 assert.throws(()=>score([row(1,.9,true),row(1,.9,true)]),/Duplicate/);
 assert.throws(()=>score([row(1,Number.NaN,true)]),/Probability/);
 assert.throws(()=>score([{...row(1,.5,true),observedAt:"2026-11-09T09:00:00Z"}]),/postdate/);
 assert.throws(()=>compare([row(1,.6,true)],[row(1,.6,false)]),/same independently observed/);
 assert.throws(()=>score([{...row(1,.5,true),evidenceRef:""}]),/reference/);
});
test("no test statistics imply universal guarantees",()=>{
 const s=score([row(1,.9,true)],{minSamples:30});
 assert.equal(s.ready,false);
 assert.equal(typeof s.guarantee,"undefined");
});
