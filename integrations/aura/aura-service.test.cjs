"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {Readable}=require("node:stream");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {createAuraHandler,validMemory}=require("./aura-service.cjs");
async function fixture(t) {
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),"aura-test-"));
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const kb=path.join(tmp,"WORLD.md");
  await fs.writeFile(kb,"WASD camera-relative controls. No desktop IDE bridge yet.");
  return {knowledgeFile:kb,memoryDir:path.join(tmp,"memory"),publicOrigin:"https://towerflow.example",authorize:async()=>({userId:"github_123"})};
}
async function call(handler,{url="/api/aura/status",method="GET",headers={},body}={}) {
  const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
  req.url=url;req.method=method;req.headers=headers;
  let code,bodyText,head;
  const res={headersSent:false,writeHead(c,h){code=c;head=h;this.headersSent=true;},end(text){bodyText=text;}};
  const handled=await handler(req,res);
  return {handled,code,head,body:bodyText&&JSON.parse(bodyText)};
}
test("fails closed without explicit trusted user authorization",async t=>{
 const opts=await fixture(t);
 const handler=createAuraHandler({...opts,authorize:async()=>null});
 const response=await call(handler);
 assert.equal(response.code,403);
});
test("serves no-store read-only status only to authorized users",async t=>{
 const handler=createAuraHandler(await fixture(t));
 const r=await call(handler);
 assert.equal(r.code,200);assert.equal(r.body.desktopIDEBridge,false);assert.equal(r.head["Cache-Control"],"no-store");
});
test("rejects cross-origin and non-JSON POST",async t=>{
 const handler=createAuraHandler(await fixture(t));
 const fail=await call(handler,{url:"/api/aura/chat",method:"POST",headers:{origin:"https://evil.example","content-type":"application/json"},body:{question:"Hello"}});
 assert.equal(fail.code,403);
 const invalid=await call(handler,{url:"/api/aura/chat",method:"POST",headers:{origin:"https://towerflow.example","content-type":"text/plain"},body:{question:"Hello"}});
 assert.equal(invalid.code,415);
});
test("persists opted-in per-user memory, supports deletion",async t=>{
 const handler=createAuraHandler(await fixture(t));
 const headers={origin:"https://towerflow.example","content-type":"application/json"};
 let r=await call(handler,{url:"/api/aura/memory",method:"POST",headers,body:{fact:"Always preserve the existing room controls."}});
 assert.equal(r.code,201);
 r=await call(handler,{url:"/api/aura/memory"});
 assert.equal(r.body.memories.length,1);
 const id=r.body.memories[0].id;
 r=await call(handler,{url:"/api/aura/memory",method:"DELETE",headers,body:{id}});
 assert.equal(r.code,200);
 r=await call(handler,{url:"/api/aura/memory"});
 assert.equal(r.body.memories.length,0);
});
test("refuses secret-like memory",()=>{
 assert.equal(validMemory("password is mypassword"),false);
 assert.equal(validMemory("github_pat_abcdefghijklmnopqrstuvwxyz12345"),false);
 assert.equal(validMemory("Maintain accurate world knowledge."),true);
});
test("non-aura route remains unhandled",async t=>{
 const handler=createAuraHandler(await fixture(t));
 const r=await call(handler,{url:"/room/team02"});
 assert.equal(r.handled,false);
});
test("requires absolute reviewed knowledge and loopback model",()=>{
 assert.throws(()=>createAuraHandler({authorize:()=>true,knowledgeFile:"WORLD.md"}));
 assert.throws(()=>createAuraHandler({authorize:()=>true,knowledgeFile:"/tmp/WORLD.md",ollamaURL:"http://0.0.0.0:11434"}));
});
