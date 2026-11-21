/*
 * TowerFlow NYC Atmosphere V1 — additive and reversible.
 * Data: NYC Open Data BUILDING (5zhs-2jue), Open-Meteo current weather.
 * Does NOT change existing workstations, navigation, audio, auth or existing
 * city assets. Actual visibility depends on the host's window geometry.
 */
export const NYC_ORIGIN=Object.freeze({lat:40.7536,lon:-73.9832});
const NYC_URL='https://data.cityofnewyork.us/resource/5zhs-2jue.geojson';
const METEO_URL='https://api.open-meteo.com/v1/forecast';
const DAY=24*3600*1000;
export function climate(now, weather={}) {
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    hour:'numeric',hourCycle:'h23'}).format(now));
  const night=weather.is_day===0 || (weather.is_day==null && (hour<6 || hour>=19));
  const cloud=Math.max(0,Math.min(100,Number(weather.cloud_cover)||0))/100;
  const rain=Math.max(0,Number(weather.precipitation)||0);
  const visibility=Math.max(250,Number(weather.visibility)||14000);
  return {night,cloud,rain,visibility,hour};
}
export function footprintFeatures(features,max=110) {
  if(!Array.isArray(features))return [];
  const out=[];
  for(const item of features) {
    if(out.length>=max)break;
    const g=item?.geometry;
    const coordinates=g?.type==='Polygon'?g.coordinates:
      g?.type==='MultiPolygon'?g.coordinates?.[0]:null;
    const ring=coordinates?.[0];
    if(!Array.isArray(ring)||ring.length<4||ring.length>200)continue;
    let valid=true, poly=[];
    for(const coord of ring){
      if(!Array.isArray(coord)||!Number.isFinite(coord[0])||!Number.isFinite(coord[1])||
        coord[0]<-74.02||coord[0]>-73.95||coord[1]<40.71||coord[1]>40.79) {
        valid=false;break;
      }
      poly.push([coord[0],coord[1]]);
    }
    if(!valid)continue;
    const raw=Number(item.properties?.height_roof);
    // NYC roof-height field is reported in feet. Reject extreme or absent heights.
    const feet=Number.isFinite(raw)&&raw>12&&raw<2500?raw:55;
    const id=String(item.properties?.bin||item.properties?.base_bbl||out.length);
    out.push({id,poly,feet});
  }
  return out;
}
function seedRandom(seed) {
  let s=seed>>>0;
  return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
}
export function proceduralFallback(n=82) {
  // Explicitly an approximate fallback, never labelled measured Manhattan.
  const random=seedRandom(28171),result=[];
  for(let i=0;i<n;i++){
    const col=i%11,row=Math.floor(i/11);
    const lon=NYC_ORIGIN.lon+(col-5)*.00102;
    const lat=NYC_ORIGIN.lat+(row-3.5)*.00078;
    const dx=.00017+random()*.00015,dy=.00013+random()*.00013;
    const h=55+random()*290+(i%9===0?225:0);
    result.push({id:'sim-'+i,feet:h,poly:[
      [lon-dx,lat-dy],[lon+dx,lat-dy],[lon+dx,lat+dy],[lon-dx,lat+dy],[lon-dx,lat-dy]
    ]});
  }
  return result;
}
export function meshProfile(item,origin=NYC_ORIGIN,unitsPerMeter=9) {
  const scaleX=111320*Math.cos(origin.lat*Math.PI/180)/unitsPerMeter;
  const scaleZ=111320/unitsPerMeter;
  const points=item.poly.map(([lon,lat])=>[
    (lon-origin.lon)*scaleX,-(lat-origin.lat)*scaleZ
  ]);
  return {points,height:Math.min(75,Math.max(2,item.feet*.3048/unitsPerMeter))};
}
async function fetchJson(url,timeout=8000) {
  const control=new AbortController(),timer=setTimeout(()=>control.abort(),timeout);
  try {
    const response=await fetch(url,{cache:'no-store',signal:control.signal});
    if(!response.ok)throw Error('HTTP '+response.status);
    return await response.json();
  }finally{clearTimeout(timer)}
}
function boundedText(root,label,status){
  root.textContent=label+' · '+status;
}
export function installNYCAtmosphere({THREE,scene,renderer,camera,position={x:62,z:-83},
   autoEnable=true,fetchData=true}={}) {
  if(!THREE||!scene||!renderer||!camera)throw Error('Three.js scene, camera and renderer required');
  if(globalThis.tfNYCAtmosphere)return globalThis.tfNYCAtmosphere;
  const group=new THREE.Group();
  group.name='TF_NYC_ATMOSPHERE_V1';
  group.position.set(position.x,0,position.z);
  scene.add(group);
  const disposables=[], materials=[];
  let enabled=Boolean(autoEnable), disposed=false, weatherTimer=null,weather=null;
  let dataMode='loading',buildings=0,lastWeather='offline',lastGeometry=null;
  const fallback=proceduralFallback();
  const previousVisibility=group.visible;
  const hud=document.createElement('div');
  hud.id='tf-nyc-atmosphere-control';
  hud.setAttribute('role','group');
  hud.setAttribute('aria-label','New York City skyline controls');
  Object.assign(hud.style,{position:'fixed',right:'12px',bottom:'58px',zIndex:'999',
    display:'flex',flexWrap:'wrap',alignItems:'center',gap:'6px',maxWidth:'min(94vw,480px)',
    padding:'7px 10px',border:'1px solid #65cce6',borderRadius:'8px',
    background:'rgba(4,18,31,.88)',color:'#ecf8fd',font:'12px system-ui',
    boxShadow:'0 3px 16px #05121bb0'});
  const toggle=document.createElement('button');
  toggle.type='button';toggle.textContent='NYC: ON';
  toggle.setAttribute('aria-pressed','true');
  const status=document.createElement('span');
  status.setAttribute('role','status');
  status.textContent='Loading NYC geometry…';
  hud.append(toggle,status);
  document.body.append(hud);

  const materialsFor=(night,cloud,layer)=>{
    const palette=night?[0x263849,0x1f2d40,0x32404b,0x3e4c58]:
      [0x57718a,0x536d85,0x82929c,0x637a91];
    const color=palette[layer%palette.length];
    const material=new THREE.MeshStandardMaterial({color,metalness:.12,
      roughness:night?.67:.79,emissive:night?0x172c3c:0x000000,
      emissiveIntensity:night?.20:0});
    materials.push(material);return material;
  };
  function clear() {
    while(group.children.length){
      const child=group.children[0];group.remove(child);
      if(child.geometry)child.geometry.dispose();
    }
    for(const m of materials.splice(0))m.dispose();
    for(const item of disposables.splice(0))item.dispose?.();
  }
  function build(features) {
    if(disposed)return;
    clear();
    const state=climate(new Date(),weather||{});
    const rng=seedRandom(7723);
    const mats=[0,1,2,3].map(i=>materialsFor(state.night,state.cloud,i));
    // Weather-responsive sky behind the skyline, not a global room background
    // replacement. This is deliberately outside the existing room geometry.
    const skyGeometry=new THREE.PlaneGeometry(270,150);
    const skyMaterial=new THREE.ShaderMaterial({
      depthWrite:false,fog:false,
      uniforms:{
        top:{value:new THREE.Color(state.night?0x0b1730:
          state.cloud>.7?0x768da3:0x609fc9)},
        horizon:{value:new THREE.Color(state.night?0x344056:
          state.cloud>.7?0xafb9bf:0xc6ddeb)},
        haze:{value:Math.min(.85,state.cloud*.45+(state.rain>0?.24:0))}
      },
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv;uniform vec3 top;uniform vec3 horizon;uniform float haze;void main(){float h=clamp(vUv.y,0.0,1.0);vec3 col=mix(horizon,top,smoothstep(0.0,0.95,h));col=mix(col,vec3(0.66,0.71,0.76),haze*(1.0-h));gl_FragColor=vec4(col,1.0);}'
    });
    const sky=new THREE.Mesh(skyGeometry,skyMaterial);
    sky.position.set(0,40,-35);
    sky.name='TF_NYC_SKY_BACKGROUND_V1';
    group.add(sky);
    materials.push(skyMaterial);
    let count=0,windows=0;
    const glassGeo=new THREE.PlaneGeometry(.40,.54);
    const glassMat=new THREE.MeshBasicMaterial({color:state.night?0xffdda1:0x9fcee6,
      transparent:true,opacity:state.night?.62:.32,depthWrite:false,
      side:THREE.DoubleSide});
    // Reused window geometry, one batched mesh per contiguous facade group.
    const windowMatrices=[];
    const transform=new THREE.Object3D();
    for(const item of features) {
      const profile=meshProfile(item);
      const pts=profile.points;
      if(pts.length<4)continue;
      const shape=new THREE.Shape();
      // Rotating the extrusion into world Y negates its original Y: flip
      // footprint Y here to preserve north/south geometry orientation.
      shape.moveTo(pts[0][0],-pts[0][1]);
      for(const [x,z] of pts.slice(1))shape.lineTo(x,-z);
      const geometry=new THREE.ExtrudeGeometry(shape,{
        depth:profile.height,bevelEnabled:false,curveSegments:1,steps:1
      });
      // Local extrude XY maps to world XZ, depth to world Y.
      geometry.rotateX(-Math.PI/2);
      const mesh=new THREE.Mesh(geometry,mats[Math.floor(rng()*4)]);
      mesh.receiveShadow=false;mesh.castShadow=false;
      mesh.name='NYC footprint '+item.id;
      group.add(mesh);count++;
      if(count>52)continue;
      const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
      const minX=Math.min(...xs),maxX=Math.max(...xs);
      const minZ=Math.min(...zs),maxZ=Math.max(...zs);
      const spans=[{a:minX,b:maxX,d:maxZ+.035,axis:'z'},
        {a:minX,b:maxX,d:minZ-.035,axis:'z'},
        {a:minZ,b:maxZ,d:maxX+.035,axis:'x'},
        {a:minZ,b:maxZ,d:minX-.035,axis:'x'}];
      for(const side of spans) {
        const length=side.b-side.a;
        const columns=Math.min(9,Math.floor(length/.72));
        const floors=Math.min(30,Math.floor(profile.height/.88));
        if(columns<1||floors<1)continue;
        for(let f=0;f<floors;f++)for(let c=0;c<columns;c++) {
          if(windowMatrices.length>=3000)break;
          if(rng()<.40)continue;
          const along=side.a+(c+.5)*length/columns;
          const h=.45+(f+.5)*profile.height/floors;
          const x=side.axis==='z'?along:side.d;
          const z=side.axis==='z'?side.d:along;
          transform.position.set(x,h,z);
          transform.rotation.set(0,side.axis==='z'?0:Math.PI/2,0);
          transform.updateMatrix();
          windowMatrices.push(transform.matrix.clone());
        }
      }
    }
    if(windowMatrices.length) {
      const instanced=new THREE.InstancedMesh(glassGeo,glassMat,windowMatrices.length);
      for(let i=0;i<windowMatrices.length;i++)instanced.setMatrixAt(i,windowMatrices[i]);
      instanced.instanceMatrix.needsUpdate=true;instanced.frustumCulled=false;
      group.add(instanced);windows=windowMatrices.length;
    } else {glassGeo.dispose();glassMat.dispose();}
    // Distance layers are baked into geometry footprint colors; no room-wide fog override.
    buildings=count;lastGeometry=features;
    group.visible=enabled;
    updateStatus();
    return {buildings,windows};
  }
  function updateStatus() {
    boundedText(status,'Midtown Manhattan',
      dataMode+' · '+buildings+' buildings · weather '+lastWeather);
  }
  async function loadGeometry(){
    if(!fetchData){dataMode='SIMULATED (offline)';build(fallback);return}
    const url=new URL(NYC_URL);
    url.searchParams.set('$where','within_box(the_geom, 40.7583, -73.9914, 40.7492, -73.9768)');
    url.searchParams.set('$limit','120');
    url.searchParams.set('$order','height_roof DESC');
    try {
      const json=await fetchJson(url.href,11000);
      if(disposed)return;
      const parsed=footprintFeatures(json.features);
      if(parsed.length<12)throw Error('Insufficient city footprints');
      dataMode='NYC OPEN DATA';
      build(parsed);
    } catch(error) {
      if(disposed)return;
      dataMode='SIMULATED (NYC data unavailable)';
      build(fallback);
    }
  }
  async function loadWeather() {
    if(disposed)return;
    try{
      const url=new URL(METEO_URL);
      url.searchParams.set('latitude',NYC_ORIGIN.lat);
      url.searchParams.set('longitude',NYC_ORIGIN.lon);
      url.searchParams.set('current','is_day,cloud_cover,precipitation,weather_code,wind_speed_10m');
      url.searchParams.set('hourly','visibility');
      url.searchParams.set('forecast_days','1');
      url.searchParams.set('timezone','America/New_York');
      const report=await fetchJson(url.href,9000);
      if(disposed)return;
      if(!report.current||!Number.isFinite(Number(report.current.cloud_cover)))
        throw Error('Invalid weather response');
      weather={...report.current,visibility:report.hourly?.visibility?.[0]};
      lastWeather='OPEN-METEO';
      if(lastGeometry)build(lastGeometry);
    }catch{
      if(disposed)return;
      lastWeather=weather?'CACHED':'LOCAL TIME ONLY';
      updateStatus();
    }
  }
  const setEnabled=next=>{
    enabled=Boolean(next);group.visible=enabled;
    toggle.textContent=enabled?'NYC: ON':'NYC: OFF';
    toggle.setAttribute('aria-pressed',String(enabled));
    return enabled;
  };
  toggle.onclick=()=>setEnabled(!enabled);
  setEnabled(enabled);
  void loadGeometry();
  void loadWeather();
  weatherTimer=setInterval(()=>void loadWeather(),10*60*1000);
  const api=Object.freeze({
    setEnabled,get enabled(){return enabled;},
    get diagnostics(){return {dataMode,buildings,lastWeather,sceneAttached:group.parent===scene,
      cameraFar:camera.far,position:{x:group.position.x,z:group.position.z}};},
    refresh:async()=>{await Promise.all([loadGeometry(),loadWeather()]);return api.diagnostics},
    dispose(){
      if(disposed)return;
      disposed=true;clearInterval(weatherTimer);
      setEnabled(false);scene.remove(group);clear();hud.remove();
      delete globalThis.tfNYCAtmosphere;
    }
  });
  globalThis.tfNYCAtmosphere=api;
  return api;
}
