"use strict";
// Composable bridge into the EXISTING task-orchestrator's repo.feature.integrate
// capability. Requires externally reviewed adapters; no network, filesystem,
// credentials, shell or server routes. No implicit publish.
const {evaluate}=require("./frontier-execution-evidence.cjs");
function required(x,name){if(typeof x!=="function")throw Error("Missing reviewed "+name+" adapter");return x;}
function createFrontierWorkflowAdapter({plan,discover,prepare,execute,collectEvidence,publish}={}){
 [plan,discover,prepare,execute,collectEvidence].forEach((f,i)=>
  required(f,["plan","discover","prepare","execute","collectEvidence"][i]));
 return Object.freeze({
  async plan(request,ctx){
   const p=await plan(request,ctx);
   if(!p||!Array.isArray(p.postconditions)||p.postconditions.length===0||
      !p.postconditions.every(x=>typeof x==="string"&&x.trim().length>2))
    throw Error("Plan must contain measurable postconditions");
   if(!p.contracts||!["SPECS","DESIGN","PRESERVATION","API"].every(k=>
      typeof p.contracts[k]==="string"&&p.contracts[k].trim().length>=3))
    throw Error("Missing four engineering contracts");
   return p;
  },
  async discover(p,ctx){return discover(p,ctx);},
  async prepare(payload,ctx){
   const result=await prepare(payload,ctx);
   if(result?.isolated!==true||typeof result?.workspaceId!=="string"||
      !result.workspaceId.startsWith("sandbox-"))
    throw Error("Trusted isolation reference required");
   return result;
  },
  async execute(payload,ctx){return execute(payload,ctx);},
  async verify(payload,ctx){
   const record=await collectEvidence(payload,ctx);
   if(record?.objective!==payload.plan.objective||
      record?.revision!==payload.discovery.revision)
    throw Error("Evidence not associated with this exact task/revision");
   const result=evaluate(record);
   if(!result.passed)return {passed:false,evidence:[],gateSummary:result};
   return {passed:true,evidence:[{
     type:"three-gate-verdict",ref:"review:"+record.id,revision:record.revision,
     gates:result.gates}],gateSummary:result};
  },
  async publish(payload,ctx){
   if(typeof publish!=="function")return {confirmed:false};
   return publish(payload,ctx);
  }
 });
}
module.exports={createFrontierWorkflowAdapter};
