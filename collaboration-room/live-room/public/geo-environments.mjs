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
 function setTime(m){
  light.intensity=m==='night'?.22:m==='morning'?1.15:1.7;
  light.color.setHex(m==='morning'?0xffb986:m==='night'?0x8398b8:0xffead2);
  ambient.intensity=m==='night'?.28:m==='morning'?.7:1;
  stone.color.setHex(m==='night'?0x727780:m==='morning'?0xc4b39b:0xb9b4a7);
 }
 setTime(mode);
 return {group,setTime,dispose(){
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
 body.append(search,mode,status,list);wrap.append(heading,body);document.body.append(wrap);
 const weather=document.createElement('div');weather.id='tf-geography-weather';
 weather.style.cssText='position:fixed;left:22px;top:68px;z-index:910;color:#ecf8ff;background:#081624ed;padding:4px 9px;font:12px system-ui';
 weather.textContent='☀️ · WEATHER UNVERIFIED';document.body.append(weather);
 let state=Object.freeze({destination:null,timeMode:'day',weatherMode:'live'});
 let active=null,weatherForecast=null,weatherTimer=null,weatherRequest=0,loadSerial=0;
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
 function setTime(value){
  state=selectMode(state,value);
  if(active)active.setTime(value);
  for(const radio of mode.querySelectorAll('input'))radio.checked=radio.value===value;
  const d=destinations.find(v=>v.id===state.destination);
  weather.textContent=weatherForecast?weatherGlyph(weatherForecast.condition,value)+' · '+d?.capital+' · '+weatherForecast.condition+' · NWS forecast':(value==='night'?'🌙':'☀️')+' · WEATHER UNVERIFIED';
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
  if(!weatherTimer){
   const update=async()=>{
     const serial=++weatherRequest;
     try{
       const target=destinations.find(v=>v.id===state.destination);
       if(!target)return;
       const result=await fetchNWSHourlyForecast(target.latitude,target.longitude);
       if(serial!==weatherRequest)return;
       weatherForecast=result;setTime(state.timeMode);
     }catch{
       if(serial!==weatherRequest)return;
       if(weatherForecast)weather.textContent+=' · CACHED';
       else weather.textContent='⚠️ · NWS FORECAST UNAVAILABLE';
     }
   };
   void update();weatherTimer=setInterval(()=>void update(),15*60*1000);
  }
  return true;
 }
 heading.addEventListener('click',()=>{body.hidden=!body.hidden;heading.setAttribute('aria-expanded',String(!body.hidden));});
 search.addEventListener('input',render);render();
 const api=Object.freeze({activate,setTime,get state(){return state;},
  get diagnostics(){return{destinations:destinations.length,sceneActive:!!active,
   validatedHighFidelityScenes:0,knownArchitecturalStudies:1};},
  dispose(){if(active){scene.remove(active.group);active.dispose();}
   if(originalSkyline)originalSkyline.visible=skylineWasVisible;
   if(nycWasEnabled!==null)window.tfNYCAtmosphere?.setEnabled(nycWasEnabled);
   if(weatherTimer)clearInterval(weatherTimer);weatherRequest++;
   wrap.remove();weather.remove();delete window.tfGeography;}});
 window.tfGeography=api;return api;
}
