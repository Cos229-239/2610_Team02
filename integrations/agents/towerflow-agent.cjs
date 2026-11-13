"use strict";
// Bounded TowerFlow agent runner. No shell, file writes, brokerage, payments,
// deployment, Git mutations, voice cloning, or arbitrary user-selected URLs.
const {randomUUID}=require("node:crypto");
const {symbol}=require("../market/alpha-vantage.cjs");
const {createSourceAwareQuotes}=require("../market/alpaca-iex.cjs");
const {createCompanyFacts,cik}=require("../market/sec-company-facts.cjs");
const flow=require("../../TowerFlow/flow-core.js");
const TOOLS=Object.freeze({
 "market.quote":Object.freeze({readOnly:true,requires:"market-provider",description:"Provider-reported latest stock quote; freshness is explicit."}),
 "company.facts":Object.freeze({readOnly:true,requires:"SEC-EDGAR",description:"Registered public-company filing metrics with dates, not intraday sales."}),
 "inventory.analyze":Object.freeze({readOnly:true,requires:"user-aggregates",description:"Deterministic category, velocity, and capital analysis from user supplied inventory."}),
 "report.brief":Object.freeze({readOnly:true,requires:"evidence",description:"Synthesizes a traceable briefing from prior tools; no model speculation."})
});
const SKILLS=Object.freeze({
 "market.research":Object.freeze({tools:["market.quote","report.brief"],description:"Stock lookup with source and date."}),
 "company.research":Object.freeze({tools:["company.facts","report.brief"],description:"SEC financial facts from real public companies."}),
 "inventory.review":Object.freeze({tools:["inventory.analyze","report.brief"],description:"Inventory risk and revenue analysis."})
});
const ROLE={viewer:0,contributor:1,maintainer:2};
function validTask(task){
 if(!task||typeof task!=="object"||Array.isArray(task))throw Error("Invalid task");
 if(!Object.hasOwn(SKILLS,task.skill))throw Error("Unsupported agent skill");
 if(typeof task.idempotencyKey!=="string"||!/^[a-zA-Z0-9_-]{8,80}$/.test(task.idempotencyKey))throw Error("Invalid idempotency key");
 if(task.skill==="market.research")symbol(task.symbol);
 if(task.skill==="company.research")cik(task.cik);
 if(task.skill==="inventory.review"){
  if(!Array.isArray(task.items)||task.items.length>250)throw Error("Inventory inputs limited to 250 items per task");
  // Reuse inventory input normalization and bounds, not arbitrary model text.
  const core=require("../../TowerFlow/inventory-core.js");
  core.analyze(task.items);
 }
 return true;
}
function createAgent({quotes=createSourceAwareQuotes(),companies=createCompanyFacts(),clock=()=>Date.now(),uuid=randomUUID}={}){
 const recent=new Map();
 const status=()=>Object.freeze({
  version:1,mode:"BOUNDED_TOOL_EXECUTION",modelAutonomy:false,
  skills:SKILLS,tools:TOOLS,
  externallyConnected:{market:quotes.configured(),companyFilings:companies.configured()},
  marketFeed:typeof quotes.provider==="function"?quotes.provider():"USER_INJECTED_PROVIDER",
  limitations:["No autonomous code execution","No payment or stock trades","No real inventory connector","No AI persona impersonation","No writes or deployments"]
 });
 async function run(task,{userId,role="viewer"}={}){
  if(typeof userId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(userId))throw Error("Unauthorized agent identity");
  if(!Object.hasOwn(ROLE,role))throw Error("Unauthorized role");
  validTask(task);
  const prior=recent.get(userId+":"+task.idempotencyKey);
  if(prior&&prior.until>clock())throw Error("Duplicate task idempotency key");
  recent.set(userId+":"+task.idempotencyKey,{until:clock()+60000});
  if(recent.size>1000)recent.delete(recent.keys().next().value);
  const started=clock();
  const trace=[],sources=[];
  let evidence;
  if(task.skill==="market.research"){
   const quote=await quotes.quote(task.symbol);
   evidence={quote};
   trace.push({tool:"market.quote",status:"completed",source:quote.source,asOf:quote.asOf});
   sources.push({provider:quote.source,asOf:quote.asOf,quality:quote.freshness});
  }else if(task.skill==="company.research"){
   const company=await companies.company(task.cik);
   evidence={company};
   trace.push({tool:"company.facts",status:"completed",source:company.source,asOf:company.retrievedAt});
   sources.push({provider:company.source,asOf:company.retrievedAt,quality:company.filingUpdateModel});
  }else{
   const core=require("../../TowerFlow/inventory-core.js");
   const a=core.analyze(task.items);
   evidence=flow.summarize(a);
   trace.push({tool:"inventory.analyze",status:"completed",source:"user-submitted",items:a.totalSkus});
   sources.push({provider:"user-submitted",asOf:null,quality:"No external verification"});
  }
  const summary=task.skill==="market.research"?
   evidence.quote.symbol+" provider-reported price "+evidence.quote.price+" USD, dated "+evidence.quote.asOf+". "+evidence.quote.freshness+".":
   task.skill==="company.research"?
   evidence.company.name+" reported "+evidence.company.facts.length+" SEC filing metrics. This is periodic accounting data, not live sales.":
   "Analyzed "+evidence.totalSkus+" submitted SKUs. Inventory cost "+evidence.inventoryCost+" USD; weekly revenue estimate "+evidence.weeklyRevenue+" USD; at-risk inventory capital "+evidence.stagnantCost+" USD.";
  trace.push({tool:"report.brief",status:"completed",source:"prior evidence"});
  return {taskId:uuid(),skill:task.skill,mode:"AUDITED_DETERMINISTIC_TOOLS",summary,evidence,
   trace,sources,startedAt:started,elapsedMs:Math.max(0,clock()-started),
   disclaimer:"No buy/sell recommendation, payments, external inventory verification or autonomous action."};
 }
 return Object.freeze({status,run});
}
module.exports={createAgent,TOOLS,SKILLS,validTask};
