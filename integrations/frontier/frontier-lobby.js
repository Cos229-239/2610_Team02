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
  const beam=new THREE.SpotLight(0x81d8ff,0,35,Math.PI/6,.7,1);
  beam.position.set(0,10,-1.5);
  beam.target.position.set(0,5.1,-15.2);
  scene.add(beam,beam.target);
  const coneMaterial=new THREE.MeshBasicMaterial({color:0x69c9ff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(6.8,13,28,1,true),coneMaterial);
  cone.position.set(0,6.2,-8);
  cone.rotation.x=Math.PI/2;
  scene.add(cone);
  let projection=0,projectionOn=true,currentTab="OVERVIEW",isPanel=false;
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
        ["Dashboard","Frontier live operations and room information.",()=>{currentTab="REPOSITORY";draw();renderDashboard();}],
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
      codespace.href="https://github.com/codespaces/new?hide_repo_select=true&repo=Cos229-239%2F2610_Team02";
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
    if(id==="frontier-dashboard"){openDashboard();return;}
    if(id==="frontier-ide"){openFrontierIDE();return;}
    if(id==="frontier-world"){openPanel("help");return;}
    // Preserve native Development Room station behavior and their original labels.
    return originalActivate(id);
  };
  // Capture clicks on the new wall panels before the original station raycaster.
  const raycaster=new THREE.Raycaster();
  renderer.domElement.addEventListener("click",e=>{
    if(!running||!document.getElementById("panel").hidden||!document.getElementById("menu").hidden||tfDevRoom)return;
    const bounds=renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects([screen,left,right],false);
    if(!hits.length || hits[0].distance>35)return;
    e.stopImmediatePropagation();
    if(hits[0].object===screen)openDashboard();
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
    projectionOn=true;
    showToast("Welcome to Frontier. Walk toward the projected dashboard and press E.");
    updateMetrics();
  };
  // Lightweight animation: projector descends and powers up, no new render loop.
  function animateProjector(){
    requestAnimationFrame(animateProjector);
    const goal=projectionOn?1:0;
    projection+=(goal-projection)*.045;
    projector.position.y=12.1-projection*1.9;
    beam.intensity=projection*23;
    cone.material.opacity=.024*projection;
    cone.visible=projection>.02;
  }
  animateProjector();
  window.tfFrontier=Object.freeze({openDashboard,openIDE:openFrontierIDE,refresh:updateMetrics});
}());
// TF_FRONTIER_LOBBY_V1_END
