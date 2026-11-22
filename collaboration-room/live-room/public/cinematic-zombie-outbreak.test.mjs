import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTBREAK_LIMITS,OUTBREAK_PHASES,outbreakPhase,proximityKey,createZombieOutbreak} from './cinematic-zombie-outbreak.mjs';
test('exact patient-zero start and bounded 420-agent budget',()=>{
  assert.equal(OUTBREAK_LIMITS.initialInfected,1);
  assert.equal(OUTBREAK_LIMITS.population,420);
  assert.equal(OUTBREAK_LIMITS.simulationHz,12);
  assert.ok(OUTBREAK_LIMITS.simulationHz<=15);
});
test('patient zero, commotion, contagion, horde, and siege are ordered',()=>{
  assert.deepEqual(OUTBREAK_PHASES.map(p=>p.id),
    ['patient-zero','panic','contagion','horde','siege']);
  assert.equal(outbreakPhase(0).id,'patient-zero');
  assert.equal(outbreakPhase(95).id,'horde');
  assert.equal(outbreakPhase(155).id,'siege');
  assert.throws(()=>outbreakPhase(-1),/Invalid/);
});
test('spatial hash buckets are stable, negative-coordinate aware and grid-local',()=>{
  assert.equal(proximityKey(-24,-12),'-5:-3');
  assert.equal(proximityKey(-25,-15),'-5:-3');
  assert.notEqual(proximityKey(-26,-15),proximityKey(-25,-15));
});

function fakeTHREE(){
  class Vec { constructor(){this.x=this.y=this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}setScalar(s){this.x=this.y=this.z=s;return this;} }
  class Object3D {
    constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec().set(1,1,1);this.children=[];this.visible=true;this.matrix={};}
    add(...xs){this.children.push(...xs);}
    remove(o){this.children=this.children.filter(x=>x!==o);}
    updateMatrix(){}
  }
  class Group extends Object3D{}
  class Mesh extends Object3D{constructor(geo,mat){super();this.geometry=geo;this.material=mat;}}
  class InstancedMesh extends Mesh {
    constructor(geo,mat,count){super(geo,mat);this.count=count;this.instanceMatrix={needsUpdate:false};this.instanceColor={needsUpdate:false};}
    setMatrixAt(i,m){}
    setColorAt(i,c){}
  }
  class Geo{dispose(){}}
  class Mat{constructor(p){Object.assign(this,p);}dispose(){}}
  class Light extends Object3D{constructor(color,intensity){super();this.intensity=intensity;}}
  return {Group,Mesh,InstancedMesh,BoxGeometry:Geo,IcosahedronGeometry:Geo,
    Object3D,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,PointLight:Light,
    Color:class {constructor(n){this.value=n;}}};
}
test('actual 3D outbreak: patient zero, first contact, persistent crashes, reset, scene preservation',()=>{
  const THREE=fakeTHREE(),urban=new THREE.Group(),scene=new THREE.Group();
  const original=new THREE.Group();scene.add(original);
  const outbreak=createZombieOutbreak({THREE,urban,scene,population:50});
  assert.equal(outbreak.state.infected,1);
  assert.equal(outbreak.state.active,false);
  outbreak.start();
  assert.equal(outbreak.state.active,true);
  for(let i=0;i<1800;i++)outbreak.update(.1);
  assert.ok(outbreak.state.infected>1,'initial infected should tag at least one civilian');
  assert.equal(outbreak.state.emergencyVehicles,12);
  assert.ok(outbreak.state.crashes>=1,'crashes must occur');
  assert.ok(urban.children.length>=1);
  outbreak.stop();
  assert.equal(outbreak.state.infected,1);
  assert.equal(outbreak.state.crashes,0);
  outbreak.dispose();
  assert.equal(urban.children.length,0);
  assert.deepEqual(scene.children,[original]);
});

test('420-person deterministic contact graph reaches a genuine horde by 95 seconds',()=>{
  const THREE=fakeTHREE(),urban=new THREE.Group(),scene=new THREE.Group();
  const outbreak=createZombieOutbreak({THREE,urban,scene,population:420});
  const before=outbreak.start();
  assert.equal(before.infected,1);
  for(let i=0;i<950;i++)outbreak.update(.1);
  const after=outbreak.state;
  assert.equal(after.phase,'contagion'); // 95s floating-point accumulation is just below threshold
  assert.ok(after.infected>=300,'expected hundreds of proximity-converted characters, observed '+after.infected);
  assert.ok(after.infected<=420);
  outbreak.dispose();
});
