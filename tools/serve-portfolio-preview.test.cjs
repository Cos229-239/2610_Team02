"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const http=require("node:http");
const {resolveAsset,serve}=require("./serve-portfolio-preview.cjs");
test("preview serves actual portfolio HTML and inventory modules",async()=>{
 const server=http.createServer(serve);
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 try{
  let html=await fetch(base+"/");
  assert.equal(html.status,200);
  const txt=await html.text();
  assert.match(txt,/data-tf-app-panel="inventory"/);
  assert.match(txt,/data-tf-app-panel="finance"/);
  for(const file of ["app.js","inventory-core.js","inventory-ui.js","styles.css"]){
   const response=await fetch(base+"/"+file);
   assert.equal(response.status,200,file+" must be available");
  }
  const secret=await fetch(base+"/..%2F..%2F.env");
  assert.equal(secret.status,403);
  assert.equal((await fetch(base+"/badfile")).status,404);
  assert.equal((await fetch(base+"/",{method:"POST"})).status,405);
 } finally{await new Promise(resolve=>server.close(resolve));}
});
test("path resolver is scoped to TowerFlow app",()=>{
 assert.equal(resolveAsset("/..%2F..%2Fsecret"),null);
 assert.equal(resolveAsset("/%5cWindows%5csecret"),null);
});
