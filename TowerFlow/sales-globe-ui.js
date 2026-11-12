"use strict";
// Premium Tier 3: offline globe visualization, no external scripts, tracking,
// unauthenticated data requests, synthetic live sales or third-party CDN.
(function(){
  const core=window.TowerflowSalesGlobeCore;
  const section=document.getElementById("tfSalesGlobe");
  if(!core||!section)return;
  const canvas=section.querySelector("canvas"),info=section.querySelector("[data-globe-detail]");
  const list=section.querySelector("[data-globe-rows]"),mode=section.querySelector("[data-globe-mode]");
  const toggle=section.querySelector("[data-globe-pause]");
  if(!canvas||!info||!list||!toggle)return;
  const ctx=canvas.getContext("2d");
  if(!ctx)return;
  // Low-resolution hand-authored silhouettes are visual approximations, NOT
  // surveyed national boundaries. Do not treat them as GIS-grade polygons.
  const LAND=[
    [[-168,69],[-150,70],[-136,62],[-125,57],[-123,48],[-115,33],[-107,31],[-98,17],[-86,10],[-81,9],[-77,18],[-84,24],[-81,30],[-67,45],[-60,52],[-55,60],[-75,62],[-94,72],[-118,72],[-142,71]],
    [[-80,12],[-68,12],[-61,8],[-50,1],[-47,-13],[-41,-23],[-54,-38],[-69,-56],[-75,-48],[-73,-32],[-80,-14],[-78,0]],
    [[-18,35],[-8,37],[10,37],[32,31],[41,12],[51,10],[43,-11],[35,-26],[19,-35],[12,-35],[10,-19],[0,-4],[-10,4],[-17,21]],
    [[-12,36],[-10,43],[-2,50],[9,54],[20,59],[28,69],[38,70],[48,64],[60,60],[67,54],[89,57],[105,52],[118,55],[135,50],[144,42],[142,34],[130,33],[122,22],[112,17],[108,3],[99,-7],[105,-7],[116,-2],[123,-8],[118,-10],[109,-7],[104,5],[90,17],[79,8],[72,8],[67,20],[61,25],[54,26],[46,37],[34,36],[28,42],[19,45],[10,43],[0,44]],
    [[112,-11],[130,-12],[145,-15],[154,-26],[148,-38],[134,-40],[115,-32],[113,-22]],
    [[-53,82],[-39,81],[-27,73],[-44,59],[-52,61]],
    [[43,-13],[51,-15],[49,-26],[44,-24]],
    [[-8,60],[-2,59],[-2,50],[-10,50]],
    [[130,31],[139,35],[145,41],[146,45],[141,43]],
    [[-180,-69],[-144,-72],[-100,-73],[-50,-70],[2,-73],[60,-71],[110,-73],[170,-70],[180,-69]]
  ];
  let yaw=-30*Math.PI/180,tilt=13*Math.PI/180,auto=true,drag=null,visible=false;
  let rows=core.summarize(),projected=[],last=0,frame=0;
  const toRad=Math.PI/180;
  function xyz(lat,lon){
    const phi=lat*toRad,lambda=lon*toRad+yaw;
    const x=Math.cos(phi)*Math.sin(lambda),z=Math.cos(phi)*Math.cos(lambda),y=Math.sin(phi);
    return [x,y*Math.cos(tilt)-z*Math.sin(tilt),z*Math.cos(tilt)+y*Math.sin(tilt)];
  }
  function paint(){
    if(!visible)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const width=Math.max(300,Math.floor(canvas.clientWidth)),height=Math.max(270,Math.floor(canvas.clientHeight));
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const cx=width*.5,cy=height*.51,r=Math.min(width*.42,height*.45);
    const glow=ctx.createRadialGradient(cx,cy,r*.5,cx,cy,r*1.2);
    glow.addColorStop(0,"#16336a00");glow.addColorStop(.7,"#5368ec27");glow.addColorStop(1,"#d9a93f00");
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*1.24,0,Math.PI*2);ctx.fill();
    const sea=ctx.createRadialGradient(cx-r*.3,cy-r*.5,r*.05,cx,cy,r*1.15);
    sea.addColorStop(0,"#2378ae");sea.addColorStop(.47,"#105075");sea.addColorStop(.83,"#062441");sea.addColorStop(1,"#040e22");
    ctx.fillStyle=sea;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    // Geographic grid, including hidden-hemisphere clipping.
    ctx.strokeStyle="#7bc7ec27";ctx.lineWidth=.8;
    const strokeLine=points=>{
      let previous=false;
      for(const [lat,lon] of points){
        const [x,y,z]=xyz(lat,lon),front=z>0;
        if(!front){previous=false;continue;}
        if(!previous){ctx.moveTo(cx+x*r,cy-y*r);previous=true;}
        else ctx.lineTo(cx+x*r,cy-y*r);
      }
    };
    for(let latitude=-60;latitude<=60;latitude+=30){
      ctx.beginPath();strokeLine(Array.from({length:361},(_,i)=>[latitude,i-180]));ctx.stroke();
    }
    for(let lon=-180;lon<180;lon+=30){
      ctx.beginPath();strokeLine(Array.from({length:181},(_,i)=>[i-90,lon]));ctx.stroke();
    }
    // Coastline approximations rendered in rotating globe coordinates.
    for(const polygon of LAND){
      ctx.beginPath();let open=false;
      const samples=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const steps=Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/3);
        for(let j=0;j<steps;j++)samples.push([a[1]+(b[1]-a[1])*j/steps,a[0]+(b[0]-a[0])*j/steps]);
      }
      for(const [lat,lon] of samples){
        const [x,y,z]=xyz(lat,lon);
        if(z<=.002){open=false;continue;}
        if(!open){ctx.moveTo(cx+x*r,cy-y*r);open=true;}
        else ctx.lineTo(cx+x*r,cy-y*r);
      }
      ctx.strokeStyle="#b9f4e27c";ctx.lineWidth=2.7;ctx.stroke();
    }
    // Atmosphere and limb shading.
    const shade=ctx.createRadialGradient(cx-r*.18,cy-r*.23,r*.21,cx,cy,r);
    shade.addColorStop(0,"#dffbff03");shade.addColorStop(.65,"#0c2d4508");shade.addColorStop(1,"#01030cbb");
    ctx.fillStyle=shade;ctx.fillRect(cx-r,cy-r,r*2,r*2);
    projected=[];
    const visibleMarkers=rows.flatMap(row=>{
      if(row.status==="none")return []; // no color or marker without sales.
      const [x,y,z]=xyz(row.lat,row.lon);
      return z>.04?[{row,x:cx+x*r,y:cy-y*r,z}]:[];
    }).sort((a,b)=>a.z-b.z);
    for(const marker of visibleMarkers){
      const size=5+Math.sqrt(marker.row.units)*.055;
      const g=ctx.createRadialGradient(marker.x,marker.y,1,marker.x,marker.y,size*3);
      g.addColorStop(0,marker.row.color+"cc");g.addColorStop(.45,marker.row.color+"44");g.addColorStop(1,marker.row.color+"00");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(marker.x,marker.y,size*3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=marker.row.color;ctx.strokeStyle="#061322";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(marker.x,marker.y,Math.max(4,size*.58),0,Math.PI*2);
      ctx.fill();ctx.stroke();
      projected.push(marker);
    }
    ctx.restore();
    ctx.strokeStyle="#aabfea";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    ctx.font="bold 11px system-ui";ctx.fillStyle="#e8d99f";
    ctx.fillText("EARTH / SALES SIGNAL",20,26);
    ctx.fillStyle="#b1bfd9";ctx.font="10px system-ui";
    ctx.fillText(auto?"AUTO ROTATION • DRAG TO EXPLORE":"ROTATION PAUSED • DRAG TO EXPLORE",20,height-15);
  }
  function renderRows(){
    list.replaceChildren();
    const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
    for(const row of rows){
      const button=document.createElement("button");button.type="button";button.className="tf-globe-region";
      const marker=document.createElement("span");marker.className="tf-globe-region-dot";
      marker.style.background=row.color||"transparent";marker.style.border=row.color?"none":"1px solid #73839d";
      const label=document.createElement("span");label.textContent=row.label;
      const status=document.createElement("strong");status.textContent=row.status==="none"?"NO SALES":row.status.toUpperCase();
      button.append(marker,label,status);
      button.onclick=()=>{yaw=-row.lon*toRad;tilt=row.lat*toRad*.55;auto=false;toggle.textContent="Resume rotation";
        detail(row);paint();};
      list.append(button);
    }
    function detail(row){
      info.textContent=row.label+" • "+(row.status==="none"?"No recorded sales":row.status.toUpperCase())+
        " • Revenue "+money(row.revenue)+" • Costs "+money(row.cost)+
        " • Profit "+money(row.profit)+
        (row.margin===null?"":" • Margin "+Math.round(row.margin*100)+"%");
    }
    section._showDetail=detail;
  }
  toggle.addEventListener("click",()=>{auto=!auto;toggle.textContent=auto?"Pause rotation":"Resume rotation";});
  canvas.addEventListener("pointerdown",e=>{
    drag={x:e.clientX,y:e.clientY,yaw,tilt};canvas.setPointerCapture(e.pointerId);
    auto=false;toggle.textContent="Resume rotation";
  });
  canvas.addEventListener("pointermove",e=>{
    if(!drag)return;
    yaw=drag.yaw+(e.clientX-drag.x)*.007;
    tilt=Math.max(-1.2,Math.min(1.2,drag.tilt+(e.clientY-drag.y)*.006));paint();
  });
  canvas.addEventListener("pointerup",()=>{drag=null;});
  canvas.addEventListener("pointercancel",()=>{drag=null;});
  canvas.addEventListener("click",e=>{
    if(drag)return;
    const rect=canvas.getBoundingClientRect();
    const at=projected.find(p=>Math.hypot(p.x-(e.clientX-rect.left),p.y-(e.clientY-rect.top))<17);
    if(at)section._showDetail(at.row);
  });
  const select=section.querySelector("[data-globe-file]");
  if(select)select.addEventListener("change",async()=>{
    const file=select.files?.[0];if(!file)return;
    try{
      if(file.size>64000)throw Error("CSV must be under 64 KB");
      const text=await file.text();
      const parts=text.trim().split(/\r?\n/);if(parts.length<2||parts.length>101)
        throw Error("Invalid CSV row count");
      const header=parts.shift().toLowerCase().replace(/\s/g,"");
      if(header!=="region,revenue,cost,units")throw Error("CSV header must be region,revenue,cost,units");
      const items=parts.map(line=>{
        const p=line.split(",");if(p.length!==4)throw Error("Expected 4 columns per row");
        return {region:p[0].trim(),revenue:Number(p[1]),cost:Number(p[2]),units:Number(p[3])};
      });
      rows=core.summarize(items);renderRows();paint();
      mode.textContent="USER-IMPORTED LOCAL CSV • NO LIVE SALES FEED";
    }catch(e){mode.textContent="IMPORT FAILED: "+e.message;}
    select.value="";
  });
  function animate(now){
    frame=requestAnimationFrame(animate);
    const parent=section.closest(".tf-flow-experience");
    const shouldShow=parent?.dataset.tier==="corporate"&&!section.hidden;
    if(shouldShow!==visible){visible=shouldShow;}
    if(!visible){last=now;return;}
    if(auto&&last)yaw+=(Math.min(now-last,100)/1000)*.11;
    last=now;paint();
  }
  renderRows();section._showDetail(rows[0]);
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){
    auto=false;toggle.textContent="Resume rotation";
  }
  requestAnimationFrame(animate);
})();
