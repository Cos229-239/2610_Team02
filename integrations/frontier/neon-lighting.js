/* TF_FRONTIER_NEON_LIGHTING_V1
 * Original photonic ring and circuitry ambience, influenced by vibrant electronic
 * album-lighting design; NOT copied artwork, not a reproduction or branded asset.
 * 4 halo rings + 2 shadowless local PointLights. No renderer/postprocess replacement.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TowerflowNeonLighting=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="towerflow.frontier.neon.v1";
 const PRESETS=Object.freeze({
  "electric-dusk":Object.freeze([0x39dbff,0x845aff,0xff4dbc,0xffb15e]),
  "ember-portal":Object.freeze([0xffa24c,0xff654f,0xffcc6e,0x72cfff]),
  "prismatic":Object.freeze([0x53f1fd,0xeb63fd,0xff4f9e,0xffcf6c]),
  "spectral-blue":Object.freeze([0x3cafff,0x62dfff,0x496dff,0xab8dff]),
  "phoenix-spectrum":Object.freeze([0xff9b3b,0xffdc65,0x49e7ff,0xa259ff])
 });
 const installed=new WeakMap();
 function validate({preset="electric-dusk",intensity=1,reducedMotion=false}={}){
   if(!Object.hasOwn(PRESETS,preset)||!Number.isFinite(intensity)||intensity<0||intensity>1.6||
     typeof reducedMotion!=="boolean")throw Error("Invalid illumination profile");
   return Object.freeze({preset,intensity,reducedMotion});
 }
 function pulse(now,index,{intensity,reducedMotion}){
   if(!Number.isFinite(now))throw Error("Invalid animation clock");
   return intensity*(reducedMotion?1:1+.12*Math.sin(now*.00055+index*.65));
 }
 function install({THREE,platforms,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
   if(!THREE?.MeshBasicMaterial||!THREE?.TorusGeometry||!THREE?.Mesh||!THREE?.Group||
      !THREE?.PointLight||!Array.isArray(platforms)||platforms.length!==4||
      platforms.some(p=>!p.group?.add||!p.group?.remove))throw Error("Existing room platforms and Three.js required");
   if(installed.has(platforms))return installed.get(platforms);
   let initial;try{initial=JSON.parse(storage?.getItem(KEY)||"null");}catch{}
   let config;try{config=validate(initial||{});}catch{config=validate();}
   const layers=[],lights=[],materials=[];
   for(let i=0;i<4;i++){
     const main=new THREE.Group();
     main.name="TF_ORIGINAL_RING_PHOTONIC_AURA_"+i;
     main.position.y=.25;main.rotation.x=Math.PI/2;
     main.userData.tfDecorativeOnly=true;
     const aura=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.13,
       blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,
       toneMapped:false
     });
     const core=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.9,
       blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
     });
     // Layered additive scattering and moving energized arc; visual glow without
     // a renderer-wide bloom composer or changing the original scene exposure.
     const geoOuter=new THREE.TorusGeometry(1.52,.24,10,72);
     const geoCore=new THREE.TorusGeometry(1.5,.045,8,72);
     const geoHaze=new THREE.TorusGeometry(1.52,.43,10,72);
     const geoArc=new THREE.TorusGeometry(1.505,.038,8,48,Math.PI*.64);
     const haze=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.055,
       blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
       depthTest:true,depthWrite:false,toneMapped:false
     });
     const spark=new THREE.MeshBasicMaterial({
       color:0xffffff,transparent:true,opacity:.78,
       blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
     });
     const outer=new THREE.Mesh(geoOuter,aura),inner=new THREE.Mesh(geoCore,core);
     const veil=new THREE.Mesh(geoHaze,haze),arc=new THREE.Mesh(geoArc,spark);
     for(const m of [veil,outer,inner,arc]){
       m.raycast=()=>{};m.castShadow=false;m.receiveShadow=false;
       m.userData.tfDecorativeOnly=true;main.add(m);
     }
     platforms[i].group.add(main);
     layers.push({group:main,geoOuter,geoCore,geoHaze,geoArc,
       outer,inner,veil,arc,aura,core,haze,spark});
     materials.push(aura,core,haze,spark);
     if(i===0||i===3){
       // Actual nearby illumination: no shadows; opt-in intensity is bounded.
       const lamp=new THREE.PointLight(PRESETS[config.preset][i],2.2*config.intensity,5.5,2);
       lamp.position.set(0,1.2,0);lamp.castShadow=false;
       lamp.userData.tfDecorativeOnly=true;platforms[i].group.add(lamp);
       lights.push({lamp,index:i,platform:platforms[i]});
     }
   }
   let disposed=false;
   function setConfig(next){
     if(disposed)throw Error("Neon layer disposed");
     config=validate({...config,...next});
     for(let i=0;i<4;i++){
       const color=PRESETS[config.preset][i];
       layers[i].aura.color.setHex(color);layers[i].core.color.setHex(color);
       layers[i].haze.color.setHex(color);
     }
     for(const {lamp,index} of lights)lamp.color.setHex(PRESETS[config.preset][index]);
     try{storage?.setItem(KEY,JSON.stringify(config));}catch{}
     return config;
   }
   const controller=Object.freeze({
     configure:setConfig,
     update(now,clearing=0){
       if(disposed||!Number.isFinite(now))return;
       const level=Math.max(0,Math.min(1,1-clearing));
       for(let i=0;i<4;i++){
         const p=pulse(now,i,config)*level;
         layers[i].aura.opacity=Math.min(.49,.22*p);
         layers[i].core.opacity=Math.min(1,.97*p);
         layers[i].haze.opacity=Math.min(.13,.072*p);
         layers[i].spark.opacity=Math.min(1,.82*p);
         // Animated energized streak is genuinely in the world, not a UI effect.
         // It is subordinate to the projector and stays hidden during descent.
         layers[i].arc.rotation.z=config.reducedMotion?0:now*.00028*(i%2?1:-1);
         layers[i].group.visible=level>.01;
       }
       for(const {lamp,index} of lights)lamp.intensity=2.2*pulse(now,index,config)*level;
     },
     stats(){return Object.freeze({
       preset:config.preset,intensity:config.intensity,rings:4,
       newLocalLights:lights.length,newShadowCasters:0,extraRaycastTargets:0,
       estimatedMeshDrawCalls:16,newAnimationLoops:0,globalRendererChanges:0,
       bloomComposerAdded:false,verifiedFrameRate:null
     });},
     dispose(){
       if(disposed)return;disposed=true;
       layers.forEach((l,i)=>{
         platforms[i].group.remove(l.group);
         l.geoOuter.dispose();l.geoCore.dispose();l.geoHaze.dispose();l.geoArc.dispose();
       });
       lights.forEach(l=>l.platform.group.remove(l.lamp));
       materials.forEach(m=>m.dispose());
       installed.delete(platforms);
     }
   });
   installed.set(platforms,controller);return controller;
 }
 return Object.freeze({KEY,PRESETS,validate,pulse,install});
});
