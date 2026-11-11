"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {SAMPLE,POLICY,analyze,createSimulator}=require("./corporate-core.js");
const args={oldSku:"OLD-04",prototype:"Nova Tablet 2027",units:100,prototypeUnitCost:170,
 prototypeSellPrice:400,prototypeWeeklySales:20,swapHandlingCostPerUnit:15,horizonWeeks:12};
test("top sellers and stagnant categories have real deterministic demo math",()=>{
 const rows=analyze();
 assert.equal(rows.length,4);
 assert.equal(rows.find(x=>x.sku==="SAT-03").status,"TOP SELLER");
 assert.equal(rows.find(x=>x.sku==="OLD-04").status,"REVIEW");
 assert.equal(rows.find(x=>x.sku==="OLD-04").weeklyHolding,492);
});
test("simulated swap records costs, forecasts and never claims actual shipment or receipt",()=>{
 const s=createSimulator({clock:()=>new Date("2026-11-10T18:00:00Z"),uuid:()=>"evt-1"});
 const proposed=s.quote(args);
 assert.equal(proposed.disposalWriteOff,24000);
 assert.equal(proposed.swapHandling,1500);
 assert.equal(proposed.oldHoldingAvoided,1440);
 assert.equal(proposed.forecastGrossMargin,55200);
 assert.equal(proposed.netForecast,31140);
 assert.equal(proposed.externalSystemsChanged,false);
 const entry=s.simulate(args);
 assert.equal(entry.simulated,true);
 assert.equal(entry.externalAcknowledgments.length,0);
 assert.equal(s.annualReport(2026).forecastNet,31140);
 assert.equal(s.annualReport(2026).officialReceipts.length,0);
});
test("three simulations is explicitly an org policy, never claimed tax law",()=>{
 const s=createSimulator({clock:()=>new Date("2026-11-10T18:00:00Z")});
 for(let i=0;i<3;i++)s.simulate(args);
 assert.equal(s.annualReport(2026).remaining,0);
 assert.throws(()=>s.simulate(args),/annual simulation limit/);
 assert.match(POLICY.reason,/NOT a tax-law/);
});
test("invalid SKU, assumptions, inventory and negative costs fail closed",()=>{
 const s=createSimulator();
 assert.throws(()=>s.quote({...args,units:9999}),/Units exceed/);
 assert.throws(()=>s.quote({...args,prototypeSellPrice:-1}),/Invalid/);
 assert.throws(()=>s.quote({...args,oldSku:"SECRET-SKU"}),/Unknown/);
 assert.throws(()=>analyze([{...SAMPLE[0],unitsOnHand:-1}]),/Invalid/);
});
