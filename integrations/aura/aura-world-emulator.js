// TF_WORLD_EMULATION_V1_BEGIN
// Towerflow hidden object-vault renderer: photography-informed procedural sky,
// realistic-shaded 3D celestial exhibit, and centered ceiling messages.
// No filesystem, shell, model credentials, network, room state or server writes.
(function(){
  "use strict";
  const STORAGE="towerflow.world-emulation.v1";
  const THEMES=["sunset","solar-system","aurora","ceiling-text"];
  const colors={red:"#ff465d",orange:"#ffa63a",yellow:"#ffec74",green:"#59ffb1",blue:"#62bfff",purple:"#ae82ff",pink:"#ff73c5",white:"#f7fbff",gold:"#ffe19c",cyan:"#48f5e4"};
  const labels={"sunset":"REALISTIC SUNSET","solar-system":"SOLAR SYSTEM OBSERVATORY","aurora":"AURORA BOREALIS","ceiling-text":"COLORED CEILING MESSAGE"};
  const savedDefault={mode:null,text:"TOWERFLOW",color:"rainbow"};
  let active={...savedDefault},saved={...savedDefault};
  let vault=[],canvases=[],planets=[],sunlight=[],lastDraw=-1;
  let installed=false,controller=null,clock=0;
  const previousBackground={};
  function available(){
    return typeof THREE!=="undefined"&&typeof scene!=="undefined"&&
      typeof renderer!=="undefined"&&typeof helpPanel==="function";
  }
  function cleanState(v){
    const mode=THEMES.includes(v?.mode)?v.mode:null;
    const text=(typeof v?.text==="string"?v.text:"TOWERFLOW").replace(/[\r\n\t]/g," ").trim().slice(0,36)||"TOWERFLOW";
    const color=v?.color==="rainbow"||Object.hasOwn(colors,v?.color)?v.color:"rainbow";
    return {mode,text,color};
  }
  function restoreState(){
    try {return cleanState(JSON.parse(localStorage.getItem(STORAGE)));}
    catch{return {...savedDefault};}
  }
  function storeState(value){
    try{localStorage.setItem(STORAGE,JSON.stringify(value));}
    catch{/* localStorage disabled; current preview still works */ }
  }
  function deleteState(){
    try{localStorage.removeItem(STORAGE);}
    catch{}
  }
  function hasPersonalSetting(){
    try {
      const raw=localStorage.getItem(STORAGE);
      return raw!==null&&!!cleanState(JSON.parse(raw)).mode;
    }catch{return false;}
  }
  function rgba(hex,alpha){
    const c=new THREE.Color(hex);
    return "rgba("+Math.round(c.r*255)+","+Math.round(c.g*255)+","+Math.round(c.b*255)+","+alpha+")";
  }
  function random(seed){let x=Math.sin(seed*127.1+78.233)*43758.5453123;return x-Math.floor(x);}
  function drawStars(ctx,w,h,seed=0,count=260){
    for(let i=0;i<count;i++){
      const x=random(i+1+seed)*w,y=random(i+987+seed)*h;
      const a=.18+random(i+455+seed)*.72,r=.35+random(i+2000+seed)*1.2;
      ctx.fillStyle="rgba(218,239,255,"+a.toFixed(2)+")";
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
  }
  function skyTexture(){
    const canvas=document.createElement("canvas");
    canvas.width=1024;canvas.height=640;
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return {canvas,texture:tex,context:canvas.getContext("2d",{alpha:false})};
  }
  function paintSunset(ctx,w,h,t){
    const horizon=h*.73;
    const sky=ctx.createLinearGradient(0,0,0,h);
    [[0,"#101b46"],[.32,"#7b466e"],[.51,"#d76b67"],[.69,"#ffb759"],[.85,"#fe7d34"],[1,"#2c1835"]].forEach(([stop,color])=>sky.addColorStop(stop,color));
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Photographic-inspired atmospheric haze: long exposure-like soft gradients.
    for(let i=0;i<9;i++){
      const x=w*(.05+random(i+12)*.9);
      const y=h*(.51+random(i+79)*.26);
      const rad=w*(.15+random(i+44)*.16);
      const g=ctx.createRadialGradient(x,y,2,x,y,rad);
      g.addColorStop(0,"rgba(255,202,136,.085)");g.addColorStop(1,"rgba(255,168,114,0)");
      ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
    }
    const phase=(t%135)/135;
    const sunY=h*(.43+.44*phase);
    const sx=w*.52,r=46;
    const glow=ctx.createRadialGradient(sx,sunY,0,sx,sunY,165);
    glow.addColorStop(0,"rgba(255,255,222,.95)");
    glow.addColorStop(.22,"rgba(255,226,139,.70)");
    glow.addColorStop(.52,"rgba(255,167,74,.24)");
    glow.addColorStop(1,"rgba(255,128,60,0)");
    ctx.fillStyle=glow;ctx.fillRect(sx-165,sunY-165,330,330);
    ctx.fillStyle="#fff7bf";ctx.beginPath();ctx.arc(sx,sunY,r,0,Math.PI*2);ctx.fill();
    // Repeated blurred horizon cloud banks with subtle left-to-right drift.
    for(let i=0;i<22;i++){
      const x=((random(i+98)*1.25-.14+t*(.00012+random(i+78)*.00004))%1.32)*w;
      const y=h*(.31+random(i+38)*.45),rw=35+random(i+451)*160;
      const hh=3+random(i+988)*12;
      ctx.fillStyle=i%3===0?"rgba(46,38,79,.36)":"rgba(113,56,80,.23)";
      ctx.beginPath();ctx.ellipse(x,y,rw,hh,.04,0,Math.PI*2);ctx.fill();
    }
    // Distant dark land silhouette conceals the setting sun at the horizon.
    ctx.fillStyle="#17132c";ctx.beginPath();ctx.moveTo(0,h);
    for(let x=0;x<=w+12;x+=12){
      const y=horizon+16+Math.sin(x*.011)*16+Math.sin(x*.031)*8+random(x+28)*4;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    ctx.fillStyle="rgba(255,183,110,.30)";
    ctx.fillRect(0,horizon-3,w,3);
  }
  function paintAurora(ctx,w,h,t){
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#030918");sky.addColorStop(.6,"#07122c");sky.addColorStop(1,"#112c3a");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,1,320);
    for(let band=0;band<4;band++){
      const tint=["46,255,161","159,86,255","58,198,231","247,92,203"][band];
      const base=h*(.28+band*.095);
      for(let i=0;i<110;i++){
        const x=i*w/109;
        const wave=Math.sin(x*.015+t*.48+band*.9)*48+
          Math.sin(x*.04-t*.32+band*1.5)*24;
        const top=base+wave;
        const length=85+Math.sin(x*.036+t*.72+band)*45+band*8;
        const gradient=ctx.createLinearGradient(x,top,x,top+length);
        gradient.addColorStop(0,"rgba("+tint+",0)");
        gradient.addColorStop(.18,"rgba("+tint+",.13)");
        gradient.addColorStop(.55,"rgba("+tint+",.18)");
        gradient.addColorStop(1,"rgba("+tint+",0)");
        ctx.fillStyle=gradient;ctx.fillRect(x,top,w/109+3,length);
      }
    }
    const glow=ctx.createLinearGradient(0,h*.73,0,h);
    glow.addColorStop(0,"rgba(35,178,127,0)");glow.addColorStop(1,"rgba(34,208,127,.12)");
    ctx.fillStyle=glow;ctx.fillRect(0,h*.73,w,h*.27);
  }
  function paintSpace(ctx,w,h){
    const g=ctx.createRadialGradient(w*.53,h*.4,0,w*.53,h*.4,w*.85);
    g.addColorStop(0,"#112048");g.addColorStop(.5,"#050e25");g.addColorStop(1,"#01050e");
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const nebula=ctx.createRadialGradient(w*.3,h*.45,0,w*.3,h*.45,w*.48);
    nebula.addColorStop(0,"rgba(64,86,142,.19)");nebula.addColorStop(1,"rgba(40,45,100,0)");
    ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,3,530);
  }
  function paintText(ctx,w,h,text,color){
    const sky=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.66);
    sky.addColorStop(0,"#182f53");sky.addColorStop(1,"#050b1c");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,8,90);
    ctx.textAlign="center";ctx.textBaseline="middle";
    const len=[...text].length;
    let size=Math.min(132,Math.floor(1050/Math.max(5,len)*1.5));
    size=Math.max(26,size);
    ctx.font="900 "+size+"px Segoe UI, Arial, sans-serif";
    while(ctx.measureText(text).width>w*.92&&size>25){size-=2;ctx.font="900 "+size+"px Segoe UI, Arial, sans-serif";}
    ctx.shadowBlur=27;ctx.shadowColor=color==="rainbow"?"#69eefa":colors[color];
    if(color==="rainbow"){
      const rainbow=["#ff647c","#ffbe69","#ffec75","#63ffc5","#5ec9ff","#b58cff"];
      let px=(w-ctx.measureText(text).width)/2;
      ctx.textAlign="left";
      for(let i=0;i<text.length;i++){
        const ch=text[i];ctx.fillStyle=rainbow[i%rainbow.length];
        ctx.fillText(ch,px,h*.53);px+=ctx.measureText(ch).width;
      }
    }else{ctx.fillStyle=colors[color];ctx.fillText(text,w/2,h*.53);}
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(94,221,255,.48)";ctx.lineWidth=7;ctx.strokeRect(15,15,w-30,h-30);
  }
  const planetData=[
    ["MERCURY",.22,"#807f82"],["VENUS",.34,"#c9a373"],
    ["EARTH",.38,"#2b72b8"],["MARS",.29,"#b85a3c"],
    ["JUPITER",.73,"#d4a878"],["SATURN",.64,"#d9c09c"],
    ["URANUS",.47,"#9ee5e8"],["NEPTUNE",.46,"#4268cc"]
  ];
  function planetTexture(name,base) {
    const c=document.createElement("canvas");c.width=512;c.height=256;
    const ctx=c.getContext("2d");
    ctx.fillStyle=base;ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<80;i++){
      const y=random(i+name.length)*256;
      const h=2+random(i+918)*11;
      const a=(.035+random(i+301)*.09).toFixed(3);
      ctx.fillStyle=(i%3===0?"rgba(250,242,219,":"rgba(26,35,54,")+a+")";
      ctx.fillRect(0,y,512,h);
    }
    if(name==="EARTH"){
      for(let i=0;i<17;i++){
        const x=random(i+70)*512,y=random(i+85)*256;
        ctx.fillStyle=i%3===0?"rgba(238,250,240,.8)":"rgba(78,165,115,.78)";
        ctx.beginPath();ctx.ellipse(x,y,8+random(i+34)*38,5+random(i+11)*18,random(i+8)*3,0,Math.PI*2);ctx.fill();
      }
    }
    if(name==="JUPITER"){
      for(let i=0;i<12;i++) {
        const y=random(i+81)*256;
        ctx.fillStyle=i%2?"rgba(126,74,58,.32)":"rgba(255,237,185,.24)";
        ctx.fillRect(0,y,512,6+random(i+66)*17);
      }
      ctx.fillStyle="rgba(177,68,49,.8)";ctx.beginPath();ctx.ellipse(360,172,26,13,-.2,0,Math.PI*2);ctx.fill();
    }
    if(name==="MARS"){
      for(let i=0;i<16;i++){
        ctx.fillStyle="rgba(96,43,35,.17)";ctx.beginPath();
        ctx.arc(random(i+19)*512,random(i+28)*256,4+random(i+38)*26,0,Math.PI*2);ctx.fill();
      }
    }
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  // Upgrade the miniature Earth from random land blobs to actual geographic
  // imagery when available. Keep the procedural texture as an offline fallback.
  // No image, credential or command is sent to the Towerflow backend.
  const earthCloudLayers=[];
  function upgradeEarthSurface(mesh,body,radius){
    if(typeof THREE.TextureLoader!=="function")return;
    const base="https://threejs.org/examples/textures/planets/";
    const loader=new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(base+"earth_atmos_2048.jpg",texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      const old=mesh.material.map;
      mesh.material.map=texture;
      mesh.material.color.set(0xffffff);
      mesh.material.emissive.set(0x080f1c);
      mesh.material.emissiveIntensity=.08;
      mesh.material.roughness=.93;
      mesh.material.needsUpdate=true;
      if(old&&old!==texture)old.dispose();
    },undefined,()=>{/* procedural fallback remains visible */});
    loader.load(base+"earth_clouds_1024.png",texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      const clouds=new THREE.Mesh(
        new THREE.SphereGeometry(radius*1.018,40,28),
        new THREE.MeshBasicMaterial({
          map:texture,transparent:true,opacity:.38,depthWrite:false,
          blending:THREE.NormalBlending,side:THREE.FrontSide
        })
      );
      clouds.rotation.y=mesh.rotation.y;
      body.add(clouds);
      earthCloudLayers.push(clouds);
    },undefined,()=>{/* globe still renders if cloud imagery is unavailable */});
    // A restrained additive limb, not a bright holographic outline.
    const atmosphere=new THREE.Mesh(
      new THREE.SphereGeometry(radius*1.055,40,28),
      new THREE.ShaderMaterial({
        uniforms:{glowColor:{value:new THREE.Color(0x478dcb)}},
        vertexShader:"varying vec3 vNormal;varying vec3 vView;void main(){vec4 viewPos=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-viewPos.xyz);gl_Position=projectionMatrix*viewPos;}",
        fragmentShader:"uniform vec3 glowColor;varying vec3 vNormal;varying vec3 vView;void main(){float edge=pow(1.0-max(0.0,dot(normalize(vNormal),normalize(vView))),3.0);gl_FragColor=vec4(glowColor,edge*0.22);}",
        transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        side:THREE.FrontSide
      })
    );
    body.add(atmosphere);
  }
  function labelTexture(label) {
    const c=document.createElement("canvas");c.width=256;c.height=72;
    const cx=c.getContext("2d");
    cx.fillStyle="#d5eaff";cx.font="bold 36px Segoe UI, Arial";cx.textAlign="center";
    cx.fillText(label,128,48);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  function makeCanopy(centerX) {
    const group=new THREE.Group();group.position.x=centerX;scene.add(group);
    const border=new THREE.Mesh(new THREE.BoxGeometry(39,.10,28),new THREE.MeshStandardMaterial({
      color:0x1d4569,metalness:.65,roughness:.24,emissive:0x165d88,emissiveIntensity:.32
    }));
    border.position.y=10.93;group.add(border);
    const sky=skyTexture();
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(38.4,27.4),new THREE.MeshBasicMaterial({
      map:sky.texture,side:THREE.DoubleSide,depthWrite:false
    }));
    screen.position.set(0,10.87,0);
    screen.rotation.x=Math.PI/2;
    group.add(screen);
    const solar=new THREE.Group();
    solar.visible=false;group.add(solar);
    const sunGeometry=new THREE.SphereGeometry(1.05,32,20);
    const sun=new THREE.Mesh(sunGeometry,new THREE.MeshBasicMaterial({color:0xffd778}));
    sun.position.set(-16,10.08,0);solar.add(sun);
    const sunGlow=new THREE.PointLight(0xffc36e,55,12,2);
    sunGlow.position.copy(sun.position);solar.add(sunGlow);
    sunlight.push(sunGlow);
    const bodies=[];
    const positions=[-12.4,-9.7,-7,-4.3,-.9,3.2,8.1,13.1];
    for(let i=0;i<planetData.length;i++){
      const [name,radius,base]=planetData[i];
      const body=new THREE.Group();
      body.position.set(positions[i],9.86,0);
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,26,18),new THREE.MeshStandardMaterial({
        map:planetTexture(name,base),metalness:0,roughness:.82,
        emissive:new THREE.Color(base),emissiveIntensity:.16
      }));
      body.add(mesh);
      if(name==="EARTH")upgradeEarthSurface(mesh,body,radius);
      if(name==="SATURN") {
        const ring=new THREE.Mesh(new THREE.RingGeometry(.79,1.23,48),new THREE.MeshBasicMaterial({
          color:0xa89c77,side:THREE.DoubleSide,transparent:true,opacity:.74,depthWrite:false
        }));
        ring.rotation.set(.58,.24,.35);body.add(ring);
      }
      const tag=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.42),new THREE.MeshBasicMaterial({
        map:labelTexture(name),transparent:true,depthWrite:false,side:THREE.DoubleSide
      }));
      tag.position.set(0,-.99,.06);tag.rotation.x=Math.PI/2;body.add(tag);
      bodies.push(mesh);
      solar.add(body);
    }
    planets.push(...bodies);
    canvases.push({...sky,group,solar});
    vault.push(group);
    return group;
  }
  function establish(){
    if(installed)return;
    if(!available())return;
    makeCanopy(0);
    makeCanopy(62);
    installed=true;
    const ticker=new THREE.Clock();
    const loop=()=>{
      requestAnimationFrame(loop);
      if(!installed || !active.mode)return;
      clock+=Math.min(.08,ticker.getDelta());
      if(clock-lastDraw<.085)return;
      lastDraw=clock;
      for(const layer of canvases){
        const {context:ctx,canvas,texture,solar}=layer;
        solar.visible=active.mode==="solar-system";
        if(active.mode==="sunset")paintSunset(ctx,canvas.width,canvas.height,clock);
        else if(active.mode==="aurora")paintAurora(ctx,canvas.width,canvas.height,clock);
        else if(active.mode==="solar-system")paintSpace(ctx,canvas.width,canvas.height);
        else paintText(ctx,canvas.width,canvas.height,active.text,active.color);
        texture.needsUpdate=true;
      }
      if(active.mode==="solar-system")planets.forEach((mesh,i)=>{mesh.rotation.y+=.005+(i%3)*.002;});
      if(active.mode==="solar-system")earthCloudLayers.forEach(layer=>{layer.rotation.y+=.0018;});
    };
    // Render only while mode selected; otherwise original opaque ceiling stays visible.
    loop();
    renderMode(saved);
  }
  function renderMode(state){
    active=cleanState(state);
    for(const layer of vault)layer.visible=!!active.mode;
    if(!active.mode)return;
    lastDraw=-1;
    for(const layer of canvases)layer.solar.visible=active.mode==="solar-system";
  }
  function interpret(text){
    if(typeof text!=="string")return null;
    const q=text.trim().slice(0,1200),m=q.match(/(?:write|display|place|insert|show|put)\s+["“']([^"”']{1,36})["”']/i);
    if(m) {
      const color=Object.keys(colors).find(c=>new RegExp("\\b"+c+"\\b","i").test(q))||"rainbow";
      return {mode:"ceiling-text",text:m[1],color};
    }
    if(/\b(?:solar system|planets|planetarium|saturn|jupiter)\b/i.test(q))return {mode:"solar-system"};
    if(/\b(?:aurora|northern lights|southern lights|borealis)\b/i.test(q))return {mode:"aurora"};
    if(/\b(?:sunset|sun setting|setting sun|twilight|golden hour)\b/i.test(q))return {mode:"sunset"};
    return null;
  }
  function ui(){
    const previous=helpPanel;
    helpPanel=function worldEmulatorHelp(){
      previous();
      const root=document.getElementById("tfAuraArea");
      if(!root || root.querySelector("#tfWorldEmulator"))return;
      const panel=document.createElement("section");panel.id="tfWorldEmulator";
      panel.setAttribute("aria-label","AURA sky metaverse and object emulation");
      const heading=document.createElement("h3");heading.textContent="AURA — WORLD EMULATION VAULT";
      const description=document.createElement("p");
      description.textContent="A hidden, photography-informed object library generates visible sky scenes when you preview them. The original room remains preserved. Scenes are artistic representations, not literal photo scans or scale-accurate astronomy.";
      const status=document.createElement("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
      const controls=document.createElement("div");
      const presets={sunset:"Sun actually sets", "solar-system":"Sun + eight planets + stars",aurora:"Moving aurora + stars","ceiling-text":"Center-ceiling colored text"};
      let draft={...saved};
      const textInput=document.createElement("input");
      textInput.placeholder="Ceiling words (maximum 36)";
      textInput.maxLength=36;textInput.value=draft.text;
      textInput.setAttribute("aria-label","Ceiling message");
      const colorSelect=document.createElement("select");
      colorSelect.setAttribute("aria-label","Text color");
      for(const color of ["rainbow",...Object.keys(colors)]){
        const opt=document.createElement("option");opt.value=color;opt.textContent=color.toUpperCase();colorSelect.append(opt);
      }
      colorSelect.value=draft.color;
      const preview=document.createElement("button");preview.type="button";preview.textContent="Preview selected world";
      const apply=document.createElement("button");apply.type="button";apply.textContent="Keep this design";apply.disabled=true;
      const revert=document.createElement("button");revert.type="button";revert.textContent="Discard preview";
      const reset=document.createElement("button");reset.type="button";reset.textContent="Restore original ceiling";
      function inform(s){status.textContent=s;}
      function show(d){
        draft=cleanState(d);
        if(draft.mode==="ceiling-text"){
          draft.text=textInput.value.trim().slice(0,36)||"TOWERFLOW";
          draft.color=colorSelect.value;
        }
        renderMode(draft);
        document.dispatchEvent(new Event("tfWorldPreviewStart"));
        apply.disabled=false;
        inform("PREVIEW: "+labels[draft.mode]+". Look at the central ceiling in either room. Keep this design or discard it.");
      }
      for(const [mode,label] of Object.entries(presets)){
        const button=document.createElement("button");button.type="button";button.textContent=label;
        button.addEventListener("click",()=>show({...draft,mode}));
        controls.append(button);
      }
      preview.addEventListener("click",()=>show(draft.mode?draft:{...draft,mode:"sunset"}));
      apply.addEventListener("click",()=>{
        if(!draft.mode)return;
        saved=cleanState(draft);storeState(saved);apply.disabled=true;
        document.dispatchEvent(new Event("tfWorldPreviewEnd"));
        inform("PRESERVED: "+labels[saved.mode]+" in this browser. Teammates' scenes are unchanged.");
      });
      revert.addEventListener("click",()=>{renderMode(saved);document.dispatchEvent(new Event("tfWorldPreviewEnd"));apply.disabled=true;inform("Reverted to the last saved scene.");});
      reset.addEventListener("click",()=>{saved={...savedDefault};renderMode(saved);deleteState();document.dispatchEvent(new Event("tfWorldPreviewEnd"));apply.disabled=true;inform("Original Towerflow ceiling restored.");});
      panel.append(heading,description,controls,textInput,colorSelect,preview,apply,revert,reset,status);
      root.append(panel);
      inform(saved.mode?"Saved scene: "+labels[saved.mode]+".":"Original ceiling remains active until a preview is selected.");
      const ask=root.querySelector("button");
      const question=root.querySelector("textarea");
      if(ask&&question){
        ask.addEventListener("click",()=>{
          const intent=interpret(question.value);
          if(!intent)return;
          if(intent.mode==="ceiling-text"){textInput.value=intent.text;colorSelect.value=intent.color;}
          show({...draft,...intent});
          inform("I created a reversible "+labels[intent.mode]+" preview from your request. Look at the ceiling, then choose Keep this design.");
        });
      }
    };
  }
  if(available()){
    saved=restoreState();
    establish();ui();
  }
  window.tfWorldEmulator=Object.freeze({
    version:1,
    supportedModes:Object.freeze([...THEMES]),
    getActive:()=>Object.freeze({...active}),
    hasPersonalSetting,
    applyAuthoritative:(scene,approvedAt)=>{
      if(typeof approvedAt==="string"){
        const stamp=Date.parse(approvedAt);
        if(Number.isFinite(stamp))clock=Math.max(0,(Date.now()-stamp)/1000)%3600;
      }
      // Shared scene updates never overwrite a browser-owned saved design.
      // The room sync client also checks this before applying changes.
      if(hasPersonalSetting())return false;
      if(!scene){saved={...savedDefault};renderMode(saved);return true;}
      saved=cleanState(scene);renderMode(saved);return true;
    },
    requestPreview:request=>{const intent=interpret(request);if(!intent)return false;renderMode({...active,...intent});return true;},
    reset:()=>{saved={...savedDefault};renderMode(saved);deleteState();}
  });
}());
// TF_WORLD_EMULATION_V1_END
