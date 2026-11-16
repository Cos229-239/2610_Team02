import test from 'node:test';
import assert from 'node:assert/strict';
import {patch} from './install-aura-lighting.mjs';
import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../integrations/aura/aura-lighting-actions.js',import.meta.url),'utf8');
const base=[
 'import * as THREE from "three";',
 '// TF_DEV_ROOM_V1',
 '// TF_CONFIG_AGENT_V1_BEGIN',
 '// TF_AURA_ROOM_CLIENT_V1_BEGIN',
 'function helpPanel() { return true; }',
 'let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;'
].join('\n');
test('adds reversible scene preset with preserved first-person control',()=>{
 const actual=patch(base,client);
 assert.match(actual,/TF_AURA_LIGHTING_V1_BEGIN/);
 assert.match(actual,/localStorage\.setItem/);
 assert.match(actual,/scene\.background\.copy\(baseBackground\)/);
 assert.match(actual,/renderer\.toneMappingExposure=baseExposure/);
 assert.match(actual,/let vx=-Math\.sin\(yaw\)/);
 assert.equal(patch(actual,client),actual);
});
test('rejects unconfigured and damaged rooms',()=>{
 assert.throws(()=>patch(base.replace('// TF_CONFIG_AGENT_V1_BEGIN',''),client),/IDE configuration/);
 assert.throws(()=>patch(base.replace('// TF_AURA_ROOM_CLIENT_V1_BEGIN',''),client),/AURA chat/);
 assert.throws(()=>patch(base.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side','let vx=fw'),client),/camera-relative/);
 assert.throws(()=>patch(base+'\n// TF_AURA_LIGHTING_V1_BEGIN',client),/Partial lighting/);
});
test('vibrant lighting does not add shell/desktop code',()=>{
 assert.doesNotMatch(client,/child_process|execSync|fetch\(|WebSocket\(/);
 assert.match(client,/committed=selected;saveTheme\(committed\)/);
 assert.match(client,/Other teammates/);
});
