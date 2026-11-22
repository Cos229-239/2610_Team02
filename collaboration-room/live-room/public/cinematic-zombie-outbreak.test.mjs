import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTBREAK_LIMITS,OUTBREAK_PHASES,outbreakPhase,proximityKey} from './cinematic-zombie-outbreak.mjs';
test('exact patient-zero start and bounded 420-agent budget',()=>{
  assert.equal(OUTBREAK_LIMITS.initialInfected,1);
  assert.equal(OUTBREAK_LIMITS.population,420);
  assert.equal(OUTBREAK_LIMITS.simulationHz,12);
  assert.ok(OUTBREAK_LIMITS.simulationHz<=15);
});
test('patient zero, commotion, contagion, horde, and siege are ordered',()=>{
  assert.deepEqual(OUTBREAK_PHASES.map(p=>p.id),
    ['patient-zero','panic','contagion','horde','siege']);
  assert.equal(outbreakPhase(0).id,'patient-zero');
  assert.equal(outbreakPhase(95).id,'horde');
  assert.equal(outbreakPhase(155).id,'siege');
  assert.throws(()=>outbreakPhase(-1),/Invalid/);
});
test('spatial hash buckets are stable, negative-coordinate aware and grid-local',()=>{
  assert.equal(proximityKey(-24,-12),'-5:-3');
  assert.equal(proximityKey(-25,-15),'-5:-3');
  assert.notEqual(proximityKey(-26,-15),proximityKey(-25,-15));
});
