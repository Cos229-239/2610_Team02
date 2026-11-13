"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {webcrypto,createHash}=require("node:crypto");
const {KEY,layout,approveManifest,assertEmbeddedGLB,install}=require("./cinematic-fidelity.js");
class Geometry {constructor(){this.disposed=false;}dispose(){this.disposed=true;}}
class Material {constructor(x){Object.assign(this,x);this.disposed=false;}dispose(){this.disposed=true;}}
class Object3D {
  constructor(){this.position={set:(x,y,z)=>{this.p={x,y,z}}};this.scale={set:(x,y,z)=>{this.s={x,y,z}}};}
  updateMatrix(){this.matrix={p:{...this.p},s:{...this.s}};}
}
class Group {constructor(){this.children=[];this.userData={};this.position={set:(...xyz)=>{this.xyz=xyz}};this.scale={setScalar:(x)=>{this.size=x}};}add(v){this.children.push(v)}traverse(f){f(this);this.children.forEach(f)}}
class InstancedMesh {
  constructor(geo,mat,n){this.geometry=geo;this.material=mat;this.count=n;this.instanceMatrix={needsUpdate:false};this.userData={};this.records=[];this.isMesh=true;}
  setMatrixAt(i,x){this.records[i]=structuredClone(x)}
}
const THREE={Group,InstancedMesh,Object3D,BoxGeometry:Geometry,TorusGeometry:Geometry,
  MeshStandardMaterial:Material,MeshPhysicalMaterial:Material};
const scene=()=>({children:[{name:"projector"},{name:"aura"},{name:"world"},{name:"dev"}],
  add(x){this.children.push(x)},remove(x){this.children.splice(this.children.indexOf(x),1)}});
function sampleGLB(json={asset:{version:"2.0"},buffers:[{byteLength:0}]}) {
  const bytes=Buffer.from(JSON.stringify(json));
  const len=(bytes.length+3)&~3;
  const out=Buffer.alloc(20+len);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);
  out.writeUInt32LE(out.byteLength,8);out.writeUInt32LE(len,12);
  out.writeUInt32LE(0x4e4f534a,16);bytes.copy(out,20);
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);
}
const approved=(bytes)=>({url:"/assets/frontier/approved-room-rack.glb",
  sha256:createHash("sha256").update(Buffer.from(bytes)).digest("hex"),rights:"licensed",
  source:"Designer-authorized asset register",position:{x:-19.6,y:2.2,z:4.1},scale:.8});
test("three PBR instanced architectural categories stay in reserved perimeter",()=>{
  const plan=layout();assert.equal(plan.estimatedDrawCalls,3);
  assert.ok(plan.instances>100&&plan.instances<300);
  for(const p of [...plan.chassis,...plan.signal,...plan.optics]){
    assert.ok(p.x< -11);
    assert.ok(Math.hypot(p.x-16.9,p.z-12.4)>2);
    assert.ok(!(p.z< -14.7&&Math.abs(p.x)<9.6));
  }
});
test("installs on original scene only and is fully reversible without input or renderer mutation",()=>{
  const src=scene(),before=src.children.slice(),renderer={info:{render:{calls:13,triangles:34000}}};
  const ctl=install({THREE,scene:src,renderer});
  assert.strictEqual(install({THREE,scene:src}),ctl);
  assert.equal(src.children.length,before.length+1);
  assert.equal(src.children.at(-1).children.length,3);
  for(const mesh of src.children.at(-1).children){
    assert.equal(mesh.userData.tfDecorativeOnly,true);
    assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,false);
    assert.equal(mesh.raycast(),undefined);
    assert.equal(mesh.records.length,mesh.count);
  }
  assert.equal(ctl.stats().observedRendererCalls,13);
  assert.equal(ctl.stats().verifiedFrameRate,null);
  ctl.dispose();assert.deepEqual(src.children,before);
});
test("user preferences do not change ceiling, existing canvas or world settings",()=>{
 const s=scene(),m=new Map([[KEY,"off"],["ceilingTheme","ivory"]]);
 const ctl=install({THREE,scene:s,storage:{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)}});
 assert.equal(ctl.stats().enabled,false);assert.equal(s.children.at(-1).visible,false);
 ctl.setEnabled(true);assert.equal(m.get("ceilingTheme"),"ivory");
 ctl.update(200);ctl.dispose();
});
test("GLB manifest is same-origin, licensed, versioned, and outside interactive zones",()=>{
 const b=sampleGLB(),m=approved(b);
 assert.equal(approveManifest(m).sha256,m.sha256);
 for(const url of ["https://evil.test/m.glb","/assets/frontier/../wrong.glb",
   "/assets/frontier/outside.gltf","//evil.test/frontier/a.glb"]){
  assert.throws(()=>approveManifest({...m,url}));
 }
 assert.throws(()=>approveManifest({...m,rights:"unknown"}),/Rights/);
 assert.throws(()=>approveManifest({...m,position:{x:0,y:1,z:0}}),/perimeter/);
});
test("GLB validator refuses malformed envelope and remote references",()=>{
 assert.equal(assertEmbeddedGLB(sampleGLB()),true);
 assert.throws(()=>assertEmbeddedGLB(new ArrayBuffer(20)),/GLB/);
 assert.throws(()=>assertEmbeddedGLB(sampleGLB({buffers:[{uri:"https://remote/evil.bin"}]})),/External/);
 assert.throws(()=>assertEmbeddedGLB(sampleGLB({images:[{uri:"external.png"}]})),/External/);
});
test("GLB mount verifies bytes before parse, disables interaction and records provenance",async()=>{
 const s=scene(),ctl=install({THREE,scene:s}),bytes=sampleGLB(),manifest=approved(bytes);
 let parsed=0;
 const asset={isMesh:true,userData:{},raycast(){throw Error("not safe")}};
 const model=new Group();model.children.push(asset);
 const response={ok:true,type:"basic",arrayBuffer:async()=>bytes};
 const receipt=await ctl.mountGLB({manifest,loader:{parseAsync:async()=>{
   parsed++;return {scene:model};}},fetcher:async()=>response,cryptoApi:webcrypto});
 assert.equal(parsed,1);assert.equal(asset.raycast(),undefined);
 assert.equal(asset.castShadow,false);assert.equal(asset.receiveShadow,false);
 assert.equal(receipt.verifiedBytes,true);
 assert.equal(ctl.stats().loadedGLB,1);
 await assert.rejects(ctl.mountGLB({manifest:{...manifest,sha256:"0".repeat(64)},
  loader:{parseAsync:()=>{throw Error("should not parse")}},fetcher:async()=>response,cryptoApi:webcrypto}),/SHA-256 mismatch/);
 ctl.dispose();
});
test("no scene or loader means explicit failure rather than fabricated install",async()=>{
 assert.throws(()=>install({THREE,scene:{}}),/scene/);
 const ctl=install({THREE,scene:scene()});
 await assert.rejects(ctl.mountGLB({manifest:approved(sampleGLB())}),/GLTFLoader/);
 ctl.dispose();
});
