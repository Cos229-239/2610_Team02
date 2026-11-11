"use strict";
// TOWERFLOW_TASK_ORCHESTRATOR_V1 — fail-closed task lifecycle scaffold.
// Safe by default: requires injected, reviewed adapters; NO shell, Git token,
// production deploy, payment, network, or file-system mutation primitives.
const {randomUUID}=require("node:crypto");
const PHASES=Object.freeze(["REQUEST","PLAN","DISCOVERY","AUTHORIZATION","PREPARE","EXECUTE","VERIFY","PUBLISH","COMPLETE"]);
const CAPABILITIES=Object.freeze({
 "room.whiteboard.create":Object.freeze({scope:"isolated-room-module",minRole:"contributor",risk:"reviewed-code"}),
 "repo.feature.integrate":Object.freeze({scope:"isolated-feature-branch",minRole:"contributor",risk:"reviewed-code"}),
 "business.product.swap.simulate":Object.freeze({scope:"sandbox-financial-simulation",minRole:"contributor",risk:"read-only-simulation"})
});
const ROLES=Object.freeze({viewer:0,contributor:1,maintainer:2});
class TaskError extends Error {constructor(message,phase){super(message);this.name="TaskError";this.phase=phase;}}
function validateRequest(req){
 if(!req||typeof req!=="object"||Array.isArray(req)||!Object.hasOwn(CAPABILITIES,req.skill))
   throw new TaskError("Unsupported task skill","REQUEST");
 if(typeof req.objective!=="string"||req.objective.trim().length<8||req.objective.length>1000)
   throw new TaskError("Invalid task objective","REQUEST");
 if(typeof req.idempotencyKey!=="string"||!/^[A-Za-z0-9_-]{8,80}$/.test(req.idempotencyKey))
   throw new TaskError("Invalid idempotency key","REQUEST");
 if(req.workspace!==undefined&&
    (typeof req.workspace!=="string"||!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/.test(req.workspace)||
     req.workspace.includes("..")||req.workspace.startsWith("/")))
   throw new TaskError("Invalid sandbox workspace identifier","REQUEST");
 return true;
}
function createOrchestrator({
 adapters={},clock=()=>Date.now(),uuid=randomUUID,
 canPublish=()=>false,canExecute=()=>true,onEvent=()=>{}
}={}){
 const tasks=new Map(),recent=new Set(),inflight=new Set();
 function copy(v){return JSON.parse(JSON.stringify(v));}
 function record(task,phase,kind,detail={}){
   const entry=Object.freeze({at:clock(),phase,kind,detail:copy(detail)});
   task.events.push(entry);onEvent(copy(entry));return entry;
 }
 function status(id,{userId,role}={}){
   const task=tasks.get(id);
   if(!task||!userId||task.owner!==userId&&!["maintainer"].includes(role))
     throw new TaskError("Task not found or unauthorized","AUTHORIZATION");
   return copy(task);
 }
 async function run(request,{userId,role="viewer"}={}){
   validateRequest(request);
   if(typeof userId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(userId)||!Object.hasOwn(ROLES,role))
     throw new TaskError("Untrusted user identity","AUTHORIZATION");
   const capability=CAPABILITIES[request.skill];
   if(ROLES[role]<ROLES[capability.minRole])throw new TaskError("Insufficient task permissions","AUTHORIZATION");
   const idkey=userId+":"+request.idempotencyKey;
   if(recent.has(idkey)||inflight.has(idkey))throw new TaskError("Duplicate idempotency key","REQUEST");
   const driver=adapters[request.skill];
   if(!driver||!["plan","discover","prepare","execute","verify","publish"].every(key=>typeof driver[key]==="function"))
     throw new TaskError("No reviewed task adapter connected for "+request.skill,"DISCOVERY");
   recent.add(idkey);if(recent.size>2000)recent.delete(recent.values().next().value);
   inflight.add(idkey);
   const task={id:uuid(),owner:userId,skill:request.skill,objective:request.objective.trim(),
     workspace:request.workspace||null,stage:"REQUEST",result:"RUNNING",events:[],artifacts:[],
     startedAt:clock(),completedAt:null};
   tasks.set(task.id,task);record(task,"REQUEST","accepted",{skill:task.skill,scope:capability.scope});
   const context=Object.freeze({userId,role,taskId:task.id,workspace:task.workspace,scope:capability.scope});
   let plan,discovery,prepared,execution,verification;
   try{
     async function step(phase,fn){
       task.stage=phase;record(task,phase,"started");
       const value=await fn();
       if(!value||typeof value!=="object"||Array.isArray(value))throw new TaskError("Invalid adapter result",phase);
       record(task,phase,"completed",{outcome:"adapter-result"});
       return value;
     }
     plan=await step("PLAN",()=>driver.plan(request,context));
     if(!Array.isArray(plan.postconditions)||plan.postconditions.length===0)
       throw new TaskError("Plan missing verifiable postconditions","PLAN");
     discovery=await step("DISCOVERY",()=>driver.discover(plan,context));
     task.stage="AUTHORIZATION";
     if(!await canExecute({request,context,plan,discovery,capability}))
       throw new TaskError("Execution permission denied","AUTHORIZATION");
     record(task,"AUTHORIZATION","granted",{scope:capability.scope});
     prepared=await step("PREPARE",()=>driver.prepare({plan,discovery},context));
     if(prepared.isolated!==true)throw new TaskError("Adapter failed isolation proof","PREPARE");
     execution=await step("EXECUTE",()=>driver.execute({plan,discovery,prepared},context));
     verification=await step("VERIFY",()=>driver.verify({plan,discovery,prepared,execution},context));
     if(verification.passed!==true||!Array.isArray(verification.evidence)||verification.evidence.length===0)
       throw new TaskError("Postconditions failed or evidence missing","VERIFY");
     task.artifacts=copy(verification.evidence);
     const publishAllowed=await canPublish({request,context,plan,verification,capability});
     if(publishAllowed){
       const published=await step("PUBLISH",()=>driver.publish({plan,prepared,execution,verification},context));
       if(published.confirmed!==true)throw new TaskError("Publish acknowledgment missing","PUBLISH");
       record(task,"PUBLISH","confirmed",{reference:published.reference||null});
     }else{
       // Unprivileged tasks may produce verified drafts; never pretend integration occurred.
       record(task,"PUBLISH","deferred",{reason:"Policy gate or required CI/maintainer checks not met"});
     }
     task.stage="COMPLETE";task.result=publishAllowed?"PUBLISHED":"VERIFIED_DRAFT";
     record(task,"COMPLETE","finished",{result:task.result});
   }catch(error){
     task.stage="FAILED";task.result="FAILED";
     record(task,error.phase||task.events.at(-1)?.phase||"REQUEST","failed",{message:String(error.message).slice(0,300)});
     // Adapter may supply a reversible cleanup operation, but not an implicit host restart.
     if(typeof driver.rollback==="function"&&prepared){
       try{await driver.rollback({prepared,execution},context);record(task,"FAILED","rollback-completed");}
       catch(err){record(task,"FAILED","rollback-failed",{message:String(err.message).slice(0,200)});}
     }
   }finally{
     inflight.delete(idkey);task.completedAt=clock();
   }
   return status(task.id,{userId,role});
 }
 return Object.freeze({run,status,capabilities:CAPABILITIES});
}
module.exports={createOrchestrator,CAPABILITIES,PHASES,validateRequest,TaskError};
