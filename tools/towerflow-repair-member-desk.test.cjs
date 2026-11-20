'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {transform,plan,apply,oldFetch,oldCatch}=require('./towerflow-repair-member-desk.cjs');
const source=fs.readFileSync(path.join(__dirname,'../collaboration-room/azure-bridge/loadout.js'),'utf8').replace(/\r\n/g,'\n');
const mark='    // TF_MEMBER_DESK_RECOVERY_V1_BEGIN',end='    // TF_MEMBER_DESK_RECOVERY_V1_END';
function previous(){
 const start=source.indexOf(mark),stop=source.indexOf(end,start)+end.length+1;
 assert.ok(start>0&&stop>start,'reviewed recovery block must exist');
 return source.slice(0,start)+source.slice(stop)
 .replace("                const response = await fetch('/api/azure-bridge/loadout', {credentials:'same-origin',cache:'no-store'});\n                if (!response.ok) throw Error('HTTP '+response.status);\n                const next = await response.json();\n                if (!next || !safe(next.login) || !next.projects || !next.projects[next.defaultProject])\n                    throw Error('Incomplete member workspace response');",oldFetch)
 .replace("            } catch (error) {\n                model = null; chosen = null; pin = null; drafts.clear();\n                shortcut.textContent = 'Contribute';\n                await fallbackDesk(error.message || 'unavailable');\n            } finally { pending = null; }",oldCatch);
}
function fixture(contents){
 const room=fs.mkdtempSync(path.join(os.tmpdir(),'tf-member-recovery-'));
 fs.mkdirSync(path.join(room,'public'));fs.mkdirSync(path.join(room,'azure-bridge'));
 fs.writeFileSync(path.join(room,'server.js'),'// existing host');
 fs.writeFileSync(path.join(room,'public','room.js'),'// preserved cinematic graphics');
 fs.writeFileSync(path.join(room,'azure-bridge','loadout.js'),contents);
 return room;
}
test('member recovery changes only reviewed snippets and preserves all existing customizations',()=>{
 const old=previous()+'\n// TEAMMATE CUSTOM FILE EXTENSION REMAINS\n';
 const repaired=transform(old);
 assert.ok(repaired.includes('TF_MEMBER_DESK_RECOVERY_V1_BEGIN'));
 assert.ok(repaired.includes('api/me'));
 assert.ok(repaired.includes('TEAMMATE CUSTOM FILE EXTENSION REMAINS'));
 assert.ok(repaired.includes('WilliamPersonal'));
 assert.equal(transform(repaired),repaired);
 assert.throws(()=>transform(old.replace(oldFetch,'// different local route')),/anchor/);
});
test('Windows CRLF source is patched without altering existing line endings or teammate customizations',()=>{
 const original=(previous()+'\n// WINDOWS TEAMMATE NOTES\n').replace(/\n/g,'\r\n');
 const result=transform(original);
 assert.ok(result.includes('TF_MEMBER_DESK_RECOVERY_V1_BEGIN\r\n'));
 assert.ok(result.endsWith('// WINDOWS TEAMMATE NOTES\r\n'));
 assert.equal(result.replace(/\r\n/g,'' ).includes('\n'),false,'No stray LF endings introduced');
 assert.equal(transform(result),result,'Idempotent CRLF update');
});
test('review-only and applied mode alter one file, never scene/server; second run is idempotent',()=>{
 const room=fixture(previous());
 try{
  const scene=fs.readFileSync(path.join(room,'public','room.js'));
  const server=fs.readFileSync(path.join(room,'server.js'));
  const before=fs.readFileSync(path.join(room,'azure-bridge','loadout.js'));
  const review=plan(room);
  assert.equal(review.changed,true);
  assert.deepEqual(fs.readFileSync(path.join(room,'azure-bridge','loadout.js')),before);
  apply(review);
  assert.deepEqual(fs.readFileSync(path.join(room,'public','room.js')),scene);
  assert.deepEqual(fs.readFileSync(path.join(room,'server.js')),server);
  const second=plan(room);assert.equal(second.changed,false);
 }finally{fs.rmSync(room,{recursive:true,force:true});}
});
test('unknown host mutation between plan and apply refuses all writes',()=>{
 const room=fixture(previous());
 try{
  const reviewed=plan(room);
  fs.appendFileSync(path.join(room,'azure-bridge','loadout.js'),'\n// teammate wrote more code');
  assert.throws(()=>apply(reviewed),/changed after planning/);
  assert.ok(fs.readFileSync(path.join(room,'azure-bridge','loadout.js'),'utf8').includes('teammate wrote more'));
 }finally{fs.rmSync(room,{recursive:true,force:true});}
});
