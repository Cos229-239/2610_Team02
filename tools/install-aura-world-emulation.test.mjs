import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchRoom,validateVault} from './install-aura-world-emulation.mjs';

const addon=readFileSync(new URL('../integrations/aura/aura-world-emulator.js',import.meta.url),'utf8');
const vault=JSON.parse(readFileSync(new URL('../towerflow-knowledge/object-reference-vault.json',import.meta.url),'utf8'));
const fixture=[
  "import * as THREE from 'three';",
  "// TF_DEV_ROOM_V1",
  "// TF_CONFIG_AGENT_V1_BEGIN",
  "// TF_AURA_ROOM_CLIENT_V1_BEGIN",
  "let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;",
  "function helpPanel() { return true; }"
].join('\n');

test('vault stores reference-based documentation for four object families',()=>{
 assert.equal(validateVault(vault),true);
 const byId=Object.fromEntries(vault.objects.map(o=>[o.id,o]));
 assert.equal(byId['solar-system'].sources.length>=2,true);
 assert.equal(byId['aurora'].sources.some(s=>s.url.includes('nasa.gov')),true);
 assert.ok(byId['sunset'].observedFeatures.some(x=>/sun/i.test(x)));
});
test('installs scene emulator once and preserves first-person navigation',()=>{
 const next=patchRoom(fixture,addon);
 assert.ok(next.includes('TF_WORLD_EMULATION_V1_BEGIN'));
 assert.ok(next.includes('paintSunset'));
 assert.ok(next.includes('paintAurora'));
 assert.ok(next.includes('planetData'));
 assert.ok(next.includes('paintText'));
 assert.ok(next.includes("let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;"));
 assert.equal(patchRoom(next,addon),next);
});
test('refuses incomplete or unfamiliar Towerflow world',()=>{
 assert.throws(()=>patchRoom(fixture.replace('TF_DEV_ROOM_V1','wrong'),addon),/Preservation check/);
 assert.throws(()=>patchRoom(fixture.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side','vx=side'),addon),/Preservation check/);
 assert.throws(()=>patchRoom(fixture+'\\n// TF_WORLD_EMULATION_V1_BEGIN',addon),/Partial previous/);
});
test('no shell, eval or server writes exposed by sky emitter',()=>{
 assert.ok(!["child_process","execSync","eval(","new Function(","fetch(","WebSocket("].some(x=>addon.includes(x)));
 assert.match(addon,/Original Towerflow ceiling restored/i);
});
