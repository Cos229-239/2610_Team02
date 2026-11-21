import test from 'node:test';
import assert from 'node:assert/strict';
import {DISASTER_DURATION_SECONDS,DISASTER_PHASES,disasterPhase} from './cinematic-disaster-scenario.mjs';

test('exact three-aircraft fictional timeline, two impacts on first tower then third on second',()=>{
  assert.deepEqual(DISASTER_PHASES.filter(p=>p.id.startsWith('impact')).map(p=>p.start),[15,32,52]);
  assert.equal(disasterPhase(14.99).id,'approach');
  assert.equal(disasterPhase(15).id,'impact-one');
  assert.equal(disasterPhase(32).id,'impact-two');
  assert.equal(disasterPhase(52).id,'impact-three');
});
test('two successive collapse phases follow all aircraft impacts',()=>{
  assert.equal(disasterPhase(82.99).id,'fire');
  assert.equal(disasterPhase(83).id,'collapse-one');
  assert.equal(disasterPhase(104).id,'collapse-two');
  assert.equal(disasterPhase(DISASTER_DURATION_SECONDS).id,'collapse-two');
});
test('invalid timeline values reject',()=>{
  assert.throws(()=>disasterPhase(-1),/Invalid/);
  assert.throws(()=>disasterPhase(NaN),/Invalid/);
});
