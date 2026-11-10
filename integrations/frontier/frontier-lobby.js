// TF_FRONTIER_LOBBY_V1_BEGIN
// Preserves original atrium as FRONTIER lobby; three interactive wall sections.
// Real source editor uses the existing authenticated /api/files and /api/file APIs.
// No OS shell, remote desktop, browser filesystem access, or arbitrary commands.
(function(){
  "use strict";
  if(typeof THREE==="undefined" || typeof scene==="undefined" || typeof stations==="undefined" ||
     typeof renderer==="undefined" || typeof tfRegister!=="function" ||
     typeof openPanel!=="function" || typeof activateTFStation!=="function") return;
  const lobbyId="frontier";
  const darkTheme={background:"#071522",border:"#7ceaff",primary:"#c6efff"};
  const surface=document.createElement("canvas");
  surface.width=1536;surface.height=864;
  const ctx=surface.getContext("2d");
  const texture=new THREE.CanvasTexture(surface);
  texture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(19.1,6.6),new THREE.MeshBasicMaterial({
    map:texture,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
  }));
  screen.position.set(0,5.15,-15.17);
  scene.add(screen);
  const bezel=new THREE.Mesh(new THREE.BoxGeometry(19.5,6.95,.16),new THREE.MeshStandardMaterial({
    color:0x10293b,metalness:.7,roughness:.28,emissive:0x105e86,emissiveIntensity:.25
  }));
  bezel.position.set(0,5.15,-15.31);
  scene.add(bezel);
  tfRegister(screen,"frontier-dashboard");
  // The original Development Room entrance remains a separate clickable object.
  stations.push({id:"frontier-dashboard",label:"FRONTIER DASHBOARD",x:0,z:-12.8});
  // Move the existing entry logo out of the projection rectangle.
  if(typeof tfEntrance!=="undefined" && tfEntrance){
    tfEntrance.position.y=8.95;
    tfEntrance.scale.set(1.48,.65,1);
    // The sign remains clickable for the development chamber.
  }
  // Luminous wall entry signs flank the main front-wall dashboard.
  const left=sign("WORLD STUDIO","AURA / ENVIRONMENT DESIGN",-15.2,4.75,-15.19,9.2,3);
  const right=sign("DEVELOPMENT IDE","EDIT / REVIEW / CONTRIBUTE",15.2,4.75,-15.19,9.2,3);
  tfRegister(left,"frontier-world");
  tfRegister(right,"frontier-ide");
  stations.push({id:"frontier-world",label:"WORLD STUDIO",x:-15,z:-12.5});
  stations.push({id:"frontier-ide",label:"DEVELOPMENT IDE",x:15,z:-12.5});
  // Decorative projector: physical body lowers from ceiling to cast an animated cone.
  const projector=new THREE.Group();
  projector.position.set(0,12.0,-1.5);
  scene.add(projector);
  const graphite=new THREE.MeshStandardMaterial({color:0x10202f,metalness:.7,roughness:.22});
  const glass=new THREE.MeshStandardMaterial({color:0x7ceaff,emissive:0x34bbff,emissiveIntensity:1.5});
  const housing=new THREE.Mesh(new THREE.BoxGeometry(1.65,.58,1.35),graphite);
  projector.add(housing);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,.25,32),glass);
  lens.rotation.x=Math.PI/2;lens.position.set(0,-.05,-.78);projector.add(lens);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1.45,12),graphite);
  arm.position.y=.92;projector.add(arm);
  // Layered spacecraft-inspired projector assembly. Geometry is authored
  // procedurally, NOT represented as a photographic scan or exact spacecraft.
  projector.scale.setScalar(1.42);
  const secondaryMetal=new THREE.MeshStandardMaterial({color:0x344e62,metalness:.82,roughness:.22});
  const graphiteTrim=new THREE.MeshStandardMaterial({color:0x061424,metalness:.63,roughness:.34});
  const opticGlow=new THREE.MeshStandardMaterial({color:0x5edcfb,metalness:.15,roughness:.08,emissive:0x31afe0,emissiveIntensity:1.4});
  for(const side of [-1,1]){
    const wing=new THREE.Mesh(new THREE.BoxGeometry(1.38,.16,1.52),secondaryMetal);
    wing.position.set(side*1.33,-.02,.11);wing.rotation.z=side*.13;projector.add(wing);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.11,.26,1.8),graphiteTrim);
    edge.position.set(side*2.02,-.03,.14);projector.add(edge);
    const fanHousing=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.16,24),graphiteTrim);
    fanHousing.position.set(side*1.3,.21,.35);projector.add(fanHousing);
    const fanCore=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.2,24),opticGlow);
    fanCore.position.set(side*1.3,.22,.35);projector.add(fanCore);
    for(let i=0;i<3;i++){
      const vent=new THREE.Mesh(new THREE.BoxGeometry(.14,.02,.36),graphiteTrim);
      vent.position.set(side*(.62+i*.22),.34,.26);projector.add(vent);
    }
    const thruster=new THREE.Mesh(new THREE.CylinderGeometry(.22,.32,.42,20),secondaryMetal);
    thruster.rotation.x=Math.PI/2;thruster.position.set(side*1.5,-.12,1.05);projector.add(thruster);
    const flame=new THREE.Mesh(new THREE.CircleGeometry(.17,24),opticGlow);
    flame.position.set(side*1.5,-.12,1.29);projector.add(flame);
  }
  const opticRing=new THREE.Mesh(new THREE.TorusGeometry(.53,.065,12,40),secondaryMetal);
  opticRing.position.set(0,-.06,-.94);projector.add(opticRing);
  const opticGlass=new THREE.Mesh(new THREE.SphereGeometry(.31,28,20),opticGlow);
  opticGlass.scale.set(1,1,.43);opticGlass.position.set(0,-.05,-.93);projector.add(opticGlass);
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(.84,.16,1.36),graphiteTrim);
  bridge.position.set(0,.41,.1);projector.add(bridge);
  const navigation=new THREE.PointLight(0x59daff,.55,6);
  navigation.position.set(0,.48,-.3);projector.add(navigation);
  const beam=new THREE.SpotLight(0x81d8ff,0,35,Math.PI/6,.7,1);
  beam.position.set(0,10,-1.5);
  beam.target.position.set(0,5.1,-15.2);
  scene.add(beam,beam.target);
  const coneMaterial=new THREE.MeshBasicMaterial({color:0x69c9ff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(6.8,13,28,1,true),coneMaterial);
  cone.position.set(0,6.2,-8);
  cone.rotation.x=Math.PI/2;
  scene.add(cone);
  let projection=0,projectionOn=false,currentTab="OVERVIEW",isPanel=false;
  // Cinematic projector aperture and descending display platforms, visual only.
  // Kept separate from gameplay, so Dev Room portals and controls are unchanged.
  const iris=new THREE.Group();iris.position.set(0,11.85,-1.5);scene.add(iris);
  const irisParts=[];
  const irisMaterial=new THREE.MeshStandardMaterial({color:0x17354a,metalness:.82,roughness:.26,side:THREE.DoubleSide});
  for(let i=0;i<8;i++){
    const wedge=new THREE.Mesh(new THREE.RingGeometry(.28,4.1,10,1,i*Math.PI/4,Math.PI/4-.025),irisMaterial);
    wedge.rotation.x=-Math.PI/2;
    iris.add(wedge);irisParts.push(wedge);
  }
  const platforms=[];
  for(const x of [-5.7,-1.9,1.9,5.7]){
    const pad=new THREE.Group();pad.position.set(x,.1,-3.3);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.45,.24,24),
       new THREE.MeshStandardMaterial({color:0x183047,metalness:.8,roughness:.3,emissive:0x0c5269,emissiveIntensity:.3}));
    pad.add(base);
    const holo=new THREE.Mesh(new THREE.OctahedronGeometry(.46),
       new THREE.MeshStandardMaterial({color:0x4adfff,wireframe:true,emissive:0x23a8ef,emissiveIntensity:1}));
    holo.position.y=.95;pad.add(holo);scene.add(pad);platforms.push(pad);
  }
  let towerflowReveal=0,towerflowRevealStarted=0;
  // Four walk-up 3D tabs are hidden until the ceiling projector lands.
  // Their panels open the ACTUAL TowerFlow app, never a counterfeit dashboard.
  const towerflowTabs=[
    ["inventory","INVENTORY",-6.15],
    ["revenue","REVENUE",-2.05],
    ["finance","STOCK MARKET",2.05],
    ["business","START HERE",6.15]
  ];
  const tabMeshes=[];
  for(const [tab,label,x] of towerflowTabs){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
    const c=canvas.getContext("2d");
    c.fillStyle="#071a2d";c.fillRect(0,0,512,256);
    c.strokeStyle="#46dcff";c.lineWidth=17;c.strokeRect(8,8,496,240);
    c.fillStyle="#e5fcff";c.font="bold 42px Segoe UI,Arial";c.textAlign="center";
    c.fillText(label,256,122);
    c.font="24px Segoe UI,Arial";c.fillText("WALK UP / CLICK TO ENTER",256,184);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(3.48,3.4,.27),
      new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),emissive:0x085b78,emissiveIntensity:.6,metalness:.45,roughness:.28}));
    mesh.position.set(x,3.9,-12.45);mesh.visible=false;scene.add(mesh);
    tfRegister(mesh,"frontier-towerflow-"+tab);
    stations.push({id:"frontier-towerflow-"+tab,label:label+" / TOWERFLOW",x,z:-10.7});
    tabMeshes.push({mesh,tab,x});
  }
  let towerflowDesiredTab="inventory",lastTabEnter=0;

  function revealTowerflow(){
    if(towerflowReveal!==0)return;
    towerflowReveal=1;towerflowRevealStarted=performance.now();
    // Progressive-enhancement: viewers requesting reduced motion go straight in.
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
      towerflowReveal=3;openBusinessPanel();return;
    }
    showToast("TOWERFLOW • PROJECTOR ACTIVATION");
  }

  const titles=["OVERVIEW","REPOSITORY","TEAM","TASKS","AURA"];
  const metrics={branch:"dev",files:"—",members:"—",state:"READY"};
  function fit(text,max=52){return String(text||"").slice(0,max);}
  function draw(){
    const w=surface.width,h=surface.height;
    const gradient=ctx.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,"#071424");gradient.addColorStop(1,"#0c3452");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.lineWidth=13;ctx.strokeStyle="#25caeb";ctx.strokeRect(19,19,w-38,h-38);
    ctx.fillStyle="#80eaff";ctx.font="bold 76px Segoe UI, Arial";ctx.textAlign="left";
    ctx.fillText("FRONTIER  /  TOWERFLOW",78,145);
    ctx.font="32px Segoe UI, Arial";ctx.fillStyle="#b8d0dd";
    ctx.fillText("TEAM 02     •     LIVE COLLABORATION CONTROL CENTER",82,201);
    titles.forEach((label,i)=>{
      const x=85+i*280,y=274;
      ctx.fillStyle=label===currentTab?"#2dbad6":"#173b52";
      ctx.fillRect(x,y,262,65);
      ctx.fillStyle="#f4fbff";ctx.font="bold 28px Segoe UI, Arial";ctx.textAlign="center";
      ctx.fillText(label,x+131,y+43);
    });
    ctx.textAlign="left";
    ctx.fillStyle="#e8f9ff";ctx.font="bold 54px Segoe UI, Arial";
    ctx.fillText(currentTab==="OVERVIEW"?"ONE WORLD • THREE DESTINATIONS":currentTab+"  /  LIVE VIEW",86,442);
    ctx.font="33px Segoe UI, Arial";ctx.fillStyle="#a9d6e6";
    const lines={
      OVERVIEW:["DASHBOARD PROJECTOR  →  LIVE ROOM OPERATIONS","DEVELOPMENT IDE  →  SHARED REPOSITORY","WORLD STUDIO  →  AURA + DESIGN TOOLS"],
      REPOSITORY:["GITHUB  /  COS229-239 / 2610_TEAM02","CURRENT BRANCH: "+fit(metrics.branch,22),"TRACKED FILES: "+metrics.files],
      TEAM:["AUTHENTICATED COLLABORATORS ONLY","MEMBERS: "+metrics.members,"INVITE AND VOICE PORTAL AVAILABLE"],
      TASKS:["TEAM TASK BOARD + MILESTONES","LOCAL BOARD IN CURRENT RELEASE","CONNECT TRELLO FOR TEAM-SHARED TASKS"],
      AURA:["QWEN3 WORLD ASSISTANT + PERSISTENT MEMORY","PROJECT CHANGES REQUIRE REVIEW","ENVIRONMENT TOOLS: WORLD STUDIO"]
    }[currentTab];
    lines.forEach((line,i)=>ctx.fillText(fit(line,70),92,520+i*79));
    ctx.fillStyle="#52ddff";ctx.fillRect(87,778,1360,5);
    ctx.fillStyle="#bedfe8";ctx.font="25px Segoe UI, Arial";
    ctx.fillText("APPROACH + PRESS E, OR CLICK THE SCREEN TO OPEN INTERACTIVE DASHBOARD",86,830);
    texture.needsUpdate=true;
  }
  draw();
  async function updateMetrics() {
    try {
      const g=await api("/api/git/status");
      metrics.branch=g.branch||"unknown";
      draw();
    } catch {metrics.branch="not available";}
    try {
      const r=await api("/api/files");
      metrics.files=Array.isArray(r)?String(r.length):"—";
      draw();
    } catch {}
    try {
      const m=await api("/api/members");
      metrics.members=Array.isArray(m)?String(m.length):"—";
      draw();
    } catch {}
  }
  function makeEl(tag,text,cls){
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    if(cls)el.className=cls;
    return el;
  }
  function renderDashboard(){
    const root=document.getElementById("panelContent");
    if(!root)return;
    root.replaceChildren();
    const app=makeEl("section",undefined,"tf-frontier-dash");
    app.style.cssText="color:#e8f8ff;background:linear-gradient(125deg,#0b1c30,#0c3348);padding:20px;border:2px solid #2bc9e9;border-radius:10px;min-height:60vh";
    const heading=makeEl("h2","FRONTIER • TEAM 02");
    heading.style.color="#8feaff";
    app.append(heading,makeEl("p","Projected wall dashboard • GitHub-gated collaboration"));
    const nav=makeEl("div");
    nav.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin:15px 0";
    for(const tab of titles){
      const button=makeEl("button",tab);
      button.type="button";button.setAttribute("aria-pressed",String(tab===currentTab));
      button.onclick=()=>{currentTab=tab;draw();renderDashboard();};
      nav.append(button);
    }
    app.append(nav);
    const content=makeEl("div");
    app.append(content);
    if(currentTab==="OVERVIEW"){
      const towerLink=makeEl("a","OPEN ACTUAL TOWERFLOW BUSINESS DASHBOARD ↗");
      towerLink.href="/towerflow/index.html?tab=inventory";towerLink.target="_blank";towerLink.rel="noopener noreferrer";
      content.append(towerLink,makeEl("br"));
      content.append(makeEl("h3","THREE WORLD SECTIONS"));
      const zones=[
        ["Towerflow Business","Inventory, revenue, market portfolio and tier experience.",openBusinessPanel],
        ["Development","Enter the preserved four-station Development Room.",()=>{tfTeleport(true);}],
        ["World Studio","AURA, world knowledge and visual design.",()=>{openPanel("help");}]
      ];
      for(const [title,description,action] of zones){
        const card=makeEl("div");card.style.cssText="border:1px solid #327b9b;padding:13px;margin:9px 0;border-radius:7px";
        const button=makeEl("button","OPEN "+title.toUpperCase());button.onclick=action;
        card.append(makeEl("strong",title),makeEl("p",description),button);content.append(card);
      }
    }else if(currentTab==="REPOSITORY"){
      content.append(makeEl("p","Source of truth: Cos229-239/2610_Team02. Editing the host checkout does not automatically commit/push."));
      content.append(makeEl("p","Current local branch: "+metrics.branch+" • Tracked files visible: "+metrics.files));
      const webide=makeEl("a","Open real browser IDE (github.dev) ↗");
      webide.href="https://github.dev/Cos229-239/2610_Team02";
      webide.target="_blank";webide.rel="noopener noreferrer";
      content.append(webide,makeEl("br"));
      const codespace=makeEl("a","CREATE ISOLATED CODSPACE / RUN + DEBUG ↗");
      codespace.href="https://codespaces.new/Cos229-239/2610_Team02";
      codespace.target="_blank";codespace.rel="noopener noreferrer";
      content.append(codespace,makeEl("br"));
      const open=makeEl("button","OPEN IN-ROOM SOURCE EDITOR");open.onclick=openFrontierIDE;content.append(open);
    }else if(currentTab==="TEAM"){
      content.append(makeEl("p","GitHub collaborators can enter with approved access. Members with write permission can edit tracked source files; all changes require review before production."));
      const button=makeEl("button","TEAM PORTAL / INVITES / VOICE");button.onclick=()=>openPanel("team");content.append(button);
      content.append(makeEl("p","Collaborators: "+metrics.members));
    }else if(currentTab==="TASKS"){
      const button=makeEl("button","OPEN TASK BOARD");button.onclick=()=>openPanel("work");content.append(button);
      content.append(makeEl("p","Current tasks are browser-local; project-wide sharing needs a backend or Trello integration."));
    }else if(currentTab==="AURA"){
      const button=makeEl("button","OPEN AURA WORLD STUDIO");button.onclick=()=>openPanel("help");content.append(button);
      content.append(makeEl("p","AURA can explain and propose. Use approved actions for actual world changes."));
    }
    root.append(app);
    updateMetrics();
  }
  function openBusinessPanel(tab="inventory"){
    if(typeof tab!=="string"||!["inventory","revenue","finance","business"].includes(tab))tab="inventory";
    towerflowDesiredTab=tab;
    if(towerflowReveal===0){revealTowerflow();return;}
    if(towerflowReveal===1||towerflowReveal===2)return;
    isPanel=true;
    openPanel("towerflow-business");
    const panel=document.getElementById("panel");
    panel.style.width="min(98vw,1650px)";panel.style.maxWidth="98vw";
    document.getElementById("panelTag").textContent="TOWERFLOW / IMMERSIVE BUSINESS PRODUCT";
    document.getElementById("panelTitle").textContent="INVENTORY • REVENUE • MARKETS • BUSINESS";
    const root=document.getElementById("panelContent");root.replaceChildren();
    const controls=makeEl("div");
    controls.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:12px";
    const back=makeEl("button","FRONTIER CONTROL CENTER");back.type="button";back.onclick=openDashboard;
    const popup=makeEl("a","OPEN BUSINESS APP IN A FULL TAB ↗");
    popup.href="/towerflow/index.html?tab="+encodeURIComponent(tab);popup.target="_blank";popup.rel="noopener noreferrer";
    const info=makeEl("p","A real, interactive TowerFlow application. Inventory figures are illustrative until imported; finance and theme settings remain available. Local browser data is not shared with teammates.");
    controls.append(back,popup);root.append(controls,info);
    const frame=document.createElement("iframe");
    frame.title="TowerFlow Business Inventory and Financial Portfolio";
    frame.src="/towerflow/index.html?tab="+encodeURIComponent(tab);
    frame.referrerPolicy="same-origin";
    frame.style.cssText="display:block;width:100%;height:min(76vh,950px);min-height:480px;border:2px solid #29c9e6;border-radius:10px;background:#071523";
    root.append(frame);
  }
  function openDashboard(){
    isPanel=true;openPanel("frontier");
    document.getElementById("panelTag").textContent="FRONTIER PROJECTOR";
    document.getElementById("panelTitle").textContent="INTERACTIVE DASHBOARD";
    const panel=document.getElementById("panel");
    panel.style.width="min(96vw,1300px)";
    panel.style.maxWidth="96vw";
    renderDashboard();
  }
  let filePaths=[],chosenFile=null,originalCode="",editingDirty=false;
  function openFrontierIDE(){
    isPanel=true;openPanel("ide");
    document.getElementById("panelTitle").textContent="FRONTIER DEVELOPMENT • BROWSER IDE";
    const panel=document.getElementById("panel");
    panel.style.width="min(98vw,1520px)";panel.style.maxWidth="98vw";
    const root=document.getElementById("panelContent");
    root.replaceChildren();
    const top=makeEl("section");top.style.cssText="background:#0b1d2c;color:#e1f7ff;padding:14px;border:1px solid #40acde";
    top.append(makeEl("h3","LIVE REPOSITORY WORKSPACE"),makeEl("p","Choose tracked source files. Read permissions permit viewing; write permissions permit saving to the host checkout. Saving does NOT push to GitHub."));
    const links=makeEl("div");links.style.cssText="display:flex;gap:12px;flex-wrap:wrap";
    const link=makeEl("a","OPEN github.dev IDE ↗");
    link.href="https://github.dev/Cos229-239/2610_Team02";link.target="_blank";link.rel="noopener noreferrer";
    links.append(link);
    const other=makeEl("a","Review PRs and commits ↗");
    other.href="https://github.com/Cos229-239/2610_Team02/pulls";other.target="_blank";other.rel="noopener noreferrer";
    links.append(other);top.append(links);
    const tool=makeEl("div");tool.style.cssText="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0";
    const status=makeEl("span","Loading repository permissions and files…");
    status.setAttribute("role","status");
    status.style.cssText="color:#b5deef;white-space:pre-wrap";
    const refresh=makeEl("button","REFRESH REPOSITORY");
    const save=makeEl("button","SAVE CHANGES");save.disabled=true;
    tool.append(refresh,save,status);top.append(tool);
    const layout=makeEl("div");layout.style.cssText="display:grid;grid-template-columns:minmax(200px,27%) minmax(300px,1fr);gap:10px";
    const sidebar=makeEl("div");sidebar.style.cssText="max-height:52vh;overflow:auto;border:1px solid #30617e;padding:8px";
    const filter=makeEl("input");filter.placeholder="Filter repository files";filter.setAttribute("aria-label","Filter repository files");filter.style.width="100%";
    const list=makeEl("div");sidebar.append(filter,list);
    const editor=makeEl("textarea");editor.spellcheck=false;editor.setAttribute("aria-label","Repository code editor");
    editor.style.cssText="width:100%;height:54vh;font:13px/1.45 Consolas,monospace;resize:vertical;background:#071220;color:#d7edff;border:1px solid #32688a";
    editor.placeholder="Select a file from the repository tree.";
    editor.addEventListener("input",()=>{editingDirty=editor.value!==originalCode;save.disabled=!editingDirty;});
    layout.append(sidebar,editor);top.append(layout);root.append(top);
    let canWrite=false;
    async function pick(file){
      if(editingDirty&&!confirm("Discard unsaved changes in the current file?"))return;
      try {
        const result=await api("/api/file?path="+encodeURIComponent(file));
        chosenFile=file;originalCode=result.content;editor.value=result.content;editingDirty=false;
        save.disabled=true;status.textContent="Loaded "+file+(canWrite?" • Can save working tree":" • Read only");
      } catch(e) {status.textContent=e.message;}
    }
    function renderFiles(){
      list.replaceChildren();
      const query=filter.value.trim().toLowerCase();
      for(const path of filePaths.filter(s=>s.toLowerCase().includes(query)).slice(0,350)){
        const button=makeEl("button",path);
        button.type="button";
        button.style.cssText="display:block;width:100%;text-align:left;overflow-wrap:anywhere;margin:3px 0;font:12px Consolas,monospace";
        button.onclick=()=>pick(path);
        list.append(button);
      }
    }
    filter.addEventListener("input",renderFiles);
    refresh.addEventListener("click",loadFiles);
    save.onclick=async()=>{
      if(!chosenFile||!canWrite||!editingDirty)return;
      if(!confirm("Save "+chosenFile+" to the HOST working tree? This does not commit or deploy."))return;
      save.disabled=true;
      try{
        const server=await api("/api/file?path="+encodeURIComponent(chosenFile));
        if(server.content!==originalCode)throw Error("File changed since it was opened. Refresh before saving; no overwrite performed.");
        await api("/api/file",{method:"PUT",body:JSON.stringify({path:chosenFile,content:editor.value})});
        originalCode=editor.value;editingDirty=false;
        status.textContent="Saved to host checkout. Review and commit on GitHub before deployment.";
      }catch(e){status.textContent=e.message;save.disabled=false;}
    };
    async function loadFiles(){
      try{
        const me=await api("/api/me");canWrite=["write","maintain","admin"].includes(me.permission);
        filePaths=await api("/api/files");
        if(!Array.isArray(filePaths))throw Error("Invalid repository file list.");
        filePaths=filePaths.filter(s=>typeof s==="string");
        status.textContent="Branch: "+(me.branch||"dev")+" • "+(canWrite?"Editor enabled":"Read-only collaborator")+" • "+filePaths.length+" tracked files";
        renderFiles();editor.readOnly=!canWrite;
      }catch(e){status.textContent="Repository unavailable: "+e.message;}
    }
    loadFiles();
  }
  const originalActivate=activateTFStation;
  activateTFStation=function frontierStation(id){
    if(id==="frontier-dashboard"){openBusinessPanel();return;}
    if(id==="frontier-ide"){openFrontierIDE();return;}
    if(id==="frontier-world"){openPanel("help");return;}
    if(id.startsWith("dev-ide-")){
      // Let the original workstation open first, then attach an isolated runnable
      // environment link. Native desktop IDE processes cannot be started on remote guests.
      originalActivate(id);
      const content=document.getElementById("panelContent");
      if(content){
        const tools=makeEl("section");
        tools.setAttribute("aria-label","Real development environment access");
        const h=makeEl("h3","REAL CODE / BUILD / TEST / DEBUG");
        const expl=makeEl("p","Use a Codespace for an isolated terminal, debugger and browser preview, or open the repository in your OWN installed desktop IDE. The room never runs guest commands on the production host.");
        const cloud=makeEl("a","OPEN ISOLATED GITHUB CODESPACES ↗");
        cloud.href="https://codespaces.new/Cos229-239/2610_Team02";
        cloud.target="_blank";cloud.rel="noopener noreferrer";
        const review=makeEl("a","VIEW CONTRIBUTION PULL REQUESTS ↗");
        review.href="https://github.com/Cos229-239/2610_Team02/pulls";
        review.target="_blank";review.rel="noopener noreferrer";
        tools.append(h,expl,cloud,makeEl("br"),review);
        content.append(tools);
      }
      return;
    }
    if(typeof id==="string"&&id.startsWith("frontier-towerflow-")){
      openBusinessPanel(id.slice("frontier-towerflow-".length));
      return;
    }
    return originalActivate(id);
  };
  // Capture clicks on the new wall panels before the original station raycaster.
  const raycaster=new THREE.Raycaster();
  renderer.domElement.addEventListener("click",e=>{
    if(!running||!document.getElementById("panel").hidden||!document.getElementById("menu").hidden||tfDevRoom)return;
    const bounds=renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects([screen,left,right,...tabMeshes.map(p=>p.mesh).filter(m=>m.visible)],false);
    if(!hits.length || hits[0].distance>35)return;
    e.stopImmediatePropagation();
    if(tabMeshes.some(p=>p.mesh===hits[0].object)){
      const entry=tabMeshes.find(p=>p.mesh===hits[0].object);
      openBusinessPanel(entry.tab);
    }else if(hits[0].object===screen)openBusinessPanel();
    else if(hits[0].object===left)openPanel("help");
    else openFrontierIDE();
  },true);
  // Preserve original Enter handler; do not intercept any Development Room return portal.
  // Ensure all first entries land in the Frontier dashboard atrium.
  const previousEnter=document.getElementById("enterBtn").onclick;
  document.getElementById("enterBtn").onclick=function(e){
    previousEnter?.call(this,e);
    if(!running)return;
    tfDevRoom=false;
    position.set(0,1.7,12);
    yaw=0;pitch=0;send({type:"move",x:0,z:12});
    document.getElementById("areaName").textContent="FRONTIER • CONTROL CENTER";
    projectionOn=towerflowReveal>=2;
    showToast("Welcome to Frontier. Walk toward the projected dashboard and press E.");
    // The Rocky proposal is silent unless an authorized original film audio asset
    // is explicitly configured. Never synthesize, clone, or swap a stand-in voice.
    window.tfRockyGreeting?.onEnter();
    window.tfRockyOfficial?.showEntranceControl();
    updateMetrics();
  };
  // TF_ROCKY_OFFICIAL_VIDEO_V1_BEGIN
  // Genuine Rocky footage through the platform's own player; no clip extraction.
  // The visitor chooses to watch. This is not the automatic in-world voice asset.
  const rockyOfficialUrl="https://www.youtube.com/watch?v=cfdtzSfS718";
  function showOfficialRockyVideo(){
    const existing=document.getElementById("tfOfficialRockyVideo");
    if(existing){existing.hidden=false;return;}
    const container=document.createElement("div");
    container.id="tfOfficialRockyVideo";
    container.setAttribute("role","dialog");
    container.setAttribute("aria-label","Rocky Balboa motivational video");
    container.style.cssText="position:fixed;inset:0;z-index:10000;background:#03080be9;display:grid;place-items:center;padding:16px";
    const panel=document.createElement("div");
    panel.style.cssText="width:min(92vw,780px);background:#101b26;border:1px solid #80a1c1;padding:14px;color:white;border-radius:10px";
    const title=document.createElement("h2");title.textContent="Rocky Balboa • Official motivational scenes";
    const explanation=document.createElement("p");
    explanation.textContent="Official Rocky Balboa video, played through YouTube. The video is not copied or modified by Towerflow.";
    const frame=document.createElement("iframe");
    frame.src="https://www.youtube-nocookie.com/embed/cfdtzSfS718?playsinline=1";
    frame.title="Official Rocky Balboa motivational speeches";
    frame.loading="lazy";
    frame.allow="encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen=true;
    frame.referrerPolicy="strict-origin-when-cross-origin";
    frame.style.cssText="width:100%;aspect-ratio:16/9;border:0;background:black";
    const close=document.createElement("button");
    close.type="button";close.textContent="Close official video";
    close.style.cssText="display:block;margin-top:12px;padding:10px 16px";
    close.addEventListener("click",()=>{frame.src="about:blank";container.remove();});
    const link=document.createElement("a");
    link.href=rockyOfficialUrl;link.target="_blank";link.rel="noopener noreferrer";
    link.textContent="Watch on the official Rocky Balboa YouTube channel ↗";
    link.style.cssText="color:#9bd7ff;display:inline-block;margin-top:10px";
    panel.append(title,explanation,frame,close,link);
    container.append(panel);document.body.append(container);close.focus();
  }
  // Expose a user-initiated link; do not autoplay or interrupt multiplayer voice.
  const officialRockyButton=document.createElement("button");
  officialRockyButton.type="button";
  officialRockyButton.textContent="🥊 Watch Rocky • Official film scenes";
  officialRockyButton.style.cssText="position:fixed;bottom:16px;right:16px;z-index:300;padding:10px 14px;border:1px solid #80a1c1;border-radius:8px;background:#102536;color:#f2f5f8;cursor:pointer";
  officialRockyButton.hidden=true;
  officialRockyButton.addEventListener("click",showOfficialRockyVideo);
  document.body.append(officialRockyButton);
  function showEntranceControl(){officialRockyButton.hidden=false;}
  window.tfRockyOfficial=Object.freeze({open:showOfficialRockyVideo,showEntranceControl,url:rockyOfficialUrl});
  // TF_ROCKY_OFFICIAL_VIDEO_V1_END
  // TF_ROCKY_GREETING_PROPOSAL_V1_BEGIN
  // Authentic Rocky excerpt: NO audio or manifest shipped. Only a local
  // rights-verified, host-installed asset may be played. No voice synthesis.
  const greetingStatus=document.createElement("div");
  greetingStatus.id="tfRockyGreetingStatus";
  greetingStatus.setAttribute("role","status");
  greetingStatus.style.cssText="position:fixed;left:12px;bottom:12px;z-index:200;padding:8px 12px;background:#08131de8;color:#f3f6fa;border:1px solid #6689a4;max-width:min(92vw,420px);font:13px system-ui";
  greetingStatus.hidden=true;
  const greetingText=document.createElement("span");
  const skipGreeting=document.createElement("button");
  skipGreeting.type="button";
  skipGreeting.textContent="Skip greeting";
  skipGreeting.style.marginLeft="12px";
  const greetingAudio=document.createElement("audio");
  greetingAudio.preload="none";
  greetingAudio.volume=.65;
  greetingStatus.append(greetingText,skipGreeting,greetingAudio);
  document.body.append(greetingStatus);
  let active=false,attempt=0;
  function stopRockyGreeting(){
    ++attempt;active=false;greetingAudio.pause();greetingAudio.removeAttribute("src");
    greetingStatus.hidden=true;
  }
  skipGreeting.addEventListener("click",stopRockyGreeting);
  greetingAudio.addEventListener("ended",stopRockyGreeting);
  greetingAudio.addEventListener("error",stopRockyGreeting);
  async function playRockyGreeting(){
    if(localStorage.getItem("tfRockyGreetingMuted")==="1")return false;
    const current=++attempt;
    // The manifest is supplied ONLY by a separate, explicit host-side
    // licensed-media installer. 404/malformed/expired means silence.
    let config;
    try{
      const response=await fetch("/room-assets/approved/rocky-greeting.json",{
        credentials:"same-origin",cache:"no-store",mode:"same-origin"
      });
      if(!response.ok)return false;
      config=await response.json();
    }catch{return false;}
    if(current!==attempt||!config||config.version!==1||config.enabled!==true||
       config.rightsVerified!==true||typeof config.licenseExpires!=="string"||
       !Number.isFinite(Date.parse(config.licenseExpires))||
       Date.now()>=Date.parse(config.licenseExpires))return false;
    const url=config.assetPath;
    if(typeof url!=="string"||
       !/^\/room-assets\/approved\/rocky-[a-f0-9]{64}\.(mp3|ogg|wav)$/.test(url))return false;
    if(localStorage.getItem("tfRockyGreetingMuted")==="1")return false;
    greetingText.textContent="Rocky Balboa • licensed film excerpt";
    greetingAudio.src=url;
    greetingStatus.hidden=false;
    // Invoked by click, but manifest fetch introduces an async boundary:
    // browsers may reject autoplay. Never block the room or voice chat.
    try{
      await greetingAudio.play();
      if(current!==attempt){greetingAudio.pause();return false;}
      active=true;return true;
    }catch{if(current===attempt)stopRockyGreeting();return false;}
  }
  window.tfRockyGreeting=Object.freeze({
    onEnter:playRockyGreeting,
    stop:stopRockyGreeting,
    disable:()=>{localStorage.setItem("tfRockyGreetingMuted","1");stopRockyGreeting();},
    enable:()=>localStorage.removeItem("tfRockyGreetingMuted"),
    get playing(){return active;}
  });
  // TF_ROCKY_GREETING_PROPOSAL_V1_END
  // Lightweight animation: projector descends and powers up, no new render loop.
  function animateProjector(){
    requestAnimationFrame(animateProjector);
    const now=performance.now();
    let descent=0,opening=0;
    if(towerflowReveal===1&&now-towerflowRevealStarted>=2000){
      towerflowReveal=2;projectionOn=true;
      showToast("TOWERFLOW • CEILING OPENING / PROJECTOR DESCENDING");
    }
    if(towerflowReveal===2){
      const elapsed=Math.max(0,now-towerflowRevealStarted-2000);
      descent=Math.min(1,elapsed/3300);
      opening=Math.min(1,elapsed/1750);
      if(descent>=1){towerflowReveal=3;openBusinessPanel(towerflowDesiredTab);}
    }
    if(towerflowReveal===3){descent=1;opening=1;projectionOn=true;}
    for(let i=0;i<irisParts.length;i++){
      const angle=i*Math.PI/4;
      irisParts[i].position.x=Math.cos(angle)*opening*3.8;
      irisParts[i].position.z=Math.sin(angle)*opening*3.8;
      irisParts[i].rotation.z=opening*(i%2===0?.7:-.7);
    }
    for(const pad of platforms)pad.position.y=.1-opening*2.8;
    for(const p of tabMeshes)p.mesh.visible=towerflowReveal===3;
    // Walk physically toward a published tab, without modifying core WASD.
    if(towerflowReveal===3&&running&&!tfDevRoom&&
       document.getElementById("panel")?.hidden&&document.getElementById("menu")?.hidden){
      if(position.z< -10.0&&position.z> -13.6&&now-lastTabEnter>2600){
        const near=tabMeshes.find(p=>Math.abs(position.x-p.x)<1.55);
        if(near){lastTabEnter=now;openBusinessPanel(near.tab);}
      }
    }
    const goal=projectionOn?1:0;
    projection+=(goal-projection)*.045;
    projector.position.y=12.1-projection*1.9-descent*6.65;
    beam.position.y=10-descent*6.65;
    beam.intensity=projection*23*(towerflowReveal===2?Math.max(0,descent-.28)/.72:towerflowReveal===1?0:1);
    cone.material.opacity=.024*projection*(towerflowReveal===2?Math.max(0,descent-.28)/.72:towerflowReveal===1?0:1);
    cone.visible=projection>.02;
  }
  animateProjector();
  window.tfFrontier=Object.freeze({openDashboard,openBusiness:openBusinessPanel,openIDE:openFrontierIDE,refresh:updateMetrics});
}());
// TF_FRONTIER_LOBBY_V1_END
