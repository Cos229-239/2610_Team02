'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit,sameSet}=require('../tools/azure-flow-metamorphic-audit.cjs');
test('Source selection comparator ignores only ordering, not missing or extra harnesses',()=>{
  assert.equal(sameSet(['research.sec','research.public'],['research.public','research.sec']),true);
  assert.equal(sameSet(['research.sec'],['research.public']),false);
  assert.equal(sameSet(['research.sec'],['research.sec','workspace.inventory']),false);
});
test('Role 3 detects seemingly successful source routing that changes with registry order',async()=>{
  const outputs=[];
  const result=await audit({ids:['F01'],logger:x=>outputs.push(x),
    runner:async(q,{registryOrder})=>({status:'MODEL_PLAN_VALIDATED',
      capabilities:registryOrder==='normal'?['research.sec']:
        ['research.sec','research.public']})});
  assert.equal(result.verdict,'NOT_QUALIFIED');
  assert.equal(result.rows[0].stable,false);
  assert.equal(result.rows[0].variants.every(x=>x.pass),true);
  assert.ok(outputs.some(x=>x.includes('REGISTRY_ORDER_INVARIANCE=FAIL')));
});
test('Permitted source order alone is not an inferred decline in accuracy',async()=>{
  const result=await audit({ids:['F01'],logger:()=>{},
    runner:async(q,{registryOrder})=>({status:'MODEL_PLAN_VALIDATED',
      capabilities:registryOrder==='normal'?['research.sec','research.public']:
        ['research.public','research.sec']})});
  assert.equal(result.passed,1);
  assert.equal(result.rows[0].stable,true);
});
test('Offline model never passes an abstention case just by returning empty list',async()=>{
  const result=await audit({ids:['F12'],logger:()=>{},
    runner:async()=>({status:'MODEL_UNAVAILABLE',capabilities:[]})});
  assert.equal(result.passed,0);
  assert.equal(result.verdict,'NOT_QUALIFIED');
});
