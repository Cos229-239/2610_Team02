'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,classify}=require('../lib/azure-flow-intent-model');

test('LLM classifier rejects invented tools or unstructured claims',()=>{
  assert.equal(parse({message:{content:'{"intent":"inventory"}'}}),'inventory');
  assert.equal(parse({message:{content:'{"intent":"sales"}'}}),'sales');
  assert.throws(()=>parse({message:{content:'{"intent":"trading"}'}}),/allowlisted/);
  assert.throws(()=>parse({message:{content:'{"intent":"inventory","shell":"powershell"}'}}),/allowlisted/);
  assert.throws(()=>parse({message:{content:'plain English answer'}}),/malformed/);
});

test('Classifier uses only installed local Ollama and bounded output',async()=>{
  const paths=[];
  const yes=await classify('What can I do to increase sales?',{
    requester:async (route,body)=>{
      paths.push(route);
      if(route==='/api/tags')return {models:[{name:'dolphin-llama3:8b'}]};
      assert.equal(body.model,'dolphin-llama3:8b');
      assert.equal(body.keep_alive,'60s');
      return {message:{content:'{"intent":"sales"}'}};
    }
  });
  assert.equal(yes.state,'MODEL_INTENT_VALIDATED');
  assert.equal(yes.intent,'sales');
  assert.deepEqual(paths,['/api/tags','/api/chat']);
  const no=await classify('No local model installed',{
    requester:async()=>({models:[]})
  });
  assert.equal(no.state,'MODEL_NOT_INSTALLED');
  assert.equal(no.intent,'unresolved');
});
