"use strict";
// Demo tiers never charge cards, call Stripe, request tokens or claim live feeds.
(function(){
 const core=window.TowerflowFlow,inventory=window.TowerflowBusiness;
 if(!core||!inventory)return;
 const $=id=>document.getElementById(id);
 const tierSelect=$("tfFlowTier"),status=$("tfFlowStatus"),topic=$("tfFlowTopic"),output=$("tfFlowResult");
 if(!tierSelect||!status||!topic||!output)return;
 const key="towerflow-tier-demo-v1";
 let currentEvidence=null;
 const valid=Object.keys(core.TIERS);
 let name="starter";try{const saved=localStorage.getItem(key);if(valid.includes(saved))name=saved;}catch{}
 const format=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
 
 function sync(){
  const t=core.tier(name),result=core.limit(name,inventory.getMetrics().totalSkus);
  tierSelect.value=name;
  document.querySelector(".tf-flow-experience").dataset.tier=name;
  $("tfFlowTierSummary").textContent="Selected demonstration: "+format(t.price)+" • inventory "+result.count+"/"+t.skuLimit+" SKUs • FLOW "+(t.ai?"enabled (local analysis)":"unavailable")+".";
  $("tfFlowLimits").textContent=result.allowed?"Within simulated catalog capacity.":"Simulated catalog capacity exceeded. Your records remain untouched.";
  $("tfFlowAnalyze").disabled=!t.ai;
  $("tfFlowAura").disabled=!t.ai||!currentEvidence;
  topic.disabled=!t.ai;
  $("tfFlowDataLabel").textContent="SOURCE: LOCAL MANUAL / ILLUSTRATIVE DATA · NO LIVE MODEL OR MARKET API";
 }
 tierSelect.addEventListener("change",()=>{
  if(!valid.includes(tierSelect.value))return;
  name=tierSelect.value;
  try{localStorage.setItem(key,name);}catch{}
  currentEvidence=null;
  output.textContent="Tier demonstration switched. No payment or service activation occurred.";
  status.textContent="Demo only; $0 charged.";sync();
 });
 $("tfFlowAnalyze").addEventListener("click",()=>{
  try{
   const t=core.tier(name);
   if(!t.ai)throw Error("Select the $500 or $100,000 demonstration tier.");
   if(!core.TOPICS.includes(topic.value))throw Error("Unsupported analysis topic");
   const a=core.answer(topic.value,inventory.getMetrics(),name);
   currentEvidence=a;
   output.replaceChildren();
   const headline=document.createElement("strong");headline.textContent=")=L0\\/\\/ (FLOW) • "+a.topic.toUpperCase();
   const p=document.createElement("p");p.textContent=a.text;
   const caveat=document.createElement("small");caveat.textContent=a.evidence.disclaimer;
   output.append(headline,p,caveat);
   if(name==="corporate"){
     const heading=document.createElement("h3");heading.textContent="CORPORATE • MULTI-CATEGORY EXPOSURE";
     const table=document.createElement("table");
     const thead=document.createElement("thead");
     const header=document.createElement("tr");
     for(const label of ["CATEGORY","SKUS","STOCK COST","WEEKLY SALES","GROSS PROFIT","SPACE"]){
       const th=document.createElement("th");th.textContent=label;header.append(th);
     }
     thead.append(header);table.append(thead);
     const tbody=document.createElement("tbody");
     for(const c of a.evidence.categories){
       const tr=document.createElement("tr");
       for(const cell of [c.category,String(c.skus),format(c.capital),format(c.weeklyRevenue),format(c.weeklyGrossProfit),c.spaceSqFt.toFixed(1)+" sq ft"]){
         const td=document.createElement("td");td.textContent=cell;tr.append(td);
       }
       tbody.append(tr);
     }
     table.append(tbody);
     const box=document.createElement("div");box.className="table-wrap";box.append(table);
     output.append(heading,box);
   }
   status.textContent="Calculated from current local inventory • no external request or charge.";
  }catch(e){status.textContent=e.message;}
  sync();
 });
 $("tfFlowAura").addEventListener("click",async()=>{
  if(!currentEvidence||!core.tier(name).ai)return;
  const evidence=currentEvidence.evidence;
  const message="You are interpreting a LOCAL MANUAL/DEMONSTRATION inventory report; do not claim external verification, investment advice, or real-time stock prices. "+
    "Give actionable but conditional analysis with explicit limitations. Metrics: "+
    JSON.stringify({totalSkus:evidence.totalSkus,inventoryCost:evidence.inventoryCost,
      weeklyRevenue:evidence.weeklyRevenue,weeklyGrossProfit:evidence.weeklyGrossProfit,
      stagnantCost:evidence.stagnantCost,atRiskSkus:evidence.atRiskSkus,
      occupiedSqFt:evidence.occupiedSqFt,topic:currentEvidence.topic});
  if(!confirm("Send only these aggregate inventory metrics to the authenticated Towerflow AURA server for AI interpretation? No product names, portfolio transactions or credentials will be included."))return;
  const button=$("tfFlowAura");button.disabled=true;
  status.textContent="Requesting opt-in AURA model interpretation…";
  try{
    const res=await fetch("/api/aura/chat",{
      method:"POST",credentials:"same-origin",cache:"no-store",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({question:message})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||typeof data.answer!=="string")throw Error(data.error||"AURA not connected.");
    const block=document.createElement("section");
    block.className="panel";
    const heading=document.createElement("strong");heading.textContent="AURA MODEL INTERPRETATION • NOT INDEPENDENTLY VERIFIED";
    const p=document.createElement("p");p.textContent=data.answer;
    block.append(heading,p);output.append(block);
    status.textContent="AURA responded from the protected server; this is model-generated guidance, not externally verified business data.";
  }catch(e){status.textContent="AURA UNAVAILABLE: "+e.message+" Original FLOW report is preserved.";}
  finally{sync();}
 });
 // Preserve privacy: no automatic network call, no card/POS/market credentials.
 for(const btn of document.querySelectorAll("[data-tf-flow-quote]")){
  btn.addEventListener("click",async()=>{
   const ticker=$("tfMarketTicker").value.trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,13}$/.test(ticker)){
    status.textContent="Invalid ticker. Enter a symbol such as AAPL.";return;
   }
   btn.disabled=true;status.textContent="Checking authenticated provider connection (no trades).";
   try{
    const res=await fetch("/api/market/quote?symbol="+encodeURIComponent(ticker),{
     credentials:"same-origin",cache:"no-store",headers:{"Accept":"application/json"}
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok||data?.status!=="PROVIDER_DATA"||!data.quote)
     throw Error(data?.message||"NOT CONNECTED: market provider endpoint unavailable.");
    const q=data.quote;
    if(q.symbol!==ticker||!Number.isFinite(q.price)||q.price<=0)
     throw Error("Market provider returned invalid data.");
    status.textContent=q.symbol+" • "+format(q.price)+" • "+q.asOf+" • "+q.source+
      ". "+q.freshness+". No buy/sell recommendation or portfolio price modification.";
   }catch(err){status.textContent="NOT CONNECTED / FAILED: "+err.message;}
   finally{btn.disabled=false;}
  });
 }
 sync();
}());
