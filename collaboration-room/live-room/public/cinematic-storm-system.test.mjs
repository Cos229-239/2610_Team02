import test from 'node:test';
import assert from 'node:assert/strict';
import {STORM_MODES,STORM_SETTINGS,stormSettings} from './cinematic-storm-system.mjs';

test('all dramatic storm categories are distinct and configured',()=>{
  assert.deepEqual(STORM_MODES,['severe','hurricane','typhoon','blizzard']);
  for(const mode of STORM_MODES){
    const s=stormSettings(mode);
    assert.ok(s.wind>0);
    assert.ok(s.cloud>0);
  }
});
test('tornado vortex distinct from hurricane storm surge',()=>{
  assert.equal(stormSettings('severe').funnel,true);
  assert.equal(stormSettings('hurricane').funnel,false);
  assert.ok(stormSettings('hurricane').flood>0);
  assert.ok(stormSettings('typhoon').flood>0);
  assert.equal(stormSettings('blizzard').rain,0);
});
test('unknown weather modes remain unhandled',()=>{
  assert.equal(stormSettings('blackout'),null);
  assert.equal(stormSettings(null),null);
});
