import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NYC_ORIGIN,climate,footprintFeatures,proceduralFallback,meshProfile} from './nyc-atmosphere.mjs';

test('New York time conversion stays separate from user local timezone',()=>{
  const noon=climate(new Date('2026-11-20T17:00:00Z'));
  const night=climate(new Date('2026-11-21T02:00:00Z'));
  assert.equal(noon.night,false);
  assert.equal(night.night,true);
  assert.equal(climate(new Date('2026-11-20T17:00:00Z'),{is_day:0}).night,true);
});
test('geometry import validates bounds and rejects malformed polygons',()=>{
  const valid={geometry:{type:'Polygon',coordinates:[[
    [-73.983,40.753],[-73.982,40.753],[-73.982,40.754],[-73.983,40.753]
  ]]},properties:{height_roof:'120',bin:'1234567'}};
  const invalid={geometry:{type:'Polygon',coordinates:[[[-90,20],[-90,21],[-89,21],[-90,20]]]},properties:{}};
  const result=footprintFeatures([valid,invalid]);
  assert.equal(result.length,1);
  assert.equal(result[0].feet,120);
  assert.ok(meshProfile(result[0]).height>3);
});
test('fallback deterministic and explicitly separate from measured NYC data',()=>{
  const a=proceduralFallback(),b=proceduralFallback();
  assert.equal(a.length,82);
  assert.deepEqual(a,b);
  assert.ok(a.every(v=>v.id.startsWith('sim-')));
  assert.ok(Math.abs(NYC_ORIGIN.lon+73.9832)<.001);
});

test('NYC V2 has no opaque planar sky card and does not replace global scene atmosphere',()=>{
  const source=readFileSync(new URL('./nyc-atmosphere.mjs',import.meta.url),'utf8');
  assert.equal(source.includes('new THREE.PlaneGeometry(270,150)'),false);
  assert.equal(source.includes('scene.background='),false);
  assert.equal(source.includes('scene.fog='),false);
  assert.ok(source.includes('facadeBands'));
  assert.ok(source.includes('for(let edge=0;edge<pts.length-1'));
});
