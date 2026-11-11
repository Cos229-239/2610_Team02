import test from 'node:test';
import assert from 'node:assert/strict';
import { selectContext, redactMemory, tokens } from './towerflow-expert-agent.mjs';

test('retrieval prioritizes domain-relevant evidence', () => {
 const corpus=[
  {path:'movement.md',text:'WASD first-person movement follows camera yaw and Shift sprints.'},
  {path:'voice.md',text:'Microphone speech connects via browser WebRTC.'}
 ];
 const chosen=selectContext('How does camera yaw change WASD movement?',corpus);
 assert.equal(chosen[0].path,'movement.md');
});
test('no forced retrieval with unrelated query',()=>{
 assert.deepEqual(selectContext('strawberry galaxy', [{path:'a',text:'WASD sprint controls'}]),[]);
});
test('rejects empty and credential memories',()=>{
 assert.throws(()=>redactMemory(' '));
 assert.throws(()=>redactMemory('password is hello'));
 assert.throws(()=>redactMemory('github_pat_abcdefghijklmnopqrstuvwxyz123456'));
 assert.equal(redactMemory('Keep the IDEs inside Towerflow.'),'Keep the IDEs inside Towerflow.');
});
test('tokens produces unique normalized words',()=>{
 assert.ok(tokens('Camera camera movement').has('camera'));
 assert.equal(tokens('Camera camera').size,1);
});
