/* TOWERFLOW_CORPORATE_SCENARIO_V1 — deterministic DEMONSTRATION simulation only. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TowerflowCorporate=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const POLICY=Object.freeze({maxSwapsPerYear:3,reason:"Configurable organization policy, NOT a tax-law requirement."});
 const SAMPLE=Object.freeze([
  Object.freeze({sku:"AUR-01",name:"Aurora Pro",category:"Devices",unitCost:260,sellPrice:590,unitsOnHand:180,weeklyUnitsSold:35,weeklyHoldingCostPerUnit:0.65}),
  Object.freeze({sku:"AUR-02",name:"Aurora Lite",category:"Devices",unitCost:180,sellPrice:350,unitsOnHand:320,weeklyUnitsSold:3,weeklyHoldingCostPerUnit:0.92}),
  Object.freeze({sku:"SAT-03",name:"Satellite Dock",category:"Accessories",unitCost:45,sellPrice:129,unitsOnHand:240,weeklyUnitsSold:60,weeklyHoldingCostPerUnit:0.15}),
  Object.freeze({sku:"OLD-04",name:"Legacy Tablet",category:"Devices",unitCost:240,sellPrice:325,unitsOnHand:410,weeklyUnitsSold:2,weeklyHoldingCostPerUnit:1.2})
 ]);
 const rounded=x=>Math.round((x+Number.EPSILON)*100)/100;
 function money(n){if(!Number.isFinite(n)||n<0||n>1e9)throw Error("Invalid nonnegative financial input");return n;}
 function analyze(items=SAMPLE){
  if(!Array.isArray(items)||items.length>500)throw Error("Invalid inventory");
  return items.map(x=>{
   for(const field of ["unitCost","sellPrice","unitsOnHand","weeklyUnitsSold","weeklyHoldingCostPerUnit"])money(x[field]);
   const weeklyRevenue=rounded(x.weeklyUnitsSold*x.sellPrice);
   const weeklyGrossMargin=rounded(x.weeklyUnitsSold*(x.sellPrice-x.unitCost));
   const weeklyHolding=rounded(x.unitsOnHand*x.weeklyHoldingCostPerUnit);
   const coverWeeks=x.weeklyUnitsSold?rounded(x.unitsOnHand/x.weeklyUnitsSold):null;
   return {...x,weeklyRevenue,weeklyGrossMargin,weeklyHolding,coverWeeks,
    status:weeklyGrossMargin>weeklyHolding*3?"TOP SELLER":"REVIEW"};
  });
 }
 function createSimulator({policy=POLICY,clock=()=>new Date(),uuid=()=>String(Date.now())}={}){
  if(!Number.isInteger(policy.maxSwapsPerYear)||policy.maxSwapsPerYear<1||policy.maxSwapsPerYear>100)
   throw Error("Invalid organization swap policy");
  const ledger=[];
  function quote(input){
   if(!input||!SAMPLE.some(x=>x.sku===input.oldSku))throw Error("Unknown demonstration SKU");
   const old=SAMPLE.find(x=>x.sku===input.oldSku);
   const prototype=String(input.prototype||"").trim();
   if(prototype.length<3||prototype.length>100)throw Error("Named prototype required");
   const units=money(input.units);if(!Number.isInteger(units)||units>old.unitsOnHand)throw Error("Units exceed current inventory");
   const improvedUnitCost=money(input.prototypeUnitCost),improvedPrice=money(input.prototypeSellPrice);
   const forecastWeeklySales=money(input.prototypeWeeklySales);
   const costPerUnit=money(input.swapHandlingCostPerUnit||0);
   const horizonWeeks=Number.isInteger(input.horizonWeeks)?input.horizonWeeks:12;
   if(horizonWeeks<1||horizonWeeks>52)throw Error("Invalid forecast horizon");
   const disposal=rounded(units*old.unitCost);
   const swapHandling=rounded(units*costPerUnit);
   const replacementCapital=rounded(units*improvedUnitCost);
   const oldHoldingAvoided=rounded(units*old.weeklyHoldingCostPerUnit*horizonWeeks);
   const forecastGrossMargin=rounded(forecastWeeklySales*(improvedPrice-improvedUnitCost)*horizonWeeks);
   const netForecast=rounded(forecastGrossMargin+oldHoldingAvoided-disposal-swapHandling);
   return Object.freeze({
    oldSku:old.sku,oldName:old.name,prototype,units,horizonWeeks,
    disposalWriteOff:disposal,swapHandling,replacementCapital,oldHoldingAvoided,
    forecastGrossMargin,netForecast,source:"DEMONSTRATION / USER-ENTERED ASSUMPTIONS",
    externalSystemsChanged:false,accountingStatus:"UNVERIFIED FORECAST — NOT OFFICIAL RECEIPT",
    proposedActions:["HOLD old SKU shipment in ERP AFTER APPROVAL","Remove affected items from shelves AFTER APPROVAL","Start prototype shipment AFTER APPROVAL"]
   });
  }
  function simulate(input){
   const now=clock();const year=now.getFullYear();
   const used=ledger.filter(e=>e.year===year).length;
   if(used>=policy.maxSwapsPerYear)throw Error("Organization policy: annual simulation limit reached");
   const result=quote(input);
   const entry=Object.freeze({id:uuid(),year,at:now.toISOString(),sequence:used+1,simulation:result,
     simulated:true,externalAcknowledgments:[],realizedGainLoss:null});
   ledger.push(entry);return entry;
  }
  function annualReport(year){
   if(!Number.isInteger(year)||year<2000||year>2200)throw Error("Invalid year");
   const entries=ledger.filter(e=>e.year===year);
   return Object.freeze({year,used:entries.length,remaining:Math.max(0,policy.maxSwapsPerYear-entries.length),
    forecastNet:rounded(entries.reduce((sum,e)=>sum+e.simulation.netForecast,0)),
    realizedNet:null,officialReceipts:[],entries:entries.map(e=>({...e})),
    disclaimer:"Demonstration event ledger. No accounting evidence, shipment integration, tax treatment or financial statement."});
  }
  return Object.freeze({quote,simulate,annualReport,policy,history:()=>ledger.map(e=>({...e}))});
 }
 return Object.freeze({SAMPLE,POLICY,analyze,createSimulator});
});
