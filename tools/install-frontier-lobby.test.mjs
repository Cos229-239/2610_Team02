import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchRoom} from './install-frontier-lobby.mjs';
const addon=readFileSync(new URL('../integrations/frontier/frontier-lobby.js',import.meta.url),'utf8');
const room=[
  "import * as THREE from 'three';",
  "// TF_DEV_ROOM_V1",
  "// TF_CONFIG_AGENT_V1_BEGIN",
  "// TF_AURA_ROOM_CLIENT_V1_BEGIN",
  "let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;",
  "function activateTFStation(id) {}"
].join('\n');
test('three-room section controls and projector added without touching navigation',()=>{
 const next=patchRoom(room,addon);
 assert.match(next,/FRONTIER  \/  TOWERFLOW/);
 assert.match(next,/WORLD STUDIO/);
 assert.match(next,/DEVELOPMENT IDE/);
 assert.match(next,/SpotLight/);
 assert.match(next,/github\.dev\/Cos229-239\/2610_Team02/);
 assert.match(next,/api\/files/);
 assert.match(next,/let vx=-Math\.sin\(yaw\)/);
 assert.equal(patchRoom(next,addon),next);
});
test('prevents overwritten unrecognized environment',()=>{
 assert.throws(()=>patchRoom(room.replace('// TF_DEV_ROOM_V1',''),addon),/preservation anchor/);
 assert.throws(()=>patchRoom(room.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;',''),addon),/preservation anchor/);
 assert.throws(()=>patchRoom(room+'// TF_FRONTIER_LOBBY_V1_BEGIN',addon),/Partial/);
});
test('source editor uses read APIs and explicit save confirmation',()=>{
 assert.match(addon,/api\/file\?path/);
 assert.match(addon,/confirm\("Save/);
 assert.match(addon,/server\.content!==originalCode/);
 assert.doesNotMatch(addon,/child_process|execSync|eval\(|new Function\(/);
});
