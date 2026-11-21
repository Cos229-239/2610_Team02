// Real-city reference photographs shown in the existing TowerFlow window.
// Wikimedia Commons metadata is checked per image. A photograph is NOT a 3D scan.
const BASE='https://commons.wikimedia.org/w/api.php';
const cache=new Map();
const allowable=/^(?:CC0|CC BY(?:-SA)?(?: [1-9](?:\.\d)?)?|Public domain)/i;
const htmlText=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
function params(data){return BASE+'?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',...data});}
async function json(url,request){
 const response=await request(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Wikimedia Commons HTTP '+response.status);
 return response.json();
}
function photograph(page){
 const i=page?.imageinfo?.[0],meta=i?.extmetadata||{},license=htmlText(meta.LicenseShortName?.value);
 const image=i?.thumburl,source=page?.canonicalurl||('https://commons.wikimedia.org/wiki/'+encodeURIComponent(page.title||''));
 if(!image||!allowable.test(license)||!/^https:\/\/upload\.wikimedia\.org\//.test(image))return null;
 return {url:image,source,license,author:htmlText(meta.Artist?.value).slice(0,140)||'Wikimedia Commons contributor',title:page.title||'',kind:'photographic reference'};
}
export async function findCapitalPhoto(destination,mode='day',request=fetch){
 const key=destination.id+':'+mode;
 if(cache.has(key))return cache.get(key);
 const night=mode==='night';
 const city=destination.id==='new-york-city'?'New York City':destination.capital==='Federal District'?'Washington D.C.':destination.capital;
 const district=destination.kind==='district';
 const query=district?'Lincoln Memorial Reflecting Pool Washington D.C.':city+' skyline'+(night?' night':'');
 const data=await json(params({generator:'search',gsrnamespace:'6',gsrsearch:query,gsrlimit:'12',
   prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1400'}),request);
 let pages=data?.query?.pages||[];
 const cityWords=city.toLowerCase().split(/\s+/).filter(w=>w.length>3);
 pages=pages.filter(p=>{
  const title=String(p.title||'').toLowerCase();
  return (district?/lincoln memorial|reflecting pool|washington monument/.test(title):
    cityWords.some(w=>title.includes(w))&&/skyline|panorama|downtown|cityscape|view/.test(title))&&
   !/map|flag|logo|drawing|diagram|historic|painting|illustration/.test(title);
 });

 for(const page of pages){
  const photo=photograph(page);
  if(photo){cache.set(key,photo);return photo;}
 }
 throw Error('No verified-license city photograph found for '+destination.capital);
}
// Procedural weather rendering independent of photographs / network services.
export function environmentPalette(time='day',weather='sun'){
 const wet=/rain|storm|shower|drizzle/i.test(weather);
 const snow=/snow|flurries|sleet/i.test(weather);
 const cloud=wet||snow||/cloud|overcast|fog/i.test(weather);
 const sunset=time==='sunset';
 const night=time==='night';
 return Object.freeze({
  top:night?'#09142f':sunset?'#292447':cloud?'#47596c':'#286bb3',
  horizon:night?'#253653':sunset?'#f5a568':wet?'#626f85':cloud?'#a3a9b2':'#c6e5ff',
  haze:wet?.42:cloud?.31:.08, rain:wet, snow, cloud, night, sunset,
  brightness:night?.31:sunset?.77:time==='morning'?.86:1
 });
}
export function buildPhotoEnvironment(THREE,photo,mode){
 const group=new THREE.Group();group.name='TF_CAPITAL_PHOTOGRAPHIC_WINDOW';
 let texture=null,material=null,geometry=null,overlayTexture=null,overlayMaterial=null,overlayGeometry=null;
 let current=mode,condition='sun';
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas sky rendering unavailable');
 overlayTexture=new THREE.CanvasTexture(canvas);
 overlayTexture.colorSpace=THREE.SRGBColorSpace;
 overlayMaterial=new THREE.MeshBasicMaterial({map:overlayTexture,transparent:true,opacity:1,
  toneMapped:false,depthWrite:false,side:THREE.DoubleSide});
 overlayGeometry=new THREE.PlaneGeometry(62,31);
 const overlay=new THREE.Mesh(overlayGeometry,overlayMaterial);
 overlay.name='TF_CAPITAL_WEATHER_GLASS_OVERLAY';
 overlay.position.set(-30.94,9,0);overlay.rotation.y=Math.PI/2;overlay.renderOrder=5;overlay.raycast=()=>{};
 group.add(overlay);
 function updateCanvas(){
  const p=environmentPalette(current,condition),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(p.sunset){
   const g=ctx.createLinearGradient(0,0,0,h);
   g.addColorStop(0,'rgba(39,20,80,.24)');g.addColorStop(.42,'rgba(241,101,101,.11)');
   g.addColorStop(.76,'rgba(252,168,85,.20)');g.addColorStop(1,'rgba(246,143,78,.29)');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }else if(p.night){ctx.fillStyle='rgba(4,12,38,.42)';ctx.fillRect(0,0,w,h);}
  else if(p.cloud){ctx.fillStyle='rgba(66,77,93,.22)';ctx.fillRect(0,0,w,h);}
  // Soft layered clouds: render into the actual exterior window, not the UI.
  if(p.cloud){
   let seed=82433;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<34;i++){
    const x=random()*w,y=random()*h*.68,r=40+random()*130;
    const g=ctx.createRadialGradient(x,y,5,x,y,r);
    g.addColorStop(0,p.night?'rgba(122,134,167,.20)':'rgba(227,234,241,.27)');
    g.addColorStop(1,'rgba(143,154,177,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*.31,0,0,Math.PI*2);ctx.fill();
   }
  }
  if(p.rain||p.snow){
   let seed=1247;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   ctx.strokeStyle=p.snow?'rgba(245,249,255,.76)':'rgba(208,229,255,.35)';ctx.lineWidth=p.snow?2:1.3;
   for(let i=0;i<210;i++){
    const x=random()*w,y=random()*h,length=p.snow?1:8+random()*19;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(p.snow?0:3),y+length);ctx.stroke();
   }
  }
  overlayTexture.needsUpdate=true;
  if(material)material.color.setHex(p.night?0x62718e:p.sunset?0xffc7aa:p.cloud?0xaebbc5:0xffffff);
 }
 async function initialize(){
  texture=await new Promise((resolve,reject)=>{
   const loader=new THREE.TextureLoader();
   loader.setCrossOrigin('anonymous');
   loader.load(photo.url,resolve,undefined,()=>reject(Error('City photograph texture unavailable')));
  });
  texture.colorSpace=THREE.SRGBColorSpace;
  material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false,depthWrite:false});
  geometry=new THREE.PlaneGeometry(62,31);
  const surface=new THREE.Mesh(geometry,material);
  surface.name='TF_CAPITAL_REAL_CITY_PHOTO';
  surface.position.set(-31,9,0);surface.rotation.y=Math.PI/2;surface.renderOrder=4;surface.raycast=()=>{};
  group.add(surface);
  updateCanvas();
  return {group,setTime(next){current=next;updateCanvas();},
   setWeather(next){condition=next;updateCanvas();},
   dispose(){group.parent?.remove(group);geometry?.dispose();material?.dispose();texture?.dispose();
    overlayGeometry?.dispose();overlayMaterial?.dispose();overlayTexture?.dispose();},
   report:{photographic:true,source:photo.source,license:photo.license,imageURL:photo.url}};
 }
 return initialize();
}

export function buildSkyFallback(THREE,mode='day'){
 const group=new THREE.Group();group.name='TF_CAPITAL_SOURCE_UNAVAILABLE_SKY';
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas sky unavailable');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const geometry=new THREE.PlaneGeometry(66,34);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='TF_CAPITAL_PROCEDURAL_SKY_ONLY';
 mesh.position.set(-90,9,0);mesh.rotation.y=Math.PI/2;mesh.raycast=()=>{};
 group.add(mesh);
 let time=mode,weather='sunny';
 function render(){
  const p=environmentPalette(time,weather),w=canvas.width,h=canvas.height;
  const gradient=ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0,p.top);gradient.addColorStop(1,p.horizon);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  if(p.cloud){
   let seed=919;
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<35;i++){
    const x=random()*w,y=random()*(h*.7),radius=22+random()*70;
    const g=ctx.createRadialGradient(x,y,0,x,y,radius);
    g.addColorStop(0,'rgba(235,238,249,.36)');g.addColorStop(1,'rgba(235,238,249,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,radius,radius*.3,0,0,Math.PI*2);ctx.fill();
   }
  }
  if(p.rain||p.snow){
   ctx.strokeStyle=p.snow?'rgba(248,251,255,.85)':'rgba(219,232,248,.4)';ctx.lineWidth=p.snow?2:1;
   for(let i=0;i<120;i++){
    const x=(i*131)%w,y=(i*97)%h;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(p.snow?0:3),y+(p.snow?2:13));ctx.stroke();
   }
  }
  texture.needsUpdate=true;
 }
 render();
 return {group,setTime(next){time=next;render();},setWeather(next){weather=next;render();},
  dispose(){group.parent?.remove(group);geometry.dispose();material.dispose();texture.dispose();},
  report:{skyOnly:true,photographic:false,source:null,warning:'No verified city image or OSM tile; original skyline remains visible'}};
}
