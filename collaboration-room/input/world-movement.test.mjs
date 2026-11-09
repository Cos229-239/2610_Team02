import test from 'node:test';
import assert from 'node:assert/strict';
import { movementVector, moveWorld } from './world-movement.js';
const keyset = (...keys) => new Set(keys);
test('W points north/up regardless of camera yaw',()=>{
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
    // Deliberately no yaw argument: orientation-independent by construction.
    const moved=moveWorld({x:0,z:0,yaw},keyset('w'),.1);
    assert.deepEqual([moved.x,moved.z],[0,-.5]);
  }
});
test('A left, D right, S down',()=>{
  assert.equal(movementVector(keyset('a')).x,-1);
  assert.equal(movementVector(keyset('d')).x,1);
  assert.equal(movementVector(keyset('s')).z,1);
});
test('diagonal motion is normalized',()=>{
  const {x,z}=movementVector(keyset('w','d'));
  assert.ok(Math.abs(Math.hypot(x,z)-1)<1e-9);
});
test('Shift sprint doubles movement, not camera rotation',()=>{
  const moved=moveWorld({x:0,z:0},keyset('w','shift'),.1);
  assert.equal(moved.z,-1);
});
test('opposite keys cancel and bounds constrain position',()=>{
  assert.deepEqual(movementVector(keyset('w','s')), {x:0,z:0,speedMultiplier:1});
  const p=moveWorld({x:19.49,z:0},keyset('d'),.1);
  assert.equal(p.x,19.5);
});
