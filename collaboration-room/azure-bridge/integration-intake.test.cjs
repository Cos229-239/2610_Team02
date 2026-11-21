'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {classify,makeIntegrationIntake} = require('./integration-intake.cjs');
const a='a'.repeat(40);
test('classifies native sources by language and owner without executing them', () => {
  const result=classify([
    {filename:'TowerFlow Files/TowerFlow (Malik modified)/TowerFlowGUI.cpp',status:'modified'},
    {filename:'Towerflow_OW/TowerFlow/Inventory.cpp',status:'added'},
    {filename:'DisplayHelper.h',status:'added'},
    {filename:'TowerFlowWindow/TowerFlowWinForm/Form1.cs',status:'modified'},
    {filename:'Towerflow_OW/TowerFlow/x64/Debug/generated.cpp',status:'added'}
  ]);
  assert.deepEqual(result.members,['SVN-760','HyperRealmEnd','DaynaPerezColon','Lopobunnie']);
  assert.deepEqual(result.languages,['C++','C#']);
  assert.equal(result.files.length,4);
  assert.equal(result.subsystems.includes('native'),true);
});
test('intake uses exact dev commit and reports unverified rather than falsely deploying', async () => {
  let calls=0;
  const read=async url=>{
    calls++;
    if (url.includes('/commits?sha=dev')) return {ok:true,json:async()=>[{
      sha:a,author:{login:'SVN-760'},commit:{message:'GUI update',committer:{date:'2026-11-20T00:00:00Z'}}
    }]};
    assert.equal(url.includes('/commits/'+a),true);
    return {ok:true,json:async()=>({files:[{filename:'TowerFlow Files/TowerFlow (Malik modified)/TowerFlowGUI.cpp',status:'modified'}]})};
  };
  let clock=1000;
  const intake=makeIntegrationIntake(read,()=>clock);
  const one=await intake('member-1'),two=await intake('member-2');
  assert.deepEqual(one,two);
  assert.equal(calls,2);
  assert.equal(one.entries[0].integration,'unverified');
  assert.equal(one.entries[0].runtime,'not-deployed');
  assert.equal(one.entries[0].build,'not-run');
  clock+=31000;
  await intake('member-1');
  assert.equal(calls,4);
});
test('intake rejects invalid GitHub commit IDs',async()=>{
  const intake=makeIntegrationIntake(async()=>({ok:true,json:async()=>[{sha:'invalid'}]}));
  await assert.rejects(intake('member'));
});
