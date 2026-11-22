import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_EVENTS,installCityExterior3D} from './city-exterior-3d.mjs';

class Vector {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(v){return this.set(v,v,v);}
  copy(v){return this.set(v.x,v.y,v.z);}
  clone(){return new Vector(this.x,this.y,this.z);}
}
class Object3D {
  constructor(){
    this.position=new Vector();this.rotation=new Vector();this.scale=new Vector(1,1,1);
    this.children=[];this.isGroup=false;this.userData={};this.visible=true;this.matrix={};
  }
  add(...objects){for(const o of objects){this.children.push(o);o.parent=this;}}
  remove(o){this.children=this.children.filter(c=>c!==o);if(o)o.parent=null;}
  traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
  getObjectByName(name){
    if(this.name===name)return this;
    for(const c of this.children){const found=c.getObjectByName(name);if(found)return found;}
    return null;
  }
  updateMatrix(){}
}
class Group extends Object3D {constructor(){super();this.isGroup=true;}}
class Geo {
  constructor(...args){this.parameters={width:args[0],height:args[1],depth:args[2]};this.attributes={};}
  setAttribute(k,v){this.attributes[k]=v;return this;}
  dispose(){}
}
class Color {constructor(value){this.value=value;}set(v){this.value=v;}}
class Material {
  constructor(properties={}){Object.assign(this,properties);this.color=new Color(properties.color??0);}
  dispose(){}
}
class Mesh extends Object3D{
  constructor(geometry,material){
    super();this.geometry=geometry;this.material=material;this.isMesh=true;this.raycast=function(){};
  }
}
class InstancedMesh extends Mesh{
  constructor(geometry,material,count){
    super(geometry,material);this.count=count;this.instanceMatrix={needsUpdate:false};
    this.instanceColor={needsUpdate:false};
  }
  setMatrixAt(){}
  setColorAt(){}
}
class Points extends Mesh {}
class Light extends Object3D {constructor(color,intensity){super();this.intensity=intensity;}}
class BufferAttribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}
class CanvasTexture {constructor(canvas){this.image=canvas;}dispose(){}}
const THREE={
  Group,Object3D,Mesh,InstancedMesh,Points,PointLight:Light,BoxGeometry:Geo,
  PlaneGeometry:Geo,IcosahedronGeometry:Geo,SphereGeometry:Geo,
  CylinderGeometry:Geo,TorusGeometry:Geo,BufferGeometry:Geo,BufferAttribute,
  CanvasTexture,MeshBasicMaterial:Material,MeshStandardMaterial:Material,
  PointsMaterial:Material,Color,DoubleSide:2,BackSide:1,SRGBColorSpace:'srgb'
};
function element(tag){
  return {
    tag,children:[],style:{cssText:''},attrs:{},textContent:'',value:'',
    append(...xs){this.children.push(...xs);},
    appendChild(x){this.children.push(x);},
    addEventListener(){},
    setAttribute(k,v){this.attrs[k]=v;},
    remove(){},
    getContext(){return {createLinearGradient(){return {addColorStop(){}};},fillRect(){}};}
  };
}
function environment(){
  const scene=new THREE.Group(),atrium=new THREE.Group();
  atrium.name='TF_REFERENCE_ATRIUM_V2';scene.add(atrium);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.6,11,32),
    new THREE.MeshStandardMaterial({color:0x111111}));
  wall.position.set(-21,5.5,0);scene.add(wall);
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(12,5.5),
    new THREE.MeshBasicMaterial({map:{image:{}}}));
  glass.position.set(-20.66,6.6,0);atrium.add(glass);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial());
  hit.userData.tfWall='left';scene.add(hit);
  const hitFunction=hit.raycast;
  const camera=new THREE.Group();camera.position.set(0,5,0);
  const doc={createElement:element,body:element('body')};
  const win={next:null,requestAnimationFrame(fn){this.next=fn;return 1;},
    cancelAnimationFrame(){this.next=null}};
  return {scene,atrium,wall,glass,hit,hitFunction,camera,doc,win,
    renderer:{info:{render:{calls:10}}}};
}
test('all 17 scenarios mount, select, render at least one update and restore original room',()=>{
  const e=environment(),before=[...e.scene.children];
  const api=installCityExterior3D({
    THREE,scene:e.scene,renderer:e.renderer,camera:e.camera,
    document:e.doc,window:e.win
  });
  assert.equal(CITY_EVENTS.length,17);
  assert.equal(e.wall.visible,false);
  assert.equal(e.glass.visible,false);
  const listed=[];
  for(let i=0;i<CITY_EVENTS.length;i++){
    const [name]=CITY_EVENTS[i];
    api.setMode(name);
    assert.equal(api.state.mode,name);
    e.win.next?.(i*1000+30);
    e.win.next?.(i*1000+60);
    assert.ok(api.state.frames>0);
    listed.push(name);
    if(name==='zombie')assert.equal(api.state.outbreak.active,true);
    else assert.equal(api.state.outbreak.active,false,'zombie failed to stop at '+name);
    if(['severe','hurricane','typhoon','blizzard'].includes(name)){
      assert.equal(api.state.storm.active,true,'storm did not activate '+name);
    }else assert.equal(api.state.storm.active,false,'storm failed to stop '+name);
    if(['fire','cataclysm','purge'].includes(name))
      assert.equal(api.state.visibleScenarioEffects.smoke,true);
    if(name==='cloudy')assert.equal(api.state.visibleScenarioEffects.clouds,true);
  }
  assert.deepEqual(listed,CITY_EVENTS.map(([name])=>name));
  api.dispose();
  assert.equal(e.wall.visible,true);
  assert.equal(e.glass.visible,true);
  assert.equal(e.hit.raycast,e.hitFunction);
  assert.deepEqual(e.scene.children,before);
  assert.equal(e.win.next,null);
});
