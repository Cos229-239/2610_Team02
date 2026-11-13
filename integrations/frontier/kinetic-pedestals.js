/* TF_FRONTIER_KINETIC_PEDESTALS_V1
 * Four ORIGINAL retractable room exhibits: typed user configuration, deterministic motion,
 * reversible faux-fragment effect. The existing platform and projector lift are not replaced.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TowerflowKineticPedestals=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="towerflow.frontier.kinetic-pedestals.v1";
 const SHAPES=Object.freeze(["original","icosahedron","dodecahedron","octahedron","sphere","cube","torus","torusKnot","cone"]);
 const PATTERNS=Object.freeze(["spin","hover","orbit","figure8","pendulum","helix","static"]);
 const COLORS=Object.freeze({azure:0x4bd8ff,violet:0x9b69ff,magenta:0xff49b5,gold:0xffc85a,emerald:0x57efab,white:0xeafaff});
 const defaults=i=>Object.freeze({shape:"original",pattern:"spin",color:["azure","violet","magenta","gold"][i%4],speed:1,intensity:1});
 function validated(input,i){
   if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid pedestal configuration");
   const allowed=["shape","pattern","color","speed","intensity"];
   if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error("Unknown pedestal setting");
   const merged={...defaults(i),...input};
   if(!SHAPES.includes(merged.shape)||!PATTERNS.includes(merged.pattern)||
      !Object.hasOwn(COLORS,merged.color)||!Number.isFinite(merged.speed)||
      merged.speed<.1||merged.speed>2||!Number.isFinite(merged.intensity)||
      merged.intensity<0||merged.intensity>2)throw Error("Unsupported pedestal setting");
   return Object.freeze(merged);
 }
 function motion(config,now,index){
   if(!Number.isFinite(now)||now<0)throw Error("Invalid monotonic clock");
   const t=now*.001*config.speed+index*.2,s=Math.sin(t),c=Math.cos(t);
   switch(config.pattern){
     case "hover":return {x:0,y:.15*s,z:0,ry:0,rz:0,scale:1};
     case "orbit":return {x:.31*c,y:.10*s,z:.31*s,ry:t,rz:0,scale:1};
     case "figure8":return {x:.33*s,y:.08*Math.cos(t*2),z:.18*Math.sin(t*2),ry:t*.6,rz:0,scale:1};
     case "pendulum":return {x:0,y:0,z:0,ry:0,rz:.33*s,scale:1};
     case "helix":return {x:.24*c,y:.12*s,z:.24*s,ry:t,rz:0,scale:1};
     case "static":return {x:0,y:0,z:0,ry:0,rz:0,scale:1};
     default:return {x:0,y:0,z:0,ry:t*.55,rz:0,scale:1};
   }
 }
 function geometry(THREE,shape){
   switch(shape){
     case "icosahedron":return new THREE.IcosahedronGeometry(.7,1);
     case "dodecahedron":return new THREE.DodecahedronGeometry(.72,0);
     case "octahedron":return new THREE.OctahedronGeometry(.73,0);
     case "sphere":return new THREE.SphereGeometry(.68,32,20);
     case "cube":return new THREE.BoxGeometry(1.12,1.12,1.12);
     case "torus":return new THREE.TorusGeometry(.6,.18,12,40);
     case "torusKnot":return new THREE.TorusKnotGeometry(.45,.13,72,12);
     case "cone":return new THREE.ConeGeometry(.62,1.25,32);
     default:throw Error("Unrecognized shape");
   }
 }
 const live=new WeakMap();
 function install({THREE,platforms,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
   if(!THREE?.InstancedMesh||!THREE?.Object3D||!THREE?.MeshStandardMaterial||
      !Array.isArray(platforms)||platforms.length!==4||
      platforms.some(p=>!p.group?.add||!p.holo?.add||!p.holo?.position))
     throw Error("Four existing Frontier platforms and Three.js required");
   if(live.has(platforms))return live.get(platforms);
   let previous=null;
   try{previous=JSON.parse(storage?.getItem(KEY)||"null");}catch{}
   const rows=platforms.map((p,i)=>{
     const original=p.holo.children.slice();
     const shardGeo=new THREE.TetrahedronGeometry(.18,0);
     const shardMat=new THREE.MeshBasicMaterial({color:COLORS.azure,transparent:true,opacity:.85,
       depthWrite:false,blending:THREE.AdditiveBlending});
     const shards=new THREE.InstancedMesh(shardGeo,shardMat,16);
     shards.visible=false;shards.raycast=()=>{};shards.castShadow=false;shards.receiveShadow=false;
     shards.userData.tfDecorativeOnly=true;
     p.group.add(shards);
     p.holo.userData.tfPedestalId=i;
     return {p,original,setting:validated(previous?.[i]||{},i),shards,shardGeo,shardMat,
       custom:null,shatteredAt:-Infinity,origPosition:p.holo.position.clone(),origRotation:p.holo.rotation.clone(),
       origScale:p.holo.scale.clone()};
   });
   let disposed=false;
   const persist=()=>{
     try{storage?.setItem(KEY,JSON.stringify(rows.map(r=>r.setting)));}catch{}
   };
   function updateShape(row){
     if(row.custom){
       row.p.holo.remove(row.custom);
       row.custom.geometry.dispose();row.custom.material.dispose();row.custom=null;
     }
     const useOriginal=row.setting.shape==="original";
     for(const child of row.original)child.visible=useOriginal;
     if(!useOriginal){
       const mat=new THREE.MeshStandardMaterial({
         color:COLORS[row.setting.color],metalness:.52,roughness:.19,transparent:true,opacity:.94,
         emissive:COLORS[row.setting.color],emissiveIntensity:row.setting.intensity*.55
       });
       row.custom=new THREE.Mesh(geometry(THREE,row.setting.shape),mat);
       row.custom.userData.tfPedestalId=rows.indexOf(row);
       row.p.holo.add(row.custom);
     }
     row.shardMat.color.setHex(COLORS[row.setting.color]);
   }
   rows.forEach(updateShape);
   const dummy=new THREE.Object3D();
   const api={
     configure(index,patch){
       if(disposed)throw Error("Pedestals disposed");
       if(!Number.isInteger(index)||index<0||index>=4)throw Error("Invalid pedestal index");
       const row=rows[index],next=validated({...row.setting,...patch},index);
       row.setting=next;row.shatteredAt=-Infinity;row.shards.visible=false;
       updateShape(row);persist();return Object.freeze({...next});
     },
     reset(index){return api.configure(index,defaults(index));},
     shatter(index,now){
       if(disposed)throw Error("Pedestals disposed");
       if(!Number.isInteger(index)||index<0||index>=4||!Number.isFinite(now))
         throw Error("Invalid shatter request");
       rows[index].shatteredAt=now;
       return true;
     },
     update(now,clearing=0){
       if(disposed||!Number.isFinite(now))return;
       for(let i=0;i<4;i++){
         const r=rows[i],c=r.setting,move=motion(c,Math.max(0,now),i);
         // Do not alter the parent platform's y or original lift animation.
         r.p.holo.position.set(r.origPosition.x+move.x,r.origPosition.y+move.y,r.origPosition.z+move.z);
         r.p.holo.rotation.set(r.origRotation.x,r.origRotation.y+move.ry,r.origRotation.z+move.rz);
         r.p.holo.scale.copy(r.origScale).multiplyScalar(1+(c.pattern==="hover"?.045*Math.sin(now*.002*c.speed):0));
         if(r.custom){r.custom.material.color.setHex(COLORS[c.color]);
           r.custom.material.emissiveIntensity=c.intensity*(.48+.07*Math.sin(now*.0018*c.speed));}
         // Shatter is cosmetic and reversible; suppressed while platforms are descending.
         const delta=now-r.shatteredAt,shattering=clearing<.02&&delta>=0&&delta<1400;
         r.p.holo.visible=!shattering;
         r.shards.visible=shattering;
         if(shattering){
           const travel=delta/1400;
           r.shards.position.copy(r.origPosition);
           r.shardMat.opacity=Math.max(.01,.85*(1-travel));
           for(let j=0;j<16;j++){
             const a=j*2.39996323+ i,spread=.12+travel*1.6;
             dummy.position.set(Math.cos(a)*spread,.16+Math.sin(j*1.5)*spread,Math.sin(a)*spread);
             dummy.scale.setScalar(Math.max(.06,(1-travel)*1.1));
             dummy.rotation.set(travel*(j%3+1),a,travel*(j%4+1));
             dummy.updateMatrix();r.shards.setMatrixAt(j,dummy.matrix);
           }
           r.shards.instanceMatrix.needsUpdate=true;
         }
         // Keep original fixture input disabled during clearing/flight; exact pose restores.
         r.p.holo.userData.tfPedestalSelectable=clearing<.02;
       }
     },
     get(index){
       if(!Number.isInteger(index)||index<0||index>=4)throw Error("Invalid pedestal index");
       return Object.freeze({...rows[index].setting});
     },
     stats(){return Object.freeze({configured:4,shapes:SHAPES.length,patterns:PATTERNS.length,
       totalShardInstances:64,additionalAnimationLoops:0,networkWrites:0,
       originalPlatformLiftPreserved:true,teamSynced:false,verifiedFrameRate:null});},
     dispose(){
       if(disposed)return;disposed=true;
       for(const r of rows){
         if(r.custom){r.p.holo.remove(r.custom);r.custom.geometry.dispose();r.custom.material.dispose();}
         r.p.group.remove(r.shards);r.shardGeo.dispose();r.shardMat.dispose();
         for(const child of r.original)child.visible=true;
         r.p.holo.position.copy(r.origPosition);r.p.holo.rotation.copy(r.origRotation);r.p.holo.scale.copy(r.origScale);
         delete r.p.holo.userData.tfPedestalId;delete r.p.holo.userData.tfPedestalSelectable;
       }
       live.delete(platforms);
     }
   };
   live.set(platforms,api);return api;
 }
 return Object.freeze({KEY,SHAPES,PATTERNS,COLORS,defaults,validated,motion,install});
});
