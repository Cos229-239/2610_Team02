import {environmentPalette,findCapitalPhoto} from './geo-capital-photo.mjs';
import {visualPreset} from './geo-scene-compositor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {destinations,validateDestinations,selectMode,createDCLandmarkStudy,weatherGlyph,fetchNWSHourlyForecast} from './geo-environments.mjs';
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
 class Material {constructor(opts){Object.assign(this,opts);this.color={setHex(){}};}dispose(){}}
 class Light extends Object3D {constructor(){super();this.color={setHex(){}};this.intensity=1;}}
 const THREE={Group:Object3D,Mesh,MeshStandardMaterial:Material,BoxGeometry:Geometry,
  CylinderGeometry:class extends Geometry {},ConeGeometry:Geometry,
  SphereGeometry:Geometry,IcosahedronGeometry:Geometry,
  DirectionalLight:Light,HemisphereLight:Light,PointLight:Light};
 const dc=createDCLandmarkStudy(THREE,'day');
 assert.equal(dc.group.name,'TF_DC_LINCOLN_REFERENCE_STUDY');
 assert.equal(dc.group.children.filter(x=>x.geometry instanceof THREE.CylinderGeometry).length,44); // 36 Doric + 8 inner
 dc.setTime('night');dc.setTime('morning');dc.dispose();
});
test('weather display distinguishes storms, rain, cloud and night without fabrication',()=>{
 assert.equal(weatherGlyph('Thunderstorms','day'),'⛈️');
 assert.equal(weatherGlyph('Rain showers','day'),'🌧️');
 assert.equal(weatherGlyph('Mostly Cloudy','day'),'☁️');
 assert.equal(weatherGlyph('Clear','night'),'🌙');
});
test('NWS hourly forecast preserves source, validates host and remains forecast, not observation',async()=>{
 const requests=[];
 const response=async url=>{
  requests.push(url);
  if(url.includes('/points/'))return {ok:true,json:async()=>({
   properties:{forecastHourly:'https://api.weather.gov/gridpoints/LWX/99,70/forecast/hourly'}
  })};
  return {ok:true,json:async()=>({properties:{periods:[{
   shortForecast:'Mostly Cloudy',temperature:49,temperatureUnit:'F'}]}})};
 };
 const result=await fetchNWSHourlyForecast(38.8893,-77.0502,response);
 assert.equal(requests.length,2);
 assert.equal(result.condition,'Mostly Cloudy');
 assert.match(result.source,/FORECAST — NOT OBSERVED/);
 await assert.rejects(fetchNWSHourlyForecast(0,0,response));
});

test('sky background reflects sunny, overcast, heavy rain, snow, sunset and night',()=>{
 const sunny=environmentPalette('day','sunny');
 const cloudy=environmentPalette('day','overcast');
 const rainy=environmentPalette('day','heavy rain');
 const snowy=environmentPalette('day','snow');
 const sunset=environmentPalette('sunset','sunny');
 const night=environmentPalette('night','clear');
 assert.equal(sunny.cloud,false);
 assert.equal(cloudy.cloud,true);
 assert.equal(rainy.rain,true);
 assert.equal(snowy.snow,true);
 assert.equal(sunset.sunset,true);
 assert.equal(night.night,true);
 assert.notEqual(sunny.top,cloudy.top);
 assert.notEqual(sunny.horizon,sunset.horizon);
 assert.notEqual(sunset.top,night.top);
});
test('city photo fetch requires a recognized reuse license and a real Commons image URL',async()=>{
 const page={title:'File:New York City skyline.jpg',imageinfo:[{
  thumburl:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/NYC.jpg/1200px-NYC.jpg',
  extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},Artist:{value:'Example contributor'}}
 }]};
 const requests=[];
 const mock=async url=>{requests.push(url);return{ok:true,json:async()=>({query:{pages:[page]}})}};
 const photo=await findCapitalPhoto({id:'new-york-city',capital:'New York City'},'day',mock);
 assert.match(photo.url,/^https:\/\/upload\.wikimedia\.org/);
 assert.equal(photo.license,'CC BY-SA 4.0');
 assert.ok(requests[0].includes('origin=*'));
 const denied=async()=>({ok:true,json:async()=>({query:{pages:[{
  ...page,imageinfo:[{...page.imageinfo[0],extmetadata:{LicenseShortName:{value:'All rights reserved'}}}]
 }]}})});
 await assert.rejects(findCapitalPhoto({id:'another-place',capital:'Another Place'},'day',denied),/No verified-license/);
});

test('viewport compositor has distinct proven rain, snow, fog, storm, night and sunset behaviors',()=>{
 const sunny=visualPreset('day','sunny'),rain=visualPreset('day','rain');
 const snow=visualPreset('day','snow'),storm=visualPreset('night','thunderstorm');
 const fog=visualPreset('morning','fog'),sunset=visualPreset('sunset','sunny');
 assert.equal(sunny.particleCount,0);
 assert.equal(rain.rain,true);assert.ok(rain.particleCount>0);
 assert.equal(snow.snow,true);
 assert.equal(storm.storm,true);assert.equal(storm.night,true);
 assert.equal(fog.fog,true);assert.equal(sunset.sunset,true);
 assert.notEqual(sunny.tint,sunset.tint);
 assert.notEqual(sunset.tint,storm.tint);
});
