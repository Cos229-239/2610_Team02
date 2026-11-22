'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {emptyInventory}=require('../lib/inventory');
const {investigate,validateSuggestion,focusSuggestion}=require('../lib/azure-flow-orchestrator');

test('model cannot inject unsupported capability or mutate inventory',()=>{
  const findings=[{title:'Low stock'}];
  assert.deepEqual(validateSuggestion({message:{content:'{"findingIndex":0,"focus":"inventory"}'}},findings),
    {findingIndex:0,focus:'inventory'});
  assert.throws(()=>validateSuggestion({message:{content:'{"findingIndex":0,"focus":"inventory","command":"delete"}'}},findings));
  assert.throws(()=>validateSuggestion({message:{content:'{"findingIndex":7,"focus":"inventory"}'}},findings));
});

test('local model adapter uses existing Ollama port and installed model only',async()=>{
  const state=emptyInventory();
  const report={findings:[{title:'No sales'}],inventory:{lowStock:0},operations:{recordedSales:0}};
  const paths=[];
  const requester=async(route,body)=>{
    paths.push(route);
    if(route==='/api/tags')return {models:[{name:'dolphin-llama3:8b'}]};
    assert.equal(body.model,'dolphin-llama3:8b');
    assert.equal(body.stream,false);
    assert.equal(body.keep_alive,'60s');
    return {message:{content:'{"findingIndex":0,"focus":"evidence"}'}};
  };
  const result=await focusSuggestion(report,{model:'dolphin-llama3:8b',requester});
  assert.equal(result.state,'MODEL_SUGGESTION_VALIDATED');
  assert.deepEqual(paths,['/api/tags','/api/chat']);
  assert.equal(JSON.stringify(state),JSON.stringify(emptyInventory()));
});

test('missing or invalid local model falls back to evidence-based analysis',async()=>{
  const source=emptyInventory();
  const before=JSON.stringify(source);
  const result=await investigate(source,{revision:'empty',now:1763850000,
    focusImpl:async()=>({state:'MODEL_UNAVAILABLE_OR_REJECTED'})});
  assert.equal(result.readOnly,true);
  assert.equal(result.model.state,'MODEL_UNAVAILABLE_OR_REJECTED');
  assert.equal(result.selectedFinding.title,result.findings[0].title);
  assert.equal(JSON.stringify(source),before);
});
test('azure flow code and login script both parse',()=>{
  const folder=path.join(__dirname,'../public');
  for(const file of ['app.js','azure-flow.js']){
    const text=fs.readFileSync(path.join(folder,file),'utf8');
    assert.doesNotThrow(()=>new (require('node:vm').Script)(text));
  }
});
