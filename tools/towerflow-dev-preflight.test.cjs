'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {inspectRoom,inspectHttp,summarize}=require('./towerflow-dev-preflight.cjs');
test('preflight blocks absent room and never mutates the host',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tf-safe-preflight-'));
 try{
  const before=fs.readdirSync(dir);
  let result=inspectRoom(dir);
  assert.ok(result.some(c=>c.id==='host-server-present'&&c.status==='BLOCK'));
  assert.ok(result.some(c=>c.id==='scene-dev-station-routing'&&c.status==='BLOCK'));
  assert.deepEqual(fs.readdirSync(dir),before);
  assert.equal(summarize(result),false);
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
test('host with bridge but stale scene is explicitly NOT READY',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tf-stale-preflight-'));
 try{
  fs.mkdirSync(path.join(dir,'public'));fs.mkdirSync(path.join(dir,'azure-bridge'));
  fs.writeFileSync(path.join(dir,'server.js'),"require('./azure-bridge/server.cjs').mount(app, opts);");
  fs.writeFileSync(path.join(dir,'public','room.js'),'// Legacy Dev Room scene. Existing graphics are unchanged.');
  const before=fs.readFileSync(path.join(dir,'public','room.js'));
  const result=inspectRoom(dir);
  assert.equal(result.find(c=>c.id==='bridge-mounted').status,'PASS');
  assert.equal(result.find(c=>c.id==='scene-dev-station-routing').status,'BLOCK');
  assert.equal(result.find(c=>c.id==='scene-business-projector').status,'BLOCK');
  assert.deepEqual(fs.readFileSync(path.join(dir,'public','room.js')),before);
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
test('HTTP preflight reports the actual served route, not only installed files',async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/room/team02')return res.end('<script src="/azure-bridge/ide-workstations.js"></script>');
  if(req.url==='/azure-bridge/ide-workstations.js')return res.end('window.tfOpenIDEStation=display');
  if(req.url==='/azure-bridge/azure-ai-connect.js')return res.end('Gemini');
  if(req.url==='/towerflow-entry.mjs')return res.end('// old 3D scene');
  res.statusCode=404;res.end();
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 try{
  const checks=await inspectHttp('http://127.0.0.1:'+server.address().port);
  assert.equal(checks.length,6);
  assert.equal(checks[0].status,'PASS');
  assert.equal(checks[1].status,'PASS');
  assert.equal(checks[2].status,'PASS');
  assert.equal(checks[3].status,'BLOCK');
  assert.equal(checks[4].status,'BLOCK');
  assert.equal(checks[5].status,'BLOCK');
 }finally{await new Promise(done=>server.close(done));}
});
