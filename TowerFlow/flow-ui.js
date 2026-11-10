"use strict";
// Demo tiers never charge cards, call Stripe, request tokens or claim live feeds.
(function(){
 const core=window.TowerflowFlow,inventory=window.TowerflowBusiness;
 if(!core||!inventory)return;
 const $=id=>document.getElementById(id);
 const tierSelect=$("tfFlowTier"),status=$("tfFlowStatus"),topic=$("tfFlowTopic"),output=$("tfFlowResult");
 if(!tierSelect||!status||!topic||!output)return;
 const key="towerflow-tier-demo-v1",countKey="towerflow-flow-usage-v1";
 const valid=Object.keys(core.TIERS);
 let name="starter";try{const saved=localStorage.getItem(key);if(valid.includes(saved))name=saved;}catch{}
 const format=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
 function usage(){try{const value=JSON.parse(localStorage.getItem(countKey));return value&&typeof value==="object"?value:{};}catch{return {};}}
 function saveUsage(v){try{localStorage.setItem(countKey,JSON.stringify(v));}catch{}}
 function sync(){
  const t=core.tier(name),result=core.limit(name,inventory.getMetrics().totalSkus);
  tierSelect.value=name;
  $("tfFlowTierSummary").textContent="Selected demonstration: "+format(t.price)+" • inventory "+result.count+"/"+t.skuLimit+" SKUs • FLOW "+(t.ai?"enabled (local analysis)":"unavailable")+".";
  $("tfFlowLimits").textContent=result.allowed?"Within simulated catalog capacity.":"Simulated catalog capacity exceeded. Your records remain untouched.";
  $("tfFlowAnalyze").disabled=!t.ai;
  topic.disabled=!t.ai;
  $("tfFlowDataLabel").textContent="SOURCE: LOCAL MANUAL / ILLUSTRATIVE DATA · NO LIVE MODEL OR MARKET API";
 }
 tierSelect.addEventListener("change",()=>{
  if(!valid.includes(tierSelect.value))return;
  name=tierSelect.value;
  try{localStorage.setItem(key,name);}catch{}
  output.textContent="Tier demonstration switched. No payment or service activation occurred.";
  status.textContent="Demo only; $0 charged.";sync();
 });
 $("tfFlowAnalyze").addEventListener("click",()=>{
  try{
   const t=core.tier(name);
   if(!t.ai)throw Error("Select the $500 or $100,000 demonstration tier.");
   if(!core.TOPICS.includes(topic.value))throw Error("Unsupported analysis topic");
   const a=core.answer(topic.value,inventory.getMetrics(),name);
   output.replaceChildren();
   const headline=document.createElement("strong");headline.textContent=")=L0\\/\\/ (FLOW) • "+a.topic.toUpperCase();
   const p=document.createElement("p");p.textContent=a.text;
   const caveat=document.createElement("small");caveat.textContent=a.evidence.disclaimer;
   output.append(headline,p,caveat);
   status.textContent="Calculated from current local inventory • no external request or charge.";
  }catch(e){status.textContent=e.message;}
  sync();
 });
 // Preserve privacy: no automatic network call, no card/POS/market credentials.
 for(const btn of document.querySelectorAll("[data-tf-flow-quote]")){
  btn.addEventListener("click",()=>{
   status.textContent="Live quotes are NOT CONNECTED. This action cannot place trades or make a financial prediction.";
  });
 }
 sync();
}());
