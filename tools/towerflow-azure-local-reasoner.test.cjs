'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {inventory,validate,propose}=require('../collaboration-room/azure-bridge/azure-local-reasoner.cjs');
test('Azure model stays disabled without explicit local opt-in, no network',async()=>{
 let called=false;
 const info=await inventory({model:'',requester:async()=>{called=true;}});
 assert.equal(info.state,'DISABLED');assert.equal(called,false);
 const reply=await propose('Fix the dashboard',{model:'',requester:async()=>{called=true;}});
 assert.equal(reply.state,'DISABLED');assert.equal(called,false);
});
test('Only an installed named local model can create strict typed intent, never a code write',async()=>{
 const routes=[];
 const mock=async(route,body)=>{
  routes.push(route);
  if(route==='/api/tags')return {models:[{name:'dolphin-llama3:8b'}]};
  assert.equal(route,'/api/chat');
  assert.equal(body.stream,false);
  assert.equal(body.think,false);
  assert.equal(body.options.num_predict,200);
  return {done_reason:'stop',message:{content:JSON.stringify({
    area:'dashboard',kind:'PROPOSE_CHANGE',reason:'User requested dashboard edit.'
  })}};
 };
 const x=await propose('Please improve the dashboard',{model:'dolphin-llama3:8b',requester:mock});
 assert.equal(x.state,'MODEL_SUGGESTION_NOT_VERIFIED');
 assert.equal(x.proposal.area,'dashboard');
 assert.equal(routes.length,2);
 assert.ok(!JSON.stringify(x).includes('edited code'));
});
test('Untrusted outputs cannot invent paths, commands, permissions or tool execution',async()=>{
 for(const obj of [
  {area:'../../../private',kind:'PROPOSE_CHANGE',reason:'ok'},
  {area:'dashboard',kind:'shell',reason:'ok'},
  {area:'dashboard',kind:'PROPOSE_CHANGE',reason:'ok',script:'rm -rf /'},
  {area:'backend',kind:'INSPECT_SOURCE',reason:'x'.repeat(300)}
 ]) assert.throws(()=>validate({message:{content:JSON.stringify(obj)}}),/violated/);
 const truncated=await propose('Look at the dashboard',{model:'dolphin-llama3:8b',
  requester:async route=>route==='/api/tags'?{models:[{name:'dolphin-llama3:8b'}]}:
   {done_reason:'length',message:{content:JSON.stringify({area:'dashboard',kind:'INSPECT_SOURCE',reason:'ok'})}}
 });
 assert.equal(truncated.state,'MODEL_OUTPUT_REJECTED');
});
test('Configured unavailable model is not reported connected',async()=>{
 const info=await inventory({model:'not-installed',requester:async()=>({models:[{name:'other'}]})});
 assert.equal(info.state,'MODEL_NOT_INSTALLED');
 const unknown=await inventory({model:'dolphin-llama3:8b',requester:async()=>{throw Error('connection refused')}});
 assert.equal(unknown.state,'UNAVAILABLE');
});
