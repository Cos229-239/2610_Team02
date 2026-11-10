"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {createMediator,validateOperation}=require("./configuration-mediator.cjs");
const hash="a".repeat(40);
const actor={session:{user:"trusted"}};
const base={authorize:async a=>a===actor?{userId:"member1",role:"contributor"}:null,origin:"https://towerflow.example",inspect:async()=>({environment:"isolated"}),propose:async({payload})=>({profile:payload.profile||payload.assetId||null}),test:async()=>({test:"queued"})};
test("untrusted caller denied before handler",async()=>{
 let calls=0;
 const m=createMediator({...base,inspect:async()=>{calls++;}});
 const out=await m.dispatch({operation:"environment.inspect",payload:{profile:"cpp"},actor:{},method:"GET"});
 assert.equal(out.status,403);assert.equal(calls,0);
});
test("world and code changes require same origin and an idempotency token",async()=>{
 const m=createMediator(base);
 const input={operation:"environment.propose",payload:{profile:"vs-community",baseRevision:hash,configuration:{language:"cpp",workloads:["native"]}},actor,method:"POST",requestOrigin:"https://towerflow.example"};
 assert.equal((await m.dispatch({...input,requestOrigin:"https://attacker.example"})).status,403);
 assert.equal((await m.dispatch(input)).status,400);
 const yes=await m.dispatch({...input,idempotencyKey:"unique-request-0001"});
 assert.equal(yes.status,202);
 const replay=await m.dispatch({...input,idempotencyKey:"unique-request-0001"});
 assert.deepEqual(replay,yes);
 assert.equal((await m.dispatch({...input,idempotencyKey:"unique-request-0001",payload:{...input.payload,profile:"other"}})).status,409);
});
test("read inspect is permitted, runner disabled fails closed",async()=>{
 const m=createMediator({authorize:base.authorize,origin:base.origin,inspect:base.inspect});
 assert.equal((await m.dispatch({operation:"environment.inspect",payload:{profile:"cpp"},actor,method:"GET"})).status,200);
 const absent=await m.dispatch({operation:"environment.test",payload:{proposalId:"P1",baseRevision:hash,suite:"node-tests"},actor,method:"POST",requestOrigin:base.origin,idempotencyKey:"run-0000000001"});
 assert.equal(absent.status,501);
});
test("untrusted role cannot review/merge",async()=>{
 const m=createMediator({...base,review:async()=>({merged:false})});
 const out=await m.dispatch({operation:"contribution.review",payload:{contributionId:"PR10",decision:"approve",baseRevision:hash},actor,method:"POST",requestOrigin:base.origin,idempotencyKey:"review-0000001"});
 assert.equal(out.status,403);
});
test("declared config does not accept shell or arbitrary root paths",()=>{
 assert.throws(()=>validateOperation("environment.propose",{profile:"cpp",baseRevision:hash,configuration:{shell:"powershell -command x"}}));
 assert.throws(()=>validateOperation("environment.propose",{profile:"cpp",baseRevision:hash,configuration:{language:"cpp"},rootPath:"C:\\"}));
 assert.throws(()=>validateOperation("environment.test",{proposalId:"p",suite:"test",baseRevision:"latest"}));
});
test("distinct code and room contributions require pinned revision",async()=>{
 const m=createMediator({...base,contribute:async({payload})=>({target:payload.target,merge:false})});
 for(const target of ["towerflow","room"]){
  const out=await m.dispatch({operation:"contribution.submit",payload:{branch:"feature/a",baseRevision:hash,synopsis:"Test addition",target},actor,method:"POST",requestOrigin:base.origin,idempotencyKey:"submit-"+target+"-2026"});
  assert.equal(out.status,202);assert.equal(out.body.result.target,target);
 }
});
