'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PROFILES,validateProfile,clampVolume,chooseGreetingAsset}=require('./acoustic-profiles.cjs');
test('all four environments are configured',()=>assert.deepEqual(Object.keys(PROFILES),['focus','forest','yoga','psychedelic']));
test('unknown environments are rejected',()=>assert.throws(()=>validateProfile('__proto__'),RangeError));
test('volume clamps and rejects invalid numbers',()=>{
  assert.equal(clampVolume(-1),0);assert.equal(clampVolume(2),1);
  assert.throws(()=>clampVolume(NaN),TypeError);
});
test('greeting never silently uses OS synthetic voice',()=>{
  assert.equal(chooseGreetingAsset([]),null);
  assert.equal(chooseGreetingAsset([{kind:'browser',locale:'en-US',url:'/assets/audio/voice.mp3'}]),null);
});
test('only local approved greeting assets are accepted',()=>{
  assert.equal(chooseGreetingAsset([{kind:'neural',locale:'en-US',url:'https://example.com/a.mp3'}]),null);
  assert.equal(chooseGreetingAsset([{kind:'recorded',locale:'en-US',url:'/assets/audio/greeting.mp3'}]).kind,'recorded');
});
