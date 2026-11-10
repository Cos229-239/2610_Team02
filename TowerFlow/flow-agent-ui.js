"use strict";
// Explicit, user-initiated task runner for server-side FLOW skills. No model
// impersonation, private key exposure, payment or code execution.
(function(){
 const inspect=document.getElementById("tfAgentInspect"),runInventory=document.getElementById("tfAgentInventory"),
       runMarket=document.getElementById("tfAgentMarket"),status=document.getElementById("tfAgentStatus"),
       trace=document.getElementById("tfAgentTrace");
 if(!inspect||!runInventory||!runMarket||!status||!trace)return;
 const $=id=>document.getElementById(id);
 const buttons=[inspect,runInventory,runMarket];
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
 runMarket.addEventListener("click",()=>{
  const symbol=$("tfMarketTicker")?.value.trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,13}$/.test(symbol||"")){status.textContent="Enter a valid ticker.";return;}
  execute({skill:"market.research",idempotencyKey:taskKey(),symbol});
 });
}());
