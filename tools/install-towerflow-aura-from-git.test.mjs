import test from 'node:test';
import assert from 'node:assert/strict';
import {patchRoom,patchServer} from './install-towerflow-aura-from-git.mjs';
import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../integrations/aura/aura-room-client.js',import.meta.url),'utf8');
const baseServer=[
 "const app={use(){},get(){}};",
 "const path=require('node:path'),__dirname='.';",
 "const auth=()=>{},ensureMember=()=>{},publicOrigin='https://example.test';",
 "app.get('/api/health',()=>{});",
 "if(data.type==='move'){self.x=Math.max(-18,Math.min(18,Number(data.x)||0));self.z=Math.max(-13,Math.min(13,Number(data.z)||0));broadcast({type:'move',id,x:self.x,z:self.z},id);}"
].join('\n');
const baseRoom=[
 '// TF_DEV_ROOM_V1',
 '// TF_CONFIG_AGENT_V1_BEGIN',
 'function helpPanel(){ console.log("help"); }',
 'let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;',
].join('\n');
test('source-matched server gains protected route and development avatar sync',()=>{
 const next=patchServer(baseServer);
 assert.ok(next.includes("createAuraHandler"));
 assert.ok(next.includes("app.use('/api/aura',auth,ensureMember"));
 assert.ok(next.includes('Number.isFinite(x)'));
 assert.equal(patchServer(next),next);
});
test('in-world chat client is idempotent and preserves confirmed controls',()=>{
 const next=patchRoom(baseRoom,client);
 assert.ok(next.includes('TF_AURA_ROOM_CLIENT_V1_BEGIN'));
 assert.ok(next.includes("let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side"));
 assert.equal(patchRoom(next,client),next);
});
test('rejects unknown or incomplete source',()=>{
 assert.throws(()=>patchRoom(baseRoom.replace('TF_DEV_ROOM_V1','wrong'),client));
 assert.throws(()=>patchServer(baseServer.replace("app.get('/api/health'","app.get('/other'")));
 assert.throws(()=>patchServer(baseServer+'\\n// TF_AURA_V2_SERVER_BEGIN'));
});
