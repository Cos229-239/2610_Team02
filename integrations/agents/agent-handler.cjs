"use strict";
// Stand-alone authenticated REST handler. Host server MUST mount behind
// auth + ensureMember; origin, identity, request bounds also checked here.
const {createAgent}=require("./towerflow-agent.cjs");
const {createFlowPlanner}=require("./flow-planner.cjs");
function createAgentHandler({agent=createAgent(),planner=null,origin,getTrustedContext=null}={}){
 const activePlanner=planner||createFlowPlanner({getTrustedContext});
 if(typeof origin!=="string"||!/^https:\/\//.test(origin))throw Error("Reviewed public origin required");
 const quotas=new Map();
 return async function handler(req,res){
  res.set("Cache-Control","no-store");
  res.set("X-Content-Type-Options","nosniff");
  const id=req.session?.user?.login;
  if(!id||!req.permission)return res.status(403).json({error:"Authenticated GitHub member required"});
  const role=["admin","maintain"].includes(req.permission)?"maintainer":"contributor";
  if(req.method==="GET"){
   if(req.path!=="/api/agents/status")return res.status(404).json({error:"Not found"});
   return res.json({agent:"FLOW",...agent.status(),planner:{model:activePlanner.model,mode:activePlanner.mode,requiresExplicitExecution:true,surface:"towerflow",trustedState:typeof getTrustedContext==="function"?"HOST_ADAPTER_CONFIGURED":"UNKNOWN"}});
  }
  if(req.method!=="POST"||!["/api/agents/run","/api/agents/plan"].includes(req.path))
    return res.status(405).json({error:"Method not allowed"});
  if(req.headers?.origin!==origin)return res.status(403).json({error:"Origin rejected"});
  if(!(req.headers?.["content-type"]||"").startsWith("application/json"))
    return res.status(415).json({error:"JSON required"});
  const key=String(id).toLowerCase();
  const now=Date.now(),windowMs=60_000;
  const q=quotas.get(key)||{since:now,count:0};
  if(now-q.since>=windowMs){q.since=now;q.count=0;}
  if(q.count>=5)return res.status(429).json({error:"Agent task rate limit: five requests per minute"});
  q.count++;quotas.set(key,q);
  if(quotas.size>2000)quotas.delete(quotas.keys().next().value);
  const body=req.body;
  if(!body||typeof body!=="object"||Buffer.byteLength(JSON.stringify(body),"utf8")>65536)
    return res.status(413).json({error:"Invalid or oversized task"});
  try{
   const result=req.path==="/api/agents/plan"?
     await activePlanner.plan({question:body.question,itemsAvailable:body.itemsAvailable===true}):
     await agent.run(body,{userId:"github_"+String(id).toLowerCase(),role});
   return res.status(200).json(result);
  }catch(e){
   const client=/^(Invalid|Unsupported|Unauthorized|Duplicate|Inventory inputs|Missing|NOT_CONNECTED|Planner proposed|Inventory context|Unexpected)/.test(e.message);
   return res.status(client?400:503).json({error:client?e.message:"Agent provider unavailable"});
  }
 };
}
module.exports={createAgentHandler};
