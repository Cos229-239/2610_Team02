import test from 'node:test';
import assert from 'node:assert/strict';
import {destinations,validateDestinations,selectMode,createDCLandmarkStudy} from './geo-environments.mjs';
test('50 distinct states and one federal district with capital mappings',()=>{
 assert.equal(destinations.length,51);
 assert.equal(destinations.filter(x=>x.kind==='state').length,50);
 assert.equal(destinations.filter(x=>x.kind==='district').length,1);
 assert.equal(validateDestinations(),true);
 assert.equal(destinations.find(x=>x.state==='New York').capital,'Albany');
 assert.equal(destinations.find(x=>x.state==='South Carolina').capital,'Columbia');
 assert.equal(destinations.find(x=>x.state==='Washington').capital,'Olympia');
 assert.equal(destinations.at(-1).id,'washington-dc');
});
test('time selection rejects invalid mode and remains mutually exclusive',()=>{
 let s={timeMode:'day'};
 for(const t of ['morning','night','day']){s=selectMode(s,t);assert.equal(s.timeMode,t);}
 assert.throws(()=>selectMode(s,'morning night'));
});
test('DC exterior reference includes 36 distinct colonnade shaft objects',()=>{
 class Object3D {
  constructor(){this.children=[];this.position={set(){}};this.rotation={y:0};this.scale={setScalar(){}};}
  add(x){this.children.push(x);}
 }
 class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
 class Geometry {constructor(...args){this.parameters=args;}dispose(){}}
 class Material {constructor(opts){this.color={setHex(){}};Object.assign(this,opts);}dispose(){}}
 class Light extends Object3D {constructor(){super();this.color={setHex(){}};this.intensity=1;}}
 const THREE={Group:Object3D,Mesh,MeshStandardMaterial:Material,BoxGeometry:Geometry,
  CylinderGeometry:class extends Geometry {},ConeGeometry:Geometry,
  DirectionalLight:Light,HemisphereLight:Light};
 const dc=createDCLandmarkStudy(THREE,'day');
 assert.equal(dc.group.name,'TF_DC_LINCOLN_REFERENCE_STUDY');
 assert.equal(dc.group.children.filter(x=>x.geometry instanceof THREE.CylinderGeometry).length,36);
 dc.setTime('night');dc.setTime('morning');dc.dispose();
});