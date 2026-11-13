/* TF_FRONTIER_CYBER_AMBIENCE_V1: Non-interactive, instanced perimeter architecture. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowCyberAmbience=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const KEY="towerflow.frontier.cyber-ambience.v1";
  const activeScenes=new WeakMap();
  const box=(x,y,z,w,h,d)=>Object.freeze({x,y,z,w,h,d});
  // The original room is approximately x +/-20.58, z +/-15.28.
  // The wall projection spans +/-9.55m on any wall; leave it unobstructed.
  // AURA's orb near (16.9, 3.1, 12.4) remains clear.
  function layout(){
    const chrome=[],azure=[],violet=[];
    for(const side of [-1,1]){
      const x=side*20.08;
      for(const y of [.18,8.76])chrome.push(box(x,y,0,.075,.085,24));
      chrome.push(box(x,4.5,-12,.12,7.9,.2));
      for(const y of [1.25,2.4,3.55,4.7,5.85,7]){
        azure.push(box(side*19.97,y,-11.98,.035,.26,.06));
      }
      for(const z of [-10,-6,-2,2,6]){
        chrome.push(box(x,8.76,z,.25,.075,.095));
        azure.push(box(side*19.97,8.78,z,.035,.028,.4));
      }
      // Front projection is deliberately kept free of ornamentation.
      for(const y of [1.1,2.55,4,5.45,6.9,8.35]){
        chrome.push(box(side*19.35,y,-15.02,.1,.72,.12));
        violet.push(box(side*19.23,y,-14.94,.028,.21,.035));
      }
    }
    // Back-of-room and technical spine: architectural insets, not overlays.
    chrome.push(box(0,8.74,15.02,36,.075,.09));
    for(const x of [-16,-12,-8,-4,0,4,8,12]){
      chrome.push(box(x,8.75,14.97,.055,.22,.18));
      azure.push(box(x,8.78,14.82,.022,.055,.25));
    }
    // Thin metallic risers; avoid rear-right corner occupied by AURA.
    for(const x of [-18.9,-17.5,-16.1]){
      chrome.push(box(x,3.7,14.94,.095,6.2,.12));
      for(const y of [1.25,2.05,2.85,3.65,4.45,5.25,6.05])
        violet.push(box(x,y,14.82,.052,.10,.034));
    }
    const plans={chrome,azure,violet};
    for(const list of Object.values(plans)){
      for(const p of list){
        if(![p.x,p.y,p.z,p.w,p.h,p.d].every(Number.isFinite)||p.w<=0||p.h<=0||p.d<=0)
          throw Error("Invalid cyber scene geometry");
      }
    }
    return Object.freeze({
      chrome:Object.freeze(chrome),azure:Object.freeze(azure),violet:Object.freeze(violet),
      instances:chrome.length+azure.length+violet.length,drawCallBudget:3
    });
  }
  function install({THREE,scene,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
    if(!THREE?.InstancedMesh||!THREE?.MeshStandardMaterial||!THREE?.Object3D||!scene?.add||!scene?.remove)
      throw Error("Existing Three.js world scene required; no scene replacement");
    if(activeScenes.has(scene))return activeScenes.get(scene);
    const plan=layout();
    const geometry=new THREE.BoxGeometry(1,1,1);
    const materials=[
      new THREE.MeshStandardMaterial({color:0x263c49,metalness:.86,roughness:.27}),
      new THREE.MeshStandardMaterial({color:0x183b4b,metalness:.48,roughness:.30,emissive:0x30b6e8,emissiveIntensity:1.05}),
      new THREE.MeshStandardMaterial({color:0x32213f,metalness:.57,roughness:.35,emissive:0xb14ae3,emissiveIntensity:.68})
    ];
    const group=new THREE.Group();
    group.name="TF_FRONTIER_CYBER_AMBIENCE_V1";
    group.userData.tfDecorativeOnly=true;
    const proxy=new THREE.Object3D();
    const sizes=[plan.chrome,plan.azure,plan.violet];
    sizes.forEach((records,index)=>{
      const instanced=new THREE.InstancedMesh(geometry,materials[index],records.length);
      instanced.name=["CYBER_TITANIUM_BACKBONE","CYBER_FIBER_OPTIC_AZURE","CYBER_FIBER_OPTIC_VIOLET"][index];
      instanced.userData.tfDecorativeOnly=true;
      // Never take wall clicks, E interactions, pointer focus or doorway controls.
      instanced.raycast=()=>{};
      instanced.castShadow=false;
      instanced.receiveShadow=false;
      for(let i=0;i<records.length;i++){
        const p=records[i];
        proxy.position.set(p.x,p.y,p.z);
        proxy.scale.set(p.w,p.h,p.d);
        proxy.updateMatrix();
        instanced.setMatrixAt(i,proxy.matrix);
      }
      instanced.instanceMatrix.needsUpdate=true;
      group.add(instanced);
    });
    let enabled=true,lastUpdate=-Infinity;
    try{enabled=storage?.getItem(KEY)!=="off";}catch{enabled=true;}
    group.visible=enabled;
    scene.add(group);
    let disposed=false;
    const controller=Object.freeze({
      setEnabled(value){
        if(disposed)return false;
        enabled=Boolean(value);
        group.visible=enabled;
        try{storage?.setItem(KEY,enabled?"on":"off");}catch{}
        return enabled;
      },
      update(now){
        if(disposed||!enabled||!Number.isFinite(now)||now-lastUpdate<160)return;
        lastUpdate=now;
        // Single soft breathing curve. No extra animation loop, shadow or lights.
        materials[1].emissiveIntensity=.92+.13*Math.sin(now*.00043);
        materials[2].emissiveIntensity=.55+.11*Math.sin(now*.00036+1.1);
      },
      stats(){
        return Object.freeze({enabled,instances:plan.instances,estimatedExtraDrawCalls:plan.drawCallBudget,
          changesSceneBackground:false,lightsAdded:0,shadowCastersAdded:0,
          clickTargetsAdded:0,newAnimationLoops:0,verifiedFrameRate:null});
      },
      dispose(){
        if(disposed)return;
        disposed=true;scene.remove(group);
        geometry.dispose();materials.forEach(material=>material.dispose());
        activeScenes.delete(scene);
      }
    });
    activeScenes.set(scene,controller);
    return controller;
  }
  return Object.freeze({layout,install,KEY});
});
