'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CASES,grade,assess}=require('../lib/azure-flow-route-evaluation');
const {devilsAdvocate,diagnosticInvestigator,adversarialBlindspot,
  reviewCase,reviewRun}=require('../lib/azure-flow-three-role-audit');

test('Role 1 challenges valid JSON and required capability without claiming factual success',()=>{
  const item=CASES.find(x=>x.id==='F02');
  const selected=['research.sec','research.public'];
  const verdict=grade(selected,item);
  assert.equal(verdict.pass,true);
  const role=devilsAdvocate(item,selected,verdict);
  assert.equal(role.role,'DEVILS_ADVOCATE');
  assert.equal(role.gate,'NOT_YET_PROVEN');
  assert.match(role.verifiedClaim,/No source retrieval/);
});

test('Role 2 diagnoses the observed omitted ADR knowledge and extraneous workspace sources',()=>{
  const item=CASES.find(x=>x.id==='F08');
  const selected=['workspace.inventory','workspace.sales','knowledge.findings'];
  const verdict=grade(selected,item);
  const role=diagnosticInvestigator(item,selected,verdict,'MODEL_PLAN_VALIDATED');
  assert.equal(role.confirmedFailure,true);
  assert.ok(role.symptoms.some(x=>x.includes('Missing a required')));
  assert.ok(role.symptoms.some(x=>x.includes('Unrelated')));
  assert.equal(role.rootCause,'UNKNOWN_PENDING_TRACE');
});

test('Old false-green F06 is now rejected for irrelevant extras even with a correct knowledge harness',()=>{
  const item=CASES.find(x=>x.id==='F06');
  const selected=['workspace.inventory','workspace.sales','knowledge.findings'];
  const verdict=grade(selected,item);
  assert.equal(verdict.requiredFound,true);
  assert.equal(verdict.pass,false);
  assert.deepEqual(verdict.irrelevantFound,['workspace.inventory','workspace.sales']);
});

test('Old false-green F07 rejects source over-selection',()=>{
  const item=CASES.find(x=>x.id==='F07');
  const selected=['research.sec','research.public','knowledge.findings'];
  const verdict=grade(selected,item);
  assert.equal(verdict.requiredFound,true);
  assert.equal(verdict.pass,false);
  assert.ok(verdict.irrelevantFound.includes('research.sec'));
});

test('Role 3 generates adverse variations and requires detector to catch all of them',()=>{
  const item=CASES.find(x=>x.id==='F05');
  const selected=['workspace.sales'];
  const verdict=grade(selected,item);
  const role=adversarialBlindspot(item,selected,verdict);
  assert.equal(role.role,'ADVERSARIAL_COLLABORATION_AND_BLIND_SPOT_ANALYSIS');
  assert.ok(role.proposedAttacks.length>=3);
  assert.equal(role.detectorEscapeCount,0);
  assert.ok(role.proposedAttacks.every(x=>x.caught));
});

test('Triad fails the user-observed routing result even though model reports valid',()=>{
  const item=CASES.find(x=>x.id==='F01');
  const verdict=reviewCase(item,['workspace.inventory','workspace.sales','knowledge.markdown'],
    'MODEL_PLAN_VALIDATED');
  assert.equal(verdict.decision,'BLOCK');
  assert.equal(verdict.roles.length,3);
  assert.equal(verdict.hiddenQualityCertified,false);
});

test('No model can pass overall qualification with failure to abstain',()=>{
  const selections=CASES.map(item=>({item,
    selected:item.requiredAny.slice(0,1),
    modelStatus:'MODEL_PLAN_VALIDATED',ms:1}));
  const f12=selections.find(x=>x.item.id==='F12');
  f12.selected=['workspace.inventory'];
  const evaluated=assess(selections);
  assert.equal(evaluated.verdict,'NOT_QUALIFIED');
  assert.ok(evaluated.failures.some(x=>x.id==='F12'));
  const triad=reviewRun(selections);
  assert.equal(triad.decision,'BLOCK');
});

test('No metric treats source fitness as factual verification',()=>{
  const item=CASES.find(x=>x.id==='F09');
  const result=reviewCase(item,['research.sec'],'MODEL_PLAN_VALIDATED');
  assert.equal(result.decision,'REVIEW_REQUIRED');
  assert.equal(result.hiddenQualityCertified,false);
  assert.match(result.roles[0].verifiedClaim,/No source retrieval/);
});
