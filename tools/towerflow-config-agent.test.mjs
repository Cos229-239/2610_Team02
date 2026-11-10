import test from 'node:test';
import assert from 'node:assert/strict';
import { patchRoom, generateBlock } from './towerflow-config-agent.mjs';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./towerflow-config.json', import.meta.url), 'utf8'));
const fixture = [
'// TF_DEV_ROOM_V1',
'let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;',
"function activateTFStation(id){ if(id==='dev-room') return; if (id.startsWith('dev-ide-')) { openPanel('ide'); return; } openPanel(id); }"
].join('\n');
test('inserts one IDE configuration panel hook without touching controls', () => {
  const result = patchRoom(fixture, config);
  assert.match(result, /tfShowIDEIntegration\(id\)/);
  assert.match(result, /let vx=-Math\.sin\(yaw\)/);
  assert.match(result, /window\.tfConfigAgent/);
  assert.match(result, /Desktop IDE bridge not configured/);
  assert.equal(patchRoom(result, config), result);
});
test('rejects absent development chamber', () => {
  assert.throws(() => patchRoom(fixture.replace('// TF_DEV_ROOM_V1',''), config), /development room/);
});
test('rejects movement regression', () => {
  assert.throws(() => patchRoom(fixture.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side','let vx=side,vz=-fw'), config), /Option A/);
});
test('rejects invalid station configuration', () => {
  assert.throws(() => generateBlock({...config, stations:[...config.stations].reverse()}), /station id/);
});
test('rejects duplicate integration markers', () => {
  const once = patchRoom(fixture,config);
  assert.throws(() => patchRoom(once+'\n// TF_CONFIG_AGENT_V1_BEGIN',config), /Duplicate|Incomplete/);
});
