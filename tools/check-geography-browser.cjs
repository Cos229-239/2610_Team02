'use strict';
// Browser-level DOM/state test for the real geography module, mocked WebGL/API.
// Does not connect to GitHub OAuth, Overpass, NWS or the user's live host.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const assert=require('node:assert/strict');
const run=promisify(execFile);
const root=path.resolve(__dirname,'../collaboration-room/live-room/public');
const page=[
 "import {installGeography,destinations} from './geo-environments.mjs';",
 "class Obj {constructor(){this.children=[];this.parent=null;this.name='';this.visible=true;this.position={set(){}};this.rotation={x:0,y:0,z:0,set(){}};this.scale={setScalar(){}};}",
 "add(...xs){for(const x of xs){x.parent=this;this.children.push(x)}}",
 "remove(x){this.children=this.children.filter(v=>v!==x);x.parent=null}",
 "getObjectByName(n){if(this.name===n)return this;for(const c of this.children){const hit=c.getObjectByName?.(n);if(hit)return hit}return null;}}",
 "class Shape {moveTo(){}lineTo(){}}",
 "class Geometry {dispose(){}rotateX(){return this}setAttribute(){this.attributes={position:{needsUpdate:false}}}}",
 "class Material {constructor(o){Object.assign(this,o);this.color={setHex(){}}}dispose(){}}",
 "class CanvasTexture {constructor(canvas){this.image=canvas;this.needsUpdate=false}dispose(){}}",
 "class Color {constructor(c){this.value=c}set(v){this.value=v;return this}setHex(v){this.value=v;return this}clone(){return new Color(this.value)}copy(v){this.value=v.value;return this}}",
 "class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m}}",
 "class BufferAttribute {constructor(a,n){this.array=a;this.itemSize=n;this.needsUpdate=false}}",
 "class Light extends Obj {constructor(){super();this.color={setHex(){}};this.intensity=1}}",
 "const THREE={Color,Group:Obj,Mesh,Shape,MeshStandardMaterial:Material,MeshBasicMaterial:Material,CanvasTexture,PointsMaterial:Material,Points:Mesh,DoubleSide:2,SRGBColorSpace:'srgb',",
 "BoxGeometry:Geometry,PlaneGeometry:Geometry,ExtrudeGeometry:Geometry,ConeGeometry:Geometry,",
 "SphereGeometry:Geometry,IcosahedronGeometry:Geometry,CylinderGeometry:Geometry,",
 "BufferGeometry:Geometry,BufferAttribute,DirectionalLight:Light,HemisphereLight:Light,PointLight:Light};",
 "const scene=new Obj(),legacy=new Obj();legacy.name='TF_CITY_SKYLINE';scene.add(legacy);",
 "const origFetch=window.fetch;",
 "const fixture=[",
 "{type:'way',id:1001,tags:{building:'yes',height:'18'},geometry:[{lon:-81.03315,lat:34.00044},{lon:-81.03305,lat:34.00044},{lon:-81.03305,lat:34.00054},{lon:-81.03315,lat:34.00044}]},",
 "{type:'way',id:1002,tags:{building:'yes','building:levels':'4'},geometry:[{lon:-81.03335,lat:34.00044},{lon:-81.03325,lat:34.00044},{lon:-81.03325,lat:34.00054},{lon:-81.03335,lat:34.00044}]},",
 "{type:'way',id:1003,tags:{highway:'residential'},geometry:[{lon:-81.03315,lat:34.00041},{lon:-81.03305,lat:34.00041}]}];",
 "window.fetch=async(url,opts)=>{url=String(url);if(url.includes('overpass')){if(String(opts?.body).includes('40.7128'))return {ok:false,status:429};return {ok:true,json:async()=>({elements:fixture})}};",
 "if(url.includes('/points/'))return {ok:true,json:async()=>({properties:{forecastHourly:'https://api.weather.gov/gridpoints/CAE/1,1/forecast/hourly'}})};",
 "if(url.includes('/forecast/hourly'))return {ok:true,json:async()=>({properties:{periods:[{shortForecast:'Mostly Cloudy',temperature:65,temperatureUnit:'F'}]}})};",
 "throw Error('Unexpected external request '+url)};",
 "try {const api=installGeography({THREE,scene});",
 "if(destinations.length!==51)throw Error('Destination count');",
 "const sh=document; // Geography controls currently live in document DOM; no shadow root.",
 "const head=sh.querySelector('button');head.click();",
 "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));",
 "if(document.querySelector('#tf-geography-controls button').getAttribute('aria-expanded')!=='false')throw Error('Escape failed to dismiss panel');",
 "head.click();",
 "if(![...sh.querySelectorAll('button')].some(b=>b.textContent.includes('South Carolina')))throw Error('Missing state button');",
 "if(!await api.activate('south-carolina'))throw Error('OSM activation failed');",
 "if(api.state.destination!=='south-carolina'||legacy.visible)throw Error('Wrong scene transition');",
 "if(api.diagnostics.sceneActive!==true)throw Error('City inactive');",
 "sh.querySelector('input[value=night]').click();",
 "if(api.state.timeMode!=='night')throw Error('Exclusive time broken');",
 "api.setTime('sunset');if(api.state.timeMode!=='sunset')throw Error('Sunset mode broken');",
 "const selects=sh.querySelectorAll('select');selects[0].value='manual';selects[0].dispatchEvent(new Event('change'));",
 "selects[1].value='rain';selects[1].dispatchEvent(new Event('change'));",
 "if(api.state.weatherMode!=='manual'||!sh.querySelector('#tf-geography-weather')){",
 "if(api.state.weatherMode!=='manual')throw Error('Manual mode failed')}",
 "if(!await api.activate('new-york-city'))throw Error('Sky fallback activation failed during HTTP 429');",
 "if(api.state.destination!=='new-york-city'||!legacy.visible)throw Error('Source failure should preserve generic skyline');",
 "if(!scene.getObjectByName('TF_CAPITAL_SOURCE_UNAVAILABLE_SKY'))throw Error('Weather sky fallback missing');",
 "if(!await api.activate('washington-dc'))throw Error('D.C. activation failed');",
 "if(api.state.destination!=='washington-dc')throw Error('D.C. not active');",
 "api.returnToOriginal();if(!legacy.visible)throw Error('Legacy scene not restored');",
 "if(api.state.destination!==null)throw Error('Original room state not restored');",
 "api.dispose();if(window.tfGeography)throw Error('Manager did not dispose');",
 "document.documentElement.dataset.geoPilot='passed';}",
 "catch(e){document.documentElement.dataset.geoPilot='failed '+e.message;}",
 "finally{window.fetch=origFetch;}"
].join('\n');
async function main(){
 const httpServer=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><head></head><body><script type="module" src="/pilot.mjs"></script></body></html>');
  if(pathname==='/pilot.mjs')return res.writeHead(200,{'Content-Type':'text/javascript'}).end(page);
  const allowed=new Set(['geo-environments.mjs','geo-capital-mesh.mjs','geo-capitals-coordinates.mjs','geo-capital-photo.mjs','geo-scene-compositor.mjs']);
  const filename=pathname.slice(1);
  if(!allowed.has(filename))return res.writeHead(404).end();
  return res.writeHead(200,{'Content-Type':'text/javascript'}).end(fs.readFileSync(path.join(root,filename)));
 });
 try{
  await new Promise((resolve,reject)=>{httpServer.once('error',reject);httpServer.listen(0,'127.0.0.1',resolve)});
  const url='http://127.0.0.1:'+httpServer.address().port+'/';
  const {stdout}=await run(process.env.CHROME_BIN||'google-chrome',
   ['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--dump-dom','--virtual-time-budget=11000',url],
   {timeout:35000,maxBuffer:5e6});
  const verdict=stdout.match(/data-geo-pilot="([^"]*)"/)?.[1];
  assert.equal(verdict,'passed',verdict||'No browser verdict');
  console.log('PASS: real geography UI, OSM switching, exclusive time, manual weather, D.C. and original room restoration');
 }finally{httpServer.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
