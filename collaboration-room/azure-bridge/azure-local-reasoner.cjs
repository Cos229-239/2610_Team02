'use strict';
// OPTIONAL local-only Azure intent model. This never writes or executes code.
// Private Megan, Laura and Pixi source remains outside the team repository.
const {SOURCE_AREAS}=require('./source-navigation.cjs');
const PORT='http://127.0.0.1:11434';
const MODEL=process.env.TOWERFLOW_AZURE_MODEL||'';
const allowed=new Set(Object.keys(SOURCE_AREAS));
async function request(route,body,{fetcher=globalThis.fetch,timeoutMs=6000}={}){
 const response=await fetcher(PORT+route,{method:body?'POST':'GET',
  headers:{'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
 if(!response.ok)throw Error('Local model unavailable HTTP '+response.status);
 const text=await response.text();
 if(text.length>12000)throw Error('Local model response exceeds safety bound');
 return JSON.parse(text);
}
async function inventory({model=MODEL,requester=request}={}){
 if(!model)return {state:'DISABLED',model:null,reason:'Set TOWERFLOW_AZURE_MODEL on the host to enable local inference.'};
 try{
  const items=await requester('/api/tags');
  const present=Array.isArray(items.models)&&items.models.some(x=>x.name===model);
  return {state:present?'MODEL_AVAILABLE':'MODEL_NOT_INSTALLED',model:present?model:null,
   reason:present?'Local Ollama model found. No code tools or external credentials exposed.':'Configured model is not installed on this host.'};
 }catch{return {state:'UNAVAILABLE',model:null,reason:'Local Ollama did not respond to a bounded health query.'};}
}
function validate(response){
 const choice=response?.message?.content;
 if(typeof choice!=='string'||choice.length>1800)throw Error('Model returned no valid bounded response');
 const raw=JSON.parse(choice);
 if(!raw||Object.keys(raw).sort().join(',')!=='area,kind,reason'||
   !allowed.has(raw.area)||!['INSPECT_SOURCE','PROPOSE_CHANGE'].includes(raw.kind)||
   typeof raw.reason!=='string'||raw.reason.length>220)throw Error('Model output violated the registered capability schema.');
 return {area:raw.area,kind:raw.kind,reason:raw.reason.slice(0,220)};
}
async function propose(prompt,{model=MODEL,requester=request}={}){
 if(typeof prompt!=='string'||prompt.length<3||prompt.length>1800)throw Error('Invalid task');
 const status=await inventory({model,requester});
 if(status.state!=='MODEL_AVAILABLE')return {state:status.state,reason:status.reason};
 try{
  const schema={
   type:'object',additionalProperties:false,
   properties:{
    area:{type:'string',enum:[...allowed]},
    kind:{type:'string',enum:['INSPECT_SOURCE','PROPOSE_CHANGE']},
    reason:{type:'string',maxLength:220}
   },required:['area','kind','reason']
  };
  const reply=await requester('/api/chat',{
   model,stream:false,think:false,format:schema,keep_alive:0,
   messages:[
    {role:'system',content:'Select only a source code area and operation from the JSON schema for a TowerFlow developer request. Do not claim code edits, file execution, connection to other accounts or access to any private repository. Answer short JSON only.'},
    {role:'user',content:prompt}
   ],options:{temperature:0,num_ctx:2048,num_predict:200}
  });
  if(reply.done_reason==='length')throw Error('Incomplete model response');
  const result=validate(reply);
  return {state:'MODEL_SUGGESTION_NOT_VERIFIED',model,proposal:result,
   evidence:'Local Ollama returned schema-valid structured intent. User must review the selected target; model did not inspect or edit the repo.'};
 }catch(error){return {state:'MODEL_OUTPUT_REJECTED',reason:'Model suggestion failed validation or execution; no action performed.'};}
}
module.exports={MODEL,inventory,validate,propose,request};
