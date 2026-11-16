"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const flow=require("./flow-core.js"),inventory=require("./inventory-core.js");
const analysis=inventory.analyze(inventory.demo);
test("simulated tier prices, SKU capacities and FLOW access are explicit",()=>{
 assert.equal(flow.TIERS.starter.price,0);
 assert.equal(flow.TIERS.assisted.price,500);
 assert.equal(flow.TIERS.corporate.price,100000);
 assert.deepEqual(flow.limit("starter",26),{allowed:false,max:25,count:26});
 assert.equal(flow.limit("assisted",26).allowed,true);
 assert.equal(flow.TIERS.assisted.trendReports,3);
 assert.equal(flow.TIERS.assisted.marketSearches,5);
 assert.throws(()=>flow.answer("overview",analysis,"starter"),/requires/);
});
test("FLOW uses deterministic product evidence, without fake market feeds",()=>{
 const a=flow.answer("inventory risk",analysis,"assisted");
 assert.equal(a.live,false);
 assert.equal(a.model,"DETERMINISTIC LOCAL ANALYSIS");
 assert.equal(a.evidence.inventoryCost,analysis.inventoryCost);
 assert.equal(a.evidence.atRiskSkus,3);
 assert.equal(a.evidence.candidates[0].sku,"PHONE-PRIOR");
 assert.match(a.evidence.disclaimer,/not connected/);
 const b=flow.answer("gross margin",analysis,"corporate");
 assert.equal(b.evidence.weeklyGrossProfit,analysis.weeklyGrossProfit);
});
test("FLOW blocks invented topics, nonnumeric tiers and invalid evidence",()=>{
 assert.throws(()=>flow.tier("__proto__"));
 assert.throws(()=>flow.answer("buy this stock",analysis,"assisted"));
 assert.throws(()=>flow.limit("corporate",-1));
 assert.throws(()=>flow.summarize({items:[],inventoryCost:Infinity}));
});
