"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createLearningLoop}=require("./evidence-learning-loop.cjs");
const input={taskId:"task-1",ownerId:"dev-a",claim:"A proposed optimization improved rendering",
 context:"Earth view on desktop",source:"feature branch benchmark",observations:["Measured before and after"],
 nextAction:"Repeat benchmark on second device"};
test("proposals are deduplicated, bounded, isolated and not trusted by default",()=>{
 const loop=createLearningLoop({clock:()=>100});
 const first=loop.propose(input);
 assert.equal(first.status,"proposed");
 assert.equal(first.id,loop.propose(input).id);
 assert.equal(loop.query().length,0);
 first.claim="forged";
 assert.equal(loop.get(first.id).claim,input.claim);
 assert.throws(()=>loop.propose({...input,claim:"".padEnd(601,"x")}),/Invalid bounded text/);
});
test("only independent maintainer with evidence promotes verified knowledge",()=>{
 const loop=createLearningLoop({clock:()=>100});
 const entry=loop.propose(input);
 const req={id:entry.id,decision:"verified",evidence:[{kind:"test",reference:"CI run 123"}],reason:"Repeatable test passed"};
 assert.throws(()=>loop.review({...req,reviewerId:"dev-b",role:"contributor"}),/Maintainer/);
 assert.throws(()=>loop.review({...req,reviewerId:"dev-a",role:"maintainer"}),/Independent/);
 assert.throws(()=>loop.review({...req,reviewerId:"dev-b",role:"maintainer",evidence:[]}),/evidence/i);
 const result=loop.review({...req,reviewerId:"dev-b",role:"maintainer"});
 assert.equal(result.status,"verified");
 assert.equal(loop.exportReviewed().entries.length,1);
 assert.throws(()=>loop.review({...req,reviewerId:"dev-b",role:"maintainer"}),/already reviewed/);
});
test("rejected claims never enter reviewed export",()=>{
 const loop=createLearningLoop();
 const item=loop.propose(input);
 loop.review({id:item.id,reviewerId:"dev-b",role:"maintainer",decision:"rejected",
  evidence:[{kind:"manual",reference:"Visual comparison failed"}],reason:"Cannot reproduce"});
 assert.equal(loop.query({status:"rejected"}).length,1);
 assert.deepEqual(loop.exportReviewed().entries,[]);
});
test("no model training, host execution or unverified automatic promotion",()=>{
 const loop=createLearningLoop();
 assert.equal(typeof loop.execute,"undefined");
 assert.equal(typeof loop.train,"undefined");
 assert.equal(typeof loop.importTrusted,"undefined");
});
