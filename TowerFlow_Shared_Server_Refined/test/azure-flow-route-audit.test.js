'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CASES,grade,assess}=require('../lib/azure-flow-route-evaluation');
const {run}=require('../tools/azure-flow-route-audit.cjs');
const {plan}=require('../lib/azure-flow-intelligence');
test('schema-valid hallucinated success is rejected for Microsoft investment filings',()=>{
  const item=CASES.find(c=>c.id==='F01');
  const proposed=['workspace.inventory','workspace.sales','knowledge.markdown'];
  assert.equal(proposed.length,3);
  const g=grade(proposed,item);
  assert.equal(g.pass,false);
  assert.equal(g.requiredFound,false);
  assert.deepEqual(g.forbiddenFound,['workspace.inventory','workspace.sales']);
  assert.equal(g.reason,'IRRELEVANT_OR_FORBIDDEN_HARNESS');
});
test('source-fitness grading rejects a plausible wrong tool despite a correct JSON schema',()=>{
  const item=CASES.find(c=>c.id==='F09');
  const wrong=grade(['knowledge.markdown'],item);
  assert.equal(wrong.pass,false);
  assert.equal(wrong.reason,'MISSED_REQUIRED_CAPABILITY');
  assert.equal(grade(['research.sec','knowledge.markdown'],item).pass,true);
});
test('privacy negative controls penalize forbidden public research and refuse false green',()=>{
  const item=CASES.find(c=>c.id==='F04');
  assert.equal(grade(['workspace.inventory','research.sec'],item).pass,false);
  const forged=CASES.map(item=>({item,selected:item.requiredAny.slice(0,1),modelStatus:'MOCK',ms:1}));
  forged[0].selected=['workspace.inventory','workspace.sales','knowledge.markdown'];
  const report=assess(forged);
  assert.equal(report.total,CASES.length);
  assert.equal(report.failures.some(x=>x.id==='F01'),true);
  assert.equal(report.verdict,'NOT_QUALIFIED');
});
test('live CLI evaluator counts failures even when the model has a valid plan object',async()=>{
  const lines=[];
  const report=await run({cases:CASES,logger:x=>lines.push(x),
    runner:async()=>({status:'MODEL_PLAN_VALIDATED',capabilities:
      ['workspace.inventory','workspace.sales','knowledge.markdown']}),
    clock:(()=>{let t=0;return()=>++t})()});
  assert.equal(report.verdict,'NOT_QUALIFIED');
  assert.ok(report.passed<CASES.length);
  assert.ok(lines.some(s=>s.includes('FAIL')));
});
test('adversarial unapproved network routing cannot get past harness authorization',async()=>{
  const answers=await Promise.all([false,true].map(allowPublic=>plan(
    'Search public issuer filings',{allowPublic,
      requester:async route=>route==='/api/tags'?
        {models:[{name:'dolphin-llama3:8b'}]}:
        {message:{content:JSON.stringify({question:'Search public issuer filings',
          capabilities:['research.sec']})}}
    })));
  assert.equal(answers[0].status,'MODEL_UNAVAILABLE');
  assert.equal(answers[0].capabilities.includes('research.sec'),false);
  assert.equal(answers[1].status,'MODEL_PLAN_VALIDATED');
  assert.deepEqual(answers[1].capabilities,['research.sec']);
});
