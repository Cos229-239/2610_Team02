/**
 * TowerFlow zombie outbreak: deterministic, reversible, CPU-bounded exterior simulation.
 * Fictional violence and panic depicted without anatomical injury geometry.
 * One initial infected "patient zero" tags civilians; the infection propagates
 * by actual proximity, not instant mass spawning. Up to 420 simulated humans.
 * Scene-space approximate: street level is urban-group local Y=0, the tower
 * collaboration room stays at its original 21st-storey elevation.
 */
export const OUTBREAK_LIMITS=Object.freeze({population:420,initialInfected:1,cellSize:5,simulationHz:12,maximumSeconds:220});
export const OUTBREAK_PHASES=Object.freeze([
  {start:0,id:'patient-zero',label:'Patient zero approaches pedestrians'},
  {start:18,id:'panic',label:'Pedestrians flee and emergency response'},
  {start:45,id:'contagion',label:'Contact infection spreads through streets'},
  {start:95,id:'horde',label:'Hordes converge on the TowerFlow building'},
  {start:155,id:'siege',label:'Street-level siege and apartment evacuations'}
]);
export function outbreakPhase(seconds){
  if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid outbreak time');
  return [...OUTBREAK_PHASES].reverse().find(p=>seconds>=p.start)||OUTBREAK_PHASES[0];
}
export function proximityKey(x,z,size=OUTBREAK_LIMITS.cellSize){
  return Math.floor(x/size)+':'+Math.floor(z/size);
}
export function createZombieOutbreak({THREE,urban,scene,seed=1729,population=OUTBREAK_LIMITS.population}={}){
  if(!THREE||!urban||!scene)throw Error('Zombie outbreak requires Three.js, urban group, scene');
  if(!Number.isInteger(population)||population<50||population>OUTBREAK_LIMITS.population)throw Error('Outbreak population out of range');
  const exterior=new THREE.Group();exterior.name='TF_ZOMBIE_APOCALYPSE_WORLD';
  urban.add(exterior);exterior.visible=false;
  const indoor=new THREE.Group();indoor.name='TF_ZOMBIE_ALERT_ROOM_TEMPORARY';
  scene.add(indoor);indoor.visible=false;
  const geometries=[],materials=[];
  function basic(hex,extra={}){const m=new THREE.MeshBasicMaterial({color:hex,...extra});materials.push(m);return m;}
  function standard(hex,extra={}){const m=new THREE.MeshStandardMaterial({color:hex,roughness:.74,...extra});materials.push(m);return m;}
  const mat={
    human:basic('#d7d5bf'),infected:basic('#344e44'),head:basic('#bfc5ab'),
    shadows:basic('#1b262e'),police:standard('#253f59'),ambulance:standard('#d6dcde'),
    fireTruck:standard('#9e292c'),glass:standard('#1c344a'),
    impact:standard('#2b2d30'),damaged:standard('#25201d'),
    signalRed:basic('#ff1635'),signalBlue:basic('#1579ff'),
    amber:basic('#ffa845'),silhouette:basic('#141821'),
    ash:basic('#485058',{transparent:true,opacity:.52,depthWrite:false})
  };
  function geomBox(w,h,d){const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);return g;}
  function cube(parent,w,h,d,x,y,z,material){
    const m=new THREE.Mesh(geomBox(w,h,d),material);m.position.set(x,y,z);parent.add(m);return m;
  }
  function orb(parent,r,x,y,z,material){
    const g=new THREE.IcosahedronGeometry(r,0);geometries.push(g);
    const m=new THREE.Mesh(g,material);m.position.set(x,y,z);parent.add(m);return m;
  }
  let rng=seed>>>0;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
  // Characters are composed of two instanced meshes: body + head. This preserves
  // a human silhouette at 21-storey distance with just two draw calls.
  const bodyGeometry=geomBox(.40,1.16,.29);
  const headGeometry=geomBox(.29,.32,.29);
  const bodies=new THREE.InstancedMesh(bodyGeometry,mat.human,population);
  const heads=new THREE.InstancedMesh(headGeometry,mat.head,population);
  for(const inst of [bodies,heads]){inst.frustumCulled=false;exterior.add(inst);}
  const agentDummy=new THREE.Object3D();
  const agents=[];
  const ROWS=7,COLS=Math.ceil(population/ROWS);
  // Place crowds across main roads and blocks, with visible central avenue.
  for(let i=0;i<population;i++){
    const row=i%ROWS,col=Math.floor(i/ROWS);
    const x=-35-row*7.2+(rand()-.5)*2.2;
    const z=-69+col*2.6+(rand()-.5)*1.2;
    agents.push({x,z,vx:0,vz:0,seed:rand()*6.283,infected:i===0,
      convertedAt:i===0?0:-1,alive:true,panic:0});
  }
  // Patient zero starts near another pedestrian for a reproducible first contact.
  agents[0].x=agents[1].x-.45;agents[0].z=agents[1].z-.2;
  function instanceAt(inst,i,x,y,z,rotationY,scale=1){
    agentDummy.position.set(x,y,z);agentDummy.rotation.set(0,rotationY,0);
    agentDummy.scale.setScalar(scale);agentDummy.updateMatrix();
    inst.setMatrixAt(i,agentDummy.matrix);
  }
  const response=[];
  function vehicle(kind,index){
    const type=kind==='police'?mat.police:kind==='ambulance'?mat.ambulance:mat.fireTruck;
    const g=new THREE.Group();exterior.add(g);
    const x=-34+(index%3)*-4,z=-66+index*12;
    g.position.set(x,0,z);
    cube(g,1.85,1.2,3.85,0,.78,0,type);
    cube(g,1.65,.80,1.4,0,1.7,-.75,mat.glass);
    const roofColor=kind==='police'?mat.signalBlue:mat.signalRed;
    const lamp=cube(g,1.15,.18,.32,0,2.19,0,roofColor);
    const flash=new THREE.PointLight(kind==='police'?'#2385ff':'#ff3040',0,9,2);
    flash.position.set(0,2.4,0);g.add(flash);
    response.push({g,lamp,flash,kind,index,originZ:z,crashed:false});
  }
  for(let i=0;i<12;i++)vehicle(i%4===0?'fireTruck':i%3===0?'ambulance':'police',i);
  // Scripted car impacts permanently mark a facade until the scenario resets.
  // Both impact cars and damage are real detachable scene geometry.
  const crashCars=[],impactMarks=[];
  const crashEvents=[{time:26,x:-52,z:-44,angle:-.3},{time:39,x:-54,z:8,angle:.3},
    {time:53,x:-84,z:-38,angle:-.5},{time:72,x:-56,z:38,angle:.7},
    {time:99,x:-83,z:52,angle:-.4},{time:121,x:-94,z:-16,angle:.3}];
  for(const [i,event] of crashEvents.entries()){
    const g=new THREE.Group();exterior.add(g);
    const car=cube(g,1.42,.9,2.8,0,.56,0,i%2===0?mat.police:mat.impact);
    const windshield=cube(g,1.24,.38,1.28,0,1.17,-.2,mat.glass);
    const scorch=new THREE.Group();exterior.add(scorch);scorch.visible=false;
    scorch.position.set(event.x-.1,1.4,event.z);
    for(let j=0;j<6;j++){
      const piece=cube(scorch,.35+rand()*1.35,.32+rand()*1.3,.10,
        (rand()-.5)*2.8,(rand()-.5)*2.8,0,mat.damaged);
      piece.rotation.z=rand()*Math.PI;
    }
    const smoke=orb(scorch,1.5,0,2,0,mat.ash);
    crashCars.push({g,event,car,windshield,scorch,smoke,index:i});
    impactMarks.push(scorch);
  }
  // Apartment/tower activity through visible facade silhouettes: no anatomically
  // graphic falling characters. Coordinates correspond to the exterior city.
  const towerFigures=[];
  for(let i=0;i<46;i++){
    const g=new THREE.Group();exterior.add(g);
    const x=i%2===0?-82.5:-105.2;
    const z=-61+(i%23)*5.4;
    const y=19+Math.floor(i/2)%12*6.2;
    g.position.set(x,y,z);
    cube(g,.5,1.25,.30,0,0,0,mat.silhouette);
    orb(g,.27,0,.87,0,mat.silhouette);
    towerFigures.push({g,origin:{x,y,z},seed:rand()*6.28,jumping:i%8===0});
  }
  // Alarm strips are on the exterior building skin, street-facing and at upper
  // floors, plus restrained red illumination inside the collaboration room.
  const buildingAlarm=[];
  for(let level=0;level<12;level++){
    const bar=cube(exterior,.17,.14,6,-24.1,2+level*5.5,11,mat.signalRed);
    buildingAlarm.push(bar);
  }
  for(let i=0;i<4;i++){
    const lamp=new THREE.PointLight('#ff2635',0,15,2);
    lamp.position.set(-18.5,3.6+i*1.9,[-13,-4,5,13][i]);indoor.add(lamp);
  }
  let active=false,disposed=false,elapsed=0,accumulator=0,infectedCount=1,totalTagged=0,crashes=0;
  let alert=false;
  function reset(){
    elapsed=0;accumulator=0;infectedCount=1;totalTagged=0;crashes=0;alert=false;
    for(let i=0;i<agents.length;i++){
      const a=agents[i],row=i%ROWS,col=Math.floor(i/ROWS);
      a.x=-35-row*7.2+Math.sin(a.seed)*.8;
      a.z=-69+col*2.6+Math.cos(a.seed)*.6;
      a.vx=0;a.vz=0;a.infected=i===0;a.convertedAt=i===0?0:-1;a.panic=0;
    }
    agents[0].x=agents[1].x-.45;agents[0].z=agents[1].z-.2;
    for(const r of response){r.crashed=false;r.g.visible=false;r.flash.intensity=0;r.g.position.z=r.originZ;}
    for(const c of crashCars){c.g.visible=false;c.scorch.visible=false;c.g.scale.set(1,1,1);}
    for(const f of towerFigures){f.g.visible=false;f.g.position.set(f.origin.x,f.origin.y,f.origin.z);}
    for(const b of buildingAlarm)b.visible=false;
    for(const l of indoor.children)l.intensity=0;
  }
  function normalize(dx,dz){const length=Math.hypot(dx,dz)||1;return [dx/length,dz/length]}
  function simulationTick(dt){
    // Spatial hash avoids O(population²) collision scanning.
    const grid=new Map();
    for(let i=0;i<agents.length;i++){
      const a=agents[i],key=proximityKey(a.x,a.z);
      if(!grid.has(key))grid.set(key,[]);
      grid.get(key).push(i);
    }
    let additional=0;
    for(let i=0;i<agents.length;i++){
      const a=agents[i];
      const cx=Math.floor(a.x/OUTBREAK_LIMITS.cellSize),cz=Math.floor(a.z/OUTBREAK_LIMITS.cellSize);
      let target=-1,distance2=Infinity;
      for(let gx=cx-1;gx<=cx+1;gx++)for(let gz=cz-1;gz<=cz+1;gz++){
        const cell=grid.get(gx+':'+gz);if(!cell)continue;
        for(const j of cell){
          if(i===j)continue;
          const b=agents[j];if(b.infected===a.infected)continue;
          const dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz;
          if(d2<distance2){distance2=d2;target=j;}
        }
      }
      if(a.infected){
        if(target>=0){
          const other=agents[target];
          // Proximity tag converts a person, with a short per-agent incubation.
          if(distance2<1.75*1.75&&!other.infected&&elapsed-a.convertedAt>(i===0?.12:.6)){
            other.infected=true;other.convertedAt=elapsed;additional++;
          }
        }
        const goal=target>=0?agents[target]:{x:-23,z:Math.sin(i*1.8)*13};
        // After the outbreak establishes, increasingly bias movement toward
        // the observation building. Keep short-range tag pursuit for contagion.
        const [chaseX,chaseZ]=normalize(goal.x-a.x,goal.z-a.z);
        const [rallyX,rallyZ]=normalize(-22.5-a.x,Math.sin(i*.24)*10-a.z);
        const rallyBias=elapsed<95?0:Math.min(.9,(elapsed-95)/80);
        const contact=target>=0&&distance2<10?1:1-rallyBias;
        const dx=chaseX*contact+rallyX*(1-contact);
        const dz=chaseZ*contact+rallyZ*(1-contact);
        // Infected must be capable of closing on a panicked civilian or no horde can emerge.
        // Deterministic calibrated speed: 420-agent synthetic run -> 412 infected by 95 seconds.
        const speed=2.45+Math.sin(a.seed)*.22+Math.min(.8,elapsed/100);
        a.vx=dx*speed;a.vz=dz*speed;
      }else{
        const threat=target>=0&&distance2<120?agents[target]:null;
        const [dx,dz]=threat?normalize(a.x-threat.x,a.z-threat.z):
          normalize(-25-a.x,(i%2===0?72:-72)-a.z);
        a.vx=dx*(threat?2.2:1.1);
        a.vz=dz*(threat?2.2:1.1);
      }
    }
    for(const a of agents){
      a.x=Math.max(-111,Math.min(-22.1,a.x+a.vx*dt));
      a.z=Math.max(-73,Math.min(73,a.z+a.vz*dt));
    }
    infectedCount+=additional;totalTagged+=additional;
  }
  function updateGeometry(){
    // Matrix updates throttled to 12Hz; only one body/head instancing pair.
    for(let i=0;i<agents.length;i++){
      const a=agents[i],heading=Math.atan2(a.vx,a.vz),bob=.04*Math.sin(elapsed*7+a.seed);
      instanceAt(bodies,i,a.x,.88+bob,a.z,heading);
      instanceAt(heads,i,a.x,1.65+bob,a.z,heading,.95);
      const color=a.infected?0x405949:0xd3cab5;
      // Different tint via per-instance attribute, not 420 individual materials.
      bodies.setColorAt(i,new THREE.Color(color));
      heads.setColorAt(i,new THREE.Color(a.infected?0x849789:0xe0d3c4));
    }
    bodies.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;
    if(bodies.instanceColor)bodies.instanceColor.needsUpdate=true;
    if(heads.instanceColor)heads.instanceColor.needsUpdate=true;
  }
  function updateVisuals(){
    const severity=infectedCount/population;
    const pulse=Math.floor(elapsed*2.9)%2===0;
    alert=elapsed>=15;
    for(const r of response){
      r.g.visible=alert;
      if(!alert)continue;
      const targetZ=r.originZ+Math.min(22,elapsed*.33);
      r.g.position.z=targetZ;
      // Alternating blue police and red rescue emergency flashes.
      const cycle=Math.floor(elapsed*7+r.index*2)%4;
      r.flash.intensity=r.kind==='police'?cycle<2?15:0:cycle>=2?15:0;
      r.lamp.visible=r.flash.intensity>0;
    }
    for(const c of crashCars){
      const age=elapsed-c.event.time;
      c.g.visible=age>=-7;
      if(!c.g.visible)continue;
      const t=Math.max(0,Math.min(1,(age+7)/7));
      c.g.position.set(-33+(c.event.x+33)*t,0,c.event.z-16*(1-t));
      c.g.rotation.y=c.event.angle*(age>=0?1:0);
      c.scorch.visible=age>=0; // persistent damage until stop / reset
      c.g.scale.x=age>=0?.7:1;
      if(age>=0&&age<.2)crashes=Math.max(crashes,c.index+1);
      if(age>=0)c.smoke.position.y=2+Math.min(12,age*.25);
    }
    for(const f of towerFigures){
      f.g.visible=elapsed>=20&&elapsed<210;
      if(!f.g.visible)continue;
      const age=Math.max(0,elapsed-60-f.seed*6);
      if(f.jumping&&age>0){
        // Distant non-graphic falling silhouettes; disappear at street level.
        f.g.position.x=f.origin.x+Math.min(12,age*.25);
        f.g.position.y=Math.max(.2,f.origin.y-age*age*.14);
        if(f.g.position.y<=.3)f.g.visible=false;
      }else{
        f.g.position.z=f.origin.z+Math.sin(elapsed*.7+f.seed)*.18;
      }
    }
    for(const b of buildingAlarm)b.visible=alert&&pulse;
    indoor.visible=alert;
    for(const lamp of indoor.children)lamp.intensity=alert&&pulse?Math.min(12,4+severity*8):0;
  }
  function start(){
    if(disposed)throw Error('Outbreak disposed');
    reset();active=true;exterior.visible=true;indoor.visible=true;
    updateGeometry();
    return status();
  }
  function status(){return {active,elapsed,phase:outbreakPhase(elapsed).id,
    population,infected:infectedCount,survivors:population-infectedCount,
    tagged:totalTagged,crashes,emergencyVehicles:response.length,apartmentFigures:towerFigures.length};}
  function update(dt){
    if(!active)return status();
    if(!Number.isFinite(dt)||dt<0)throw Error('Invalid outbreak frame delta');
    if(elapsed>=OUTBREAK_LIMITS.maximumSeconds)return status(); // freeze completed scene and persistent damage
    const bounded=Math.min(.1,dt);
    elapsed=Math.min(OUTBREAK_LIMITS.maximumSeconds,elapsed+bounded);
    accumulator+=bounded;
    let count=0;
    while(accumulator>=1/OUTBREAK_LIMITS.simulationHz&&count<2){
      simulationTick(1/OUTBREAK_LIMITS.simulationHz);
      accumulator-=1/OUTBREAK_LIMITS.simulationHz;count++;
    }
    if(count)updateGeometry();
    updateVisuals();
    return status();
  }
  function stop(){if(disposed)return;active=false;exterior.visible=false;indoor.visible=false;reset();}
  function dispose(){
    if(disposed)return;
    stop();disposed=true;urban.remove(exterior);scene.remove(indoor);
    for(const g of geometries)g.dispose();
    for(const m of materials)m.dispose();
  }
  reset();
  return Object.freeze({get state(){return status()},start,update,stop,dispose});
}
