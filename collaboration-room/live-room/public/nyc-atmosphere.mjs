/*
 * TowerFlow NYC Atmosphere V1 — additive and reversible.
 * Data: NYC Open Data BUILDING (5zhs-2jue), Open-Meteo current weather.
 * Does NOT change existing workstations, navigation, audio, auth or existing
 * city assets. Actual visibility depends on the host's window geometry.
 */
export const NYC_ORIGIN=Object.freeze({lat:40.7536,lon:-73.9832});
const NYC_URL='https://data.cityofnewyork.us/resource/5zhs-2jue.geojson';
const METEO_URL='https://api.open-meteo.com/v1/forecast';
const ARCGIS_URL='https://services2.arcgis.com/IsDCghZ73NgoYoz5/ArcGIS/rest/services/NYC_Building_Footprint/FeatureServer/0/query';
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
    const raw=Number(item.properties?.height_roof ?? item.properties?.HEIGHTROOF ?? item.properties?.HeightRoof);
    // NYC roof-height field is reported in feet. Reject extreme or absent heights.
    const feet=Number.isFinite(raw)&&raw>12&&raw<2500?raw:55;
    const id=String(item.properties?.bin||item.properties?.BIN||item.properties?.base_bbl||out.length);
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
// Never position mechanical roofs over an empty parcel corner.
export function pointInFootprint(x,z,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,zi]=points[i],[xj,zj]=points[j];
    if(((zi>z)!==(zj>z)) &&
      x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}
export function interiorRoofPoint(points) {
  if(points.length<3)return null;
  const unique=points.length>3&&points[0][0]===points.at(-1)[0]&&
    points[0][1]===points.at(-1)[1]?points.slice(0,-1):points;
  const mid=[unique.reduce((n,p)=>n+p[0],0)/unique.length,
    unique.reduce((n,p)=>n+p[1],0)/unique.length];
  if(pointInFootprint(mid[0],mid[1],points))return mid;
  // For concave footprints, only retain an interior centroid of a local
  // triangle; otherwise omit the rooftop ornament instead of floating it.
  for(let i=1;i<unique.length-1;i++){
    const p=[(unique[0][0]+unique[i][0]+unique[i+1][0])/3,
      (unique[0][1]+unique[i][1]+unique[i+1][1])/3];
    if(pointInFootprint(p[0],p[1],points))return p;
  }
  return null;
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
  let dataMode='loading',buildings=0,lastWeather='offline',lastGeometry=null,lastGeometryError=null;
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

  function clear() {
    // Every weather refresh rebuilds the environment. Dispose nested ground,
    // window and rooftop geometry exactly once to avoid leaking GPU memory.
    const geometry=new Set();
    group.traverse(obj=>{if(obj.geometry)geometry.add(obj.geometry);});
    while(group.children.length)group.remove(group.children[0]);
    for(const g of geometry)g.dispose();
    for(const m of materials.splice(0))m.dispose();
    for(const item of disposables.splice(0))item.dispose?.();
  }
  function build(features) {
    if(disposed)return;
    clear();
    const state=climate(new Date(),weather||{});
    const rng=seedRandom(7723);
    // V2: no opaque rectangle or independent sky backdrop. The original
    // TowerFlow sky and horizon stay visible. Atmospheric depth comes from
    // camera-distance façade tones and low-opacity geometry, not a sky card.
    // V3 PHOTOGRAPH TRANSCRIPTION: Manhattan buildings have continuous
    // street and ground contact. A zero-elevation base prevents the skyline
    // from reading as a cluster of floating rectangular solids.
    const terrain=new THREE.Group();terrain.name='TF_NYC_GROUNDED_STREETS_V3';
    const groundSize=135;
    const groundGeo=new THREE.PlaneGeometry(groundSize,groundSize);
    const groundMat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,
      uniforms:{ground:{value:new THREE.Color(state.night?0x26323b:0x656b6b)}},
      vertexShader:'varying vec2 uvTerrain; void main(){uvTerrain=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 uvTerrain;uniform vec3 ground;void main(){vec2 p=abs(uvTerrain-.5)*2.0;float a=1.0-smoothstep(.74,.99,max(p.x,p.y));gl_FragColor=vec4(ground,a*.95);}'
    });
    const ground=new THREE.Mesh(groundGeo,groundMat);
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.22;
    ground.name='NYC street-level ground (not aerial facade)';
    terrain.add(ground);
    materials.push(groundMat);
    const roadMat=new THREE.MeshBasicMaterial({color:state.night?0x22262e:0x434d51,transparent:true,opacity:.90,depthWrite:false});
    const laneMat=new THREE.MeshBasicMaterial({color:state.night?0xbba777:0xc9bd8d,transparent:true,opacity:.45,depthWrite:false});
    const parkMat=new THREE.MeshStandardMaterial({color:state.night?0x273d31:0x54785a,roughness:.97,metalness:0});
    const treeMat=new THREE.MeshStandardMaterial({color:state.night?0x213d2f:0x355c38,roughness:1});
    materials.push(roadMat,laneMat,parkMat,treeMat);
    function flat(w,d,x,z,material,y=-.19){
      const g=new THREE.PlaneGeometry(w,d);
      const mesh=new THREE.Mesh(g,material);
      mesh.rotation.x=-Math.PI/2;
      mesh.position.set(x,y,z);terrain.add(mesh);
      return mesh;
    }
    // The street layout is an approximate photo-informed urban floor.
    // No precision street-map claim until NYC road centerlines are imported.
    for(let k=-4;k<=4;k++){
      const c=k*12;
      flat(1.55,117,c,0,roadMat);
      flat(116,1.48,0,c,roadMat);
      flat(.04,116,c,0,laneMat,-.178);
    }
    // Bryant Park vegetation is a stylized visual anchor west of Fifth Ave,
    // not a surveyed park-boundary mesh.
    flat(14,8.5,-12,-2.5,parkMat,-.16);
    const canopy=new THREE.IcosahedronGeometry(.75,1);
    for(let ix=0;ix<7;ix++)for(let iz=0;iz<3;iz++){
      const tree=new THREE.Mesh(canopy,treeMat);
      tree.scale.set(1,.68,1);
      tree.position.set(-18+ix*1.83,.44,-5.8+iz*3.22);
      terrain.add(tree);
    }
    terrain.renderOrder=-2;
    group.add(terrain);
    // Preserve original sky and all existing world objects; the new ground
    // is limited to the geographically separate NYC scene group.
    let count=0,windows=0;
    const referenceMode='PHOTO-TRANSCRIBED V3';
    const roofMaterial=new THREE.MeshStandardMaterial({
      color:state.night?0x4e5861:0x8b979b,roughness:.83,metalness:.13,
      emissive:state.night?0x20252d:0x172532,emissiveIntensity:.10
    });
    materials.push(roofMaterial);
    // Photo transcription: glass curtain wall, limestone/art deco,
    // charcoal masonry, and pale concrete. Never all the same blue.
    const nearTone=state.night?[0x263c48,0x51483f,0x373b43,0x434b50]:
      [0x648d99,0xb9aa91,0x555d65,0xa2a6a1];
    const farTone=state.night?0x637487:0xb0c4ce;
    const facadeBands=[0,.27,.54].map(mix=>
      nearTone.map(hex=>{
        const color=new THREE.Color(hex).lerp(new THREE.Color(farTone),mix);
        const material=new THREE.MeshStandardMaterial({
          color,metalness:.10,roughness:.78,
          emissive:state.night?0x192533:0x111c28,
          emissiveIntensity:state.night?.18:.13
        });
        materials.push(material);return material;
      }));
    // Three distance bands preserve material batching and different building
    // depth colors. A single shared material recolored per building would not.
    function facadeMaterial(index,depth){
      const band=depth<19?0:depth<48?1:2;
      return facadeBands[band][index%4];
    }
    const glassGeo=new THREE.PlaneGeometry(.38,.52);
    const frameGeo=new THREE.PlaneGeometry(.49,.65);
    const glassMat=new THREE.MeshBasicMaterial({color:0xffffff,
      side:THREE.DoubleSide,depthWrite:false,transparent:true,
      opacity:state.night?.87:.78});
    const frameMat=new THREE.MeshBasicMaterial({
      color:state.night?0x1c2b38:0x344d5d,side:THREE.DoubleSide,
      depthWrite:false,transparent:true,opacity:.95
    });
    // Instancing is retained for performance; per-instance colors stop
    // the repetitive copy-paste tower appearance.
    const glassMatrices=[],frameMatrices=[],paneColors=[];
    const transform=new THREE.Object3D();
    const palette=state.night?
      [0x1a2b37,0x2b3e4c,0xffd89b,0xe1ad74,0x7192a6,0x1c2630]:
      [0x284758,0x457c95,0x8dbcd1,0xb4c9ce,0x345f73,0x96b5c4];
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
      const category=Math.floor(rng()*4);
      const centerZ=pts.reduce((n,p)=>n+p[1],0)/pts.length;
      const mesh=new THREE.Mesh(geometry,facadeMaterial(category,Math.abs(centerZ)));
      mesh.receiveShadow=false;mesh.castShadow=false;
      mesh.name='NYC footprint '+item.id;
      group.add(mesh);count++;
      // Rooftop crown / mechanical boxes. NYC reference photographs show
      // stepped roofs, parapets, and HVAC instead of identical flat caps.
      if(count<=76){
        const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs);
        const minZ=Math.min(...zs),maxZ=Math.max(...zs);
        const roofPoint=interiorRoofPoint(pts);
        const cx=roofPoint?.[0],cz=roofPoint?.[1];
        const width=maxX-minX,depth=maxZ-minZ;
        if(roofPoint&&width>.7 && depth>.7 && profile.height>5.4){
          const crown=new THREE.Mesh(
            new THREE.BoxGeometry(Math.min(2.8,width*.7),.36+ rng()*.32,Math.min(2.6,depth*.67)),
            roofMaterial);
          crown.position.set(cx,profile.height+.21,cz);
          group.add(crown);
          if(count%8===0){
            const spire=new THREE.Mesh(new THREE.CylinderGeometry(.025,.08,2.4,5),roofMaterial);
            spire.position.set(cx,profile.height+1.7,cz);
            group.add(spire);
          }
        }
      }
      if(count>52)continue;
      // Photo-informed façades: place windows on the actual footprint edge,
      // never on an axis-aligned bounding box of a rotated Manhattan building.
      for(let edge=0;edge<pts.length-1 && glassMatrices.length<2600;edge++){
        const p=pts[edge],q=pts[edge+1];
        const dx=q[0]-p[0],dz=q[1]-p[1];
        const length=Math.hypot(dx,dz);
        if(length<.85)continue;
        const nx=dz/length,nz=-dx/length;
        const columns=Math.min(10,Math.max(1,Math.floor(length/.78)));
        const floors=Math.min(30,Math.max(1,Math.floor(profile.height/.94)));
        for(let f=0;f<floors && windowMatrices.length<3000;f++){
          for(let c=0;c<columns && windowMatrices.length<3000;c++){
            if(rng()<.34)continue;
            const fraction=(c+.5)/columns;
            transform.position.set(
              p[0]+dx*fraction+nx*.058,
              .38+(f+.5)*(profile.height-.38)/floors,
              p[1]+dz*fraction+nz*.058
            );
            transform.rotation.set(0,Math.atan2(nx,nz),0);
            transform.updateMatrix();
            frameMatrices.push(transform.matrix.clone());
            // Glass 0.012 units outside the frame to prevent z-fighting.
            transform.position.x+=nx*.014;
            transform.position.z+=nz*.014;
            transform.updateMatrix();
            glassMatrices.push(transform.matrix.clone());
            paneColors.push(palette[Math.floor(rng()*palette.length)]);
          }
        }
      }
    }
    if(glassMatrices.length) {
      const pane=new THREE.InstancedMesh(glassGeo,glassMat,glassMatrices.length);
      const frame=new THREE.InstancedMesh(frameGeo,frameMat,frameMatrices.length);
      for(let i=0;i<glassMatrices.length;i++){
        pane.setMatrixAt(i,glassMatrices[i]);
        frame.setMatrixAt(i,frameMatrices[i]);
        pane.setColorAt(i,new THREE.Color(paneColors[i]));
      }
      pane.instanceMatrix.needsUpdate=true;frame.instanceMatrix.needsUpdate=true;
      if(pane.instanceColor)pane.instanceColor.needsUpdate=true;
      pane.frustumCulled=false;frame.frustumCulled=false;
      group.add(frame,pane);windows=glassMatrices.length;
      materials.push(glassMat,frameMat);
    } else {
      glassGeo.dispose();glassMat.dispose();
      frameGeo.dispose();frameMat.dispose();
    }
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
    if(!fetchData){dataMode='SIMULATED (offline)';build(fallback);return;}
    const socrata=new URL(NYC_URL);
    socrata.searchParams.set('$where','within_box(the_geom, 40.7583, -73.9914, 40.7492, -73.9768)');
    socrata.searchParams.set('$limit','150');
    socrata.searchParams.set('$order','height_roof DESC');
    const arcgis=new URL(ARCGIS_URL);
    arcgis.searchParams.set('f','geojson');
    arcgis.searchParams.set('geometry','-73.9914,40.7492,-73.9768,40.7583');
    arcgis.searchParams.set('geometryType','esriGeometryEnvelope');
    arcgis.searchParams.set('inSR','4326');
    arcgis.searchParams.set('outSR','4326');
    arcgis.searchParams.set('spatialRel','esriSpatialRelIntersects');
    arcgis.searchParams.set('outFields','BIN,HEIGHTROOF');
    arcgis.searchParams.set('resultRecordCount','150');
    const providers=[['NYC OPEN DATA',socrata],['NYC ARCGIS',arcgis]];
    const reasons=[];
    for(const [provider,url] of providers){
      try {
        const json=await fetchJson(url.href,8500);
        if(disposed)return;
        const parsed=footprintFeatures(json?.features);
        if(parsed.length<12)throw Error('Valid footprints: '+parsed.length);
        dataMode=provider;
        lastGeometryError=null;
        build(parsed);
        return;
      } catch(error) {
        if(disposed)return;
        reasons.push(provider+': '+String(error?.message||error).slice(0,90));
      }
    }
    dataMode='SIMULATED (NYC data unavailable)';
    lastGeometryError=reasons.join(' | ');
    console.warn('NYC footprint services unavailable; simulated city retained:',lastGeometryError);
    build(fallback);
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
  // Read-only inventory of legacy skyline owners. The private ~947-KB
  // live room may have independently generated blue cylindrical towers.
  // Never hide unrelated scene meshes based only on a visual guess.
  function inspectLegacyScene() {
    const nodes=[];
    scene.traverse(obj=>{
      if(nodes.length>=60 || !obj.name || obj===group)return;
      if(obj===group || group.getObjectByName(obj.name)===obj)return;
      if(!/city|sky|tower|building|exterior|highrise|facade|window/i.test(obj.name))return;
      const pos=obj.getWorldPosition(new THREE.Vector3());
      nodes.push({name:obj.name.slice(0,90),type:obj.type,
        x:+pos.x.toFixed(2),y:+pos.y.toFixed(2),z:+pos.z.toFixed(2)});
    });
    return {count:nodes.length,nodes,manualReviewRequired:true};
  }
  const api=Object.freeze({
    inspectLegacyScene,
    setEnabled,get enabled(){return enabled;},
    get diagnostics(){return {dataMode,buildings,lastWeather,
      grounding:'BUILDINGS at y=0; STREET GROUND at y=-0.22',
      referenceMode:'PHOTO-TRANSCRIBED V3',
      sceneAttached:group.parent===scene,
      cameraFar:camera.far,lastGeometryError,
      hasOpaqueSkyCard:!!group.getObjectByName('TF_NYC_SKY_BACKGROUND_V1'),
      position:{x:group.position.x,z:group.position.z}};},
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
