"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {layout,install,KEY}=require("./cyber-ambience.js");
class Geometry {constructor(){this.disposed=false} dispose(){this.disposed=true}}
class Material {
  constructor(opts){Object.assign(this,opts);this.disposed=false}
  dispose(){this.disposed=true}
}
class Object3D {
  constructor(){this.position={set:(x,y,z)=>{this.p={x,y,z}}};this.scale={set:(w,h,d)=>{this.s={w,h,d}}};this.matrix=null}
  updateMatrix(){this.matrix={p:{...this.p},s:{...this.s}}}
}
class Group{
  constructor(){this.children=[];this.userData={};this.name="";this.visible=true}
  add(item){this.children.push(item)}
}
class InstancedMesh{
  constructor(geo,material,count){this.geometry=geo;this.material=material;this.count=count;this.name="";this.userData={};this.instanceMatrix={needsUpdate:false};this.matrices=[]}
  setMatrixAt(index,matrix){this.matrices[index]={p:{...matrix.p},s:{...matrix.s}}}
}
const THREE={BoxGeometry:Geometry,MeshStandardMaterial:Material,Object3D,Group,InstancedMesh};
const createScene=()=>({
  children:[{name:"original-projector"},{name:"original-DevRoom"},{name:"original-AURA"},{name:"original-globe"}],
  add(o){this.children.push(o)},
  remove(o){this.children.splice(this.children.indexOf(o),1)}
});
test("cyber layout occupies perimeter and never covers any wall projector screen",()=>{
  const p=layout();
  assert.ok(p.instances>50 && p.instances<=160);
  assert.equal(p.drawCallBudget,3);
  for(const row of [...p.chrome,...p.azure,...p.violet]){
    assert.ok(row.x>=-20.58&&row.x<=20.58&&row.z>=-15.28&&row.z<=15.28);
    // Main wall display center and side-wall screen areas remain clear.
    assert.equal(Math.abs(row.z)>14.7&&Math.abs(row.x)<9.6&&row.y<8.5,false,"projection obstructed");
    assert.equal(Math.abs(row.x)>19.9&&Math.abs(row.z)<9.6&&row.y<8.5,false,"side wall projection obstructed");
    assert.ok(Math.hypot(row.x-16.9,row.z-12.4)>2,"AURA orb zone obstructed");
  }
});
test("installation adds three no-shadow instanced 3D meshes, no input or network effects",()=>{
  const scene=createScene(); const original=scene.children.slice();
  const addon=install({THREE,scene});
  assert.equal(scene.children.length,original.length+1);
  original.forEach((v,i)=>assert.strictEqual(scene.children[i],v));
  const group=scene.children.at(-1);
  assert.equal(group.children.length,3);
  for(const instanced of group.children){
    assert.equal(instanced.castShadow,false);
    assert.equal(instanced.receiveShadow,false);
    assert.equal(instanced.userData.tfDecorativeOnly,true);
    assert.equal(instanced.raycast(),undefined);
    assert.equal(instanced.matrices.length,instanced.count);
  }
  assert.equal(addon.stats().lightsAdded,0);
  assert.equal(addon.stats().clickTargetsAdded,0);
  assert.equal(addon.stats().newAnimationLoops,0);
  assert.strictEqual(install({THREE,scene}),addon);
  addon.dispose();
  assert.deepEqual(scene.children,original);
});
test("preferences persist only when explicitly changed and never touch world settings",()=>{
  const scene=createScene(), map=new Map([[KEY,"off"],["ceiling","gold"]]);
  const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const addon=install({THREE,scene,storage});
  assert.equal(addon.stats().enabled,false);
  assert.equal(scene.children.at(-1).visible,false);
  assert.equal(addon.setEnabled(true),true);
  assert.equal(map.get(KEY),"on");
  assert.equal(map.get("ceiling"),"gold");
  addon.dispose();
});
test("animation only changes decorative material and stops after dispose",()=>{
  const scene=createScene(),addon=install({THREE,scene});
  const a=scene.children.at(-1).children[1].material;
  const initial=a.emissiveIntensity;
  addon.update(500);const after=a.emissiveIntensity;
  assert.notEqual(after,initial);
  addon.update(501);assert.equal(a.emissiveIntensity,after);
  assert.equal(addon.stats().verifiedFrameRate,null);
  addon.dispose();assert.equal(a.disposed,true);
  addon.update(2000);assert.equal(a.emissiveIntensity,after);
});
test("fail closed without existing room and Three.js; never create a replacement scene",()=>{
  assert.throws(()=>install({THREE:null,scene:createScene()}),/Three.js/);
  assert.throws(()=>install({THREE,scene:{}}),/Three.js/);
});
