/* TF_FRONTIER_CINEMATIC_FIDELITY_V1 — optional original-room PBR detail and reviewed local GLB mounting.
 * Never replaces scene, renderer, controls, lighting, world state, or input handlers.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowCinematicFidelity=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const KEY="towerflow.frontier.cinematic-fidelity.v1";
  const installed=new WeakMap();
  const box=(x,y,z,w,h,d)=>Object.freeze({x,y,z,w,h,d});
  function layout(){
    const chassis=[],signal=[],optics=[];
    // Server-blade housings are inset into the left perimeter; no traversable-floor obstruction.
    for(const z of [-11.2,-8.4,-5.6,-2.8,0,2.8,5.6,8.4]){
      chassis.push(box(-19.82,4.9,z,.09,5.9,1.18));
      for(const y of [2.65,3.14,3.63,4.12,4.61,5.10,5.59,6.08,6.57]){
        chassis.push(box(-19.72,y,z,.12,.20,.95));
        signal.push(box(-19.635,y,z-.29,.045,.035,.16));
        signal.push(box(-19.635,y,z+.29,.045,.035,.16));
      }
    }
    // Back-left optical terminals, outside every projector wall rectangle.
    for(const x of [-18.05,-16.65,-15.25,-13.85]){
      for(const y of [2.1,3.5,4.9,6.3]){
        optics.push(Object.freeze({x,y,z:14.67,r:.19}));
      }
    }
    const safe=p=>p.x>=-20.58&&p.x<=20.58&&p.z>=-15.28&&p.z<=15.28 &&
      !(p.z< -14.7&&Math.abs(p.x)<9.6&&p.y<8.5) &&
      !(Math.abs(p.x)>19.9&&Math.abs(p.z)<9.6&&p.y>1.8&&p.y<8.5) &&
      Math.hypot(p.x-16.9,p.z-12.4)>2;
    // Left-wall blades are a reviewed exception to a generic *screen* corridor:
    // side projection is at +X; this installation is at -X and confined behind -19.6.
    for(const p of [...chassis,...signal,...optics]){
      if(![p.x,p.y,p.z].every(Number.isFinite)||!safe(p))throw Error("Optics intersect protected world zones");
    }
    return Object.freeze({chassis:Object.freeze(chassis),signal:Object.freeze(signal),
      optics:Object.freeze(optics),instances:chassis.length+signal.length+optics.length,
      estimatedDrawCalls:3});
  }
  function approveManifest(m){
    if(!m||typeof m!=="object"||Array.isArray(m))throw Error("Approved asset manifest required");
    if(!/^\/assets\/frontier\/[a-zA-Z0-9_/-]+\.glb$/.test(m.url) ||
       m.url.includes("//")||m.url.includes(".."))
      throw Error("GLB must be an explicitly local Frontier asset");
    if(!/^[a-f0-9]{64}$/i.test(m.sha256))throw Error("Expected SHA-256 is required");
    if(!["owner","licensed","permission","public-domain"].includes(m.rights))
      throw Error("Rights record required");
    if(typeof m.source!=="string"||m.source.length<8||m.source.length>400)
      throw Error("Asset origin required");
    const v=m.position;
    if(!v||![v.x,v.y,v.z].every(Number.isFinite)||v.y<.5||v.y>8.5||
       !(v.x< -19.1 && Math.abs(v.z)<=12 || v.x< -11 && v.z>=14.3&&v.z<=14.85))
      throw Error("GLB placement must be in the reserved decorative perimeter");
    if(m.scale!==undefined && (!Number.isFinite(m.scale)||m.scale<=0||m.scale>3))
      throw Error("Invalid model scale");
    return Object.freeze({url:m.url,sha256:m.sha256.toLowerCase(),rights:m.rights,
      source:m.source,position:Object.freeze({...v}),scale:m.scale??1});
  }
  function assertEmbeddedGLB(data){
    if(!(data instanceof ArrayBuffer)||data.byteLength<20||data.byteLength>25*1024*1024)
      throw Error("Invalid or over-budget GLB");
    const v=new DataView(data);
    if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
       v.getUint32(8,true)!==data.byteLength||v.getUint32(16,true)!==0x4e4f534a)
      throw Error("GLB v2 envelope required");
    const size=v.getUint32(12,true);
    if(size<2||size>1024*1024||20+size>data.byteLength)throw Error("GLB JSON chunk exceeds limit");
    const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,size)).replace(/[\u0000\s]+$/g,""));
    for(const row of [...(meta.buffers||[]),...(meta.images||[])]){
      if(row.uri!==undefined)throw Error("External GLB resource URI prohibited");
    }
    if(meta.extensionsRequired?.some(x=>typeof x!=="string"))throw Error("Invalid GLB extensions");
    return true;
  }
  function install({THREE,scene,renderer,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
    if(!THREE?.InstancedMesh||!THREE?.MeshStandardMaterial||!THREE?.Group||!scene?.add||!scene?.remove)
      throw Error("Original Three.js scene required");
    if(installed.has(scene))return installed.get(scene);
    const plan=layout(),group=new THREE.Group();group.name="TF_FRONTIER_CINEMATIC_FIDELITY_V1";
    group.userData.tfDecorativeOnly=true;
    const physical=THREE.MeshPhysicalMaterial||THREE.MeshStandardMaterial;
    const materials=[
      new physical({color:0x45596a,metalness:.92,roughness:.31,...(THREE.MeshPhysicalMaterial?{clearcoat:.16,clearcoatRoughness:.33}:{})}),
      new THREE.MeshStandardMaterial({color:0x153b51,metalness:.48,roughness:.37,emissive:0x1394d0,emissiveIntensity:.48}),
      new physical({color:0x1f3543,metalness:.72,roughness:.19,emissive:0x399dce,emissiveIntensity:.18,
        ...(THREE.MeshPhysicalMaterial?{clearcoat:.45,clearcoatRoughness:.15}:{})})
    ];
    const geometries=[new THREE.BoxGeometry(1,1,1),new THREE.BoxGeometry(1,1,1),
      new THREE.TorusGeometry(.19,.035,8,24)];
    const specs=[plan.chassis,plan.signal,plan.optics];
    const instance=new THREE.Object3D();
    specs.forEach((rows,k)=>{
      const m=new THREE.InstancedMesh(geometries[k],materials[k],rows.length);
      m.name=["COMPUTE_RACK_CERAMIC_METAL","NETWORK_FIBER_STATUS","OPTICAL_TERMINAL_RINGS"][k];
      m.userData.tfDecorativeOnly=true;m.castShadow=false;m.receiveShadow=false;m.raycast=()=>{};
      rows.forEach((p,i)=>{
        instance.position.set(p.x,p.y,p.z);
        instance.scale.set(p.w||1,p.h||1,p.d||1);
        instance.updateMatrix();
        m.setMatrixAt(i,instance.matrix);
      });
      m.instanceMatrix.needsUpdate=true;group.add(m);
    });
    let enabled=true,disposed=false,stamp=-Infinity;
    try{enabled=storage?.getItem(KEY)!=="off";}catch{}
    group.visible=enabled;scene.add(group);
    const loaded=[];
    const controller={
      setEnabled(flag){
        if(disposed)return false;enabled=Boolean(flag);group.visible=enabled;
        try{storage?.setItem(KEY,enabled?"on":"off");}catch{}
        return enabled;
      },
      update(now){
        if(disposed||!enabled||!Number.isFinite(now)||now-stamp<180)return;
        stamp=now;materials[1].emissiveIntensity=.43+.07*Math.sin(now*.00039);
      },
      async mountGLB({manifest,loader,fetcher=typeof fetch==="function"?fetch:null,cryptoApi=globalThis.crypto}={}){
        if(disposed)throw Error("Fidelity layer disposed");
        const entry=approveManifest(manifest);
        if(!loader||typeof loader.parseAsync!=="function"||typeof fetcher!=="function"||
           typeof cryptoApi?.subtle?.digest!=="function")
          throw Error("GLTFLoader, same-origin fetch and SHA-256 verification required");
        const response=await fetcher(entry.url,{credentials:"same-origin",cache:"no-store"});
        if(!response.ok||response.type==="opaque")throw Error("Asset fetch refused");
        const bytes=await response.arrayBuffer();
        assertEmbeddedGLB(bytes);
        const digest=Array.from(new Uint8Array(await cryptoApi.subtle.digest("SHA-256",bytes)))
          .map(v=>v.toString(16).padStart(2,"0")).join("");
        if(digest!==entry.sha256)throw Error("Asset SHA-256 mismatch");
        if(disposed)throw Error("Fidelity layer disposed");
        const output=await loader.parseAsync(bytes,"/assets/frontier/");
        const model=output?.scene;
        if(!model?.traverse||!model?.position?.set||!model?.scale?.setScalar)
          throw Error("GLB scene missing");
        model.traverse(obj=>{if(obj.isMesh){obj.userData.tfDecorativeOnly=true;obj.raycast=()=>{};
          obj.castShadow=false;obj.receiveShadow=false;}});
        model.position.set(entry.position.x,entry.position.y,entry.position.z);
        model.scale.setScalar(entry.scale);
        model.userData.tfDecorativeOnly=true;
        if(disposed)throw Error("Fidelity layer disposed");
        group.add(model);loaded.push(model);
        return Object.freeze({url:entry.url,rights:entry.rights,source:entry.source,
          sha256:entry.sha256,verifiedBytes:true});
      },
      stats(){
        const gpu=renderer?.info;
        return Object.freeze({enabled,proceduralDetails:plan.instances,
          estimatedAdditionalDrawCalls:plan.estimatedDrawCalls,
          loadedGLB:loaded.length,installedToOriginalScene:true,
          observedRendererCalls:Number.isFinite(gpu?.render?.calls)?gpu.render.calls:null,
          observedRendererTriangles:Number.isFinite(gpu?.render?.triangles)?gpu.render.triangles:null,
          verifiedFrameRate:null,globalLightingChanged:false,newAnimationLoops:0,
          userInputChanged:false,assetsArePhotogrammetry:false});
      },
      dispose(){
        if(disposed)return;disposed=true;scene.remove(group);
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
        // Imported GLB resources are owned by their caller; do not dispose shared materials.
        installed.delete(scene);
      }
    };
    installed.set(scene,controller);
    return controller;
  }
  return Object.freeze({KEY,layout,approveManifest,assertEmbeddedGLB,install});
});
