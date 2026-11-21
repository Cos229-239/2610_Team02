import {capitalCoordinates} from './geo-capitals-coordinates.mjs';
import {fetchCapitalTile,buildCapitalScene} from './geo-capital-mesh.mjs';
// TowerFlow geographic foundation: one scene owner, no generic fake capital cities.
const capitals=[
'Alabama|Montgomery|America/Chicago','Alaska|Juneau|America/Juneau',
'Arizona|Phoenix|America/Phoenix','Arkansas|Little Rock|America/Chicago',
'California|Sacramento|America/Los_Angeles','Colorado|Denver|America/Denver',
'Connecticut|Hartford|America/New_York','Delaware|Dover|America/New_York',
'Florida|Tallahassee|America/New_York','Georgia|Atlanta|America/New_York',
'Hawaii|Honolulu|Pacific/Honolulu','Idaho|Boise|America/Boise',
'Illinois|Springfield|America/Chicago','Indiana|Indianapolis|America/Indiana/Indianapolis',
'Iowa|Des Moines|America/Chicago','Kansas|Topeka|America/Chicago',
'Kentucky|Frankfort|America/New_York','Louisiana|Baton Rouge|America/Chicago',
'Maine|Augusta|America/New_York','Maryland|Annapolis|America/New_York',
'Massachusetts|Boston|America/New_York','Michigan|Lansing|America/Detroit',
'Minnesota|Saint Paul|America/Chicago','Mississippi|Jackson|America/Chicago',
'Missouri|Jefferson City|America/Chicago','Montana|Helena|America/Denver',
'Nebraska|Lincoln|America/Chicago','Nevada|Carson City|America/Los_Angeles',
'New Hampshire|Concord|America/New_York','New Jersey|Trenton|America/New_York',
'New Mexico|Santa Fe|America/Denver','New York|Albany|America/New_York',
'North Carolina|Raleigh|America/New_York','North Dakota|Bismarck|America/Chicago',
'Ohio|Columbus|America/New_York','Oklahoma|Oklahoma City|America/Chicago',
'Oregon|Salem|America/Los_Angeles','Pennsylvania|Harrisburg|America/New_York',
'Rhode Island|Providence|America/New_York','South Carolina|Columbia|America/New_York',
'South Dakota|Pierre|America/Chicago','Tennessee|Nashville|America/Chicago',
'Texas|Austin|America/Chicago','Utah|Salt Lake City|America/Denver',
'Vermont|Montpelier|America/New_York','Virginia|Richmond|America/New_York',
'Washington|Olympia|America/Los_Angeles','West Virginia|Charleston|America/New_York',
'Wisconsin|Madison|America/Chicago','Wyoming|Cheyenne|America/Denver'];
export const destinations=Object.freeze([...capitals.map(line=>{
 const [state,capital,timeZone]=line.split('|');
 return Object.freeze({id:state.toLowerCase().replaceAll(' ','-'),state,capital,timeZone,
  kind:'state',status:'real-osm-on-demand',...capitalCoordinates[state]});
}),Object.freeze({id:'washington-dc',state:'Washington, D.C.',capital:'Federal District',
 timeZone:'America/New_York',kind:'district',status:'architectural-study',
 latitude:38.8893,longitude:-77.0502})]);
export const modes=Object.freeze(['morning','day','night']);
export function validateDestinations(list=destinations){
 return list.length===51&&list.filter(d=>d.kind==='state').length===50&&
  list.filter(d=>d.kind==='district').length===1&&new Set(list.map(d=>d.id)).size===51&&
  list.every(d=>{try{new Intl.DateTimeFormat('en-US',{timeZone:d.timeZone});return !!d.capital&&Number.isFinite(d.latitude)&&Number.isFinite(d.longitude);}
   catch{return false;}});
}
export function selectMode(previous,mode){
 if(!modes.includes(mode))throw Error('Invalid time mode');
 return Object.freeze({...previous,timeMode:mode});
}
export function weatherGlyph(description,timeMode='day') {
 const text=String(description||'').toLowerCase();
 if(/thunder|storm/.test(text))return '⛈️';
 if(/rain|showers|drizzle/.test(text))return '🌧️';
 if(/cloud|overcast|fog/.test(text))return '☁️';
 return timeMode==='night'?'🌙':'☀️';
}
export async function fetchNWSHourlyForecast(latitude,longitude,request=fetch) {
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||
    latitude<18||latitude>72||longitude< -180||longitude> -60)
   throw Error('Invalid U.S. forecast coordinates');
 const opts={headers:{Accept:'application/geo+json'},signal:AbortSignal.timeout(8000)};
 const first=await request('https://api.weather.gov/points/'+latitude+','+longitude,opts);
 if(!first.ok)throw Error('NWS point lookup HTTP '+first.status);
 const metadata=await first.json();
 const href=metadata?.properties?.forecastHourly;
 if(typeof href!=='string')throw Error('NWS hourly forecast unavailable');
 const url=new URL(href);
 if(url.protocol!=='https:'||url.hostname!=='api.weather.gov')
   throw Error('Unexpected forecast destination');
 const second=await request(url.href,opts);
 if(!second.ok)throw Error('NWS forecast HTTP '+second.status);
 const periods=(await second.json())?.properties?.periods;
 if(!Array.isArray(periods)||!periods[0]||typeof periods[0].shortForecast!=='string')
  throw Error('NWS forecast missing weather condition');
 const item=periods[0];
 return {condition:item.shortForecast,temperature:item.temperature,
  temperatureUnit:item.temperatureUnit,asOf:new Date().toISOString(),
  source:'NWS HOURLY FORECAST — NOT OBSERVED CURRENT WEATHER'};
}
export function createDCLandmarkStudy(THREE,mode){
 const group=new THREE.Group();group.name='TF_DC_LINCOLN_REFERENCE_STUDY';
 const geo=[],mats=[];
 function mat(c){const m=new THREE.MeshStandardMaterial({color:c,roughness:.86});mats.push(m);return m;}
 const stone=mat(0xb9b4a7),ground=mat(0x4c7056),water=mat(0x477789),walk=mat(0x9f9c92);
 function mesh(g,m,x,y,z){geo.push(g);const ob=new THREE.Mesh(g,m);ob.position.set(x,y,z);group.add(ob);return ob;}
 function box(w,h,d,x,y,z,m=stone){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
 // A grounded *architectural study*, not a surveyed model or photogrammetry.
 box(50,.3,174,0,-.3,-52,ground);
 box(14,.08,82,0,-.09,-50,walk);
 box(10,.06,63,0,-.03,-49,water);
 box(24,1.3,18,0,.65,11);
 for(let step=0;step<8;step++)box(21-step*.22,.14,1.35,0,.08+step*.14,1+step*1.15);
 // 36 Doric perimeter columns; no duplicate corner locations.
 const points=[];
 for(let k=0;k<12;k++){const x=-10+k*20/11;points.push([x,4],[x,18]);}
 for(let k=0;k<6;k++){const z=6+k*10/5;points.push([-10.8,z],[10.8,z]);}
 const colGeo=new THREE.CylinderGeometry(.36,.44,6.3,16);
 geo.push(colGeo);
 for(const [x,z] of points){
  const col=new THREE.Mesh(colGeo,stone);col.position.set(x,5.2,z);group.add(col);
  box(1.07,.25,1.07,x,8.45,z);
 }
 box(15.5,6.1,10,0,5.2,11);
 box(24,1.1,18,0,9.1,11);
 // Washington Monument stands across the Reflecting Pool along one axis.
 box(2,23,2,0,11.5,-114);
 const apex=mesh(new THREE.ConeGeometry(1.41,3,4),stone,0,24.5,-114);
 apex.rotation.y=Math.PI/4;
 const light=new THREE.DirectionalLight(0xffead2,1.5);
 light.position.set(-27,50,25);group.add(light);
 const ambient=new THREE.HemisphereLight(0xc0d6ec,0x2a373a,.9);group.add(ambient);
 let currentMode=mode,condition='sun';
 function applyLighting(){
  const cloud=/cloud|overcast|rain|storm/i.test(condition);
  light.intensity=(currentMode==='night'?.22:currentMode==='morning'?1.15:1.7)*(cloud?.62:1);
  light.color.setHex(currentMode==='morning'?0xffb986:currentMode==='night'?0x8398b8:0xffead2);
  ambient.intensity=currentMode==='night'?.28:currentMode==='morning'?.7:1;
  stone.color.setHex(currentMode==='night'?0x727780:currentMode==='morning'?0xc4b39b:0xb9b4a7);
  water.color.setHex(/rain|storm/i.test(condition)?0x344d62:0x477789);
 }
 function setTime(m){currentMode=m;applyLighting();}
 function setWeather(w){condition=w;applyLighting();}
 applyLighting();
 return {group,setTime,setWeather,dispose(){
  for(const g of new Set(geo))g.dispose();for(const m of mats)m.dispose();
 }};
}
export function installGeography({THREE,scene}){
 if(!validateDestinations())throw Error('Invalid U.S. capital registry');
 if(window.tfGeography)return window.tfGeography;
 const wrap=document.createElement('div');
 wrap.id='tf-geography-controls';
 wrap.style.cssText='position:fixed;right:12px;top:100px;z-index:910;background:#081624ed;color:#e9f8ff;padding:10px;border:1px solid #487b93;border-radius:9px;max-width:min(320px,82vw);font:12px system-ui';
 const heading=document.createElement('button');
 heading.type='button';heading.textContent='STATES · CAPITALS ▾';
 const body=document.createElement('div');body.hidden=true;
 const search=document.createElement('input');search.type='search';
 search.placeholder='Search state or capital';search.setAttribute('aria-label','Search capitals');
 search.style.cssText='display:block;width:95%;margin:8px 0;background:#132b3c;color:white';
 const mode=document.createElement('div');mode.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin:9px 0';
 const list=document.createElement('div');list.style.cssText='max-height:42vh;overflow-y:auto';
 const status=document.createElement('p');status.setAttribute('role','status');
 status.textContent='D.C. architectural study available; other cities require verified reference scenes.';
 const weatherControls=document.createElement('div');
 weatherControls.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin:8px 0';
 const weatherModeSelect=document.createElement('select');
 weatherModeSelect.setAttribute('aria-label','Weather source');
 const manualSelect=document.createElement('select');
 manualSelect.setAttribute('aria-label','Simulated weather');
 for(const [value,label] of [['live','LIVE NWS'],['manual','MANUAL']]){
  const op=document.createElement('option');op.value=value;op.textContent=label;weatherModeSelect.append(op);
 }
 for(const value of ['sun','clouds','rain','thunderstorm']){
  const op=document.createElement('option');op.value=value;op.textContent=value.toUpperCase();manualSelect.append(op);
 }
 manualSelect.hidden=true;
 weatherControls.append(weatherModeSelect,manualSelect);
 const restore=document.createElement('button');
 restore.textContent='RETURN TO ORIGINAL ROOM';restore.type='button';
 body.append(search,mode,weatherControls,status,restore,list);wrap.append(heading,body);document.body.append(wrap);
 const weather=document.createElement('div');weather.id='tf-geography-weather';
 weather.style.cssText='position:fixed;left:22px;top:68px;z-index:910;color:#ecf8ff;background:#081624ed;padding:4px 9px;font:12px system-ui';
 weather.textContent='☀️ · WEATHER UNVERIFIED';document.body.append(weather);
 let state=Object.freeze({destination:null,timeMode:'day',weatherMode:'live',manualWeather:'sun'});
 let active=null,weatherForecast=null,weatherTimer=null,weatherRequest=0,loadSerial=0;
 let weatherMesh=null,weatherGeometry=null,weatherMaterial=null,weatherAnimation=0;

 function clearWeatherVisual(){
  if(weatherAnimation)cancelAnimationFrame(weatherAnimation);
  weatherAnimation=0;
  weatherMesh?.parent?.remove(weatherMesh);
  weatherGeometry?.dispose();weatherMaterial?.dispose();
  weatherMesh=weatherGeometry=weatherMaterial=null;
 }
 function applyWeatherVisual(){
  clearWeatherVisual();
  if(!active)return;
  const condition=state.weatherMode==='manual'?state.manualWeather:weatherForecast?.condition||'';
  const rain=/rain|storm|shower|drizzle/i.test(condition);
  active.setWeather?.(condition);
  if(!rain)return;
  const points=new Float32Array(180*3);
  for(let i=0;i<180;i++){
   points[i*3]=(Math.random()-.5)*52;
   points[i*3+1]=Math.random()*22+1;
   points[i*3+2]=(Math.random()-.5)*42;
  }
  weatherGeometry=new THREE.BufferGeometry();
  weatherGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  weatherMaterial=new THREE.PointsMaterial({color:0xaed7f4,size:.17,opacity:.7,transparent:true});
  weatherMesh=new THREE.Points(weatherGeometry,weatherMaterial);
  weatherMesh.name='TF_CAPITAL_WEATHER_RAIN';
  active.group.add(weatherMesh);
  const tick=()=>{
   if(!weatherMesh||!active)return;
   for(let i=1;i<points.length;i+=3){
    points[i]-=.27;if(points[i]<0)points[i]=22;
   }
   weatherGeometry.attributes.position.needsUpdate=true;
   weatherAnimation=requestAnimationFrame(tick);
  };
  weatherAnimation=requestAnimationFrame(tick);
 }
 const originalSkyline=scene.getObjectByName('TF_CITY_SKYLINE');
 const skylineWasVisible=originalSkyline?.visible;
 let nycWasEnabled=null;
 function render(){
  list.replaceChildren();
  const query=search.value.trim().toLowerCase();
  for(const d of destinations){
   if(!(d.state+' '+d.capital).toLowerCase().includes(query))continue;
   const b=document.createElement('button');b.type='button';
   b.textContent=d.state+' — '+d.capital+(d.kind==='district'?' · MEMORIAL STUDY':' · REAL OSM DATA');
   b.setAttribute('aria-current',String(state.destination===d.id));
   b.style.cssText='display:block;width:100%;text-align:left;margin:4px 0;background:#122b3e;color:#eaf5ff;border:1px solid #4b7892;padding:7px';
   b.title='Load geographic geometry only when its source is available';
   b.addEventListener('click',()=>activate(d.id));list.append(b);
  }
 }
 function renderWeather(){
  const d=destinations.find(v=>v.id===state.destination);
  const label=state.weatherMode==='manual'?state.manualWeather+' · SIMULATED':
   weatherForecast?weatherForecast.condition+' · NWS HOURLY FORECAST':
   'NWS WEATHER UNAVAILABLE';
  weather.textContent=weatherGlyph(label,state.timeMode)+' · '+(d?.capital||'CAPITAL')+' · '+label;
  applyWeatherVisual();
 }
 function setTime(value){
  state=selectMode(state,value);
  if(active)active.setTime(value);
  for(const radio of mode.querySelectorAll('input'))radio.checked=radio.value===value;
  renderWeather();
 }
 async function updateWeather(){
  const d=destinations.find(v=>v.id===state.destination);
  if(!d||state.weatherMode!=='live')return;
  const serial=++weatherRequest,current=state.destination;
  try{
   const result=await fetchNWSHourlyForecast(d.latitude,d.longitude);
   if(serial!==weatherRequest||state.destination!==current)return;
   weatherForecast=result;renderWeather();
  }catch{
   if(serial!==weatherRequest)return;
   weather.textContent=weatherForecast?'⚠️ '+d.capital+' · CACHED NWS FORECAST':
    '⚠️ '+d.capital+' · NWS WEATHER UNAVAILABLE';
  }
 }
 for(const value of modes){
  const label=document.createElement('label');label.style.marginRight='5px';
  const input=document.createElement('input');input.type='radio';input.name='tf-time';
  input.value=value;input.checked=value==='day';
  input.addEventListener('change',()=>{if(input.checked)setTime(value);});
  label.append(input,document.createTextNode(' '+value.toUpperCase()));mode.append(label);
 }
 async function activate(id){
  const d=destinations.find(v=>v.id===id);
  if(!d)return false;
  const serial=++loadSerial;
  status.textContent='Loading '+d.capital+' real geographic geometry…';
  let prepared;
  try{
   if(d.kind==='district')prepared=createDCLandmarkStudy(THREE,state.timeMode);
   else{
    const tile=await fetchCapitalTile(d);
    if(serial!==loadSerial)return false;
    prepared=buildCapitalScene(THREE,tile,state.timeMode);
    prepared.report={buildings:tile.buildings.length,roads:tile.roads.length,
      estimated:tile.buildings.filter(v=>v.estimation!=='OSM height tag').length};
   }
  }catch(error){
    if(serial===loadSerial)status.textContent='Unavailable: '+d.capital+' — '+String(error.message||error)+'; prior scene retained.';
    return false;
  }
  if(serial!==loadSerial){prepared.dispose();return false;}
  if(nycWasEnabled===null && window.tfNYCAtmosphere)nycWasEnabled=window.tfNYCAtmosphere.enabled;
  window.tfNYCAtmosphere?.setEnabled(false);
  if(originalSkyline)originalSkyline.visible=false;
  if(active){scene.remove(active.group);active.dispose();}
  active=prepared;
  prepared.group.position.set(63,0,-57);
  prepared.group.scale.setScalar(.40);
  scene.add(prepared.group);state=Object.freeze({...state,destination:id});
  status.textContent=d.kind==='district'?'WASHINGTON, D.C. · Architectural study, not verified high-fidelity reconstruction':d.capital+' · '+prepared.report.buildings+' verified OSM footprint records, '+prepared.report.estimated+' estimated heights';
  render();weatherForecast=null;
  ++weatherRequest;
  if(state.weatherMode==='live')void updateWeather();
  renderWeather();
  return true;
 }
 weatherModeSelect.addEventListener('change',()=>{
  state=Object.freeze({...state,weatherMode:weatherModeSelect.value});
  manualSelect.hidden=state.weatherMode!=='manual';
  ++weatherRequest;
  if(state.weatherMode==='live')void updateWeather();
  renderWeather();
 });
 manualSelect.addEventListener('change',()=>{
  state=Object.freeze({...state,manualWeather:manualSelect.value});
  renderWeather();
 });
 function returnToOriginal(){
  ++loadSerial;++weatherRequest;clearWeatherVisual();
  if(active){scene.remove(active.group);active.dispose();active=null;}
  if(originalSkyline)originalSkyline.visible=skylineWasVisible;
  if(nycWasEnabled!==null){window.tfNYCAtmosphere?.setEnabled(nycWasEnabled);nycWasEnabled=null;}
  state=Object.freeze({...state,destination:null});weatherForecast=null;
  status.textContent='Original TowerFlow skyline restored.';render();renderWeather();
 }
 restore.addEventListener('click',returnToOriginal);
 weatherTimer=setInterval(()=>{if(state.weatherMode==='live')void updateWeather();},15*60*1000);
 heading.addEventListener('click',()=>{body.hidden=!body.hidden;heading.setAttribute('aria-expanded',String(!body.hidden));});
 search.addEventListener('input',render);render();
 const api=Object.freeze({activate,setTime,get state(){return state;},
  get diagnostics(){return{destinations:destinations.length,sceneActive:!!active,
   validatedHighFidelityScenes:0,knownArchitecturalStudies:1};},
  returnToOriginal,
  dispose(){returnToOriginal();
   if(weatherTimer)clearInterval(weatherTimer);weatherRequest++;
   wrap.remove();weather.remove();delete window.tfGeography;}});
 window.tfGeography=api;return api;
}
