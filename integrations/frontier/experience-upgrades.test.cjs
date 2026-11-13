"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const kinetics=require("./kinetic-pedestals.js");
const neon=require("./neon-lighting.js");
const chat=require("./team-chat-dock.js");
class Color {
 constructor(hex=0){this.hex=hex;}
 setHex(hex){this.hex=hex;}
}
class Disposable {
 constructor(...a){this.args=a;this.disposed=false;}
 dispose(){this.disposed=true;}
}
class Material extends Disposable{
 constructor(opts={}){super();Object.assign(this,opts);this.color=new Color(opts.color);
   if(opts.emissive!==undefined)this.emissive=new Color(opts.emissive);
 }
 clone(){return new Material({...this,color:this.color.hex,emissive:this.emissive?.hex})}
}
class Vector {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 clone(){return new Vector(this.x,this.y,this.z)}
 copy(v){return this.set(v.x,v.y,v.z)}
 multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}
 setScalar(x){return this.set(x,x,x)}
}
class Group{
 constructor(){this.children=[];this.parent=null;this.userData={};this.position=new Vector;
 this.rotation=new Vector;this.scale=new Vector(1,1,1);this.visible=true;}
 add(...x){for(const v of x){v.parent=this;this.children.push(v);}}
 remove(v){this.children.splice(this.children.indexOf(v),1);v.parent=null;}
}
class Mesh extends Group {
 constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}
}
class InstancedMesh extends Mesh{
 constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={needsUpdate:false};this.matrices=[];}
 setMatrixAt(i,m){this.matrices[i]=structuredClone(m)}
}
class Object3D extends Group{
 updateMatrix(){this.matrix={position:{...this.position},scale:{...this.scale},rotation:{...this.rotation}};}
}
class PointLight extends Group{constructor(color,intensity,dist,decay){super();
 this.color=new Color(color);this.intensity=intensity;this.distance=dist;this.decay=decay;}}
const THREE={Mesh,Group,Object3D,InstancedMesh,PointLight,
  MeshStandardMaterial:Material,MeshBasicMaterial:Material,
  SphereGeometry:Disposable,BoxGeometry:Disposable,TorusGeometry:Disposable,
  TorusKnotGeometry:Disposable,IcosahedronGeometry:Disposable,DodecahedronGeometry:Disposable,
  OctahedronGeometry:Disposable,TetrahedronGeometry:Disposable,ConeGeometry:Disposable,
  AdditiveBlending:2,DoubleSide:2};
const makePads=()=>Array.from({length:4},(_,i)=>{
 const group=new Group(),holo=new Group();holo.position.y=1.6;
 const material=new Material({color:0x123456,emissive:0x010101,emissiveIntensity:.1});
 const core=new Mesh(new Disposable,material);core.visible=i!==3;
 holo.add(core);group.add(holo);
 return {group,holo,baseY:0,homeX:(i-1.5)*3.8,originalMaterial:material,core};
});
test("typed configs bound intensity/velocity/shape and preserve unique pattern semantics",()=>{
 for(const x of ["spin","hover","orbit","figure8","pendulum","helix","static"]){
  const config=kinetics.validated({pattern:x},0);const o=kinetics.motion(config,1250,0);
  assert.ok([o.x,o.y,o.z,o.ry,o.rz,o.scale].every(Number.isFinite));
 }
 assert.throws(()=>kinetics.validated({speed:100},0),/Unsupported/);
 assert.throws(()=>kinetics.validated({shape:"unlicensed-script"},0),/Unsupported/);
 assert.throws(()=>kinetics.validated({bad:"code"},0),/Unknown/);
});
test("kinetic pedals use existing 4 transform groups; animate, fracture, restore materials",()=>{
 const pads=makePads(),refs=pads.map(x=>[x.group.position.y,x.holo.position.clone(),x.core.material,x.core.visible]);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const ctl=kinetics.install({THREE,platforms:pads,storage});
 assert.equal(ctl.stats().configured,4);
 ctl.configure(2,{shape:"sphere",color:"gold",pattern:"figure8",speed:1.8});
 assert.equal(ctl.get(2).shape,"sphere");
 assert.equal(pads[2].holo.children.length,2);
 ctl.shatter(2,250);ctl.update(300,0);
 assert.equal(pads[2].holo.visible,false);
 ctl.update(1800,0);assert.equal(pads[2].holo.visible,true);
 pads[0].group.position.y=-3.2;ctl.update(1850,.6);assert.equal(pads[0].group.position.y,-3.2);
 ctl.dispose();
 pads.forEach((p,i)=>{
  assert.strictEqual(p.core.material,refs[i][2]);
  assert.equal(p.core.visible,refs[i][3]);
  assert.equal(p.holo.children.length,1);
  assert.equal(p.holo.position.y,refs[i][1].y);
 });
});
test("photonic lighting retains original ring props and uses two actual shadowless lights",()=>{
 const pads=makePads(),original=pads.map(x=>x.group.children.slice());
 const ctl=neon.install({THREE,platforms:pads});
 assert.equal(ctl.stats().newLocalLights,2);
 assert.equal(ctl.stats().newShadowCasters,0);
 assert.equal(ctl.stats().bloomComposerAdded,false);
 ctl.configure({preset:"ember-portal",intensity:1.6});
 ctl.update(1400,0);
 for(const p of pads)assert.ok(p.group.children.length>=original[pads.indexOf(p)].length+1);
 ctl.update(1600,1);ctl.dispose();
 pads.forEach((p,i)=>assert.deepEqual(p.group.children,original[i]));
 assert.throws(()=>neon.validate({preset:"https://evil"}),/Invalid/);
});
test("C toggle never captures text entry, browser modifiers, or auto-repeat",()=>{
 assert.equal(chat.shouldToggle({code:"KeyC",target:{tagName:"DIV"}}),true);
 assert.equal(chat.shouldToggle({code:"KeyC",target:{tagName:"TEXTAREA"}}),false);
 assert.equal(chat.shouldToggle({code:"KeyC",ctrlKey:true,target:{tagName:"DIV"}}),false);
 assert.equal(chat.shouldToggle({code:"KeyC",repeat:true,target:{tagName:"DIV"}}),false);
});
test("chat requires real authenticated host transport and XSS is text only",()=>{
 assert.throws(()=>chat.validTransport({send:()=>{}}),/transport/);
 const feed=chat.createFeed();
 assert.equal(feed.push({author:"A",text:"<img src=x onerror=alert(1)>",id:"one"}),true);
 assert.equal(feed.push({author:"A",text:"duplicate",id:"one"}),false);
 assert.equal(feed.list()[0].text,"<img src=x onerror=alert(1)>");
 assert.equal(chat.safeMessage({user:"Team",body:"hello"}).author,"Team");
 assert.equal(chat.safeMessage({user:"X",body:"a".repeat(2001)}),null);
 assert.equal(chat.safeMessage({user:"X",body:""}),null);
});
