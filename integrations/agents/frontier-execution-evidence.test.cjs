"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {evaluate,summary,wilson}=require("./frontier-execution-evidence.cjs");
function trial(id=1,status="PASS"){
 return {id:"case-"+id,objective:"Make the Development Room projector open on E and preserve movement",
 revision:"12345678",protocol:"towerflow-e2e-v1",
 startedAt:"2026-11-11T01:00:00Z",finishedAt:"2026-11-11T01:01:00Z",
 gates:{
  code:[{id:"requirement",status,method:"inspected-diff",...(status!=="UNKNOWN"?{evidence:"review:diff-"+id}:{})}],
  pattern:[{id:"observed-projector",status,method:"browser-endstate",...(status!=="UNKNOWN"?{evidence:"artifact:playwright-"+id}:{})}],
  preservation:[{id:"wasd-regression",status,method:"browser-interaction",...(status!=="UNKNOWN"?{evidence:"test:wasd-"+id}:{})}]
 }};
}
test("full observed gates produce 10/10/10, with source-reference caveat",()=>{
 const r=evaluate(trial());
 assert.equal(r.passed,true);
 assert.deepEqual(Object.values(r.gates).map(g=>g.score),[10,10,10]);
 assert.match(r.caution,/not authenticated/);
});
test("unknown is never treated as a pass",()=>{
 const t=trial();t.gates.pattern[0]={id:"visual",status:"UNKNOWN",method:"browser-not-run"};
 const r=evaluate(t);assert.equal(r.passed,false);assert.equal(r.gates.pattern.state,"UNKNOWN");
});
test("preservation regression blocks promotion",()=>{
 const t=trial();t.gates.preservation[0].status="FAIL";
 const r=evaluate(t);assert.equal(r.passed,false);assert.equal(r.gates.preservation.score,0);
});
test("malformed and evidence-free passing verdicts fail closed",()=>{
 const t=trial();delete t.gates.code[0].evidence;
 assert.throws(()=>evaluate(t),/evidence reference/);
 const u=trial();u.gates.pattern[0].evidence="I say it worked";
 assert.throws(()=>evaluate(u),/evidence reference/);
 const v=trial();v.gates.code[0].status="UNKNOWN";
 assert.throws(()=>evaluate(v),/Unknown check/);
});
test("duplicate trials cannot inflate sample count",()=>{
 assert.throws(()=>summary([trial(),trial()]),/Duplicate trial/);
});
test("30 apparent perfect trials have a 95% Wilson lower bound above .8",()=>{
 const r=summary(Array.from({length:30},(_,i)=>trial(i)),{minTrials:30});
 assert.equal(r.observedRate,1);
 assert.ok(r.confidenceLower95>.8);
 assert.equal(r.readyForPromotion,true);
});
test("24 of 30 passes do not establish ≥80% population reliability",()=>{
 const cases=Array.from({length:30},(_,i)=>trial(i,i<24?"PASS":"FAIL"));
 const r=summary(cases);
 assert.equal(r.observedRate,.8);
 assert.ok(r.confidenceLower95<.8);
 assert.equal(r.readyForPromotion,false);
});
test("all-success 12 trials cannot satisfy minimum sample gate",()=>{
 const r=summary(Array.from({length:12},(_,i)=>trial(i)));
 assert.equal(r.readyForPromotion,false);
});
test("Wilson interval obeys conservative uncertainty",()=>{
 assert.ok(wilson(8,10)<.8);
 assert.ok(wilson(30,30)<1);
 assert.throws(()=>wilson(11,10),/Invalid/);
});
