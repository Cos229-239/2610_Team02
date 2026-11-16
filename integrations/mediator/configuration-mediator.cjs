"use strict";
// TOWERFLOW_CONFIG_MEDIATOR_V1
// Trust-boundary adapter for runtime & scene configuration. No shell, filesystem,
// Docker, GitHub tokens, native IDE control or network is exposed here.
const {randomUUID,createHash}=require("node:crypto");
const MAX_BODY=16384;
const OPS=Object.freeze({
  "environment.inspect":{role:"viewer",method:"GET",mutating:false},
  "environment.propose":{role:"contributor",method:"POST",mutating:true},
  "environment.test":{role:"contributor",method:"POST",mutating:true},
  "environment.cancel":{role:"contributor",method:"POST",mutating:true},
  "world.preview":{role:"viewer",method:"POST",mutating:true},
  "world.propose":{role:"contributor",method:"POST",mutating:true},
  "contribution.inspect":{role:"viewer",method:"GET",mutating:false},
  "contribution.submit":{role:"contributor",method:"POST",mutating:true},
  "contribution.review":{role:"maintainer",method:"POST",mutating:true}
});
const ROLE={viewer:0,contributor:1,maintainer:2};
class MediatorError extends Error{
  constructor(code,status,message){super(message);this.code=code;this.status=status;}
}
function object(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function assertText(v,field,max=120){
  if(typeof v!=="string"||!v.trim()||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
    throw new MediatorError("invalid_request",400,"Invalid "+field);
  return v.trim();
}
function assertSHA(v){
  if(typeof v!=="string"||!/^[a-f0-9]{40,64}$/.test(v))
    throw new MediatorError("invalid_revision",400,"A pinned 40/64-character revision hash is required.");
  return v;
}
function validateOperation(operation,payload){
  if(!Object.hasOwn(OPS,operation))throw new MediatorError("unsupported_operation",404,"Unsupported operation.");
  if(!object(payload))throw new MediatorError("invalid_request",400,"Expected a JSON object.");
  const p={};
  switch(operation){
    case "environment.inspect":
      p.profile=assertText(payload.profile,"profile",80);break;
    case "environment.propose":
      p.profile=assertText(payload.profile,"profile",80);
      p.baseRevision=assertSHA(payload.baseRevision);
      if(!object(payload.configuration)||JSON.stringify(payload.configuration).length>8000)
        throw new MediatorError("invalid_request",400,"A bounded configuration object is required.");
      // Only declarative configuration with known keys; never accept process argv, shell or arbitrary paths.
      const allowed=["language","runtime","workloads","extensions","features","ide"];
      if(Object.keys(payload.configuration).some(k=>!allowed.includes(k)))
        throw new MediatorError("invalid_config",400,"Unapproved configuration field.");
      p.configuration=JSON.parse(JSON.stringify(payload.configuration));break;
    case "environment.test":
      p.proposalId=assertText(payload.proposalId,"proposalId",100);
      p.baseRevision=assertSHA(payload.baseRevision);
      p.suite=assertText(payload.suite,"suite",80);break;
    case "environment.cancel":
      p.jobId=assertText(payload.jobId,"jobId",100);break;
    case "world.preview":
    case "world.propose":
      p.assetId=assertText(payload.assetId,"assetId",90);
      p.baseRevision=assertSHA(payload.baseRevision);
      if(payload.parameters!==undefined){
        if(!object(payload.parameters)||JSON.stringify(payload.parameters).length>4000)
          throw new MediatorError("invalid_request",400,"Invalid bounded world parameters");
        p.parameters=JSON.parse(JSON.stringify(payload.parameters));
      }break;
    case "contribution.inspect":
      p.contributionId=assertText(payload.contributionId,"contributionId",100);break;
    case "contribution.submit":
      p.branch=assertText(payload.branch,"branch",120);
      if(!/^(feature|fix|docs|experiment)\/[a-zA-Z0-9._/-]{1,100}$/.test(p.branch)||p.branch.includes("..")||p.branch.includes("//"))
        throw new MediatorError("invalid_branch",400,"Use an isolated feature branch.");
      p.baseRevision=assertSHA(payload.baseRevision);
      p.synopsis=assertText(payload.synopsis,"synopsis",500);
      p.target=payload.target==="towerflow"?"towerflow":payload.target==="room"?"room":null;
      if(!p.target)throw new MediatorError("invalid_target",400,"Choose towerflow or room.");break;
    case "contribution.review":
      p.contributionId=assertText(payload.contributionId,"contributionId",100);
      if(!["approve","request_changes"].includes(payload.decision))
        throw new MediatorError("invalid_decision",400,"Explicit review decision required.");
      p.decision=payload.decision;
      p.baseRevision=assertSHA(payload.baseRevision);break;
  }
  // Requests cannot upgrade their identity/privilege.
  if(Object.keys(payload).some(k=>["role","userId","isAdmin","command","cwd","shell","token","secret","rootPath"].includes(k)))
    throw new MediatorError("invalid_request",400,"Privileged or command fields cannot be supplied.");
  return p;
}
function safeError(error){
  if(error instanceof MediatorError)return {status:error.status,body:{error:{code:error.code,message:error.message}}};
  return {status:503,body:{error:{code:"adapter_unavailable",message:"Trusted backend unavailable; no action performed."}}};
}
function createMediator({authorize,inspect,propose,test,cancel,preview,contribute,review,origin,audit}={}){
  if(typeof authorize!=="function"||typeof origin!=="string"||!/^https:\/\//.test(origin))
    throw Error("Trusted authorization callback and HTTPS origin required");
  const handlers={
    "environment.inspect":inspect,
    "environment.propose":propose,
    "environment.test":test,
    "environment.cancel":cancel,
    "world.preview":preview,
    "world.propose":propose,
    "contribution.inspect":inspect,
    "contribution.submit":contribute,
    "contribution.review":review
  };
  const seen=new Map();
  async function dispatch({operation,payload,actor,requestOrigin,idempotencyKey,method}){
    try{
      const meta=OPS[operation];
      if(!meta)throw new MediatorError("unsupported_operation",404,"Unsupported operation");
      if(method!==meta.method)throw new MediatorError("method_not_allowed",405,"Invalid method for this operation");
      if(meta.mutating&&requestOrigin!==origin)throw new MediatorError("origin_denied",403,"Same-origin request required");
      const who=await authorize(actor,operation);
      if(!who||!who.userId||!(who.role in ROLE)||ROLE[who.role]<ROLE[meta.role])
        throw new MediatorError("forbidden",403,"Insufficient collaborator permission");
      const data=validateOperation(operation,payload);
      const handler=handlers[operation];
      if(typeof handler!=="function")
        throw new MediatorError("not_connected",501,"No trusted runner/preview provider configured.");
      if(meta.mutating){
        if(typeof idempotencyKey!=="string"||!/^[A-Za-z0-9._:-]{12,100}$/.test(idempotencyKey))
          throw new MediatorError("idempotency_required",400,"Unique idempotency key required");
        const key=who.userId+":"+operation+":"+idempotencyKey;
        const digest=createHash("sha256").update(JSON.stringify(data)).digest("hex");
        const prior=seen.get(key);
        if(prior){
          if(prior.digest!==digest)throw new MediatorError("idempotency_conflict",409,"Key reused with different request.");
          return await prior.promise;
        }
        const jobId=randomUUID();
        const promise=(async()=>{
          const outcome=await handler({operation,who,payload:data,jobId});
          const result={status:202,body:{status:"accepted",jobId,operation,result:outcome??null}};
          if(typeof audit==="function")await audit({action:operation,actor:who.userId,jobId,status:"accepted"});
          return result;
        })();
        seen.set(key,{digest,promise});
        // Bounded memory, not durable dedupe: production requires persistent DB uniqueness.
        if(seen.size>1000)seen.delete(seen.keys().next().value);
        try{return await promise;}catch(e){seen.delete(key);throw e;}
      }
      const result=await handler({operation,who,payload:data,jobId:null});
      return {status:200,body:{status:"ok",operation,result:result??null}};
    }catch(err){return safeError(err);}
  }
  async function route(req,res){
    const operation=String(req.params?.operation||"");
    if(!Object.hasOwn(OPS,operation))return false;
    const meta=OPS[operation];
    const raw=req.body??{};
    if(JSON.stringify(raw).length>MAX_BODY){
      res.status(413).json({error:{code:"too_large",message:"Request too large"}});return true;
    }
    const answer=await dispatch({
      operation,payload:req.method==="GET"?req.query:raw,
      actor:req,method:req.method,requestOrigin:req.get?.("origin")||"",
      idempotencyKey:req.get?.("idempotency-key")||""
    });
    res.set?.("Cache-Control","no-store");
    res.status(answer.status).json(answer.body);
    return true;
  }
  return Object.freeze({dispatch,route,supportedOperations:()=>Object.keys(OPS)});
}
module.exports={createMediator,validateOperation,OPS,MediatorError};
