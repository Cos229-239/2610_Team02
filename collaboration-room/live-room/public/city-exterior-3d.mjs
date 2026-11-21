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
  // Room and main camera retain their coordinates. Street is 21 storeys below in scene units.
  const STREET_LEVEL=-70; // illustration, not surveyed real-world metres
  const urban=new THREE.Group();urban.name='TF_CITY_STREET_21';
  urban.position.y=STREET_LEVEL;group.add(urban);
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
    const b=new THREE.Group();b.position.set(cx,0,cz);urban.add(b);
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
      // Apartment/hotel detail: recessed blinds, side curtains and people.
      // Place all details just above the illuminated facade to retain real depth.
      // Instancing avoids one draw call per window.
      const blindsMat=new THREE.MeshBasicMaterial({color:'#8d9394',side:THREE.DoubleSide});
      const curtainMat=new THREE.MeshBasicMaterial({color:'#76697c',side:THREE.DoubleSide});
      const silhouetteMat=new THREE.MeshBasicMaterial({color:'#101823',side:THREE.DoubleSide});
      const blindShape=new THREE.PlaneGeometry(.76,.13),curtainShape=new THREE.PlaneGeometry(.23,1.12);
      const personShape=new THREE.PlaneGeometry(.25,.62);
      geometries.add(blindShape);geometries.add(curtainShape);geometries.add(personShape);
      const max=litCount,blinds=new THREE.InstancedMesh(blindShape,blindsMat,max);
      const curtains=new THREE.InstancedMesh(curtainShape,curtainMat,max*2);
      const people=new THREE.InstancedMesh(personShape,silhouetteMat,max);
      blinds.count=0;curtains.count=0;people.count=0;
      b.add(blinds,curtains,people);
      const blindObj=new THREE.Object3D(),curtainObj=new THREE.Object3D(),personObj=new THREE.Object3D();
      let bc=0,cc=0,pc=0;
      const personStates=[];
      for(const side of [-1,1])for(let level=0;level<levels;level++)for(let col=0;col<columns;col++){
        const x=side*(w/2+.034);
        const y=1.55+level*2.15;
        const z=-d/2+.9+col*(d-1.8)/Math.max(1,columns-1);
        const orientation=side*Math.PI/2;
        const fate=rand();
        if(fate<.27){
          blindObj.rotation.set(0,orientation,0);
          blindObj.position.set(x,y+.31,z);
          blindObj.updateMatrix();blinds.setMatrixAt(bc++,blindObj.matrix);
        }else if(fate<.49){
          for(const sign of [-1,1]){
            curtainObj.rotation.set(0,orientation,0);
            curtainObj.position.set(x,y,z+sign*.31);
            curtainObj.updateMatrix();curtains.setMatrixAt(cc++,curtainObj.matrix);
          }
        }else if(fate>.954 && pc<max){
          // A shadowed tenant slowly peeks/moves behind a hotel/apartment window.
          personObj.rotation.set(0,orientation,0);
          personObj.position.set(x,y-.22,z);
          personObj.updateMatrix();people.setMatrixAt(pc++,personObj.matrix);
          personStates.push({x,y:y-.22,z,rotation:orientation,seed:rand()*6.28});
        }
      }
      for(const [mesh,count] of [[blinds,bc],[curtains,cc],[people,pc]]){
        mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
      }
      animation.push({people,personStates,personObj,blindsMat,curtainMat,silhouetteMat});
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
  // The old 12x5.5 painted aperture and its trims visually divide the exterior into
  // a square inset. The entire 32x11 room wall now becomes the window.
  const originalTrims=[];
   const leftHitTargets=[];
   scene.traverse(object=>{
     if(object.userData?.tfWall==='left'&&object.isMesh){
       leftHitTargets.push({object,raycast:object.raycast});
     }
   });
   if(leftHitTargets.length!==1)throw Error('Expected exactly one left wall hit target; found '+leftHitTargets.length);
  const atrium=scene.getObjectByName('TF_REFERENCE_ATRIUM_V2');
  for(const object of atrium.children){
    const p=object.geometry?.parameters;
    if(!object.isMesh||!p||object===glass)continue;
    // Exact old mullion/rail meshes: x=-20.58, z near old 12-unit canvas.
    const isMullion=near(object.position.x,-20.58)&&near(object.position.y,6.6)&&
      [-6,-3,0,3,6].some(z=>near(object.position.z,z))&&near(p.width,.08)&&near(p.height,5.7);
    const isRail=near(object.position.x,-20.58)&&near(object.position.z,0)&&
      [9.4,3.8].some(y=>near(object.position.y,y))&&near(p.width,.08)&&near(p.height,.1);
    if(isMullion||isRail)originalTrims.push({object,visible:object.visible});
  }
  try{
    // Full-wall panoramic glazing: 32 wide × 11 high, continuous skyline/sky.
    // No solid lower wall or side wall sections. This replaces the inset square.
    // Minimal window framing is aligned to one plane, not offset overlapping bars.
    for(const z of [-15.82,-10.55,-5.28,0,5.28,10.55,15.82])
      box(group,.09,10.9,.115,-20.57,5.5,z,palette.frame);
    for(const y of [.13,10.91])
      box(group,.09,.11,31.7,-20.57,y,0,palette.frame);
    originalTrims.forEach(({object})=>{object.visible=false});
    // Disable click-through to projector while glass is active; restore on disposal.
    leftHitTargets.forEach(({object})=>{object.raycast=()=>{};});
    // Continuous gradient sky closes the camera's old painted background.
    // Face of sky is ~100 scene units beyond glass, safely within far clip 130.
    // Multiple broad horizontal strips avoid a distinct square or visible image edges.
    const skyCanvas=doc.createElement('canvas');
    skyCanvas.width=8;skyCanvas.height=512;
    const skyctx=skyCanvas.getContext('2d');
    if(skyctx){
      const gradient=skyctx.createLinearGradient(0,0,0,512);
      gradient.addColorStop(0,'#081326');
      gradient.addColorStop(.42,'#17203e');
      gradient.addColorStop(.78,'#4c526c');
      gradient.addColorStop(1,'#9b7890');
      skyctx.fillStyle=gradient;skyctx.fillRect(0,0,8,512);
    }
    const skyTexture=new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace=THREE.SRGBColorSpace;
    const skyMat=new THREE.MeshBasicMaterial({map:skyTexture,side:THREE.DoubleSide,depthWrite:false,fog:false});
    // A rectangular back plane produces exactly the square/distant-picture artifact
    // seen through the viewport. Render a seamless sky enclosure instead.
    const skyGeo=new THREE.SphereGeometry(119,48,24);geometries.add(skyGeo);
    skyMat.side=THREE.BackSide;
    const sky=new THREE.Mesh(skyGeo,skyMat);
    sky.position.copy(camera.position);
    sky.position.y=0;
    sky.renderOrder=-1000;
    sky.frustumCulled=false;
    group.add(sky);
    // Street lights and structures run below the continuous open sky.
    box(urban,96,.34,146,-70,-.52,0,palette.sidewalk);
    box(urban,12,.05,146,-30,-.28,0,palette.road);
    box(urban,13,.05,146,-60,-.28,0,palette.road);
    for(const x of [-36,-54,-67]){
      for(let z=-67;z<67;z+=10)box(urban,.12,.02,3.7,x,-.22,z,palette.line);
    }
    // Keep a clear setback from the pane so nearby facades do not loom
    // across the full window. Source uses scene units, not metres.
    for(const x of [-53,-83,-108]){
      for(const z of frontage){
        if(Math.abs(z)<17&&x===-53)continue;
        const d=7+rand()*5,w=7+rand()*4;
        const h=x===-53?42+rand()*22:x===-83?72+rand()*35:105+rand()*40;
        tower(x,z,w,d,h,Math.floor(rand()*3));
      }
    }
    // Foreground real-height streetlamps with point illumination sampled sparsely.
    for(let z=-57;z<=57;z+=20){
      box(urban,.13,5,.13,-39,2.4,z,palette.frame);
      box(urban,1.9,.1,.13,-38.1,4.9,z,palette.frame);
      const lamp=new THREE.PointLight(0xffc992,4.5,9,2);
      lamp.position.set(-37.4,4.7,z);urban.add(lamp);
    }
    // Actual moving vehicles: car bodies and headlights are world geometry.
    const cars=[];
    for(let i=0;i<12;i++){
      const isNear=i%2===0;
      const vehicle=new THREE.Group();urban.add(vehicle);
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
      rainPositions[i*3]=-23-rand()*85;rainPositions[i*3+1]=STREET_LEVEL+rand()*95;rainPositions[i*3+2]=(rand()-.5)*130;
    }
    const particleGeometry=new THREE.BufferGeometry();
    particleGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
    geometries.add(particleGeometry);
    const particles=new THREE.Points(particleGeometry,palette.rain);particles.visible=false;group.add(particles);
    const snowfall=new THREE.PointsMaterial({color:'#edf5fa',size:.16,transparent:true,opacity:.82,depthWrite:false});
    const wet=new THREE.MeshStandardMaterial({color:'#17252d',roughness:.19,metalness:.38});
    const lightning=new THREE.PointLight(0xd5e7ff,0,115,2);
    lightning.position.set(-65,64,0);group.add(lightning);
    const chaos={enabled:false,scheme:'normal',events:0};
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
      if(!['dusk','rain','snow','storm','blackout','rush'].includes(next))throw Error('Unknown city mode');
      mode=next;chaos.enabled=['storm','blackout','rush'].includes(next);
      chaos.scheme=next;
      particles.visible=['rain','snow','storm'].includes(next);
      particleMaterial.color.set(next==='snow'?'#e9f2ff':'#a6d7f0');
      particleMaterial.size=next==='snow'?.16:.065;
      for(const road of rainRoads)road.material=['rain','storm'].includes(next)?wet:palette.road;
      for(const m of [palette.warm,palette.cool])m.color.set(next==='blackout'?'#26343d':m===palette.warm?'#ffc17a':'#a8d6ee');
      label.textContent='CITY • 3D • '+next.toUpperCase();
    };
    const stop=()=>{
      if(!active)return;
      active=false;win.cancelAnimationFrame(raf);
      wall.visible=prior.wall;glass.visible=prior.glass;
      originalTrims.forEach(({object,visible})=>{object.visible=visible});
      leftHitTargets.forEach(({object,raycast})=>{object.raycast=raycast});
      scene.remove(group);panel.remove();
      for(const g of geometries)g.dispose();
      const used=new Set(Object.values(palette));used.add(snowfall);used.add(wet);used.add(skyMat);
      for(const a of animation)for(const key of ['blindsMat','curtainMat','silhouetteMat'])used.add(a[key]);
      skyTexture.dispose();
      for(const m of used)m.dispose();
      if(win.tfCityExterior3D===api)delete win.tfCityExterior3D;
    };
    button('Dusk',()=>setMode('dusk'));
    button('Rain',()=>setMode('rain'));
    button('Snow',()=>setMode('snow'));
    // These are only experimental effects, NOT the owner's previously specified Chaos Schemes.
    // Do not mislabel or promote them as the complete chaos implementation.
    const weatherButton=button('Storm / Blackout / Rush',()=>{
      const options=['storm','blackout','rush'];
      const next=options[(options.indexOf(mode)+1)%options.length];setMode(next);
    });
    weatherButton.title='Provisional effects only; original Chaos Schemes are not implemented here';
    button('Restore',stop);
    const api=Object.freeze({
      get state(){return {active,mode,frames:frameCount,drawCalls,streetLevel:STREET_LEVEL,observerStorey:21,leftWindowClickable:false,originalFloorUntouched:true}},
      setMode,dispose:stop
    });
    scene.add(group);wall.visible=false;glass.visible=false;doc.body.append(panel);
    const tick=(time)=>{
      if(!active)return;raf=win.requestAnimationFrame(tick);
      // Keep the background enclosure centred on the viewer so its silhouette never
      // appears as a rectangular photograph when looking up or sideways.
      sky.position.copy(camera.position);
      const delta=Math.min(.05,Math.max(0,(time-last)/1000));last=time;
      for(const car of cars){
        car.vehicle.position.z+=car.velocity*delta*(mode==='rush'?2.5:1);
        if(car.vehicle.position.z>75)car.vehicle.position.z=-75;
        if(car.vehicle.position.z< -75)car.vehicle.position.z=75;
      }
      // Update only existing tenant instances; no new meshes per animation frame.
      if((frameCount%5)===0){
        for(const resident of animation){
          const {people,personStates,personObj}=resident;
          for(let i=0;i<personStates.length;i++){
            const p=personStates[i];
            personObj.rotation.set(0,p.rotation,0);
            personObj.position.set(p.x,p.y+Math.sin(time*.00035+p.seed)*.16,p.z);
            personObj.updateMatrix();people.setMatrixAt(i,personObj.matrix);
          }
          if(personStates.length)people.instanceMatrix.needsUpdate=true;
        }
      }
      if(mode==='storm'){
        lightning.intensity=Math.sin(time*.0013)> .998?150:Math.sin(time*.0013)>.995?28:0;
        if(lightning.intensity>0)chaos.events++;
      }else{lightning.intensity=0}
      if(particles.visible){
        const p=particleGeometry.attributes.position.array;
        for(let i=0;i<p.length;i+=3){
          p[i+1]-=(mode==='rain'||mode==='storm'?13:2.1)*delta;
          p[i]+=(mode==='rain'||mode==='storm')?-1.5*delta:.3*delta;
          if(p[i+1]<STREET_LEVEL)p[i+1]=STREET_LEVEL+85+(i%17);
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
    originalTrims.forEach(({object,visible})=>{object.visible=visible});
      leftHitTargets.forEach(({object,raycast})=>{object.raycast=raycast});
    scene.remove(group);
    for(const g of geometries)g.dispose();
    for(const m of Object.values(palette))m.dispose();
    for(const a of animation)for(const key of ['blindsMat','curtainMat','silhouetteMat'])a[key].dispose();
    throw error;
  }
}
