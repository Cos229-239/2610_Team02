"use strict";
// Explicit, user-initiated task runner for server-side FLOW skills. No model
// impersonation, private key exposure, payment or code execution.
(function(){
 const inspect=document.getElementById("tfAgentInspect"),runInventory=document.getElementById("tfAgentInventory"),
       runMarket=document.getElementById("tfAgentMarket"),status=document.getElementById("tfAgentStatus"),
       trace=document.getElementById("tfAgentTrace");
 if(!inspect||!runInventory||!runMarket||!status||!trace)return;
 const $=id=>document.getElementById(id);
 const planButton=$("tfAgentPlan"),approveButton=$("tfAgentApprovePlan"),question=$("tfAgentQuestion"),companyBtn=$("tfAgentCompany");
 let proposed=null;
 const buttons=[inspect,runInventory,runMarket,planButton,companyBtn].filter(Boolean);
 const print=data=>{trace.textContent=JSON.stringify(data,null,2).slice(0,18000);};
 const busy=b=>buttons.forEach(btn=>btn.disabled=b);
 async function request(url,body){
  const opt={credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}};
  if(body){opt.method="POST";opt.headers["Content-Type"]="application/json";opt.body=JSON.stringify(body);}
  const response=await fetch(url,opt);
  const json=await response.json().catch(()=>null);
  if(!response.ok)throw Error(json?.error||"Agent route is not active on this server.");
  return json;
 }
 async function execute(task){
  busy(true);status.textContent="Executing approved agent skill…";
  try{
   const result=await request("/api/agents/run",task);
   if(!Array.isArray(result.trace)||!Array.isArray(result.sources))throw Error("Unverified tool execution response");
   print({summary:result.summary,skill:result.skill,trace:result.trace,sources:result.sources,
     evidence:result.evidence,limitations:result.disclaimer});
   status.textContent="Server returned "+result.trace.length+" audited tool steps. Check provider timestamps and data provenance; this does not prove model autonomy.";
  }catch(e){status.textContent="AGENT UNAVAILABLE: "+e.message;print({status:"NOT CONNECTED",reason:e.message});}
  finally{busy(false);}
 }
 function taskKey(){return "task_"+Date.now()+"_"+Math.random().toString(36).slice(2,11);}
 planButton.addEventListener("click",async()=>{
  proposed=null;approveButton.disabled=true;
  const text=question.value.trim();
  if(text.length<4){status.textContent="Describe a specific inventory or market research task.";return;}
  busy(true);status.textContent="Requesting one model-proposed reviewed tool skill…";
  try{
   const result=await request("/api/agents/plan",{question:text,itemsAvailable:true});
   if(result.executed!==false||result.approved!==false||
      !["inventory.review","market.research","company.research"].includes(result.proposal?.skill))
     throw Error("Unapproved or unsupported model tool proposal");
   proposed=result.proposal;
   approveButton.disabled=false;
   print({proposal:proposed,model:result.model,executed:false,
     next:"Review the selected skill, then explicitly confirm execution."});
   status.textContent="Model proposed "+proposed.skill+". NO tool has executed. Review before approving.";
  }catch(e){status.textContent="PLANNER UNAVAILABLE: "+e.message;print({status:"NOT CONNECTED",reason:e.message});}
  finally{busy(false);}
 });
 approveButton.addEventListener("click",()=>{
  const p=proposed;proposed=null;approveButton.disabled=true;
  if(!p)return;
  if(p.skill==="company.research"){
    if(!confirm("Approve FLOW SEC EDGAR company facts lookup for CIK "+p.cik+"? Official filing facts are periodic, not live sales."))return;
    execute({skill:"company.research",cik:p.cik,idempotencyKey:taskKey()});
  }else if(p.skill==="market.research"){
    if(!confirm("Approve FLOW market.quote for "+p.symbol+"? This performs one authenticated provider lookup, not a trade."))return;
    execute({skill:"market.research",symbol:p.symbol,idempotencyKey:taskKey()});
  }else if(p.skill==="inventory.review"){
    const items=window.TowerflowBusiness?.getMetrics()?.items;
    if(!Array.isArray(items)||items.length>250){status.textContent="Inventory skill is capped at 250 catalog items.";return;}
    if(!confirm("Approve FLOW inventory.analyze on "+items.length+" normalized product records? Names, costs and sales are sent to the protected server."))return;
    execute({skill:"inventory.review",items,idempotencyKey:taskKey()});
  }
 });
 inspect.addEventListener("click",async()=>{
  busy(true);status.textContent="Inspecting server agent capabilities…";
  try{
   const caps=await request("/api/agents/status");
   print(caps);status.textContent="Capabilities returned by the authenticated server. Not all providers may be connected.";
  }catch(e){print({status:"NOT CONNECTED",reason:e.message});status.textContent="AGENT UNAVAILABLE: "+e.message;}
  finally{busy(false);}
 });
 runInventory.addEventListener("click",()=>{
  const state=window.TowerflowBusiness?.getMetrics();
  const items=state?.items;
  if(!Array.isArray(items)||items.length>250){status.textContent="Inventory skill supports 250 items per invocation.";return;}
  if(!confirm("Send "+items.length+" inventory records to the authenticated FLOW agent task runner? This includes SKU, product name, costs and recorded weekly sales."))return;
  execute({skill:"inventory.review",idempotencyKey:taskKey(),items});
 });
 companyBtn?.addEventListener("click",()=>{
  const cik=$("tfCompanyCIK")?.value.trim();
  if(!/^\d{1,10}$/.test(cik||"")){status.textContent="Enter a valid SEC CIK (1 to 10 digits).";return;}
  if(!confirm("Fetch real public-company SEC EDGAR financial filing facts for CIK "+cik+"? Figures are not streaming sales."))return;
  execute({skill:"company.research",idempotencyKey:taskKey(),cik});
 });
 // Opt-in, same-origin, read-only polling of actual provider trades. No invented quotes.
 const liveToggle=$("tfLiveQuoteToggle"),liveStatus=$("tfLiveQuoteStatus");
 let liveTimer=null,liveInFlight=false;
 async function liveQuote(){
  if(liveInFlight||document.visibilityState==="hidden")return;
  const ticker=$("tfMarketTicker")?.value.trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,13}$/.test(ticker||"")){
   liveStatus.textContent="Enter a valid ticker for the real market feed.";stopLive();return;
  }
  liveInFlight=true;
  try{
   const response=await fetch("/api/market/quote?symbol="+encodeURIComponent(ticker),{
    credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}
   });
   const payload=await response.json().catch(()=>null);
   if(!response.ok||payload?.status!=="PROVIDER_DATA")throw Error(payload?.message||"Provider unavailable");
   const q=payload.quote;
   if(!q||!Number.isFinite(q.price)||!Number.isFinite(Date.parse(q.asOf))||
     typeof q.source!=="string")throw Error("Provider evidence is incomplete");
   liveStatus.textContent=ticker+" · "+q.price.toFixed(2)+" USD · "+q.source+" · "+q.asOf+
     " · "+(q.coverage||"provider-specific coverage")+" · "+q.freshness+
     (q.cache==="HIT"?" · cached":"");
  }catch(error){
   liveStatus.textContent="FEED DISCONNECTED: "+String(error.message).slice(0,180)+". No fallback prices shown.";
   stopLive();
  }finally{liveInFlight=false;}
 }
 function stopLive(){
  if(liveTimer!==null)clearInterval(liveTimer);
  liveTimer=null;
  if(liveToggle){liveToggle.setAttribute("aria-pressed","false");liveToggle.textContent="Start real quote feed";}
 }
 liveToggle?.addEventListener("click",()=>{
  if(liveTimer!==null){stopLive();liveStatus.textContent="Market feed paused by user.";return;}
  liveToggle.setAttribute("aria-pressed","true");
  liveToggle.textContent="Stop quote feed";
  liveStatus.textContent="Connecting to authenticated real-data provider…";
  liveQuote();liveTimer=setInterval(liveQuote,12000);
 });
 window.addEventListener("pagehide",stopLive);
 runMarket.addEventListener("click",()=>{
  const symbol=$("tfMarketTicker")?.value.trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,13}$/.test(symbol||"")){status.textContent="Enter a valid ticker.";return;}
  execute({skill:"market.research",idempotencyKey:taskKey(),symbol});
 });
}());
