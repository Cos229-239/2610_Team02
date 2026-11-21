import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createExteriorWindowAdapter,locateOriginalWindow} from './exterior-window-adapter.mjs';

function fixture(overrides={}){
  const pixels=new Uint8ClampedArray(1024*512*4);pixels.fill(128);
  const ctx={
    getImageData:()=>({data:new Uint8ClampedArray(pixels)}),
    putImageData:image=>pixels.set(image.data),
    save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}
  };
  const canvas={width:1024,height:512,getContext:()=>ctx};
  const mesh={
    isMesh:true,geometry:{parameters:{width:12,height:5.5}},
    position:{x:-20.66,y:6.6,z:0},rotation:{y:Math.PI/2},
    material:{map:{image:canvas,needsUpdate:false}},
    userData:{},parent:{},matrixWorld:{clone(){return this},equals(){return true}}
  };
  Object.assign(mesh,overrides);
  const group={traverse:fn=>fn(mesh)};
  const scene={getObjectByName:name=>name==='TF_REFERENCE_ATRIUM_V2'?group:null};
  return {scene,THREE:{},mesh,pixels};
}

test('original window is uniquely identified by exact geometry and texture',()=>{
  const f=fixture();assert.equal(locateOriginalWindow(f),f.mesh);
  assert.throws(()=>locateOriginalWindow(fixture({position:{x:-19,y:6.6,z:0}})),/found 0/);
});

test('autostart never allowed and no second installation',()=>{
  const f=fixture();
  assert.throws(()=>createExteriorWindowAdapter({...f,autoStart:true}),/Autostart/);
  const adapter=createExteriorWindowAdapter(f);
  assert.throws(()=>createExteriorWindowAdapter(f),/Already mounted/);
  adapter.dispose();
});

test('existing geometry and texture identity are preserved',()=>{
  const f=fixture(),originalMap=f.mesh.material.map;
  const adapter=createExteriorWindowAdapter(f);
  assert.equal(adapter.verifyPreservation(),true);
  adapter.setWeather('rain');
  assert.equal(f.mesh.material.map,originalMap);
  assert.equal(adapter.verifyPreservation(),true);
  adapter.dispose();
});

test('weather states reject unsupported values and refuse after disposal',()=>{
  const f=fixture(),adapter=createExteriorWindowAdapter(f);
  assert.equal(adapter.setWeather('rain'),'rain');
  assert.equal(adapter.setWeather('snow'),'snow');
  assert.equal(adapter.advance(5),true);
  assert.throws(()=>adapter.setWeather('storm'),/Allowed/);
  assert.throws(()=>adapter.advance(-1),/Invalid time/);
  adapter.dispose();
  assert.throws(()=>adapter.setWeather('rain'),/disposed/);
  assert.equal(adapter.advance(7),false);
});

test('disposal restores exact pre-integration bitmap',()=>{
  const f=fixture(),adapter=createExteriorWindowAdapter(f);
  adapter.setWeather('snow');adapter.advance(9);adapter.dispose();
  assert.equal(f.pixels.every(value=>value===128),true);
  assert.equal(f.mesh.userData.tfExteriorWindowAdapter,undefined);
  assert.equal(adapter.verifyPreservation(),false);
});
