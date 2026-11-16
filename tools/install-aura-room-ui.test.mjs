import test from 'node:test';
import assert from 'node:assert/strict';
import {install} from './install-aura-room-ui.mjs';
import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../integrations/aura/aura-room-client.js',import.meta.url),'utf8');
const source=[
 '// TF_DEV_ROOM_V1',
 "let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;",
 "function helpPanel(){ console.log('AURA help'); }",
 "function openPanel(id) { if(id==='help') helpPanel(); }"
].join('\n');
test('appends client without changing camera-relative controls',()=>{
 const patched=install(source,client);
 assert.ok(patched.includes('TF_AURA_ROOM_CLIENT_V1_BEGIN'));
 assert.ok(patched.includes('tfAuraArea'));
 assert.ok(patched.includes("let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;"));
 assert.equal(install(patched,client),patched);
});
test('refuses unrecognized live world',()=>{
 assert.throws(()=>install(source.replace('TF_DEV_ROOM_V1','none'),client),/development room/);
});
test('refuses movement regression',()=>{
 assert.throws(()=>install(source.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;','let vx=side;'),client),/Option A/);
});
test('fails closed on damaged patch markers',()=>{
 assert.throws(()=>install(source+'\\n// TF_AURA_ROOM_CLIENT_V1_BEGIN',client),/Partial/);
});
