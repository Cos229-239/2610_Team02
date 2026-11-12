"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const c=require("./inventory-core.js");
test("auditable stock metrics and 0-sales lead to no-sales signal",()=>{
 const a=c.analyze(c.demo);
 assert.equal(a.totalSkus,5);
 assert.equal(a.atRiskSkus,3);
 assert.equal(a.unitsOnHand,312);
 assert.equal(a.inventoryCost,c.demo.reduce((n,p)=>n+p.units*p.unitCost,0));
 const gpu=a.items.find(p=>p.sku==="GPU-LEGACY");
 assert.equal(gpu.signal,"NO SALES");
 assert.equal(gpu.weeksOfCover,null);
 assert.equal(a.weeklyGrossProfit,c.demo.reduce((n,p)=>n+p.weeklySales*(p.unitPrice-p.unitCost),0));
});
test("reprice is a transparent constant-volume scenario",()=>{
 const r=c.reprice(c.demo[0],520);
 assert.equal(r.newPotentialGrossProfit-r.oldPotentialGrossProfit,(520-479)*96);
 assert.match(r.assumptions,/Demand changes UNKNOWN|demand elasticity unchanged/i);
 assert.deepEqual(c.demo[0].unitPrice,479);
});
test("reject invalid, duplicate and negative or zero-price inventory",()=>{
 assert.throws(()=>c.analyze([c.demo[0],c.demo[0]]),/Duplicate SKU/);
 assert.throws(()=>c.normalizeProduct({...c.demo[0],units:-1}),/units/);
 assert.throws(()=>c.normalizeProduct({...c.demo[0],weeklySales:Infinity}),/units/);
 assert.throws(()=>c.normalizeProduct({...c.demo[0],unitPrice:"abc"}),/sale price/);
});
test("legacy product can be paused without losing the record",()=>{
 const p=c.metrics({...c.demo[0],status:"paused"});
 assert.equal(p.signal,"PAUSED");
 assert.equal(p.units,96);
 assert.equal(p.weeklyRevenue,0);
 assert.equal(p.inventoryCost,96*390);
});
