"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {validateManifest,createInteractionRegistry,contributorPackage}=require("./object-contract.cjs");
const original={schemaVersion:1,moduleId:"network.console",author:"Dulskinator96",branch:"feature/network-console",
 target:"frontier",asset:{kind:"glb",path:"assets/network-console.glb",rights:"CC0",sha256:"a".repeat(64),
 dimensions:{width:1.2,height:1.7,depth:.8}},
 interactions:[{action:"object.inspect",label:"Inspect network console",minRole:"viewer",handlerId:"inspect_console"},
 {action:"ide.open",label:"Open workstation workspace",minRole:"contributor",handlerId:"open_workspace"}]};
test("real 3D object package preserves author and room/business routing",()=>{
 const m=validateManifest(original);
 assert.equal(m.owner,undefined);
 assert.equal(m.author,"Dulskinator96");
 assert.equal(m.target,"frontier");
 assert.equal(m.interactions.length,2);
 assert.equal(m.acceptance.pattern,"UNKNOWN");
 const pkg=contributorPackage(original,{revision:"a".repeat(40)});
 assert.equal(pkg.owner,"Dulskinator96");
 assert.equal(pkg.autoPublish,false);
});
test("Object actions bind to reviewed server functionality and roles, not arbitrary AI code",async()=>{
 let count=0;
 const registry=createInteractionRegistry({handlers:{inspect_console:async()=>({confirmed:true,evidenceRef:"test:inspection"}),
   open_workspace:async()=>{count++;return {confirmed:true,evidenceRef:"test:workspace-open"};}},
  authorize:async context=>context.role});
 assert.equal((await registry.invoke(original,"object.inspect",{role:"viewer",actor:"test"})).result,"EXECUTED");
 await assert.rejects(registry.invoke(original,"ide.open",{role:"viewer"}),/denied/);
 assert.equal(count,0);
 await registry.invoke(original,"ide.open",{role:"contributor"});
 assert.equal(count,1);
 await assert.rejects(registry.invoke(original,"code.shell",{role:"maintainer"}),/not described/);
});
test("Rejects path traversal, illegitimate assets, and unknown rights",()=>{
 assert.throws(()=>validateManifest({...original,asset:{...original.asset,path:"../secret.glb"}}),/GLB/);
 assert.throws(()=>validateManifest({...original,asset:{...original.asset,rights:"pinterest"}}),/GLB/);
 assert.throws(()=>validateManifest({...original,interactions:[]}),/one to twelve/);
 assert.throws(()=>validateManifest({...original,interactions:[original.interactions[0],original.interactions[0]]}),/duplicate/);
 assert.throws(()=>validateManifest({...original,target:"shell"}),/identity/);
});
test("Missing reviewed handler or its receipt is never treated as execution",async()=>{
 const registry=createInteractionRegistry({handlers:{inspect_console:async()=>({confirmed:true})},
  authorize:async()=>"maintainer"});
 await assert.rejects(registry.invoke(original,"object.inspect",{}),/verified/);
 await assert.rejects(registry.invoke(original,"ide.open",{}),/not installed/);
});
