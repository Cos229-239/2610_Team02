'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CASES,CANDIDATES,parseDecision,screenModel}=require('../tools/azure-flow-live-calibration.cjs');
test('Real-model calibration is a fixed 20-case, two-domain screen, not a model promotion',()=>{
  assert.equal(CASES.length,20);
  assert.equal(CASES.filter(c=>c.task==='intent').length,10);
  assert.equal(CASES.filter(c=>c.task==='reorder').length,10);
  assert.equal(new Set(CASES.map(c=>c.id)).size,20);
  assert.ok(CANDIDATES.includes('dolphin-llama3:8b'));
  assert.ok(CANDIDATES.includes('qwen3.5:4b'));
});
test('Calibration refuses malformed JSON, executable operations, and unregistered models',async()=>{
  assert.equal(parseDecision({message:{content:'{"decision":"ABSTAIN"}'}}),'ABSTAIN');
  assert.throws(()=>parseDecision({message:{content:'{"decision":"BUY"}'}}));
  assert.throws(()=>parseDecision({message:{content:'{"decision":"NO_ORDER","command":"execute"}'}}));
  await assert.rejects(()=>screenModel('custom-not-installed:latest'),/MODEL_NOT_ALLOWLISTED/);
});
test('Calibration counts empty and invalid answers as failures, never evidence of success',async()=>{
  const two=CASES.slice(0,2);
  const result=await screenModel('dolphin-llama3:8b',{
    cases:two,
    requester:async route=>route==='/api/tags'?
      {models:[{name:'dolphin-llama3:8b'}]}:
      {message:{content:''}},
    now:(()=>{let n=0;return()=>++n})()
  });
  assert.equal(result.passed,0);
  assert.equal(result.valid,0);
  assert.equal(result.total,2);
  assert.equal(result.status,'SCREEN_FAIL');
  assert.equal(result.rows.every(x=>x.observed===null),true);
});
test('Schema compliant model routing is screened with reference labels independently',async()=>{
  const first=CASES.slice(0,1);
  const result=await screenModel('dolphin-llama3:8b',{
    cases:first,
    requester:async route=>route==='/api/tags'?
      {models:[{name:'dolphin-llama3:8b'}]}:
      {message:{content:'{"intent":"inventory"}'},eval_count:5},
    now:(()=>{let n=0;return()=>++n})()
  });
  assert.equal(result.passed,1);
  assert.equal(result.valid,1);
  assert.equal(result.unsafe,0);
  assert.equal(result.rows[0].tokens,5);
  assert.match(result.caveat,/Not a blind benchmark/);
});
