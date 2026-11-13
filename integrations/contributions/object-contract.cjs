"use strict";
// Contributor-owned object interface contract. No eval, shell, PR mutation, host file writes.
// A world object has explicit interactions; the room renderer supplies geometry and handlers.
const crypto=require("node:crypto");
const TARGETS=new Set(["frontier","development","towerflow"]);
const RIGHTS=new Set(["owned","CC0","licensed","permission"]);
const id=s=>typeof s==="string"&&/^[a-z][a-z0-9._-]{2,79}$/.test(s)&&!s.includes("..");
const relpath=p=>typeof p==="string"&&p.length<=240&&
 !p.startsWith("/")&&!p.includes("\\")&&!p.split("/").includes("..")&&
 /^[a-zA-Z0-9._/\-]+$/.test(p);
const actionName=x=>typeof x==="string"&&/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,5}$/.test(x);
function validateManifest(input){
 if(!input||typeof input!=="object"||Array.isArray(input)||input.schemaVersion!==1)throw Error("Invalid versioned object manifest");
 const {moduleId,author,branch,target,asset,interactions}=input;
 if(!id(moduleId)||typeof author!=="string"||!/^[a-zA-Z0-9_-]{1,60}$/.test(author)||
  typeof branch!=="string"||!branch.startsWith("feature/")||branch.length>140||
  !TARGETS.has(target))throw Error("Invalid contribution identity/target");
 if(!asset||typeof asset!=="object"||asset.kind!=="glb"||!relpath(asset.path)||!asset.path.endsWith(".glb")||
   !RIGHTS.has(asset.rights)||typeof asset.sha256!=="string"||!/^[a-f0-9]{64}$/.test(asset.sha256)||
   ![asset.dimensions?.width,asset.dimensions?.height,asset.dimensions?.depth].every(x=>Number.isFinite(x)&&x>0&&x<=50))
   throw Error("Real source-linked GLB, physical dimensions and rights are required");
 if(!Array.isArray(interactions)||interactions.length<1||interactions.length>12)throw Error("Describe one to twelve functional interactions");
 const names=new Set();
 for(const interaction of interactions){
   if(!interaction||!actionName(interaction.action)||!["viewer","contributor","maintainer"].includes(interaction.minRole)||
    typeof interaction.label!=="string"||interaction.label.trim().length<3||interaction.label.length>70||
    names.has(interaction.action)||!id(interaction.handlerId))
    throw Error("Invalid or duplicate object interaction");
   names.add(interaction.action);
 }
 return Object.freeze({
  schemaVersion:1,moduleId,author,branch,target,
  asset:{kind:"glb",path:asset.path,rights:asset.rights,sha256:asset.sha256,
   dimensions:{width:asset.dimensions.width,height:asset.dimensions.height,depth:asset.dimensions.depth}},
  interactions:interactions.map(x=>({action:x.action,label:x.label,minRole:x.minRole,handlerId:x.handlerId})),
  acceptance:{code:"UNKNOWN",pattern:"UNKNOWN",preservation:"UNKNOWN"},
  integration:"PR_CANDIDATE_ONLY"
 });
}
const ROLES={viewer:0,contributor:1,maintainer:2};
function createInteractionRegistry({handlers={},authorize}={}){
 if(typeof authorize!=="function")throw Error("Trusted role authorization is required");
 return Object.freeze({
  async invoke(manifest,action,context){
   const m=validateManifest(manifest),i=m.interactions.find(v=>v.action===action);
   if(!i)throw Error("Interaction not described by the object");
   const role=await authorize(context,m,i);
   if(!Object.hasOwn(ROLES,role)||ROLES[role]<ROLES[i.minRole])throw Error("Object action denied by host permission");
   const fn=handlers[i.handlerId];
   if(typeof fn!=="function")throw Error("Object handler not installed in authoritative runtime");
   const outcome=await fn(Object.freeze({moduleId:m.moduleId,action,actor:context?.actor||null,revision:context?.revision}));
   if(!outcome||outcome.confirmed!==true||typeof outcome.evidenceRef!=="string")throw Error("Interaction lacks verified host outcome");
   return {moduleId:m.moduleId,action,result:"EXECUTED",evidenceRef:outcome.evidenceRef};
  }
 });
}
function contributorPackage(manifest,{revision}={}){
 const m=validateManifest(manifest);
 if(typeof revision!=="string"||!/^[a-f0-9]{7,40}$/.test(revision))throw Error("Git commit revision required");
 return Object.freeze({candidate:m,revision,owner:m.author,
  workflow:["isolated author branch","manifest + rights","reviewed handlers","unit tests","in-room preview","CODE/PATTERN/PRESERVATION","PR to dev","maintainer release"],
  noDataLoss:true,autoPublish:false});
}
module.exports={validateManifest,createInteractionRegistry,contributorPackage};
