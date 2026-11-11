"use strict";
// TOWERFLOW_EVIDENCE_LEARNING_LOOP_V1
// A bounded, reviewable feedback memory for humans and agents. No model training,
// file writes, network, or automatic promotion into trusted world knowledge.
const {createHash}=require("node:crypto");
const STATES=Object.freeze(["proposed","verified","rejected"]);
const MAX=500;
function plain(x){return x!==null&&typeof x==="object"&&!Array.isArray(x);}
function text(x,n=300){
 if(typeof x!=="string"||!x.trim()||x.length>n||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x))throw Error("Invalid bounded text");
 return x.trim();
}
function digest(x){return createHash("sha256").update(JSON.stringify(x)).digest("hex");}
function createLearningLoop({clock=()=>Date.now(),onEvent=()=>{}}={}){
 const entries=new Map();
 function snapshot(x){return JSON.parse(JSON.stringify(x));}
 function propose({taskId,claim,context,source,observations=[],nextAction,ownerId}={}){
  const owner=text(ownerId,100), task=text(taskId,100);
  const c=text(claim,600),ctx=text(context,600),src=text(source,240),next=text(nextAction,300);
  if(!Array.isArray(observations)||observations.length>12)throw Error("Invalid observations");
  const notes=observations.map(x=>text(x,240));
  const id=digest({owner,task,c,ctx,src,notes,next});
  if(entries.has(id))return snapshot(entries.get(id));
  if(entries.size>=MAX)throw Error("Learning capacity reached; archive reviewed entries first");
  const item={id,taskId:task,claim:c,context:ctx,source:src,observations:notes,nextAction:next,
   ownerId:owner,status:"proposed",createdAt:clock(),updatedAt:clock(),review:null,version:1};
  entries.set(id,item);
  onEvent({type:"learning.proposed",id,ownerId:owner});
  return snapshot(item);
 }
 function review({id,reviewerId,role,decision,evidence,reason}={}){
  const entry=entries.get(text(id,64));
  if(!entry)throw Error("Learning entry not found");
  if(role!=="maintainer")throw Error("Maintainer review required");
  const reviewer=text(reviewerId,100);
  if(reviewer===entry.ownerId)throw Error("Independent review required");
  if(entry.status!=="proposed")throw Error("Learning already reviewed");
  if(!["verified","rejected"].includes(decision))throw Error("Invalid review decision");
  if(!Array.isArray(evidence)||evidence.length<1||evidence.length>10)throw Error("Review evidence required");
  const refs=evidence.map(x=>{
   if(!plain(x))throw Error("Evidence must be structured");
   if(!["test","commit","pr","document","manual"].includes(x.kind))throw Error("Unknown evidence kind");
   return {kind:x.kind,reference:text(x.reference,300)};
  });
  entry.status=decision;entry.review={reviewerId:reviewer,evidence:refs,reason:text(reason,500)};
  entry.updatedAt=clock();entry.version++;
  onEvent({type:"learning.reviewed",id,decision,reviewerId:reviewer});
  return snapshot(entry);
 }
 function get(id){const value=entries.get(id);return value?snapshot(value):null;}
 function query({status="verified",limit=20,contains=""}={}){
  if(!STATES.includes(status)&&status!=="all")throw Error("Invalid status");
  if(!Number.isInteger(limit)||limit<1||limit>50)throw Error("Invalid limit");
  const q=typeof contains==="string"?contains.trim().toLowerCase():"";
  if(q.length>100)throw Error("Search too long");
  return [...entries.values()].filter(x=>(status==="all"||x.status===status)&&
    (!q||(x.claim+" "+x.context+" "+x.nextAction).toLowerCase().includes(q)))
   .sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,limit).map(snapshot);
 }
 function exportReviewed(){return {schemaVersion:1,mode:"HUMAN_VERIFIED_KNOWLEDGE",exportedAt:clock(),
   entries:query({status:"verified",limit:50})};}
 function stats(){return Object.freeze({total:entries.size,
   proposed:query({status:"proposed",limit:50}).length,
   note:"In-memory prototype only; bounded queries are not complete population counts."});}
 return Object.freeze({propose,review,get,query,exportReviewed,stats});
}
module.exports={createLearningLoop};
