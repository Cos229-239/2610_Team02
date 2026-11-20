'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {MODULES,KNOWN,blobHash,plan,verify,apply}=require('./towerflow-stage-verified-ui.cjs');
const source=path.resolve(__dirname,'..','collaboration-room','azure-bridge');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'tf-updater-audit-'));
 fs.mkdirSync(path.join(root,'public'));
 fs.mkdirSync(path.join(root,'azure-bridge'));
 fs.writeFileSync(path.join(root,'server.js'),"require('./azure-bridge/server.cjs').mount(app,opts);");
 fs.writeFileSync(path.join(root,'public','room.js'),'// preserve all 3D graphics\n');
 for(const file of MODULES)fs.copyFileSync(path.join(source,file),path.join(root,'azure-bridge',file));
 return root;
}
test('verified UI staging does not edit 3D graphics, can update reviewed hash and repeat safely',()=>{
 const root=fixture();
 try{
  const originalScene=fs.readFileSync(path.join(root,'public','room.js'));
  const css=path.join(root,'azure-bridge','loadout.css');
  fs.writeFileSync(css,'/* known reviewed older CSS */');
  const known={...KNOWN,'loadout.css':[...KNOWN['loadout.css'],blobHash(fs.readFileSync(css))]};
  const before=plan(root,{known});
  assert.equal(before.blocked.length,0);
  assert.equal(before.changes.length,1);
  verify(before.changes);
  apply(before.changes);
  assert.deepEqual(fs.readFileSync(path.join(root,'public','room.js')),originalScene);
  assert.deepEqual(fs.readFileSync(css),fs.readFileSync(path.join(source,'loadout.css')));
  const after=plan(root);
  assert.equal(after.blocked.length,0);
  assert.equal(after.changes.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unknown contributor-edited module blocks all writes, preserves custom code',()=>{
 const root=fixture();
 try{
  const file=path.join(root,'azure-bridge','app-hub.js');
  const bytes=Buffer.from('// unique local user customization, never overwrite\n');
  fs.writeFileSync(file,bytes);
  const result=plan(root);
  assert.ok(result.blocked.some(s=>s.includes('app-hub.js')));
  assert.deepEqual(fs.readFileSync(file),bytes);
  assert.equal(result.changes.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('tampering after planning blocks update before writing',()=>{
 const root=fixture();
 try{
  const file=path.join(root,'azure-bridge','azure-ai-connect.js');
  fs.rmSync(file);
  const result=plan(root);
  assert.equal(result.blocked.length,0);
  assert.ok(result.changes.some(c=>c.name==='azure-ai-connect.js'));
  fs.writeFileSync(file,'// newly customized after plan');
  assert.throws(()=>apply(result.changes),/Host changed after plan/);
  assert.equal(fs.readFileSync(file,'utf8'),'// newly customized after plan');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
