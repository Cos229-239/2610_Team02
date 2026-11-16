"use strict";
// TOWERFLOW_SHARED_WORLD_V1
// Durable reviewed scene state. No arbitrary objects, AI code, shell, remote downloads or secrets.
const fs=require("node:fs/promises");
const path=require("node:path");
const crypto=require("node:crypto");
const MODES=new Set(["sunset","solar-system","aurora","ceiling-text"]);
const COLORS=new Set(["rainbow","red","orange","yellow","green","blue","purple","pink","white","gold","cyan"]);
function validateScene(raw){
 if(raw===null)return null;
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Invalid scene");
 if(!MODES.has(raw.mode))throw Error("Unsupported scene mode");
 if(raw.mode!=="ceiling-text")return {mode:raw.mode};
 const text=String(raw.text??"").trim();
 if(!text||text.length>36||/[\r\n\x00-\x1f]/.test(text))throw Error("Invalid ceiling text");
 const color=String(raw.color||"rainbow").toLowerCase();
 if(!COLORS.has(color))throw Error("Invalid text color");
 return {mode:"ceiling-text",text,color};
}
function empty(){return {version:1,revision:0,scene:null,approvedBy:null,updatedAt:null,history:[]};}
function createWorldStore({file,now=()=>new Date().toISOString()}){
 if(typeof file!=="string"||!path.isAbsolute(file))throw Error("Absolute private state path required");
 if(file.split(/[\\/]/).some(x=>x==="public"))throw Error("World state must be stored outside public webroot");
 let queue=Promise.resolve();
 async function read(){
  try{
   const record=JSON.parse(await fs.readFile(file,"utf8"));
   if(record.version!==1||!Number.isSafeInteger(record.revision)||record.revision<0)throw Error("Corrupt world record");
   validateScene(record.scene);
   return record;
  }catch(e){if(e.code==="ENOENT")return empty();throw e;}
 }
 async function update({baseRevision,scene,approvedBy,reason}){
  if(!Number.isSafeInteger(baseRevision)||baseRevision<0)throw Error("Invalid revision");
  if(typeof approvedBy!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(approvedBy))throw Error("Invalid reviewer");
  if(typeof reason!=="string"||reason.trim().length<4||reason.length>280)throw Error("Review reason required");
  const proposed=validateScene(scene);
  const write=async()=>{
   const current=await read();
   if(current.revision!==baseRevision){
    const err=new Error("Scene revision has changed; reload before approving.");err.status=409;throw err;
   }
   const date=now();
   const next={
    version:1,revision:current.revision+1,scene:proposed,
    approvedBy,updatedAt:date,
    history:[...(Array.isArray(current.history)?current.history:[]),{
      revision:current.revision+1,scene:proposed,approvedBy,updatedAt:date,reason:reason.trim()
    }].slice(-100)
   };
   await fs.mkdir(path.dirname(file),{recursive:true});
   const staging=file+".stage-"+crypto.randomUUID();
   try{
    await fs.writeFile(staging,JSON.stringify(next,null,2)+"\n",{mode:0o600,flag:"wx"});
    await fs.rename(staging,file);
   }finally{await fs.rm(staging,{force:true});}
   return next;
  };
  // Mutations serialize, including rejected actions. Rejected actions do not break future writes.
  const p=queue.then(write);
  queue=p.catch(()=>{});
  return p;
 }
 return Object.freeze({read,update});
}
function createWorldHandler({store,origin,authorize}){
 if(!store||!origin?.startsWith("https://")||typeof authorize!=="function")throw Error("Trusted origin, auth and store required");
 return async function worldHandler(req,res){
  try{
   if(req.method==="GET"){
    const actor=await authorize(req,"read");
    if(!actor)return res.status(403).json({error:"Repository member authorization required"});
    const state=await store.read();
    res.set("Cache-Control","no-store");
    return res.json(state);
   }
   if(req.method==="POST"){
    if(req.get("origin")!==origin)return res.status(403).json({error:"Same origin required"});
    const actor=await authorize(req,"approve");
    if(!actor||actor.role!=="maintainer")return res.status(403).json({error:"Maintainer approval required"});
    const body=req.body;
    if(!body||typeof body!=="object"||Array.isArray(body)||JSON.stringify(body).length>3000)
      return res.status(400).json({error:"Invalid request"});
    const state=await store.update({baseRevision:body.baseRevision,scene:body.scene,reason:body.reason,approvedBy:actor.userId});
    res.set("Cache-Control","no-store");
    return res.status(200).json(state);
   }
   return res.status(405).json({error:"Use GET or POST"});
  }catch(e){
   const code=e.status||(/Invalid|Unsupported|required/.test(e.message)?400:503);
   return res.status(code).json({error:code===503?"World state unavailable":e.message});
  }
 };
}
module.exports={createWorldStore,createWorldHandler,validateScene};
