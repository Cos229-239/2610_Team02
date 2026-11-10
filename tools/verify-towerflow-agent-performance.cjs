#!/usr/bin/env node
"use strict";
// Acceptance harness: fixture-backed tool execution. This is not evidence of
// live provider latency, model quality, or host integrations.
const {createAgent}=require("../integrations/agents/towerflow-agent.cjs");
const inventory=require("../TowerFlow/inventory-core.js");
async function main(){
 const results=[],failures=[];
 const quotes={configured:()=>true,quote:async symbol=>({
  symbol,price:200.12,currency:"USD",asOf:"2026-11-06",source:"FIXTURE ONLY",freshness:"FIXTURE/NOT LIVE"
 })};
 const agent=createAgent({quotes});
 for(let i=0;i<40;i++){
  const skill=i%2===0?"inventory.review":"market.research";
  const task=skill==="inventory.review"?
   {skill,idempotencyKey:"bench-inventory-"+i,items:inventory.demo}:
   {skill,idempotencyKey:"bench-market-"+i,symbol:"AAPL"};
  const start=performance.now();
  try{
   const r=await agent.run(task,{userId:"qa_user",role:"contributor"});
   const elapsed=performance.now()-start;
   if(!Array.isArray(r.trace)||r.trace.length!==2||!Array.isArray(r.sources)||r.sources.length!==1)
    throw Error("Missing evidence trace");
   if(skill==="inventory.review"&&r.evidence.totalSkus!==5)throw Error("Inventory count regression");
   if(skill==="market.research"&&r.sources[0].provider!=="FIXTURE ONLY")throw Error("False provider label");
   results.push({skill,elapsedMs:elapsed});
  }catch(e){failures.push({case:i,error:String(e.message)});}
 }
 const percentile=p=>{
  const sorted=results.map(x=>x.elapsedMs).sort((a,b)=>a-b);
  return sorted.length?Number(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)].toFixed(2)):null;
 };
 const report={
  suite:"TowerFlow deterministic agent skill acceptance",
  fixtureOnly:true,liveProviderMeasured:false,ollamaMeasured:false,
  passed:results.length,failed:failures.length,p50FixtureMs:percentile(.5),
  p95FixtureMs:percentile(.95),limitations:"Execution and trace reliability for fixture tools only. No real Ollama, market entitlement or production host measured.",
  failures
 };
 process.stdout.write(JSON.stringify(report,null,2)+"\n");
 if(failures.length||results.length!==40)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
