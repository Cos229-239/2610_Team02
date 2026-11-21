// TF_CAPITAL_WORLD_V1 — reversible, local-only 3D exterior emulation.
// Illustrative capital-city archetypes, NOT surveyed digital twins, real weather, or historical footage.
// No network, persistence beyond this browser, server changes, or room-wide publication.
const STATES = Object.freeze([
["Alabama","Montgomery"],["Alaska","Juneau"],["Arizona","Phoenix"],["Arkansas","Little Rock"],
["California","Sacramento"],["Colorado","Denver"],["Connecticut","Hartford"],["Delaware","Dover"],
["Florida","Tallahassee"],["Georgia","Atlanta"],["Hawaii","Honolulu"],["Idaho","Boise"],
["Illinois","Springfield"],["Indiana","Indianapolis"],["Iowa","Des Moines"],["Kansas","Topeka"],
["Kentucky","Frankfort"],["Louisiana","Baton Rouge"],["Maine","Augusta"],["Maryland","Annapolis"],
["Massachusetts","Boston"],["Michigan","Lansing"],["Minnesota","Saint Paul"],["Mississippi","Jackson"],
["Missouri","Jefferson City"],["Montana","Helena"],["Nebraska","Lincoln"],["Nevada","Carson City"],
["New Hampshire","Concord"],["New Jersey","Trenton"],["New Mexico","Santa Fe"],["New York","Albany"],
["North Carolina","Raleigh"],["North Dakota","Bismarck"],["Ohio","Columbus"],["Oklahoma","Oklahoma City"],
["Oregon","Salem"],["Pennsylvania","Harrisburg"],["Rhode Island","Providence"],["South Carolina","Columbia"],
["South Dakota","Pierre"],["Tennessee","Nashville"],["Texas","Austin"],["Utah","Salt Lake City"],
["Vermont","Montpelier"],["Virginia","Richmond"],["Washington","Olympia"],["West Virginia","Charleston"],
["Wisconsin","Madison"],["Wyoming","Cheyenne"],["Washington, D.C.","Washington"]
]);
const EVENTS = Object.freeze([
["normal","Normal city activity"],["sunny","Sunny"],["cloudy","Cloudy"],
["rain","Rain"],["thunder","Thunderstorm"],["severe","Severe thunderstorm / tornado / wind"],
["fire","Urban fire"],["cataclysm","Cataclysm"],["typhoon","Typhoon (fictional location override)"],
["hurricane","Hurricane (fictional location override)"],["zombie","Zombie apocalypse (fiction)"],
["airborne","Airborne illness / emergency response (fiction)"],
["purge","12-hour lawless-night scenario (fiction)"],
["rapture","Rapture: 3 phases (fictional interpretation)"],
["sept11","September 11 historical remembrance (NYC, 2001 — not a capital)"]
]);
const KEY="towerflow.capital-world.v1";
export function installCapitalWorld({THREE,scene,renderer,document,windowObject=window}){
  if(windowObject.tfCapitalWorld)return windowObject.tfCapitalWorld;
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}})();
  const state={index:Number.isInteger(saved.index)&&saved.index>=0&&saved.index<STATES.length?saved.index:0,
    event:EVENTS.some(x=>x[0]===saved.event)?saved.event:"normal",time:0};
  const root=new THREE.Group();root.name="TF_CAPITAL_WORLD_EXTERIOR";scene.add(root);
  const geometries=[],materials=[],instances=[],panes=[],vehicles=[],people=[],effects=[];
  const clock=new THREE.Clock();let raf=0,frame=0,phase=-1,ui=null,status=null,cityGroups=[],worlds=[];
  const rng=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const seedFor=text=>{let n=2166136261;for(const c of text){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
  const m=(color,roughness=.75,emissive=0,ei=0)=>{const material=new THREE.MeshStandardMaterial({color,roughness,metalness:.04,emissive,emissiveIntensity:ei});materials.push(material);return material;};
  const geom=(w,h,d)=>{const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);return g;};
  const solid=(parent,w,h,d,x,y,z,material)=>{const o=new THREE.Mesh(geom(w,h,d),material);o.position.set(x,y,z);parent.add(o);return o;};
  const facade=m(0x263949,.96),facade2=m(0x56616b,.88),facade3=m(0x9b9282,.91),
    road=m(0x111c26,.99),cloud=m(0x78808c,.99),glass=m(0x456d8a,.25,0x10273b,.15),
    lit=m(0xffc66b,.88,0xffa640,.7),dark=m(0x263e51,.9),
    warning=m(0xff5437,.75,0xff2300,1),sickness=m(0x83dafa,.8,0x247aff,.7);
  const iconMat=m(0xa4b0b6,.9);
  const personGeom=new THREE.CylinderGeometry(.12,.14,.85,5);geometries.push(personGeom);
  const windowGeom=geom(.48,.62,.05),buildingGeom=geom(1,1,1),carGeom=geom(.9,.4,1.8);
  const meshes=[{base:facade},{base:facade2},{base:facade3}];
  const dummy=new THREE.Object3D();
  const horizons=[
    {room:0,edge:-21,dir:-1}, {room:62,edge:83,dir:1}
  ];
  function matrix(mesh,index,x,y,z,sx,sy,sz,rotation=0){
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,rotation,0);
    dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  }
  function instanced(geometry,material,count,parent){
    const object=new THREE.InstancedMesh(geometry,material,count);
    object.frustumCulled=false;object.count=0;parent.add(object);return object;
  }
  function createWorld(w){
    const group=new THREE.Group();group.name="Capital exterior — "+w.room;root.add(group);
    const exteriorX=w.edge+w.dir*.2;
    // Architectural opening is formed in room.js. This geometry lies genuinely outside it.
    const paneMaterial=new THREE.MeshPhysicalMaterial({color:0xadd9f0,metalness:0,roughness:.1,
      transmission:.78,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide});
    materials.push(paneMaterial);
    const pane=solid(group,.045,5.36,18.1,exteriorX,5.9,0,paneMaterial);panes.push(pane);
    const trim=m(0x3b596d,.28,0x0a6b83,.12);
    for(const z of [-9,0,9])solid(group,.18,5.45,.11,exteriorX-w.dir*.12,5.9,z,trim);
    for(const y of [3.25,8.62])solid(group,.18,.11,18.1,exteriorX-w.dir*.12,y,0,trim);
    solid(group,.18,.08,18.1,exteriorX-w.dir*.12,6.18,0,trim);
    const city=new THREE.Group();group.add(city);cityGroups.push(city);
    const buildings=meshes.map(x=>instanced(buildingGeom,x.base,110,city));
    const bright=instanced(windowGeom,lit,2500,city),off=instanced(windowGeom,dark,2500,city);
    const traffic=instanced(carGeom,iconMat,40,city),emergency=instanced(carGeom,sickness,14,city);
    const pedestrians=instanced(personGeom,iconMat,80,city);
    const fire=instanced(buildingGeom,warning,60,city);
    const rain=instanced(buildingGeom,sickness,170,city);
    const clouds=instanced(buildingGeom,cloud,22,city);
    const world={...w,group,city,buildings,bright,off,traffic,emergency,pedestrians,fire,rain,clouds,
      carList:[],pedList:[],weatherList:[],fireList:[],cloudList:[],sourceSeed:0};
    worlds.push(world);
    return world;
  }
  for(const w of horizons)createWorld(w);
  function clearInstanced(w){
    for(const obj of [...w.buildings,w.bright,w.off,w.traffic,w.emergency,w.pedestrians,w.fire,w.rain,w.clouds])obj.count=0;
    w.carList.length=0;w.pedList.length=0;w.weatherList.length=0;w.fireList.length=0;w.cloudList.length=0;
  }
  function rebuildWorld(w){
    clearInstanced(w);
    const capital=STATES[state.index][1],rand=rng(seedFor(capital));
    const isAlaska=capital==="Juneau",high=capital==="Denver"||capital==="Salt Lake City",
      coastal=["Honolulu","Juneau","Annapolis","Providence","Boston","Olympia","Tallahassee"].includes(capital);
    w.sourceSeed=seedFor(capital);
    const heights=isAlaska?10:high?27:32;
    const floorOffset=w.edge+w.dir*11;
    // Coherent city blocks and actual layered depth, rather than an opaque skyline image.
    const buildingsByType=[[],[],[]],lightsOn=[],lightsOff=[];
    const night=["normal","airborne","purge","zombie","rapture","sept11"].includes(state.event);
    for(let row=0;row<3;row++)for(let col=0;col<24;col++){
      const x=w.edge+w.dir*(12+row*17+(rand()-.5)*6);
      const z=-53+col*4.5+(rand()-.5)*1.7;
      const h=(2.8+rand()*heights)*(1+row*.16),width=2.8+rand()*1.5;
      buildingsByType[Math.floor(rand()*3)].push({x,z,h,width});
      if(Math.abs(z)>53)continue;
      const levels=Math.min(23,Math.floor(h/1.3));
      for(let j=0;j<levels;j++)for(let k=0;k<3;k++){
        const zWindow=z-width*.30+k*width*.3;
        const sign=(row+col)%2===0?1:-1;
        const windowX=x+sign*width*.52;
        const item={x:windowX,y:.9+j*1.28,z:zWindow,sx:.06,sy:.52,sz:.6};
        if(rand()<(night?.40:.17))lightsOn.push(item);else lightsOff.push(item);
      }
    }
    buildingsByType.forEach((items,idx)=>{
      const mesh=w.buildings[idx];mesh.count=Math.min(items.length,mesh.instanceMatrix.count);
      for(let j=0;j<mesh.count;j++){const b=items[j];matrix(mesh,j,b.x,b.h/2,b.z,b.width,b.h,b.width);}
      mesh.instanceMatrix.needsUpdate=true;
    });
    for(const [mesh,list] of [[w.bright,lightsOn],[w.off,lightsOff]]){
      mesh.count=Math.min(list.length,mesh.instanceMatrix.count);
      for(let i=0;i<mesh.count;i++){const p=list[i];matrix(mesh,i,p.x,p.y,p.z,p.sx,p.sy,p.sz);}
      mesh.instanceMatrix.needsUpdate=true;
    }
    for(let i=0;i<36;i++){
      w.carList.push({x:w.edge+w.dir*(5+(i%3)*16),z:-40+rand()*80,speed:.7+rand()*3,ambulance:i<12});
    }
    for(let i=0;i<72;i++)w.pedList.push({x:w.edge+w.dir*(4+rand()*26),z:-45+rand()*90,rate:.15+rand()*.5});
    for(let i=0;i<170;i++)w.weatherList.push({x:w.edge+w.dir*(3+rand()*38),z:-46+rand()*92,y:2+rand()*30});
    for(let i=0;i<60;i++)w.fireList.push({x:w.edge+w.dir*(8+rand()*43),z:-45+rand()*90,y:2+rand()*10});
    for(let i=0;i<22;i++)w.cloudList.push({x:w.edge+w.dir*(12+rand()*65),z:-54+rand()*108,y:21+rand()*15});
    w.traffic.count=24;w.emergency.count=0;w.pedestrians.count=72;
    w.rain.count=0;w.fire.count=0;w.clouds.count=0;
    // Ground and roads are part of the same exterior world.
    if(!w.terrain){
      w.terrain=new THREE.Group();w.group.add(w.terrain);
      const terrainColor=m(coastal?0x223b3d:0x2b3431,.97);
      solid(w.terrain,80,.12,120,w.edge+w.dir*40,-.14,0,terrainColor);
      for(let i=0;i<3;i++){
        const x=w.edge+w.dir*(5+i*16);
        solid(w.terrain,3.1,.07,120,x,-.04,0,road);
      }
      if(isAlaska||high){
        const mountain=m(0x62747c,.99),peak=m(0xcbd4da,.95);
        for(let i=0;i<13;i++){
          const z=-56+i*9.5,base=w.edge+w.dir*(68+(i%3)*3),height=18+(i*7)%24;
          const cone=new THREE.Mesh(new THREE.ConeGeometry(7,height,5),mountain);cone.position.set(base,height/2,z);w.terrain.add(cone);geometries.push(cone.geometry);
          const snow=new THREE.Mesh(new THREE.ConeGeometry(2.2,height*.22,5),peak);snow.position.set(base,height*.89,z);w.terrain.add(snow);geometries.push(snow.geometry);
        }
      }
    } else {
      w.terrain.position.y=0;
    }
  }
  function animateWorld(w,dt,t){
    const event=state.event;
    const ambulanceCount=event==="airborne"?12:event==="sept11"||event==="fire"||event==="cataclysm"?8:2;
    const showRain=["rain","thunder","severe","hurricane","typhoon"].includes(event);
    const showCloud=["cloudy","rain","thunder","severe","hurricane","typhoon","cataclysm","sept11"].includes(event);
    const showFire=["fire","cataclysm","purge","rapture","sept11"].includes(event);
    const showPeople=!["zombie","sept11"].includes(event);
    w.traffic.count=24;w.emergency.count=ambulanceCount;w.pedestrians.count=showPeople?72:18;
    w.rain.count=showRain?170:0;w.clouds.count=showCloud?22:0;w.fire.count=showFire?60:0;
    for(let i=0;i<w.traffic.count;i++){
      const p=w.carList[i],speed=(event==="purge"?3:1)*(event==="hurricane"||event==="severe"?.4:1);
      const z=((p.z+t*p.speed*speed+50)%100)-50;
      matrix(w.traffic,i,p.x,.22,z,.9,.5,1.7);
    } w.traffic.instanceMatrix.needsUpdate=true;
    for(let i=0;i<w.emergency.count;i++){
      const p=w.carList[i],z=((p.z+t*(p.speed+2)*2+50)%100)-50;
      matrix(w.emergency,i,p.x,.4,z,1.05,.56,2.05);
    } w.emergency.instanceMatrix.needsUpdate=true;
    for(let i=0;i<w.pedestrians.count;i++){
      const p=w.pedList[i],z=((p.z+t*p.rate*(event==="purge"?2.5:1)+50)%100)-50;
      let y=.62;
      if(event==="rapture"){
        const cycle=t%90;const stage=cycle<30?0:cycle<60?1:2;
        const rising=i%3===stage;
        if(rising)y+=(cycle%30)*.58;
      }
      matrix(w.pedestrians,i,p.x,y,z,1,1,1);
    } w.pedestrians.instanceMatrix.needsUpdate=true;
    for(let i=0;i<w.rain.count;i++){
      const p=w.weatherList[i],y=2+((p.y-t*(event==="severe"?34:22))%27+27)%27;
      const sway=(event==="hurricane"||event==="typhoon"||event==="severe")?Math.sin(t*2+i)*2:0;
      matrix(w.rain,i,p.x+sway,y,p.z,.045,.48,.04);
    }if(w.rain.count)w.rain.instanceMatrix.needsUpdate=true;
    for(let i=0;i<w.clouds.count;i++){
      const p=w.cloudList[i];matrix(w.clouds,i,p.x, p.y+Math.sin(t*.1+i)*.35,p.z+Math.sin(t*.04+i)*7,6,1.1,8);
    }if(w.clouds.count)w.clouds.instanceMatrix.needsUpdate=true;
    for(let i=0;i<w.fire.count;i++){
      const p=w.fireList[i],flicker=.45+Math.abs(Math.sin(t*9+i*7))*.9;
      matrix(w.fire,i,p.x,p.y,p.z,.6,flicker*2,.6);
    }if(w.fire.count)w.fire.instanceMatrix.needsUpdate=true;
    const lightning=["thunder","severe","hurricane","typhoon"].includes(event);
    if(w.light)w.light.intensity=lightning&&Math.sin(t*3)*Math.sin(t*15)>.86?80:0;
    const tornado=event==="severe"||event==="cataclysm";
    if(w.tornado)w.tornado.visible=tornado;
    if(w.tornado)w.tornado.rotation.y=t*.8;
  }
  function setStageObjects(w){
    const tornado=m(0x73838a,.98);
    const cone=new THREE.Mesh(new THREE.CylinderGeometry(4,.2,23,9,7,true),tornado);
    geometries.push(cone.geometry);cone.position.set(w.edge+w.dir*38,13,-25);
    cone.visible=false;w.city.add(cone);w.tornado=cone;
    const flash=new THREE.PointLight(0xc2dcff,0,55);flash.position.set(w.edge+w.dir*34,25,-12);w.city.add(flash);w.light=flash;
  }
  for(const w of worlds)setStageObjects(w);
  function apply(){
    for(const w of worlds)rebuildWorld(w);
    const [region,capital]=STATES[state.index];
    if(ui){
      ui.querySelector("#tfCapitalState").value=String(state.index);
      ui.querySelector("#tfCapitalActivity").value=state.event;
      ui.querySelector("#tfCapitalName").textContent="CAPITAL • "+capital;
    }
    if(status){
      status.textContent=region+" — "+capital+" | "+EVENTS.find(x=>x[0]===state.event)[1]+" | simulated / illustrative, not live";
    }
    try{localStorage.setItem(KEY,JSON.stringify({index:state.index,event:state.event}));}catch{}
  }
  function makeUI(){
    const panel=document.createElement("section");panel.id="tfCapitalDock";
    panel.setAttribute("aria-label","State capital exterior emulator");
    panel.style.cssText="position:fixed;right:14px;top:92px;z-index:22;width:min(268px,34vw);max-height:calc(100vh - 115px);overflow:auto;background:rgba(4,14,25,.92);border:1px solid #356b82;border-radius:9px;padding:10px;box-shadow:0 9px 28px #0009;color:#e3f0f6;font:12px Segoe UI,Arial;display:none";
    const heading=document.createElement("strong");heading.textContent="EXTERIOR • STATE CAPITAL";
    heading.style.cssText="display:block;letter-spacing:.08em;margin-bottom:7px";
    const stateLabel=document.createElement("label");stateLabel.textContent="State / District";
    stateLabel.style.cssText="display:block;margin:7px 0 4px";
    const select=document.createElement("select");select.id="tfCapitalState";
    select.setAttribute("aria-label","Select state or Washington DC");
    select.style.cssText="width:100%;background:#10263a;color:#e8f2ff;padding:6px;border:1px solid #47778e";
    STATES.forEach(([region,capital],idx)=>{const option=document.createElement("option");option.value=String(idx);option.textContent=region;select.append(option);});
    const capitalName=document.createElement("div");capitalName.id="tfCapitalName";
    capitalName.style.cssText="font-weight:bold;margin:7px 0 10px";
    const activityLabel=document.createElement("label");activityLabel.textContent="Activity / World event";
    activityLabel.htmlFor="tfCapitalActivity";activityLabel.style.cssText="display:block;margin:7px 0 4px";
    const activity=document.createElement("select");activity.id="tfCapitalActivity";
    activity.style.cssText=select.style.cssText;
    EVENTS.forEach(([key,label],idx)=>{const option=document.createElement("option");option.value=key;option.textContent=label;
      activity.append(option);});
    const note=document.createElement("small");
    note.textContent="Local 3D fiction and weather effects; no live feeds. Historic scenario is symbolic, non-graphic and set in NYC, not Albany.";
    note.style.cssText="display:block;color:#a6c1d1;margin-top:8px;line-height:1.4";
    status=document.createElement("p");status.setAttribute("role","status");
    status.style.cssText="border-top:1px solid #35556a;padding-top:7px;color:#80e4ec;font-size:11px";
    select.addEventListener("change",()=>{state.index=Number(select.value);apply();});
    activity.addEventListener("change",()=>{state.event=activity.value;apply();});
    panel.append(heading,stateLabel,select,capitalName,activityLabel,activity,note,status);
    document.body.append(panel);ui=panel;
    const hud=document.getElementById("hud");
    const visibility=()=>{panel.style.display=hud&&!hud.hidden?"block":"none";};
    visibility();
    if(hud)new MutationObserver(visibility).observe(hud,{attributes:true,attributeFilter:["hidden"]});
  }
  apply();makeUI();
  const tick=()=>{
    raf=requestAnimationFrame(tick);
    const dt=Math.min(clock.getDelta(),.05);state.time+=dt;frame++;
    if(frame%2)return;
    for(const w of worlds)animateWorld(w,dt,state.time);
  };
  tick();
  const api=Object.freeze({
    states:Object.freeze(STATES.map(x=>Object.freeze([...x]))),
    events:Object.freeze(EVENTS.map(x=>Object.freeze([...x]))),
    getCurrent:()=>Object.freeze({state:STATES[state.index][0],capital:STATES[state.index][1],event:state.event,representation:"illustrative"}),
    select:(region,event)=>{
      const idx=STATES.findIndex(x=>x[0]===region);if(idx<0)throw Error("Unknown state");
      if(event!==undefined&&!EVENTS.some(x=>x[0]===event))throw Error("Unknown event");
      state.index=idx;if(event!==undefined)state.event=event;apply();return api.getCurrent();
    },
    dispose:()=>{
      cancelAnimationFrame(raf);if(ui)ui.remove();scene.remove(root);
      geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());
      if(windowObject.tfCapitalWorld===api)delete windowObject.tfCapitalWorld;
    }
  });
  windowObject.tfCapitalWorld=api;
  return api;
}
