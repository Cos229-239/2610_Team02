import test from 'node:test';
import assert from 'node:assert/strict';
import {project,parseOSMTile,fetchCapitalTile} from './geo-capital-mesh.mjs';
import {destinations} from './geo-environments.mjs';
const testCapital=destinations.find(x=>x.state==='South Carolina');
function p(dx,dy){return {lon:testCapital.longitude+dx,lat:testCapital.latitude+dy};}
const fixture={elements:[
 {type:'way',id:101,tags:{building:'yes',height:'16'},geometry:[
  p(0,0),p(.0001,0),p(.0001,.0001),p(0,.0001),p(0,0)]},
 {type:'way',id:102,tags:{building:'yes','building:levels':'5'},geometry:[
  p(.0002,0),p(.0003,0),p(.0003,.0001),p(.0002,.0001),p(.0002,0)]},
 {type:'way',id:103,tags:{highway:'residential'},geometry:[
  p(0,-.0001),p(.0002,-.0001)]}
]};
test('geographically anchored footprints and visible street source are parsed',()=>{
 const result=parseOSMTile(fixture,testCapital);
 assert.equal(result.buildings.length,2);
 assert.equal(result.roads.length,1);
 assert.equal(result.buildings[0].estimation,'OSM height tag');
 assert.equal(result.buildings[1].estimation,'OSM levels estimate');
 assert.ok(result.buildings[0].height>0);
 assert.deepEqual(project([testCapital.longitude,testCapital.latitude],testCapital),[0,-0]);
});
test('corrupt and distant geometry never becomes invented city content',()=>{
 const input={elements:[...fixture.elements,{type:'way',id:104,tags:{building:'yes'},
  geometry:[{lon:0,lat:0},{lon:1,lat:0},{lon:1,lat:1},{lon:0,lat:0}]}]};
 const result=parseOSMTile(input,testCapital);
 assert.equal(result.buildings.length,2);
 assert.throws(()=>parseOSMTile({elements:null},testCapital));
});
test('tile request uses one selected capital, bounded radius, and caches its response',async()=>{
 let calls=0;
 const request=async(url,opts)=>{
  calls++;assert.match(url,/overpass/);assert.equal(opts.method,'POST');
  assert.match(decodeURIComponent(opts.body),/around:330,34.0004393,-81.0331509/);
  return {ok:true,json:async()=>fixture};
 };
 const a=await fetchCapitalTile(testCapital,{request,now:()=>12345678});
 const b=await fetchCapitalTile(testCapital,{request,now:()=>12345680});
 assert.deepEqual(a,b);
 assert.equal(calls,1);
});
test('map source absence prevents activation rather than inventing fake towers',async()=>{
 const never={...testCapital,id:'temporary-capital-test'};
 await assert.rejects(
  fetchCapitalTile(never,{request:async()=>({ok:true,json:async()=>({elements:[]})})}),
  /Insufficient verified building footprints/
 );
});
