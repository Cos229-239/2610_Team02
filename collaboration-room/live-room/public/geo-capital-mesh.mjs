// TowerFlow capital-city geographic tiles: source-grounded OSM footprint renderer.
// No invented downtown, no external textures, no secret keys, no mass requests.
const OSM='https://overpass-api.de/api/interpreter';
const memory=new Map();
const TILE_TTL=24*60*60*1000;
const LIMIT=145;
const RADIUS=330;
export function project([lon,lat],center){
 const latRad=center.latitude*Math.PI/180;
 return [(lon-center.longitude)*111320*Math.cos(latRad)/4,
   -(lat-center.latitude)*111320/4];
}
export function parseOSMTile(data,center){
 if(!Array.isArray(data?.elements))throw Error('Invalid OSM tile data');
 const items=[],roads=[];
 for(const elem of data.elements){
  if(elem.type!=='way'||!Array.isArray(elem.geometry)||
     elem.geometry.length<2||elem.geometry.length>250)continue;
  const poly=elem.geometry.map(p=>[p.lon,p.lat]);
  if(poly.some(p=>!p.every(Number.isFinite)))continue;
  const coords=poly.map(p=>project(p,center));
  if(coords.some(([x,z])=>Math.abs(x)>105||Math.abs(z)>105))continue;
  if(elem.tags?.building && coords.length>=4){
   const explicit=Number(String(elem.tags.height||'').replace(/m$/i,''));
   const levels=Number(elem.tags['building:levels']);
   const meters=Number.isFinite(explicit)&&explicit>2&&explicit<700?explicit:
      Number.isFinite(levels)&&levels>=1&&levels<=100?levels*3.15:12;
   const measured=Number.isFinite(explicit)&&explicit>2&&explicit<700;
   items.push({id:elem.id,coords,height:Math.min(65,meters/4),
    estimation:measured?'OSM height tag':Number.isFinite(levels)&&levels>0?
      'OSM levels estimate':'estimated 12m',
    material:elem.tags['building:material']||null});
  }else if(elem.tags?.highway&&coords.length>=2){
   roads.push({id:elem.id,coords,type:elem.tags.highway});
  }
  if(items.length>=LIMIT&&roads.length>=65)break;
 }
 return {buildings:items.slice(0,LIMIT),roads:roads.slice(0,65),
   provenance:'OpenStreetMap contributor geometry via Overpass; heights may be estimates'};
}
export async function fetchCapitalTile(capital,{request=fetch,now=Date.now}={}){
 const key=capital.id,existing=memory.get(key);
 if(existing && now()-existing.at<TILE_TTL)return existing.value;
 const lat=capital.latitude,lon=capital.longitude;
 if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Capital coordinates unavailable');
 const query='[out:json][timeout:22];(way["building"](around:'+RADIUS+','+lat+','+lon+
   ');way["highway"](around:'+RADIUS+','+lat+','+lon+'););out geom;';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),27000);
 try {
  const res=await request(OSM,{method:'POST',
   headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
   body:new URLSearchParams({data:query}).toString(),signal:controller.signal});
  if(!res.ok)throw Error('OpenStreetMap service HTTP '+res.status);
  const result=parseOSMTile(await res.json(),capital);
  if(result.buildings.length<2)throw Error('Insufficient verified building footprints');
  memory.set(key,{value:result,at:now()});
  return result;
 }finally{clearTimeout(timer)}
}
export function buildCapitalScene(THREE,tile,mode){
 if(!tile?.buildings?.length)throw Error('No verified footprints to render');
 const group=new THREE.Group();
 group.name='TF_CAPITAL_OSM_CITY';
 const materials=[],geometries=[];
 function mat(color,opts={}){
  const m=new THREE.MeshStandardMaterial({color,roughness:.84,metalness:.04,...opts});
  materials.push(m);return m;
 }
 const stone=mat(0xbcb3a4),glass=mat(0x668796,{metalness:.22,roughness:.37}),
  brick=mat(0x80665d),roadMat=mat(0x505c62),groundMat=mat(0x52785e);
 function mesh(geometry,material){
  geometries.push(geometry);
  const obj=new THREE.Mesh(geometry,material);group.add(obj);return obj;
 }
 const ground=mesh(new THREE.PlaneGeometry(205,205),groundMat);
 ground.rotation.x=-Math.PI/2;ground.position.y=-.13;
 for(const building of tile.buildings){
  const pts=building.coords;
  const shape=new THREE.Shape();
  shape.moveTo(pts[0][0],-pts[0][1]);
  for(const [x,z] of pts.slice(1))shape.lineTo(x,-z);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:building.height,bevelEnabled:false,
    steps:1,curveSegments:1});
  geo.rotateX(-Math.PI/2);
  const surface=/glass|steel|metal/i.test(building.material||'')?glass:
     /brick/i.test(building.material||'')?brick:stone;
  const ob=mesh(geo,surface);ob.name='OSM '+building.id;
 }
 for(const road of tile.roads){
  for(let i=1;i<road.coords.length;i++){
   const [ax,az]=road.coords[i-1],[bx,bz]=road.coords[i];
   const length=Math.hypot(bx-ax,bz-az);
   if(length<.05||length>35)continue;
   const width=/motorway|primary/.test(road.type)?1.3:.62;
   const o=mesh(new THREE.PlaneGeometry(width,length),roadMat);
   o.rotation.set(-Math.PI/2,0,-Math.atan2(bx-ax,bz-az));
   o.position.set((ax+bx)/2,-.08,(az+bz)/2);
  }
 }
 const sunlight=new THREE.DirectionalLight(0xffdfb4,1.4);
 sunlight.position.set(-35,60,18);group.add(sunlight);
 const ambient=new THREE.HemisphereLight(0xb7c9d9,0x35453d,.72);group.add(ambient);
 let time=mode,condition='sun';
 function applyLighting(){
  const cloudy=/cloud|overcast|rain|storm/i.test(condition);
  sunlight.intensity=(time==='night'?.18:time==='sunset'?.68:time==='morning'?.95:1.6)*(cloudy?.6:1);
  sunlight.color.setHex(time==='morning'?0xffb779:time==='sunset'?0xff946b:time==='night'?0x8ca3c8:0xffe9cb);
  ambient.intensity=time==='night'?.25:time==='sunset'?.45:time==='morning'?.56:.83;
  groundMat.color.setHex(/rain|storm/i.test(condition)?0x3d5d4e:0x52785e);
  roadMat.color.setHex(/rain|storm/i.test(condition)?0x2b414b:0x505c62);
 }
 function setTime(next){time=next;applyLighting();}
 function setWeather(next){condition=next;applyLighting();}
 applyLighting();
 return {group,setTime,setWeather,dispose(){
  for(const g of new Set(geometries))g.dispose();
  for(const m of new Set(materials))m.dispose();
 }};
}
