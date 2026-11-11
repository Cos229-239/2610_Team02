"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createFlowPlanner,parseProposal}=require("./flow-planner.cjs");
test("structured proposal allows approved inventory and market skills only",()=>{
 assert.equal(parseProposal('{"skill":"market.research","symbol":"AAPL","summary":"Check quote"}').symbol,"AAPL");
 assert.equal(parseProposal({skill:"inventory.review",summary:"Inspect catalog"}).skill,"inventory.review");
 assert.throws(()=>parseProposal({skill:"shell.exec",command:"rm -rf /"}),/unsupported/);
 assert.throws(()=>parseProposal({skill:"market.research",symbol:"../../private"}),/ticker/);
 assert.throws(()=>parseProposal("not json"),/structured JSON/);
});
test("model produces proposal only; no tool is executed without approval",async()=>{
 let calls=0;
 const planner=createFlowPlanner({fetchFn:async(url,options)=>{
  calls++;assert.equal(new URL(url).hostname,"127.0.0.1");
  const req=JSON.parse(options.body);assert.equal(req.stream,false);
  return {ok:true,json:async()=>({message:{content:JSON.stringify({skill:"inventory.review",summary:"Inspect stock"})}})};
 }});
 const r=await planner.plan({question:"Can you review my inventory?",itemsAvailable:true});
 assert.equal(calls,1);assert.equal(r.executed,false);assert.equal(r.approved,false);
 assert.equal(r.requiresExplicitExecution,true);
 assert.equal(r.proposal.skill,"inventory.review");
});
test("planner rejects off-host endpoints and missing authorized context",async()=>{
 assert.throws(()=>createFlowPlanner({url:"https://attacker.example"}),/loopback/);
 const p=createFlowPlanner({fetchFn:async()=>({ok:true,json:async()=>({message:{content:'{"skill":"inventory.review"}'}})})});
 await assert.rejects(p.plan({question:"Review my stock list",itemsAvailable:false}),/context/);
 await assert.rejects(p.plan({question:"hi",itemsAvailable:true}),/Invalid planning question/);
});
