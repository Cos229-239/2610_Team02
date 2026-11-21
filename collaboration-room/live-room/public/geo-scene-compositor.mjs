// TowerFlow viewport environment compositor — additive, reversible.
// The existing WebGL room remains authoritative and keeps its current
// background, furniture, projector, camera and interaction ownership.
// The visual effect runs in the actual room viewport, not inside the menu.
// Real-city photographic reference is differentiated from a 3D reconstruction.
export function visualPreset(time='day',weather='sunny'){
 const v=String(weather).toLowerCase();
 const rain=/rain|shower|drizzle|storm/.test(v),storm=/thunder|storm/.test(v);
 const snow=/snow|sleet|flurr/.test(v),fog=/fog|mist/.test(v);
 const clouds=fog||rain||snow||/cloud|overcast/.test(v);
 const night=time==='night',sunset=time==='sunset',morning=time==='morning';
 return Object.freeze({rain,storm,snow,fog,clouds,night,sunset,morning,
  tint:night?'rgba(4,13,43,.27)':sunset?'rgba(240,105,58,.14)':
   clouds?'rgba(69,92,126,.19)':morning?'rgba(255,182,120,.12)':'rgba(244,226,154,.07)',
  cloudsOpacity:storm?.7:rain?.56:clouds?.34:0,
  particleCount:storm?130:rain?90:snow?55:0});
}
export function installSceneCompositor({mount=document.body}={}){
 if(document.getElementById('tf-geo-scene-effects'))throw Error('Scene compositor already installed');
 const effects=document.createElement('canvas');
 effects.id='tf-geo-scene-effects';
 effects.setAttribute('aria-hidden','true');
 effects.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:21';
 const view=document.createElement('div');view.id='tf-geo-city-view';
 view.style.cssText='position:fixed;left:0;right:0;bottom:0;height:53vh;pointer-events:none;z-index:18;overflow:hidden;display:none';
 const photo=document.createElement('img');photo.alt='';
 photo.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 58%;opacity:.92;mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.8) 34%,black 75%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.8) 34%,black 75%)';
 photo.referrerPolicy='no-referrer';
 const label=document.createElement('div');
 label.id='tf-geo-scene-caption';
 label.style.cssText='position:fixed;left:16px;bottom:16px;max-width:min(540px,76vw);z-index:22;pointer-events:none;background:#061724d9;color:#e3f6ff;border:1px solid #38667d;border-radius:5px;padding:7px 10px;font:12px/1.5 system-ui;display:none;text-shadow:0 1px 2px #000';
 view.append(photo);mount.append(view,effects,label);
 const ctx=effects.getContext('2d',{alpha:true});
 if(!ctx)throw Error('2D canvas unavailable');
 let preset=visualPreset(),destination=null,source=null,raf=0,lastTick=0,frame=0;
 let serial=0,photoLoad=0,disposed=false;
 const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 const width=()=>effects.width;
 const height=()=>effects.height;
 function resize(){
  const ratio=Math.min(window.devicePixelRatio||1,1.5);
  effects.width=Math.max(1,Math.round(window.innerWidth*ratio));
  effects.height=Math.max(1,Math.round(window.innerHeight*ratio));
 }
 resize();window.addEventListener('resize',resize);
 function draw(t){
  if(disposed)return;
  if(!reducedMotion)raf=requestAnimationFrame(draw);
  if(!reducedMotion&&t-lastTick<45)return;
  lastTick=t;frame++;
  const w=width(),h=height();
  ctx.clearRect(0,0,w,h);
  if(!destination)return;
  // Tinted light changes across the live scene while preserving its background.
  ctx.fillStyle=preset.tint;ctx.fillRect(0,0,w,h);
  if(preset.sunset){
   const glow=ctx.createLinearGradient(0,0,0,h);
   glow.addColorStop(0,'rgba(76,33,107,.06)');
   glow.addColorStop(.64,'rgba(235,105,73,.13)');
   glow.addColorStop(1,'rgba(255,147,82,.26)');
   ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  if(preset.clouds){
   const shift=(frame*.17)%w;
   for(let i=0;i<14;i++){
    const x=((i*177+shift)%(w+220))-110;
    const y=(i*79)%(h*.58);
    const radius=75+(i%5)*22;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
    const alpha=preset.cloudsOpacity;
    gradient.addColorStop(0,'rgba(171,185,206,'+(alpha*.52)+')');
    gradient.addColorStop(1,'rgba(171,185,206,0)');
    ctx.fillStyle=gradient;
    ctx.beginPath();ctx.ellipse(x,y,radius,radius*.39,0,0,2*Math.PI);ctx.fill();
   }
  }
  if(preset.fog){
   const fog=ctx.createLinearGradient(0,h*.2,0,h);
   fog.addColorStop(0,'rgba(183,199,210,.02)');
   fog.addColorStop(1,'rgba(183,199,210,.30)');
   ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);
  }
  if(preset.rain||preset.snow){
   ctx.strokeStyle=preset.snow?'rgba(241,250,255,.82)':'rgba(183,220,246,.53)';
   ctx.lineWidth=preset.snow?2.3:1.1;
   ctx.beginPath();
   for(let i=0;i<preset.particleCount;i++){
    const x=(i*157+(frame*(preset.snow?1.4:5)))%w;
    const y=(i*83+frame*(preset.snow?2:15))%h;
    ctx.moveTo(x,y);ctx.lineTo(x+(preset.snow?1:-5),y+(preset.snow?2:22));
   }
   ctx.stroke();
  }
  if(preset.storm&&frame%133===0){
   ctx.fillStyle='rgba(210,229,255,.24)';ctx.fillRect(0,0,w,h);
  }
 }
 if(!reducedMotion)raf=requestAnimationFrame(draw);
 function update({time='day',weather='sunny',name=null,photoURL=null,photoSource=null,photoLicense=null,warning=null}={}){
  preset=visualPreset(time,weather);
  destination=name;
  source=photoSource;
  const current=++serial;
  if(reducedMotion)draw(performance.now());
  // A selection changes the live atmosphere immediately, without waiting
  // for the NWS, Wikimedia Commons or Overpass network calls.
  if(!name){
   view.style.display='none';photo.removeAttribute('src');
   label.style.display='none';return;
  }
  const timeName=time.toUpperCase(),weatherName=String(weather).toUpperCase();
  label.style.display='block';
  label.textContent=name+'  ·  '+timeName+'  ·  '+weatherName+
   (warning?'  ·  '+warning:'');
  if(photoURL){
   const temp=new Image();
   temp.referrerPolicy='no-referrer';
   const request=++photoLoad;
   temp.onload=()=>{
    if(disposed||serial!==current||request!==photoLoad)return;
    photo.src=photoURL;view.style.display='block';
    label.textContent=name+'  ·  '+timeName+'  ·  '+weatherName+
     '  ·  PHOTOGRAPHIC REFERENCE ('+(photoLicense||'license verified')+') — NOT A 3D MODEL';
   };
   temp.onerror=()=>{
    if(disposed||serial!==current||request!==photoLoad)return;
    view.style.display='none';
    label.textContent=name+' · '+timeName+' · '+weatherName+' · CITY PHOTO FAILED TO LOAD';
   };
   temp.src=photoURL;
  }else{
   photoLoad++;view.style.display='none';photo.removeAttribute('src');
  }
 }
 function dispose(){
  disposed=true;serial++;photoLoad++;cancelAnimationFrame(raf);
  window.removeEventListener('resize',resize);
  effects.remove();view.remove();label.remove();
 }
 return Object.freeze({update,dispose,get diagnostics(){return{
  active:!!destination,time:!!destination?undefined:null,weatherEffectsVisible:!!destination,
  cityPhotoVisible:view.style.display!=='none',photoSource:source
 }}});
}
