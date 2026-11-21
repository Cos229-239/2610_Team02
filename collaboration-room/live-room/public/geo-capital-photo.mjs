// Real-city reference photographs shown in the existing TowerFlow window.
// Wikimedia Commons metadata is checked per image. A photograph is NOT a 3D scan.
const BASE='https://commons.wikimedia.org/w/api.php';
const curated={
 'new-york-city':{
  day:'File:Midtown Manhattan Skyline 2024.jpg',
  night:'File:New York skyline at night.jpg'},
 'new-york':{
  day:'File:AlbanyNYPano.jpg',
  night:'File:Nighttime Albany, New York skyline in the Port of Albany.jpg'}
};
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
 const titles=curated[destination.id],night=mode==='night';
 let pages=[];
 if(titles){
  const title=night?titles.night:titles.day;
  const data=await json(params({prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1400',titles:title}),request);
  pages=data?.query?.pages||[];
 } else {
  const city=destination.capital==='Federal District'?'Washington D.C.':destination.capital;
  const query=city+' skyline'+(night?' night':'');
  const data=await json(params({generator:'search',gsrnamespace:'6',gsrsearch:query,gsrlimit:'8',
   prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1400'}),request);
  pages=data?.query?.pages||[];
  const cityWords=city.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  pages=pages.filter(p=>{
   const title=String(p.title||'').toLowerCase();
   return cityWords.some(w=>title.includes(w))&&/skyline|panorama|downtown|cityscape|view/.test(title)&&
    !/map|flag|logo|drawing|diagram|historic|painting|illustration/.test(title);
  });
 }
 for(const page of pages){
  const photo=photograph(page);
  if(photo){cache.set(key,photo);return photo;}
 }
 throw Error('No verified-license city photograph found for '+destination.capital);
}
export function buildPhotoEnvironment(THREE,photo,mode){
 const group=new THREE.Group();group.name='TF_CAPITAL_PHOTOGRAPHIC_WINDOW';
 let texture=null,material=null,geometry=null;
 let current=mode;
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
  // Camera can see the image through left room glazing at x=-21.
  surface.position.set(-31,9,0);surface.rotation.y=Math.PI/2;
  surface.renderOrder=-1;
  surface.raycast=()=>{};
  group.add(surface);
  setTime(current);
  return {group,setTime,setWeather(){},dispose(){
   group.parent?.remove(group);geometry?.dispose();material?.dispose();texture?.dispose();
  },report:{photographic:true,source:photo.source,license:photo.license}};
 }
 function setTime(next){
  current=next;
  if(!material)return;
  // Cosmetic tint only. Never claim the real photograph was taken at this time.
  material.color.setHex(next==='night'?0x9caccb:next==='morning'?0xffdab3:0xffffff);
 }
 return initialize();
}
