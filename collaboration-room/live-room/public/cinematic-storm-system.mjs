/**
 * Dramatic fully spatial procedural storm effects; explicitly NOT a weather forecast.
 * Supports tornado/severe, hurricane, typhoon, and blizzard without touching
 * the original TowerFlow floor, camera, room, windows, or external projectors.
 */
export const STORM_MODES=Object.freeze(['severe','hurricane','typhoon','blizzard']);
export const STORM_SETTINGS=Object.freeze({
  severe:{wind:1.7,rain:1,cloud:0.90,flood:0.0,funnel:true,lightning:true},
  hurricane:{wind:1.4,rain:1.4,cloud:0.84,flood:1,funnel:false,lightning:true},
  typhoon:{wind:1.6,rain:1.6,cloud:0.88,flood:1.25,funnel:false,lightning:true},
  blizzard:{wind:1.1,rain:0,cloud:0.74,flood:0,funnel:false,lightning:false}
});
export function stormSettings(mode){return STORM_SETTINGS[mode]||null;}
export function createCinematicStorm({THREE,group,urban,streetLevel=-70,seed=7564}={}){
  if(!THREE||!group||!urban)throw Error('Storm requires scene and exterior city');
  const root=new THREE.Group();root.name='TF_CINEMATIC_WEATHER_STORMS';
  group.add(root);root.visible=false;
  const geometries=[],materials=[];
  const pointsMat=new THREE.PointsMaterial({color:0x86949c,size:1.1,transparent:true,opacity:.58,depthWrite:false,sizeAttenuation:true});
  materials.push(pointsMat);
  const fogMat=new THREE.MeshBasicMaterial({color:0x253344,transparent:true,opacity:.33,side:THREE.DoubleSide,depthWrite:false});
  const vortexMat=new THREE.MeshBasicMaterial({color:0x78808b,transparent:true,opacity:.36,side:THREE.DoubleSide,depthWrite:false});
  const surgeMat=new THREE.MeshStandardMaterial({color:0x233f4d,roughness:.22,metalness:.21,transparent:true,opacity:.85,depthWrite:false});
  const rubbleMat=new THREE.MeshStandardMaterial({color:0x748087,roughness:.85});
  materials.push(fogMat,vortexMat,surgeMat,rubbleMat);
  let state=seed>>>0;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const stormClouds=[];
  for(let i=0;i<26;i++){
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(6+rand()*13,1),fogMat);
    geometries.push(mesh.geometry);
    mesh.position.set(-48-rand()*45,45+rand()*38,(rand()-.5)*100);
    mesh.scale.set(1.8,.42,1.4);
    root.add(mesh);stormClouds.push({mesh,origin:mesh.position.clone(),speed:.25+rand()});
  }
  const funnels=[];
  // Volumetric-looking rotating instanced rings, not a featureless fixed cone.
  const ringGeometry=new THREE.TorusGeometry(1,.16,5,20);
  geometries.push(ringGeometry);
  const funnel=new THREE.Group();
  funnel.position.set(-72,streetLevel+1,3);root.add(funnel);
  for(let i=0;i<26;i++){
    const ring=new THREE.Mesh(ringGeometry,vortexMat);
    const h=i*2.2;
    ring.position.y=h;
    const radius=1.4+h*.24;
    ring.scale.set(radius,radius,1);
    ring.rotation.x=Math.PI/2;
    funnel.add(ring);funnels.push(ring);
  }
  const debrisGeometry=new THREE.BoxGeometry(.5,.12,.35);
  geometries.push(debrisGeometry);
  const debris=new THREE.InstancedMesh(debrisGeometry,rubbleMat,125);
  debris.frustumCulled=false;root.add(debris);
  const dummy=new THREE.Object3D();
  const debrisOrbit=Array.from({length:125},()=>({r:2+rand()*14,a:rand()*Math.PI*2,h:rand()*35,speed:.65+rand()*1.2}));
  const waterGeometry=new THREE.PlaneGeometry(110,142,24,24);
  geometries.push(waterGeometry);
  const surge=new THREE.Mesh(waterGeometry,surgeMat);
  surge.rotation.x=-Math.PI/2;surge.position.set(-69,streetLevel+.07,0);
  root.add(surge);
  const waveGeometry=new THREE.PlaneGeometry(110,142,20,20);
  geometries.push(waveGeometry);
  const waveMat=new THREE.MeshBasicMaterial({color:0x97bac7,transparent:true,opacity:.17,wireframe:true,depthWrite:false});
  materials.push(waveMat);
  const waves=new THREE.Mesh(waveGeometry,waveMat);
  waves.rotation.x=-Math.PI/2;waves.position.set(-69,streetLevel+.16,0);root.add(waves);
  const flash=new THREE.PointLight(0xdceeff,0,180,2);
  flash.position.set(-65,38,0);root.add(flash);
  let mode=null,elapsed=0,disposed=false,strikes=0;
  function setMode(next){
    if(disposed)throw Error('Storm disposed');
    if(next!==null&&!STORM_MODES.includes(next))throw Error('Unknown storm '+next);
    mode=next;elapsed=0;strikes=0;root.visible=!!next;
    funnel.visible=!!STORM_SETTINGS[next]?.funnel;
    debris.visible=!!STORM_SETTINGS[next]?.funnel;
    surge.visible=!!STORM_SETTINGS[next]?.flood;
    waves.visible=surge.visible;
    flash.intensity=0;
    if(next){
      fogMat.opacity=STORM_SETTINGS[next].cloud*.45;
      pointsMat.color.set(next==='blizzard'?0xedf4ff:0x87959c);
    }
    return {mode,active:!!mode};
  }
  function update(dt){
    if(disposed)throw Error('Storm disposed');
    if(!mode)return {mode:null,active:false,strikes};
    if(!Number.isFinite(dt)||dt<0)throw Error('Invalid time');
    elapsed+=Math.min(dt,.1);
    const cfg=STORM_SETTINGS[mode],time=elapsed;
    for(const c of stormClouds){
      c.mesh.position.z=((c.origin.z+time*c.speed*cfg.wind*3+90)%180)-90;
      c.mesh.position.y=c.origin.y+Math.sin(time*.22+c.origin.z)*1.2;
      c.mesh.rotation.y=time*.012*c.speed;
    }
    if(funnel.visible){
      funnel.position.z=3+Math.sin(time*.16)*19;
      funnel.position.x=-72+Math.cos(time*.14)*9;
      funnel.rotation.y=time*.38;
      for(let i=0;i<funnels.length;i++){
        const r=funnels[i];
        r.rotation.z=time*(.22+i*.003);
        r.position.x=Math.sin(time*.9+i*.28)*(.35+i*.028);
      }
      debrisOrbit.forEach((d,i)=>{
        const angle=d.a+time*d.speed;
        dummy.position.set(funnel.position.x+Math.cos(angle)*d.r,streetLevel+d.h+1.5,
          funnel.position.z+Math.sin(angle)*d.r);
        dummy.rotation.set(angle*.6,angle,angle*.3);
        dummy.scale.setScalar(.6+Math.sin(time+i)*.25);
        dummy.updateMatrix();
        debris.setMatrixAt(i,dummy.matrix);
      });
      debris.instanceMatrix.needsUpdate=true;
    }
    if(surge.visible){
      // Street-level water only. Never rises to the TowerFlow room 21 floors up.
      const rise=Math.min(cfg.flood*1.35,Math.max(0,elapsed*.08));
      surge.position.y=streetLevel+rise;
      waves.position.y=streetLevel+rise+.09;
      waves.position.z=Math.sin(time*.7)*2.6;
      waves.material.opacity=.12+Math.abs(Math.sin(time*.8))*.1;
    }
    if(cfg.lightning){
      // Predetermined periodic flashes, separated to avoid continuous strobing.
      const n=Math.floor(time/8);
      const within=time-n*8;
      const bright=within>.35&&within<.48;
      flash.intensity=bright?72:0;
      strikes=n;
    }else flash.intensity=0;
    return {mode,active:true,elapsed,strikes,wind:cfg.wind,flood:cfg.flood};
  }
  setMode(null);
  return Object.freeze({
    get state(){return {mode,active:!!mode,elapsed,strikes,visible:root.visible}},
    setMode,update,
    dispose(){
      if(disposed)return;
      disposed=true;mode=null;root.visible=false;group.remove(root);
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    }
  });
}
