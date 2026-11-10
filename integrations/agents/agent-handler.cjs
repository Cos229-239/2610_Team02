"use strict";
// Stand-alone authenticated REST handler. Host server MUST mount behind
// auth + ensureMember; origin, identity, request bounds also checked here.
const {createAgent}=require("./towerflow-agent.cjs");
function createAgentHandler({agent=createAgent(),origin}={}){
 if(typeof origin!=="string"||!/^https:\/\//.test(origin))throw Error("Reviewed public origin required");
 return async function handler(req,res){
  res.set("Cache-Control","no-store");
  res.set("X-Content-Type-Options","nosniff");
  const id=req.session?.user?.login;
  if(!id||!req.permission)return res.status(403).json({error:"Authenticated GitHub member required"});
  const role=["admin","maintain"].includes(req.permission)?"maintainer":"contributor";
  if(req.method==="GET"){
   if(req.path!=="/api/agents/status")return res.status(404).json({error:"Not found"});
   return res.json({agent:"FLOW",...agent.status()});
  }
  if(req.method!=="POST"||req.path!=="/api/agents/run")
    return res.status(405).json({error:"Method not allowed"});
  if(req.headers?.origin!==origin)return res.status(403).json({error:"Origin rejected"});
  if(!(req.headers?.["content-type"]||"").startsWith("application/json"))
    return res.status(415).json({error:"JSON required"});
  const body=req.body;
  if(!body||typeof body!=="object"||Buffer.byteLength(JSON.stringify(body),"utf8")>65536)
    return res.status(413).json({error:"Invalid or oversized task"});
  try{
   const result=await agent.run(body,{userId:"github_"+String(id).toLowerCase(),role});
   return res.status(200).json(result);
  }catch(e){
   const client=/^(Invalid|Unsupported|Unauthorized|Duplicate|Inventory inputs|Missing|NOT_CONNECTED)/.test(e.message);
   return res.status(client?400:503).json({error:client?e.message:"Agent provider unavailable"});
  }
 };
}
module.exports={createAgentHandler};
