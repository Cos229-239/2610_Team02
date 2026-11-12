import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePinterestUrl,requireRights,validateCamera,focalLengthPixels,displayRect,photoContact,groundIntersection,validateDimensions,buildManifest} from './calibration.mjs';
const photo={name:'licensed-room.jpg',width:1600,height:900};
const camera={fov:55,height:1.65,distance:6.5,pitch:16,aspect:16/9};
const dimensions={width:2.3,depth:0.95,height:0.86,basis:'estimated'};
const contact={u:0.52,v:0.84};
test('Pinterest pin and board links are provenance-only normalized URLs',()=>{
  assert.equal(parsePinterestUrl(''),null);
  assert.equal(parsePinterestUrl('https://www.pinterest.com/pin/12345/?foo=1#foo'),'https://www.pinterest.com/pin/12345/');
  assert.equal(parsePinterestUrl('https://pin.it/abc123'),'https://pin.it/abc123');
  assert.equal(parsePinterestUrl('https://pinterest.com/design/rooms/'),'https://pinterest.com/design/rooms/');
});
test('Reject look-alike URLs and insecure / root addresses',()=>{
  for(const url of ['http://pinterest.com/pin/123','https://pinterest.com.evil.com/pin/1','https://notpinterest.com/pin/1','https://pinterest.com/','bad-url','https://user:pass@pinterest.com/pin/1']) {
    assert.throws(()=>parsePinterestUrl(url));
  }
});
test('Rights are mandatory, not inferred from Pinterest publication',()=>{
  for(const rights of ['owner','licensed','permission']) assert.equal(requireRights(rights),rights);
  for(const rights of ['unknown',undefined,'pinterest','']) assert.throws(()=>requireRights(rights));
});
test('Focal length for 90-degree vertical FOV is half image height',()=>{
  assert.ok(Math.abs(focalLengthPixels(900,90)-450)<1e-10);
  assert.throws(()=>focalLengthPixels(0,50));
  assert.throws(()=>focalLengthPixels(1000,180));
});
test('Letterboxed image coordinates are accurately recovered',()=>{
  const r=displayRect(1000,1000,1600,900);
  assert.deepEqual(r,{left:0,top:218.75,width:1000,height:562.5});
  assert.deepEqual(photoContact(500,500,1000,1000,1600,900),{u:0.5,v:0.5,ndcX:0,ndcY:0});
  assert.throws(()=>photoContact(20,1,1000,1000,1600,900),/outside/);
});
test('Portrait photo has horizontal letterboxes',()=>{
  const r=displayRect(1200,600,600,900);
  assert.ok(Math.abs(r.left-400)<1e-9);
  const p=photoContact(600,300,1200,600,600,900);
  assert.ok(Math.abs(p.ndcX)<1e-9 && Math.abs(p.ndcY)<1e-9);
});
test('Ray intersects metric floor for downward rays only',()=>{
  assert.deepEqual(groundIntersection({x:1,y:2,z:3},{x:0,y:-1,z:-1}),{x:1,z:1});
  assert.throws(()=>groundIntersection({x:0,y:1,z:0},{x:0,y:1,z:-1}));
  assert.throws(()=>groundIntersection({x:0,y:1,z:0},{x:0,y:0,z:-1}));
  assert.throws(()=>groundIntersection({x:0,y:1,z:0},{x:0,y:0,z:0}));
});
test('Camera scale and physical dimensions are finite and bounded',()=>{
  assert.deepEqual(validateCamera(camera),camera);
  for(const x of [0,NaN,Infinity,120]) assert.throws(()=>validateCamera({...camera,fov:x}));
  assert.deepEqual(validateDimensions(dimensions),dimensions);
  assert.throws(()=>validateDimensions({...dimensions,width:-2}));
  assert.throws(()=>validateDimensions({...dimensions,basis:'accurate'}));
});
test('Manifest retains observation/estimation distinction without inventing accuracy',()=>{
  const m=buildManifest({photo,pinUrl:'https://pinterest.com/pin/999',rights:'licensed',camera,contact,dimensions});
  assert.equal(m.schemaVersion,1);
  assert.equal(m.source.pinterestReference,'https://pinterest.com/pin/999');
  assert.equal(m.status,'candidate_unverified');
  assert.equal(m.camera.status,'user_calibrated_not_solved');
  assert.equal(m.reconstruction.observed.floorContactNormalized.u,0.52);
  assert.equal(m.reconstruction.dimensionsMeters.basis,'estimated');
  assert.ok(m.reconstruction.inferred.includes('hidden/rear geometry'));
  assert.equal(m.verification.dimensionError,'unknown');
  assert.equal(JSON.stringify(m).includes('data:image'),false);
});
test('Reject missing photo, unknown rights, invalid pixel, and unsupported asset',()=>{
  const args={photo,rights:'owner',camera,contact,dimensions};
  assert.throws(()=>buildManifest({...args,photo:null}));
  assert.throws(()=>buildManifest({...args,rights:'unknown'}));
  assert.throws(()=>buildManifest({...args,contact:{u:1.1,v:0.5}}));
  assert.throws(()=>buildManifest({...args,asset:'pinterest_copy'}));
  assert.throws(()=>buildManifest({...args,sha256:'abc'}));
});

test('Supplementary photo evidence retains rights, hash and original dimensions',()=>{
  const v={name:'rear-angle.webp',width:1280,height:720,rights:'permission',sha256:'a'.repeat(64)};
  const m=buildManifest({photo,pinUrl:'https://pin.it/example',rights:'owner',camera,contact,dimensions,additionalViews:[v]});
  assert.deepEqual(m.source.additionalViews,[v]);
  assert.equal(m.verification.heldOutView,'not_supplied');
});
test('Reject excessive secondary views, invalid hashes and missing permissions',()=>{
  const args={photo,rights:'owner',camera,contact,dimensions};
  const valid={name:'side.png',width:640,height:480,rights:'licensed',sha256:null};
  assert.throws(()=>buildManifest({...args,additionalViews:Array(9).fill(valid)}));
  assert.throws(()=>buildManifest({...args,additionalViews:[{...valid,rights:'unknown'}]}));
  assert.throws(()=>buildManifest({...args,additionalViews:[{...valid,sha256:'not-a-hash'}]}));
});
