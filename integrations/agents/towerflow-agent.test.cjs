"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createAgent,validTask}=require("./towerflow-agent.cjs");
const inv=require("../../TowerFlow/inventory-core.js");
test("agent declares exact tools and limitations",()=>{
 const s=createAgent({quotes:{configured:()=>false}}).status();
 assert.equal(s.modelAutonomy,false);
 assert.equal(s.externallyConnected.market,false);
 assert.deepEqual(s.skills["inventory.review"].tools,["inventory.analyze","report.brief"]);
});
test("inventory review executes bounded tool sequence and returns traceable evidence",async()=>{
 const agent=createAgent({quotes:{configured:()=>false},clock:()=>1000,uuid:()=>"task-fixture"});
 const task={skill:"inventory.review",idempotencyKey:"sample-task-101",items:inv.demo};
 const r=await agent.run(task,{userId:"member1"});
 assert.equal(r.taskId,"task-fixture");
 assert.equal(r.evidence.totalSkus,5);
 assert.deepEqual(r.trace.map(x=>x.tool),["inventory.analyze","report.brief"]);
 assert.equal(r.sources[0].provider,"user-submitted");
 await assert.rejects(agent.run(task,{userId:"member1"}),/Duplicate/);
});
test("market research uses source-stamped provider only",async()=>{
 const agent=createAgent({quotes:{configured:()=>true,quote:async symbol=>({symbol,price:201,asOf:"2026-11-06",source:"provider-test",freshness:"dated"})}});
 const r=await agent.run({skill:"market.research",idempotencyKey:"market-test-101",symbol:"AAPL"},{userId:"viewer123"});
 assert.equal(r.evidence.quote.price,201);
 assert.equal(r.sources[0].asOf,"2026-11-06");
 assert.deepEqual(r.trace.map(x=>x.tool),["market.quote","report.brief"]);
});
test("denies arbitrary skills, command strings, invalid identity and unbounded inputs",async()=>{
 assert.throws(()=>validTask({skill:"shell.execute",idempotencyKey:"unsafe-111"}),/Unsupported/);
 assert.throws(()=>validTask({skill:"market.research",symbol:"aapl",idempotencyKey:"task-123456"}),/Invalid ticker/);
 const agent=createAgent({quotes:{configured:()=>false}});
 await assert.rejects(agent.run({skill:"inventory.review",items:inv.demo,idempotencyKey:"task-123456"},{userId:"../../etc"}),/Unauthorized/);
});
