import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {requireRights,parsePinterestUrl,validateCamera,photoContact,groundIntersection,validateDimensions,buildManifest} from './calibration.mjs';

const $=id=>document.getElementById(id);
const mount=$('canvasMount'),frame=$('photoFrame'),photoImg=$('photoImg'),dot=$('photoDot');
const info={photo:null,hash:null,contact:null,placement:null,imageUrl:null,imported:null,hdrUrl:null,additionalViews:[]};
const maps={map:null,normalMap:null,roughnessMap:null};
const materials=new Set();
const scene=new THREE.Scene();
scene.background=new THREE.Color('#0b1216');
scene.fog=new THREE.Fog('#0b1216',13,43);
const camera=new THREE.PerspectiveCamera(55,1,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.setSize(Math.max(1,mount.clientWidth),Math.max(1,mount.clientHeight),false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.07;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
mount.appendChild(renderer.domElement);
for(const id of ['stats']) $(id).style.zIndex='3';
document.querySelector('.float').style.zIndex='3';
const pmrem=new THREE.PMREMGenerator(renderer);
const fallbackRoom=new RoomEnvironment(renderer);
let environment=pmrem.fromScene(fallbackRoom).texture;
fallbackRoom.dispose();
scene.environment=environment;
scene.add(new THREE.HemisphereLight(0xbad8e1,0x2c2927,1.15));
const key=new THREE.DirectionalLight(0xffebd6,2.9);
key.position.set(-3.5,7.5,5.5);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.near=.5;key.shadow.camera.far=26;
key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;
key.shadow.normalBias=.018;scene.add(key);
const bounced=new THREE.PointLight(0x77d8d8,28,15,2);bounced.position.set(4.2,3.0,-1);scene.add(bounced);
const warm=new THREE.PointLight(0xffc18c,38,16,2);warm.position.set(-4,3,1);scene.add(warm);

const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const wallMat=mat(0x404b4c,.85),floorMat=mat(0x54504a,.8),trimMat=mat(0x202a30,.49,.37),metalMat=mat(0x6e7977,.29,.82);
const brassMat=mat(0x9a754b,.27,.73),woodMat=mat(0x4c372a,.54,.05),planterMat=mat(0x343c3f,.48,.3);
function mesh(geo,material,parent=scene){const o=new THREE.Mesh(geo,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function box(w,h,d,material,x,y,z,parent=scene){const o=mesh(new THREE.BoxGeometry(w,h,d),material,parent);o.position.set(x,y,z);return o}
function plane(w,h,material,x,y,z,parent=scene,rotY=0){const o=mesh(new THREE.PlaneGeometry(w,h),material,parent);o.position.set(x,y,z);o.rotation.y=rotY;o.castShadow=false;return o}
const ground=mesh(new THREE.PlaneGeometry(18,18),floorMat);
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.castShadow=false;
plane(18,5,wallMat,0,2.5,-7.5);
plane(15,5,wallMat,-9,2.5,0,scene,Math.PI/2);
for(let z=-6.8;z<7;z+=2.3){box(.025,5,.032,trimMat,-8.96,2.5,z);box(.018,.025,2.1,trimMat,-8.94,.12,z+.9)}
box(18,.13,.16,trimMat,0,.05,-7.4);
for(let x=-8;x<=8;x+=2.3){box(.036,4.5,.08,trimMat,x,2.35,-7.39)}
for(let n=0;n<13;n++){const z=-7.0+n*1.07;box(18,.004,.004,woodMat,0,.005,z).castShadow=false}
const plinth=mesh(new THREE.CylinderGeometry(.2,.26,.065,32),metalMat);plinth.position.set(6.4,.035,-5.3);
// Floor lamp with physical shade, not a flat emissive disc.
const lampBase=mesh(new THREE.CylinderGeometry(.27,.31,.06,32),metalMat);
lampBase.position.set(-4.6,.05,-3.3);
const lampPole=mesh(new THREE.CylinderGeometry(.024,.024,1.75,16),brassMat);lampPole.position.set(-4.6,.94,-3.3);
const shade=mesh(new THREE.CylinderGeometry(.28,.42,.36,32,1,true),new THREE.MeshStandardMaterial({color:0xe4d7c2,roughness:.8,side:THREE.DoubleSide}));
shade.position.set(-4.6,1.86,-3.3);
const bulb=new THREE.PointLight(0xffd5a3,24,4,2);bulb.position.set(-4.6,1.74,-3.3);scene.add(bulb);
// Coffee table with beveled real thickness and separate legs.
const tableTop=mesh(new RoundedBoxGeometry(1.6,.095,.82,4,.035),woodMat);tableTop.position.set(0,.43,1.1);
for(const x of [-.62,.62]) for(const z of [.8,1.4])box(.06,.36,.06,metalMat,x,.22,z);
// Accent bench behind sofa.
box(2.8,.06,.28,woodMat,0,.86,-5.6);
for(const x of [-1.2,1.2])box(.045,.84,.045,trimMat,x,.43,-5.6);
// Real geometry leaves (low poly until photogrammetry assets supplied).
const plant=new THREE.Group();plant.position.set(5.9,0,-4.7);scene.add(plant);
const pot=mesh(new THREE.CylinderGeometry(.38,.28,.67,20),planterMat,plant);pot.position.y=.36;
const soil=mesh(new THREE.CylinderGeometry(.37,.37,.014,20),mat(0x211b17,1),plant);soil.position.y=.7;
const stemMat=mat(0x536449,.95),leafMat=new THREE.MeshStandardMaterial({color:0x345d47,roughness:.78,side:THREE.DoubleSide});
for(let i=0;i<12;i++){
  const a=i*2.399,top=.9+(i%5)*.28,rad=.25+(i%4)*.1;
  const stem=mesh(new THREE.CylinderGeometry(.012,.019,top-.66,7),stemMat,plant);
  stem.position.set(Math.cos(a)*rad*.5,(top+.66)/2,Math.sin(a)*rad*.5);
  stem.rotation.z=Math.sin(a)*.13;
  const leaf=mesh(new THREE.SphereGeometry(1,9,6),leafMat,plant);
  leaf.scale.set(.12,.42,.055);leaf.position.set(Math.cos(a)*rad,top,Math.sin(a)*rad);
  leaf.rotation.y=-a;leaf.rotation.z=-Math.sin(a)*.45;
}

function fabricMaterial(){
  const m=new THREE.MeshPhysicalMaterial({
    color:0x87918c,roughness:.88,metalness:0,
    sheen:.55,sheenRoughness:.86,sheenColor:new THREE.Color(0xb6c5bd)
  });
  for(const [key,tex] of Object.entries(maps)) if(tex) m[key]=tex;
  materials.add(m);return m;
}
function rounded(parent,w,h,d,x,y,z,material,r=.045){
  const o=mesh(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w*.25,h*.25,d*.25)),material,parent);o.position.set(x,y,z);return o;
}
function seam(parent,points,material,thickness=.007){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),thickness,5,false),material,parent);
}
/** Real multi-part sofa geometry; visual proxy, not recovered from a photo. */
function makeSofa(){
  const g=new THREE.Group();
  const fabric=fabricMaterial();
  const seamMat=mat(0x59615d,.96);
  rounded(g,2.46,.34,.93,0,.37,0,fabric,.11);
  rounded(g,2.42,.61,.23,0,.82,-.37,fabric,.08);
  for(const x of [-1.1,1.1]) {
    rounded(g,.25,.59,.94,x,.62,.015,fabric,.10);
    box(.07,.18,.07,metalMat,x,.12,-.33,g);
    box(.07,.18,.07,metalMat,x,.12,.30,g);
  }
  for(const x of [-.71,0,.71]){
    rounded(g,.71,.19,.76,x,.57,.085,fabric,.055);
    rounded(g,.68,.37,.17,x,.86,-.245,fabric,.055);
    seam(g,[[x-.33,.65,.46],[x,.67,.48],[x+.33,.65,.46]],seamMat,.006);
    seam(g,[[x-.31,.99,-.16],[x,1.01,-.15],[x+.31,.99,-.16]],seamMat,.004);
  }
  for(const [x,z,r] of [[-.87,.24,-.18],[.84,.15,.18]]){
    const pillow=rounded(g,.4,.39,.12,x,.79,z,fabric,.06);pillow.rotation.z=r;pillow.rotation.y=r*.5;
  }
  return g;
}
let candidate=null;
const clearCandidate=()=>{
  if(candidate){scene.remove(candidate);candidate=null;}
};
function floatInput(id){return Number($(id).value)}
function readCamera(){
  return validateCamera({
    fov:floatInput('lensFov'),height:floatInput('camHeight'),
    distance:floatInput('camDistance'),pitch:floatInput('camPitch'),
    aspect:info.photo ? info.photo.width/info.photo.height : Math.max(1,mount.clientWidth)/Math.max(1,mount.clientHeight)
  });
}
function readDimensions(){
  return validateDimensions({
    width:floatInput('objectWidth'),depth:floatInput('objectDepth'),
    height:floatInput('objectHeight'),basis:$('dimensionBasis').value
  });
}
function applyCamera(){
  const s=readCamera();
  camera.fov=s.fov;camera.aspect=Math.max(1,mount.clientWidth)/Math.max(1,mount.clientHeight);
  camera.position.set(0,s.height,s.distance);
  camera.lookAt(0,s.height-Math.tan(s.pitch*Math.PI/180)*s.distance,0);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function photoRay(ndcX,ndcY){
  const refCamera=camera.clone();
  refCamera.aspect=info.photo.width/info.photo.height;
  refCamera.updateProjectionMatrix();refCamera.updateMatrixWorld(true);
  return new THREE.Vector3(ndcX,ndcY,.5).unproject(refCamera).sub(refCamera.position).normalize();
}
function resize(){
  const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
  renderer.setSize(w,h,false);applyCamera();
}
new ResizeObserver(resize).observe(mount);
function say(text,ok=false){$('message').textContent=text;$('message').style.color=ok?'#86e8d0':'#e7b68b';}
function candidateDimensions(group,dims){
  group.position.set(0,0,0);group.scale.set(1,1,1);
  group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(group);
  const size=box.getSize(new THREE.Vector3());
  if(!(size.x>1e-6&&size.y>1e-6&&size.z>1e-6))throw Error('Mesh has no measurable 3D extent');
  group.scale.set(dims.width/size.x,dims.height/size.y,dims.depth/size.z);
  group.updateMatrixWorld(true);
  const adjusted=new THREE.Box3().setFromObject(group);
  group.position.y=-adjusted.min.y;
}
function showCandidate(group,world,dims){
  clearCandidate();
  candidate=group;
  candidateDimensions(candidate,dims);
  candidate.position.x=world.x;candidate.position.z=world.z;
  candidate.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  scene.add(candidate);
}
showCandidate(makeSofa(),{x:0,z:-1.75},{width:2.3,depth:.95,height:.86});
function clickContact(e){
  try{
    if(!info.photo)throw Error('Import a rights-cleared image before choosing a point');
    requireRights($('rights').value);
    applyCamera();
    const rect=frame.getBoundingClientRect();
    const c=photoContact(e.clientX-rect.left,e.clientY-rect.top,rect.width,rect.height,info.photo.width,info.photo.height);
    const direction=photoRay(c.ndcX,c.ndcY);
    const ground=groundIntersection(camera.position,direction);
    if(Math.abs(ground.x)>8 || Math.abs(ground.z)>8)throw Error('This ray lands outside the demo room. Refine the camera model or contact point.');
    info.contact=c;
    const displayX=rect.width*(e.clientX-rect.left)/rect.width;
    const displayY=rect.height*(e.clientY-rect.top)/rect.height;
    dot.style.left=displayX+'px';dot.style.top=displayY+'px';dot.style.display='block';
    say('Observed contact recorded. Candidate floor intersection: x='+ground.x.toFixed(2)+' m, z='+ground.z.toFixed(2)+' m. Validate camera before accepting.',true);
  }catch(error){say(error.message);}
}
frame.addEventListener('click',clickContact);
async function usePhoto(e){
  const f=e.target.files?.[0];if(!f)return;
  let nextUrl=null;
  try{
    requireRights($('rights').value);
    if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>16*1024*1024)throw Error('Select a PNG, JPEG or WebP image smaller than 16 MB');
    parsePinterestUrl($('pinUrl').value);
    nextUrl=URL.createObjectURL(f);
    const temp=new Image();temp.src=nextUrl;
    await new Promise((resolve,reject)=>{temp.onload=resolve;temp.onerror=()=>reject(new Error('Image could not be decoded'));});
    if(temp.naturalWidth>8192||temp.naturalHeight>8192)throw Error('Photo dimensions exceed 8192 pixels');
    const digest=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(info.imageUrl)URL.revokeObjectURL(info.imageUrl);
    info.imageUrl=nextUrl;nextUrl=null;
    info.hash=hash;info.photo={name:f.name,width:temp.naturalWidth,height:temp.naturalHeight};
    info.contact=null;info.placement=null;info.additionalViews=[];dot.style.display='none';
    $('multiMeta').textContent='0 secondary views · supports inference, but not automatic photogrammetry';
    photoImg.src=info.imageUrl;photoImg.hidden=false;$('emptyPhoto').hidden=true;
    $('photoMeta').textContent=f.name+' · '+temp.naturalWidth+' × '+temp.naturalHeight+' · SHA-256 recorded locally';
    say('Photograph loaded locally. Click the floor-contact point visible in the photo.',true);
  }catch(error){say(error.message);}finally{
    if(nextUrl)URL.revokeObjectURL(nextUrl);e.target.value='';
  }
}
$('photoInput').addEventListener('change',usePhoto);
$('multiInput').addEventListener('change',async event=>{
  const files=[...(event.target.files||[])];
  try{
    requireRights($('rights').value);
    if(!files.length)return;
    if(!info.photo)throw Error('Load the main photographic reference first');
    if(files.length+info.additionalViews.length>8)throw Error('Maximum eight secondary views per candidate');
    const next=[];
    for(const f of files){
      if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>16*1024*1024)throw Error('Each supporting photo must be a PNG/JPEG/WebP under 16 MB');
      const url=URL.createObjectURL(f);
      let img;
      try{
        img=new Image();
        img.src=url;
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Supporting view could not be decoded'));});
        if(img.naturalWidth>8192||img.naturalHeight>8192)throw Error('Supporting view exceeds 8192 pixels');
      } finally {URL.revokeObjectURL(url);}
      const digest=await crypto.subtle.digest('SHA-256',await f.arrayBuffer());
      next.push({
        name:f.name,width:img.naturalWidth,height:img.naturalHeight,
        rights:$('rights').value,
        sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')
      });
    }
    info.additionalViews.push(...next);
    $('multiMeta').textContent=info.additionalViews.length+' secondary views recorded (metadata only) · NOT depth recovered';
    say('Supporting view metadata and hashes stored locally. Align camera poses independently before using views to infer missing geometry.',true);
  }catch(error){say(error.message);}finally{event.target.value='';}
});
$('pinUrl').addEventListener('change',()=>{try{parsePinterestUrl($('pinUrl').value);say('Pinterest link recorded as reference only. No image fetched.',true);}catch(e){say(e.message);}});
$('rights').addEventListener('change',()=>{if($('rights').value==='unknown')say('Permission is required before placing from the photo.');});
function place(){
  try{
    if(!info.photo||!info.contact)throw Error('A licensed photograph and observed floor-contact point are required');
    requireRights($('rights').value);
    parsePinterestUrl($('pinUrl').value);
    const dims=readDimensions();applyCamera();
    const c=info.contact;
    const ray=photoRay(c.ndcX,c.ndcY);
    const floor=groundIntersection(camera.position,ray);
    if(Math.abs(floor.x)>8||Math.abs(floor.z)>8)throw Error('Candidate placement is outside supported scene bounds');
    const useGLB=$('objectKind').value==='uploaded_glb';
    if(useGLB&&!info.imported)throw Error('Import a local licensed GLB before choosing GLB placement');
    const model=useGLB?info.imported.clone(true):makeSofa();
    showCandidate(model,floor,dims);
    info.placement={world:{x:floor.x,y:0,z:floor.z},asset:useGLB?'uploaded_glb':'authored_mesh'};
    $('stateBadge').textContent='CANDIDATE · NOT YET VERIFIED';
    $('sceneLabel').textContent='PHOTO-CONTACT ANCHOR · CAMERA ASSUMED';
    $('meshStatus').textContent=(useGLB?'Imported GLB':'Sofa proxy')+' · '+dims.width+' × '+dims.depth+' × '+dims.height+' meters';
    say('Candidate placed in 3D. Hidden surfaces, camera and scale still require independent validation.',true);
  }catch(error){say(error.message);}
}
$('applyButton').addEventListener('click',place);
function cameraChanged(){
  try{applyCamera();info.placement=null;$('stateBadge').textContent='RECALIBRATION · NOT VERIFIED';say('Camera changed. Placement is stale; use Place from observed contact again.');}
  catch(e){say(e.message);}
}
for(const id of ['lensFov','camHeight','camDistance','camPitch'])$(id).addEventListener('change',cameraChanged);
$('resetButton').addEventListener('click',()=>{
  for(const [id,value] of Object.entries({lensFov:55,camHeight:1.65,camDistance:6.5,camPitch:16}))$(id).value=value;
  cameraChanged();
});
async function importGLB(e){
  const file=e.target.files?.[0];if(!file)return;
  try{
    requireRights($('rights').value);
    if(!/\.glb$/i.test(file.name)||file.size>30*1024*1024)throw Error('GLB must be smaller than 30 MB');
    const ab=await file.arrayBuffer();
    const view=new DataView(ab);
    if(ab.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==ab.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw Error('Not a valid glTF 2.0 binary container');
    const jsonLength=view.getUint32(12,true);
    if(jsonLength<=0||20+jsonLength>ab.byteLength)throw Error('Invalid GLB metadata');
    const json=JSON.parse(new TextDecoder().decode(new Uint8Array(ab,20,jsonLength)));
    if(json.buffers?.some(b=>b.uri)||json.images?.some(i=>i.uri))throw Error('GLB must embed all buffers and image textures; external dependencies are not accepted');
    const gltf=await new GLTFLoader().parseAsync(ab,'');
    let triangles=0;
    gltf.scene.traverse(o=>{if(o.isMesh){const geo=o.geometry;triangles+=(geo.index?geo.index.count:geo.attributes.position?.count||0)/3;}});
    if(!triangles||triangles>400000)throw Error('Asset contains no triangles or exceeds the 400,000 triangle candidate limit');
    info.imported=gltf.scene;$('objectKind').value='uploaded_glb';
    $('meshStatus').textContent='GLB ready · '+Math.round(triangles).toLocaleString()+' triangles';
    say('Rights-approved GLB parsed. Mark image floor contact and place it to preview.',true);
  }catch(error){say(error.message);}finally{e.target.value='';}
}
$('glbInput').addEventListener('change',importGLB);
async function importHDR(e){
  const file=e.target.files?.[0];if(!file)return;
  let url;
  try{
    if(!/\.hdr$/i.test(file.name)||file.size>20*1024*1024)throw Error('Use a licensed .hdr image smaller than 20 MB');
    url=URL.createObjectURL(file);
    const tex=await new RGBELoader().loadAsync(url);
    const next=pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    if(environment)environment.dispose();
    environment=next;scene.environment=environment;
    $('hdrStatus').textContent='User HDR · '+file.name+' · lighting reference';
    say('Photographic HDR illumination loaded. Source license remains your responsibility.',true);
  }catch(error){say(error.message);}finally{if(url)URL.revokeObjectURL(url);e.target.value='';}
}
$('hdrInput').addEventListener('change',importHDR);
async function importMap(event,key){
  const file=event.target.files?.[0];if(!file)return;
  let url;
  try{
    requireRights($('rights').value);
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('Use a rights-cleared PNG/JPEG/WebP map under 8 MB');
    url=URL.createObjectURL(file);
    const tex=await new THREE.TextureLoader().loadAsync(url);
    tex.colorSpace=key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    if(maps[key])maps[key].dispose();
    maps[key]=tex;
    for(const m of materials){m[key]=tex;m.needsUpdate=true;}
    say(key+' uploaded locally. Verify UV scale and material correspondence against the source photo.',true);
  }catch(error){say(error.message);}finally{if(url)URL.revokeObjectURL(url);event.target.value='';}
}
for(const [id,key] of Object.entries({baseMap:'map',normalMap:'normalMap',roughnessMap:'roughnessMap'}))$(id).addEventListener('change',e=>importMap(e,key));
$('exportButton').addEventListener('click',()=>{
  try{
    if(!info.placement)throw Error('Place an evidence-grounded candidate before exporting');
    const m=buildManifest({
      photo:info.photo,sha256:info.hash,rights:$('rights').value,pinUrl:$('pinUrl').value,
      camera:readCamera(),contact:info.contact,dimensions:readDimensions(),asset:info.placement.asset,
      additionalViews:info.additionalViews
    });
    m.reconstruction.placementMeters=info.placement.world;
    m.render={engine:'Three.js',tonemapping:'ACESFilmic',hdrSource:$('hdrStatus').textContent,frameRates:'runtime UI only; not a verified benchmark'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(m,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='towerflow-photo-evidence.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('Candidate evidence exported. All accuracy and release tests remain unverified.',true);
  }catch(error){say(error.message);}
});
let last=performance.now(),frames=0,elapsed=0;
function tick(now){
  const delta=Math.min(1000,Math.max(0,now-last));last=now;frames++;elapsed+=delta;
  renderer.render(scene,camera);
  if(elapsed>=1200){
    $('stats').textContent=(frames*1000/elapsed).toFixed(0)+' FPS (browser loop) · '+renderer.info.render.calls+' calls · '+renderer.info.render.triangles.toLocaleString()+' triangles · GPU memory unmeasured';
    frames=0;elapsed=0;
  }
}
applyCamera();
renderer.setAnimationLoop(tick);
window.addEventListener('beforeunload',()=>{
  if(info.imageUrl)URL.revokeObjectURL(info.imageUrl);
  renderer.setAnimationLoop(null);
  for(const t of Object.values(maps))t?.dispose();
  environment?.dispose();pmrem.dispose();renderer.dispose();
});
