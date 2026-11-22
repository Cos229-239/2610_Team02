'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {calibrate,CASES,ALLOWLIST}=require('../lib/azure-flow-calibration');
test('Model screening is bounded to already installed eligible models and counts invalid outputs',async()=>{
  const used=[];
  const result=await calibrate({
    clock:(()=>{let n=1763850000000;return()=>n+=100})(),
    requester:async(route,payload)=>{
      used.push([route,payload?.model]);
      if(route==='/api/tags') return {models:[{name:'dolphin-llama3:8b'},{name:'arbitrary-unreviewed-model:70b'}]};
      const i=used.filter(x=>x[0]==='/api/chat').length-1;
      return {message:{content:JSON.stringify({findingIndex:CASES[i].expected,focus:'inventory'})}};
    }
  });
  assert.equal(result.status,'LOCAL_SCREEN_PASS');
  assert.equal(result.tested.length,1);
  assert.equal(result.tested[0].accuracy,1);
  assert.equal(result.selected,'dolphin-llama3:8b');
  assert.equal(result.promoted,false);
  assert.equal(used.filter(x=>x[0]==='/api/chat').length,5);
  assert.equal(ALLOWLIST.includes('arbitrary-unreviewed-model:70b'),false);
});
