"use strict";
// Optional local Ollama planner. Proposes ONLY reviewed read-only skills;
// a human must separately approve execution. No commands, URLs, or writes.
const allowed=new Set(["inventory.review","market.research","company.research"]);
const {configure}=require("./dual-agent-harness.cjs");
function parseProposal(value){
 let obj=value;
 if(typeof value==="string"){
  if(value.length>2500)throw Error("Planner response too long");
  try{obj=JSON.parse(value);}catch{throw Error("Planner did not return structured JSON");}
 }
 if(!obj||typeof obj!=="object"||Array.isArray(obj)||!allowed.has(obj.skill))
  throw Error("Planner proposed unsupported skill");
 const proposal={skill:obj.skill,summary:typeof obj.summary==="string"?obj.summary.slice(0,240):"Reviewed read-only skill"};
 if(obj.skill==="company.research"){
  const {cik}=require("../market/sec-company-facts.cjs");
  proposal.cik=cik(obj.cik);
 }else if(obj.skill==="market.research"){
  const {symbol}=require("../market/alpha-vantage.cjs");
  proposal.symbol=symbol(obj.symbol);
 }else if(obj.symbol!==undefined)throw Error("Unexpected symbol");
 return Object.freeze(proposal);
}
function createFlowPlanner({fetchFn=globalThis.fetch,url=process.env.TOWERFLOW_OLLAMA_URL||"http://127.0.0.1:11434",
 model=process.env.TOWERFLOW_FLOW_MODEL||process.env.TOWERFLOW_AI_MODEL||"dolphin-llama3:8b",getTrustedContext=null}={}){
 const u=new URL(url);
 if(u.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(u.hostname)||u.username||u.password||
   (u.pathname!=="/"&&u.pathname!==""))throw Error("Ollama planner must be loopback HTTP");
 return Object.freeze({
  model,mode:"PROPOSAL_ONLY_NO_AUTO_EXECUTION",
  plan:async function({question,itemsAvailable=false}={}){
   if(typeof question!=="string"||question.trim().length<4||question.length>700)
    throw Error("Invalid planning question");
   const trusted=typeof getTrustedContext==="function"?await getTrustedContext():null;
   const h=configure({agent:"FLOW",model,surface:"towerflow",task:question.trim(),
     hostContext:trusted?.state,hostRevision:trusted?.revision,hostSource:trusted?.attested===true?"trusted-host":"unknown",
     roles:["viewer"],configuration:{scope:"user"}});
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetchFn(new URL("/api/chat",u),{
     method:"POST",signal:controller.signal,redirect:"error",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
      model,stream:false,format:"json",options:{temperature:0,num_predict:180},
      messages:[
       {role:"system",content:"You are FLOW task planner. Suggest exactly ONE reviewable read-only skill. Output only strict JSON {skill,summary,symbol?,cik?}. Valid skills: inventory.review (only when itemsAvailable=true), market.research (ticker symbol), or company.research (SEC CIK). If no skill applies, use unsupported and host rejects. Do not invent data or perform trades.\n"+h.instructions},
       {role:"user",content:"ITEMS_AVAILABLE="+Boolean(itemsAvailable)+"\nTRUSTED_CONTEXT="+JSON.stringify(h.context)+"\nQUESTION="+question.trim()}
      ]
     })
    });
    if(!response.ok)throw Error("Planner model unavailable");
    const reply=await response.json();
    const proposal=parseProposal(reply.message?.content);
    if(proposal.skill==="inventory.review"&&!itemsAvailable)throw Error("Inventory context was not authorized");
    return {proposal,model,modelFamily:h.model.family,surface:h.surface,contextStatus:h.context.status,weightsUpdated:false,approved:false,executed:false,requiresExplicitExecution:true,
      disclaimer:"Proposed skill is unverified until separately executed and returned with evidence trace."};
   }finally{clearTimeout(timer);}
  }
 });
}
module.exports={createFlowPlanner,parseProposal};
