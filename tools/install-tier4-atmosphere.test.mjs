import test from 'node:test';
import assert from 'node:assert/strict';
import { patchRoom } from './install-tier4-atmosphere.mjs';

const start = '// TF_TIER4_ATMOSPHERE_V1_BEGIN';
const end = '// TF_TIER4_ATMOSPHERE_V1_END';
const module = start + '\nwindow.tfTier4Atmosphere = {};\n' + end;
const room = 'const THREE = {}; const scene = {}; const renderer = {};\n';

test('preserves original room and appends module', () => {
  const result = patchRoom(room, module);
  assert.equal(result.slice(0, room.length), room);
  assert.ok(result.includes(module));
});
test('reinstallation is idempotent', () => {
  const once = patchRoom(room, module);
  assert.equal(patchRoom(once, module), once);
});
test('rejects incompatible rooms and partial markers', () => {
  assert.throws(() => patchRoom('const unrelated = true;', module), /Incompatible/);
  assert.throws(() => patchRoom(room + start, module), /Partial/);
});
