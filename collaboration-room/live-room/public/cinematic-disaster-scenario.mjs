/**
 * TowerFlow cinematic urban disaster sequence.
 * Fictionalized, non-historical reconstruction: not to scale, not documentary footage.
 * A visually intense but non-anatomical sequence of damage, fires, smoke,
 * evacuations, falling debris and structural collapse.
 *
 * Scene coordinates: urban parent already places street at y=-70 scene units.
 * All geometry belongs to a detachable group and may be disposed independently.
 */
export const DISASTER_DURATION_SECONDS=120;
export const DISASTER_PHASES=Object.freeze([
  {start:0,id:'approach',label:'Aircraft approach'},
  {start:15,id:'impact-one',label:'First aircraft strikes tower one'},
  {start:32,id:'impact-two',label:'Second aircraft strikes tower one'},
  {start:52,id:'impact-three',label:'Third aircraft strikes tower two'},
  {start:62,id:'fire',label:'Escalating fires, smoke and rescue'},
  {start:83,id:'collapse-one',label:'Tower one collapses — debris and dust'},
  {start:104,id:'collapse-two',label:'Tower two collapses — expanding dust cloud'}
]);
export function disasterPhase(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid disaster elapsed time');
  return [...DISASTER_PHASES].reverse().find(x=>seconds>=x.start) || DISASTER_PHASES[0];
}
export function createCinematicDisaster({THREE,urban,seed=911042}={}){
  if(!THREE||!urban)throw Error('Three.js and street-level urban group required');
  const root=new THREE.Group();
  root.name='TF_FICTIONAL_URBAN_DISASTER_CINEMATIC';
  urban.add(root);
  root.visible=false;
  const geometries=[],materials=[];
  let disposed=false,elapsed=0,active=false,phase='approach',lastPhase='';
  let randomState=seed>>>0;
  const rand=()=>{randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296;};
  const material=(color,options={})=>{
    const m=new THREE.MeshStandardMaterial({color,...options});materials.push(m);return m;
  };
  const surface={
    facade:material('#4b5b68',{metalness:.48,roughness:.53}),
    ribs:material('#202f3c',{metalness:.62,roughness:.42}),
    roof:material('#27343b',{roughness:.81}),
    flame:new THREE.MeshBasicMaterial({color:'#ff773a',transparent:true,opacity:.92}),
    core:new THREE.MeshBasicMaterial({color:'#ffe0a1',transparent:true,opacity:.93}),
    smoke:new THREE.MeshBasicMaterial({color:'#34363a',transparent:true,opacity:.38,depthWrite:false}),
    ash:new THREE.MeshBasicMaterial({color:'#727276',transparent:true,opacity:.43,depthWrite:false}),
    emergency:new THREE.MeshBasicMaterial({color:'#e52f31'}),
    rescue:new THREE.MeshBasicMaterial({color:'#e8edef'}),
    evacuee:new THREE.MeshBasicMaterial({color:'#101923'}),
    aircraft:material('#a4b0b7',{metalness:.57,roughness:.46}),
    dark:material('#253540',{metalness:.4,roughness:.55})
  };
  for(const item of Object.values(surface))if(!materials.includes(item))materials.push(item);
  function mesh(parent,w,h,d,x,y,z,mat){
    const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);
    const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  function blob(parent,r,x,y,z,mat){
    const g=new THREE.IcosahedronGeometry(r,1);geometries.push(g);
    const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  // Twin-tower-inspired fictional geometry; does not claim actual WTC dimensions.
  const towers=[];
  const footprint=[{x:-81,z:-17,h:125},{x:-96,z:18,h:123}];
  for(let t=0;t<2;t++){
    const p=footprint[t],tower=new THREE.Group();
    tower.position.set(p.x,0,p.z);root.add(tower);
    const structural=new THREE.Group();tower.add(structural);
    mesh(structural,12,p.h,12,0,p.h/2,0,surface.facade);
    mesh(structural,12.5,.5,12.5,0,p.h+.25,0,surface.roof);
    for(const edge of [-1,1]){
      mesh(structural,.14,p.h,12.2,edge*6,p.h/2,0,surface.ribs);
      mesh(structural,12.2,p.h,.14,0,p.h/2,edge*6,surface.ribs);
    }
    for(let i=-5;i<=5;i++){
      mesh(structural,.12,p.h,.12,6.16,p.h/2,i*1.05,surface.ribs);
      mesh(structural,.12,p.h,.12,-6.16,p.h/2,i*1.05,surface.ribs);
    }
    // Broken upper volume deforms from impact and descends during collapse.
    const upper=new THREE.Group();upper.position.y=75;tower.add(upper);
    for(let i=0;i<18;i++){
      const chunk=mesh(upper,.6+rand()*3,.7+rand()*3,.6+rand()*3,
        (rand()-.5)*10,rand()*36,(rand()-.5)*10,surface.ribs);
      chunk.userData.initial=chunk.position.clone();
    }
    structural.userData.baseHeight=p.h;
    towers.push({tower,structural,upper,position:p});
  }
  // Alternate-history fictional sequence: TWO strikes on tower one, THIRD on tower two.
  // This is deliberately not a factual depiction of September 11, 2001.
  const impactSequence=Object.freeze([
    {start:0,hit:15,tower:0,y:94,heading:-1},
    {start:20,hit:32,tower:0,y:82,heading:1},
    {start:39,hit:52,tower:1,y:92,heading:-1}
  ]);
  const aircraft=[];
  for(let i=0;i<impactSequence.length;i++){
    const flight=new THREE.Group();root.add(flight);
    const body=mesh(flight,1.2,1.1,9,0,0,0,surface.aircraft);
    mesh(flight,19,.24,2.4,0,.1,0,surface.aircraft);
    mesh(flight,4,3,.32,0,1.8,-3.2,surface.aircraft);
    aircraft.push(flight);
  }
  const plume=[];
  const fires=[];
  const debris=[];
  const groundDust=[];
  for(let t=0;t<2;t++){
    const p=footprint[t],impactHeight=t===0?95:87;
    for(let j=0;j<35;j++){
      const puff=blob(root,1.7+rand()*3.8,p.x+(rand()-.5)*15,
        impactHeight+j*.5,p.z+(rand()-.5)*11,surface.smoke);
      puff.userData={baseX:puff.position.x,baseY:puff.position.y,baseZ:puff.position.z,seed:rand()*6.3,t};
      puff.visible=false;plume.push(puff);
    }
    for(let j=0;j<24;j++){
      const flame=blob(root,.6+rand()*1.4,p.x+(rand()-.5)*11,
        impactHeight+(rand()-.5)*7,p.z+(rand()-.5)*11,j%3===0?surface.core:surface.flame);
      flame.userData={base:flame.position.clone(),seed:rand()*6.28,t};
      flame.visible=false;fires.push(flame);
    }
    for(let j=0;j<70;j++){
      const fragment=mesh(root,.2+rand()*1.5,.15+rand()*1.4,.3+rand()*1.5,
        p.x+(rand()-.5)*15,impactHeight+rand()*17,p.z+(rand()-.5)*15,surface.ribs);
      fragment.userData={base:fragment.position.clone(),dx:(rand()-.5)*17,dy:4+rand()*18,dz:(rand()-.5)*17,t};
      fragment.visible=false;debris.push(fragment);
    }
    for(let j=0;j<35;j++){
      const dust=blob(root,1+rand()*3,p.x+(rand()-.5)*35,2+rand()*6,p.z+(rand()-.5)*32,surface.ash);
      dust.userData={base:dust.position.clone(),seed:rand()*4,t};
      dust.visible=false;groundDust.push(dust);
    }
  }
  const emergencyVehicles=[],evacuees=[];
  for(let i=0;i<8;i++){
    const truck=new THREE.Group();root.add(truck);
    truck.position.set(-37,0,-52+i*13);
    mesh(truck,1.8,1.45,4,0,1,0,surface.rescue);
    mesh(truck,1.82,.45,2.3,0,1.72,.5,surface.emergency);
    emergencyVehicles.push({truck,origin:truck.position.z});
  }
  for(let i=0;i<35;i++){
    const person=new THREE.Group();root.add(person);
    const px=-46+rand()*8,pz=(rand()-.5)*95;
    person.position.set(px,0,pz);
    mesh(person,.43,1.4,.3,0,1.04,0,surface.evacuee);
    blob(person,.31,0,1.95,0,surface.evacuee);
    evacuees.push({person,origin:pz,speed:1.2+rand()*3.5});
  }
  const impactBursts=[];
  const burstMat=new THREE.MeshBasicMaterial({color:'#ffad54',transparent:true,opacity:.88,depthWrite:false});
  materials.push(burstMat);
  for(const event of impactSequence){
    const at=footprint[event.tower];
    const burst=new THREE.Group();root.add(burst);
    burst.position.set(at.x,event.y,at.z+event.heading*6);
    for(let j=0;j<15;j++){
      const m=blob(burst,.8+rand()*2.1,
        (rand()-.5)*9,(rand()-.5)*9,(rand()-.5)*8,burstMat);
      m.userData.ripple=.3+rand()*2;
    }
    burst.visible=false;
    impactBursts.push(burst);
  }
  const impactLight=new THREE.PointLight('#ffa46b',0,65,1.5);
  impactLight.position.set(-81,95,-17);root.add(impactLight);
  function reset(){
    elapsed=0;phase='approach';lastPhase='';
    for(const item of towers){item.structural.scale.set(1,1,1);item.structural.visible=true;item.upper.visible=false;item.upper.position.y=75;item.upper.rotation.set(0,0,0);}
    for(const a of aircraft)a.visible=true;
    for(const burst of impactBursts){burst.visible=false;burst.scale.setScalar(1);}
    for(const item of [...plume,...fires,...debris,...groundDust])item.visible=false;
    for(const item of emergencyVehicles)item.truck.visible=false;
    for(const item of evacuees)item.person.visible=false;
    impactLight.intensity=0;
  }
  function step(seconds){
    if(disposed)throw Error('Disposed scenario');
    if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid elapsed seconds');
    elapsed=Math.min(seconds,DISASTER_DURATION_SECONDS);
    const p=disasterPhase(elapsed);phase=p.id;
    // Three separately staged impacts; each aircraft physically reaches its
    // assigned tower facade before disappearing, followed by a short fireball.
    aircraft.forEach((a,i)=>{
      const event=impactSequence[i],target=footprint[event.tower];
      const t=Math.min(1,Math.max(0,(elapsed-event.start)/(event.hit-event.start)));
      a.visible=elapsed>=event.start&&elapsed<event.hit;
      const startX=event.heading<0?-24:-150;
      const startZ=event.heading<0?target.z+55:target.z-55;
      a.position.set(startX+(target.x-startX)*t,event.y,startZ+(target.z+event.heading*6-startZ)*t);
      a.rotation.y=event.heading<0?-.47:Math.PI+.47;
    });
    impactBursts.forEach((burst,i)=>{
      const age=elapsed-impactSequence[i].hit;
      burst.visible=age>=0&&age<5;
      if(burst.visible)burst.scale.setScalar(1+age*.65);
    });
    towers.forEach(({structural,upper},i)=>{
      const impact=i===0?15:52,collapse=i===0?83:104;
      const isHit=elapsed>=impact,fall=Math.max(0,(elapsed-collapse)/10);
      // Impact facade darkens, upper structure deforms, then lower structure descends.
      structural.scale.y=fall>0?Math.max(.04,1-fall*1.05):1;
      upper.visible=isHit&&fall<1.05;
      upper.rotation.z=fall*.18;
      upper.position.y=75-Math.min(fall,1)*57;
    });
    for(const puff of plume){
      const impact=puff.userData.t===0?15:52,age=elapsed-impact;
      puff.visible=age>=0;
      if(!puff.visible)continue;
      const drift=age*.22;
      puff.position.set(puff.userData.baseX-drift*.48,puff.userData.baseY+drift,puff.userData.baseZ+drift*.24);
      puff.scale.setScalar(Math.min(3.6,1+age*.023));
      puff.material.opacity=.32;
    }
    for(const flame of fires){
      const impact=flame.userData.t===0?15:52;
      const collapse=flame.userData.t===0?83:104;
      flame.visible=elapsed>=impact&&elapsed<collapse;
      if(flame.visible){
        const t=elapsed*.9+flame.userData.seed;
        flame.position.y=flame.userData.base.y+Math.sin(t)*1.3;
        flame.scale.setScalar(.75+Math.abs(Math.sin(t*.8))*.6);
      }
    }
    for(const f of debris){
      const impact=f.userData.t===0?15:52,age=Math.max(0,elapsed-impact),fall=Math.max(0,elapsed-(f.userData.t===0?83:104));
      f.visible=elapsed>=impact&&age<12||fall>0&&fall<17;
      if(!f.visible)continue;
      const t=fall>0?fall:age*.42,base=f.userData.base;
      f.position.set(base.x+f.userData.dx*t*.28,Math.max(.2,base.y+f.userData.dy*t*.13-4.9*t*t),base.z+f.userData.dz*t*.3);
      f.rotation.set(t*.55,t*.38,t*.65);
    }
    for(const dust of groundDust){
      const collapse=dust.userData.t===0?83:104,age=elapsed-collapse;
      dust.visible=age>=0&&age<22;
      if(dust.visible){
        dust.position.copy(dust.userData.base);
        dust.position.y+=age*.17;
        dust.scale.setScalar(.5+age*.12);
      }
    }
    for(const item of emergencyVehicles){
      item.truck.visible=elapsed>15;
      item.truck.position.z=Math.min(item.origin+elapsed*.23,55);
    }
    for(const item of evacuees){
      item.person.visible=elapsed>15;
      item.person.position.z=item.origin+Math.max(0,elapsed-15)*item.speed;
      if(item.person.position.z>83)item.person.position.z=83;
    }
    const recent=impactSequence.find(event=>elapsed>=event.hit&&elapsed<event.hit+2);
    if(recent){
      const at=footprint[recent.tower];
      impactLight.position.set(at.x,recent.y,at.z);
    }
    impactLight.intensity=recent?36:0;
    return {active,elapsed,phase,phaseLabel:p.label};
  }
  reset();
  return Object.freeze({
    get state(){return {active,elapsed,phase,phaseLabel:disasterPhase(elapsed).label,visible:root.visible}},
    start(){if(disposed)throw Error('Disposed scenario');active=true;root.visible=true;reset();return step(0);},
    seek:step,
    update(dt){if(!active)return this.state;return step(elapsed+Math.max(0,dt));},
    stop(){active=false;root.visible=false;reset();},
    dispose(){
      if(disposed)return;
      this.stop();disposed=true;urban.remove(root);
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    }
  });
}
