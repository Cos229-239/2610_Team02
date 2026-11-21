/* TowerFlow 3D Exterior V1 — experimental but actual geometry, not a painted skyline.
   Opt-in; exact existing atrium window only. No floor, renderer, camera, or auth changes.
   City is procedural fiction, not geographically surveyed architecture.
*/
export const CITY_VERSION='tf-exterior-3d-v1';
const near=(a,b,e=.04)=>Math.abs(a-b)<e;
export function locateAtriumWindow(scene){
  const atrium=scene.getObjectByName('TF_REFERENCE_ATRIUM_V2');
  if(!atrium)throw Error('Reference atrium not found');
  const hits=[];
  atrium.traverse(o=>{
    const p=o.geometry?.parameters;
    if(!o.isMesh||!p||!o.material?.map?.image)return;
    if(near(p.width,12)&&near(p.height,5.5)&&near(o.position.x,-20.66)&&near(o.position.y,6.6)&&near(o.position.z,0))hits.push(o);
  });
  if(hits.length!==1)throw Error('Cannot locate unique atrium window: '+hits.length);
  return hits[0];
}
export function locateAtriumWall(scene){
  const hits=[];
  scene.traverse(o=>{
    const p=o.geometry?.parameters;
    if(!o.isMesh||!p||o.parent!==scene)return;
    if(near(p.width,.6)&&near(p.height,11)&&near(p.depth,32)&&near(o.position.x,-21)&&near(o.position.y,5.5)&&near(o.position.z,0))hits.push(o);
  });
  if(hits.length!==1)throw Error('Cannot locate unique atrium wall: '+hits.length);
  return hits[0];
}
export function installCityExterior3D({THREE,scene,renderer,camera,document:doc=document,window:win=window}){
  if(!THREE||!scene||!renderer||!camera)throw Error('Missing TowerFlow graphics engine');
  if(win.tfCityExterior3D)return win.tfCityExterior3D;
  const glass=locateAtriumWindow(scene),wall=locateAtriumWall(scene);
  const group=new THREE.Group();group.name='TF_EXTERIOR_CITY_ACTUAL_3D_V1';
  const mat=(color,roughness=.82,metalness=.08)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const palette={
    road:mat('#19232c',.72),sidewalk:mat('#515c61',.91),line:mat('#a0aba2',.95),
    brick:mat('#384655',.87),concrete:mat('#52616c',.86),steel:mat('#293c4c',.57,.34),
    dark:mat('#1b2a36',.68),roof:mat('#232e38',.78),frame:mat('#171f2a',.5,.3),
    warm:new THREE.MeshBasicMaterial({color:'#ffc17a'}),cool:new THREE.MeshBasicMaterial({color:'#a8d6ee'}),
    muted:new THREE.MeshBasicMaterial({color:'#354957'}),
    head:new THREE.MeshBasicMaterial({color:'#fff6cb'}),tail:new THREE.MeshBasicMaterial({color:'#d95343'}),
    snow:mat('#b8cbd7',.97),rain:new THREE.PointsMaterial({color:'#a6d7f0',size:.065,transparent:true,opacity:.55,depthWrite:false})
  };
  const geometries=new Set();
  function box(parent,w,h,d,x,y,z,material){
    const g=new THREE.BoxGeometry(w,h,d);geometries.add(g);
    const m=new THREE.Mesh(g,material);m.position.set(x,y,z);parent.add(m);return m;
  }
  const rng=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const rand=rng(37021),animation=[];
  const frontage=[-66,-53,-40,-27,-14,-1,12,25,38,51,64];
  function tower(cx,cz,w,d,height,style){
    const b=new THREE.Group();b.position.set(cx,0,cz);group.add(b);
    const base=style===0?palette.brick:style===1?palette.concrete:palette.steel;
    box(b,w,height,d,0,height/2,0,base);
    box(b,w+.5,.28,d+.5,0,height+.14,0,palette.roof);
    if(style===2){
      for(const sx of [-1,1])box(b,.08,height-.7,d+.18,sx*(w/2+.03),height/2,0,palette.frame);
    }
    if(height>20){
      box(b,w*.58,1.8,d*.48,0,height+1.1,0,palette.dark);
      if(rand()>.5)box(b,.07,3,.07,0,height+3.5,0,palette.frame);
    }
    // Instanced facade mullions: geometry in world units, varied room illumination.
    const levels=Math.floor((height-2)/2.15),columns=Math.max(2,Math.floor((d-1)/1.55));
    const litCount=levels*columns*2;
    if(litCount){
      const shape=new THREE.PlaneGeometry(.82,1.18);geometries.add(shape);
      const paletteWindows=[palette.warm,palette.cool,palette.muted];
      const batches=paletteWindows.map(material=>{
        const mesh=new THREE.InstancedMesh(shape,material,litCount);
        mesh.count=0;mesh.frustumCulled=false;b.add(mesh);return mesh;
      });
      const obj=new THREE.Object3D(),counts=[0,0,0];
      for(let side of [-1,1])for(let level=0;level<levels;level++)for(let col=0;col<columns;col++){
        const index=rand()<.17?0:rand()<.65?1:2;
        obj.position.set(side*(w/2+.015),1.55+level*2.15,-d/2+.9+col*(d-1.8)/Math.max(1,columns-1));
        obj.rotation.set(0,side*Math.PI/2,0);obj.updateMatrix();
        batches[index].setMatrixAt(counts[index]++,obj.matrix);
      }
      batches.forEach((mesh,i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true});
    }
    // Cornices and darker glazing bands give realistic architectural rhythm.
    if(style===0){
      for(let y=8;y<height-1;y+=8)box(b,w+.14,.16,d+.14,0,y,0,palette.frame);
    }
    return b;
  }
  const dispose=[];
  let active=true,mode='dusk',last=0,raf=0,frameCount=0,drawCalls=0;
  // Preserve solid original wall/window and replace wall only with its exact framed aperture.
  // Glass remains hidden while 3D is active. No other existing scene object is changed.
  const prior={wall:wall.visible,glass:glass.visible};
  try{
    box(group,.6,11,9.8,-21,5.5,-11.1,wall.material);
    box(group,.6,11,9.8,-21,5.5,11.1,wall.material);
    box(group,.6,3.7,12.4,-21,1.85,0,wall.material);
    box(group,.6,1.6,12.4,-21,10.2,0,wall.material);
    // Do not duplicate the original atrium window mullions.
    // Its original frame already exists at x=-20.58, z=[-6,-3,0,3,6].
    // The extra 3D mullions from V1 produced double-thick/oblique grids.
    // Near (21–42 units), mid (42–76 units), far (76–118 units).
    box(group,96,.34,146,-70,-.52,0,palette.sidewalk);
    box(group,12,.05,146,-30,-.28,0,palette.road);
    box(group,13,.05,146,-60,-.28,0,palette.road);
    for(const x of [-36,-54,-67]){
      for(let z=-67;z<67;z+=10)box(group,.12,.02,3.7,x,-.22,z,palette.line);
    }
    // Keep a clear setback from the pane so nearby facades do not loom
    // across the full window. Source uses scene units, not metres.
    for(const x of [-53,-83,-108]){
      for(const z of frontage){
        if(Math.abs(z)<17&&x===-53)continue;
        const d=7+rand()*5,w=7+rand()*4;
        const h=x===-53?9+rand()*17:x===-83?18+rand()*32:23+rand()*42;
        tower(x,z,w,d,h,Math.floor(rand()*3));
      }
    }
    // Foreground real-height streetlamps with point illumination sampled sparsely.
    for(let z=-57;z<=57;z+=20){
      box(group,.13,5,.13,-39,2.4,z,palette.frame);
      box(group,1.9,.1,.13,-38.1,4.9,z,palette.frame);
      const lamp=new THREE.PointLight(0xffc992,4.5,9,2);
      lamp.position.set(-37.4,4.7,z);group.add(lamp);
    }
    // Actual moving vehicles: car bodies and headlights are world geometry.
    const cars=[];
    for(let i=0;i<12;i++){
      const isNear=i%2===0;
      const vehicle=new THREE.Group();group.add(vehicle);
      const x=isNear?-30:-59;
      const z=-65+i*12;
      vehicle.position.set(x,0,z);
      box(vehicle,1.3,.72,2.8,0,.48,0,isNear?palette.dark:palette.brick);
      box(vehicle,1.08,.48,1.4,0,1.02,-.24,palette.steel);
      for(const dx of [-.42,.42]){
        box(vehicle,.22,.2,.045,dx,.55,isNear?-1.43:1.43,isNear?palette.head:palette.tail);
      }
      cars.push({vehicle,velocity:(isNear?1:-1)*(2.5+rand()*3),z});
    }
    const rainPositions=new Float32Array(1900*3);
    for(let i=0;i<1900;i++){
      rainPositions[i*3]=-23-rand()*85;rainPositions[i*3+1]=rand()*35;rainPositions[i*3+2]=(rand()-.5)*130;
    }
    const particleGeometry=new THREE.BufferGeometry();
    particleGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
    geometries.add(particleGeometry);
    const particles=new THREE.Points(particleGeometry,palette.rain);particles.visible=false;group.add(particles);
    const snowfall=new THREE.PointsMaterial({color:'#edf5fa',size:.16,transparent:true,opacity:.82,depthWrite:false});
    const wet=new THREE.MeshStandardMaterial({color:'#17252d',roughness:.19,metalness:.38});
    const roadMats=[palette.road,wet];
    // Controls don't cover navigation: tiny inspector placed above original HUD.
    const panel=doc.createElement('div');
    panel.id='tf-city3d-probe';
    panel.style.cssText='position:fixed;bottom:104px;right:12px;z-index:100002;background:#07111ddf;border:1px solid #4b7c8a;border-radius:7px;padding:8px;color:#d8ecf2;font:12px system-ui,sans-serif;display:flex;gap:6px;align-items:center';
    const label=doc.createElement('span');label.textContent='CITY • 3D';panel.append(label);
    const button=(text,action)=>{
      const b=doc.createElement('button');b.textContent=text;b.type='button';
      b.style.cssText='padding:4px 7px;color:white;background:#183545;border:1px solid #4b7c8a;border-radius:4px;cursor:pointer';
      b.addEventListener('click',action);panel.append(b);return b;
    };
    const rainRoads=[];group.traverse(o=>{if(o.isMesh&&o.material===palette.road)rainRoads.push(o)});
    const particleMaterial=particles.material;
    const setMode=(next)=>{
      if(!['dusk','rain','snow'].includes(next))throw Error('Unknown city mode');
      mode=next;particles.visible=next!=='dusk';
      particleMaterial.color.set(next==='snow'?'#e9f2ff':'#a6d7f0');
      particleMaterial.size=next==='snow'?.16:.065;
      for(const road of rainRoads)road.material=next==='rain'?wet:palette.road;
      label.textContent='CITY • 3D • '+next.toUpperCase();
    };
    const stop=()=>{
      if(!active)return;
      active=false;win.cancelAnimationFrame(raf);
      wall.visible=prior.wall;glass.visible=prior.glass;
      scene.remove(group);panel.remove();
      for(const g of geometries)g.dispose();
      const used=new Set(Object.values(palette));used.add(snowfall);used.add(wet);
      for(const m of used)m.dispose();
      if(win.tfCityExterior3D===api)delete win.tfCityExterior3D;
    };
    button('Dusk',()=>setMode('dusk'));
    button('Rain',()=>setMode('rain'));
    button('Snow',()=>setMode('snow'));
    button('Restore',stop);
    const api=Object.freeze({
      get state(){return {active,mode,frames:frameCount,drawCalls,originalFloorUntouched:true}},
      setMode,dispose:stop
    });
    scene.add(group);wall.visible=false;glass.visible=false;doc.body.append(panel);
    const tick=(time)=>{
      if(!active)return;raf=win.requestAnimationFrame(tick);
      const delta=Math.min(.05,Math.max(0,(time-last)/1000));last=time;
      for(const car of cars){
        car.vehicle.position.z+=car.velocity*delta;
        if(car.vehicle.position.z>75)car.vehicle.position.z=-75;
        if(car.vehicle.position.z< -75)car.vehicle.position.z=75;
      }
      if(particles.visible){
        const p=particleGeometry.attributes.position.array;
        for(let i=0;i<p.length;i+=3){
          p[i+1]-=(mode==='rain'?13:2.1)*delta;
          p[i]+=mode==='rain'?-1.5*delta:.3*delta;
          if(p[i+1]<-.1)p[i+1]=24+(i%17);
          if(p[i]<-115)p[i]=-23;
        }
        particleGeometry.attributes.position.needsUpdate=true;
      }
      frameCount++;drawCalls=renderer.info?.render?.calls??0;
    };
    raf=win.requestAnimationFrame(tick);
    win.tfCityExterior3D=api;
    return api;
  }catch(error){
    wall.visible=prior.wall;glass.visible=prior.glass;
    scene.remove(group);
    for(const g of geometries)g.dispose();
    for(const m of Object.values(palette))m.dispose();
    throw error;
  }
}
