import test from 'node:test';
import assert from 'node:assert/strict';
import {enuFromWGS84,wgs84ECEF,storyAtElevation,screenSpaceErrorPx} from './geo-world-frame.mjs';
test('WGS84 ECEF known equator and exact local origin',()=>{
 const E=wgs84ECEF({latitude:0,longitude:0,altitudeMeters:0});
 assert.ok(Math.abs(E.x-6378137)<1e-8);
 assert.ok(Math.abs(E.y)<1e-8&&Math.abs(E.z)<1e-8);
 const juneau={latitude:58.289373,longitude:-134.400816,altitudeMeters:11};
 const zero=enuFromWGS84(juneau,juneau);
 for(const c of ['eastMeters','northMeters','upMeters'])assert.ok(Math.abs(zero[c])<1e-9);
 const east=enuFromWGS84({latitude:0,longitude:.001,altitudeMeters:0},
  {latitude:0,longitude:0,altitudeMeters:0});
 assert.ok(Math.abs(east.eastMeters-111.31949)<.003);
 assert.ok(Math.abs(east.northMeters)<.01);
 assert.throws(()=>enuFromWGS84({latitude:58.3,longitude:-134.4},
  juneau),/altitude/);
});
test('measured building floor mapping does not invent stories',()=>{
 assert.equal(storyAtElevation(12,null).floorIndex,null);
 assert.equal(storyAtElevation(12,[0,4,8,12]).floorIndex,3);
 assert.equal(storyAtElevation(11.9,[0,4,8,12]).floorIndex,2);
 assert.equal(storyAtElevation(-2,[0,4,8,12]).floorIndex,null);
 assert.throws(()=>storyAtElevation(9,[0,4,4,12]),/strictly/);
});
test('near/mid/far selection is driven by calibrated screen-space error, not arbitrary ranges',()=>{
 const near=screenSpaceErrorPx({distanceMeters:20,geometricErrorMeters:1,
  viewportHeightPx:1080,verticalFOVDeg:60});
 const far=screenSpaceErrorPx({distanceMeters:200,geometricErrorMeters:1,
  viewportHeightPx:1080,verticalFOVDeg:60});
 assert.ok(near>far*9.9);
 assert.throws(()=>screenSpaceErrorPx({distanceMeters:30,geometricErrorMeters:1,
  viewportHeightPx:1080,verticalFOVDeg:null}),/calibrated FOV/);
});
