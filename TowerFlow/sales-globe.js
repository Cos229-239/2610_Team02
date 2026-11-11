/* TOWERFLOW_SALES_GLOBE_V1 — browser-only globe, no fabricated live sales. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const panel=document.querySelector('[data-tf-app-panel="business"]');
if(!panel)return;
const wrap=document.createElement("section");wrap.className="panel tf-sales-globe";wrap.hidden=true;
wrap.innerHTML='<div class="tf-globe-heading"><div><div class="eyebrow">CORPORATE COMMAND / GEOGRAPHIC INTELLIGENCE</div><h2>Global sales intelligence</h2><p>Drag to rotate Earth. Select a location for evidence. Unreported regions remain uncolored.</p></div><div class="tf-globe-controls"><button type="button" id="tfGlobeSpin" class="btn secondary">Pause rotation</button><button type="button" id="tfGlobeDemo" class="btn secondary">Load clearly labeled sample sales</button><button type="button" id="tfGlobeClear" class="btn secondary">Clear</button></div></div><div class="tf-globe-layout"><canvas id="tfGlobeCanvas" width="820" height="610" role="img" aria-label="Rotating interactive globe. Colored location markers show sales performance only where records exist."></canvas><aside class="tf-globe-details"><h3 id="tfGlobeSelected">No geographic sales loaded</h3><p id="tfGlobeDescription">Import a verified regional dataset to display real performance. The sample button shows illustrative data only.</p><div class="tf-globe-legend"><span><i style="background:#39e584"></i>Strong sales</span><span><i style="background:#f4d75a"></i>Low activity</span><span><i style="background:#fb536c"></i>Poor performance</span><span><i style="background:#17283d;border:1px solid #57758b"></i>No sales record — no overlay</span></div><p id="tfGlobeProvenance" class="muted">SOURCE: NO DATA CONNECTED</p></aside></div>';
const tier=document.getElementById("tfFlowTier");
const target=tier?.closest(".panel")||panel;
target.insertAdjacentElement("afterend",wrap);
const canvas=$("tfGlobeCanvas"),ctx=canvas.getContext("2d");
if(!ctx)return;
const R=232,CX=410,CY=303,PI=Math.PI;
let yaw=-.25,pitch=.14,spinning=true,last=0,drag=null,locations=[],source="NO DATA CONNECTED",points=[];
const demo=[
 {region:"United States — Northeast",lat:40.7,lon:-74,sales:860000,target:600000,returns:11000},
 {region:"United States — West",lat:37.8,lon:-122.4,sales:230000,target:580000,returns:72000},
 {region:"Brazil — Southeast",lat:-23.5,lon:-46.6,sales:88000,target:400000,returns:14000},
 {region:"United Kingdom",lat:51.5,lon:-.12,sales:520000,target:510000,returns:20000},
 {region:"Germany",lat:52.5,lon:13.4,sales:97000,target:280000,returns:12000},
 {region:"India — West",lat:19.1,lon:72.9,sales:410000,target:380000,returns:8500},
 {region:"Japan",lat:35.7,lon:139.7,sales:720000,target:510000,returns:12000},
 {region:"Australia — East",lat:-33.9,lon:151.2,sales:120000,target:390000,returns:46000}
];
function classify(row){
 // Explicit enterprise demonstration rule, configurable later with approved KPIs:
 // red if returns exceed 15% of sales or attainment below 40%;
 // yellow if attainment below 85%; green otherwise.
 const attainment=row.sales/row.target;
 return row.returns/Math.max(1,row.sales)>.15||attainment<.4?"red":attainment<.85?"yellow":"green";
}
const colors={green:"#39e584",yellow:"#f4d75a",red:"#fb536c"};
function validate(rows){
 if(!Array.isArray(rows)||rows.length>500)throw Error("Expected up to 500 regional records.");
 const names=new Set();
 return rows.map(r=>{
  if(!r||typeof r.region!=="string"||r.region.length<2||r.region.length>100||names.has(r.region))throw Error("Invalid or duplicate region");
  names.add(r.region);
  for(const k of ["lat","lon","sales","target","returns"])if(!Number.isFinite(r[k]))throw Error("Invalid "+k+" for "+r.region);
  if(Math.abs(r.lat)>90||Math.abs(r.lon)>180||r.sales<0||r.target<=0||r.returns<0||r.returns>r.sales)throw Error("Out-of-range regional sales data");
  return Object.freeze({region:r.region,lat:r.lat,lon:r.lon,sales:r.sales,target:r.target,returns:r.returns,status:classify(r)});
 });
}
function project(lat,lon){
 const a=lat*PI/180,b=lon*PI/180+yaw,p=pitch;
 const x=Math.cos(a)*Math.sin(b),z=Math.cos(a)*Math.cos(b),y=Math.sin(a);
 const yy=y*Math.cos(p)-z*Math.sin(p),zz=y*Math.sin(p)+z*Math.cos(p);
 return {x:CX+x*R,y:CY-yy*R,visible:zz>0,z:zz};
}
function drawPolyline(points,color,width){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let open=false;
 for(const [lon,lat] of points){
  const p=project(lat,lon);
  if(!p.visible){open=false;continue;}
  if(!open){ctx.moveTo(p.x,p.y);open=true;}else ctx.lineTo(p.x,p.y);
 }
 ctx.stroke();
}
function render(){
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 const glow=ctx.createRadialGradient(CX,CY,R*.4,CX,CY,R*1.36);
 glow.addColorStop(0,"rgba(25,125,212,.18)");glow.addColorStop(1,"rgba(5,18,40,0)");
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 const sea=ctx.createRadialGradient(CX-R*.3,CY-R*.45,10,CX,CY,R);
 sea.addColorStop(0,"#3194bd");sea.addColorStop(.4,"#0b527b");sea.addColorStop(.82,"#062a4a");sea.addColorStop(1,"#031022");
 ctx.beginPath();ctx.arc(CX,CY,R,0,PI*2);ctx.fillStyle=sea;ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(CX,CY,R-1,0,PI*2);ctx.clip();
 // Spherical graticule: longitude and latitude lines, correctly occluded at horizon.
 for(let lat=-75;lat<=75;lat+=15){
  const line=[];for(let lon=-180;lon<=180;lon+=2)line.push([lon,lat]);
  drawPolyline(line,"rgba(114,195,223,.14)",.8);
 }
 for(let lon=-180;lon<180;lon+=15){
  const line=[];for(let lat=-90;lat<=90;lat+=2)line.push([lon,lat]);
  drawPolyline(line,"rgba(114,195,223,.14)",.8);
 }
 // Geographic outlines are intentionally schematic, not an authoritative GIS basemap.
 const outlines=[
 [[-168,65],[-140,70],[-125,49],[-117,32],[-98,17],[-83,10],[-78,26],[-62,45],[-82,58],[-110,71],[-168,65]],
 [[-81,11],[-70,-5],[-79,-17],[-70,-34],[-68,-55],[-48,-32],[-35,-9],[-50,9],[-81,11]],
 [[-11,36],[-18,15],[-17,-5],[12,-35],[34,-34],[45,-12],[51,12],[35,32],[10,37],[-11,36]],
 [[-11,36],[-10,55],[9,71],[31,70],[47,57],[90,55],[135,49],[154,58],[177,60],[146,38],[121,20],[106,1],[78,9],[65,26],[43,30],[29,42],[9,36],[-11,36]],
 [[112,-11],[115,-34],[136,-39],[153,-29],[152,-11],[133,-12],[112,-11]],
 [[-52,60],[-42,82],[-20,83],[-39,60],[-52,60]]
 ];
 for(const outline of outlines)drawPolyline(outline,"rgba(122,239,200,.67)",2.5);
 points=[];
 for(const row of locations){
  const p=project(row.lat,row.lon);if(!p.visible)continue;
  const color=colors[row.status];
  ctx.beginPath();ctx.arc(p.x,p.y,17,0,PI*2);ctx.fillStyle=color+"29";ctx.fill();
  ctx.beginPath();ctx.arc(p.x,p.y,7,0,PI*2);ctx.fillStyle=color;ctx.fill();
  ctx.strokeStyle="#f6f9ff";ctx.lineWidth=1.6;ctx.stroke();
  points.push({x:p.x,y:p.y,row});
 }
 ctx.restore();
 ctx.strokeStyle="rgba(134,223,255,.8)";ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(CX,CY,R,0,PI*2);ctx.stroke();
 ctx.fillStyle="#b2dff3";ctx.font="16px system-ui";ctx.textAlign="center";
 ctx.fillText("EARTH • GEOGRAPHIC SALES INTELLIGENCE",CX,44);
 ctx.fillStyle="#86a8c3";ctx.font="13px system-ui";
 ctx.fillText(source,CX,h-30);
}
function animate(time){
 if(spinning&&!drag&&last)yaw+=(time-last)*.00011;
 last=time;render();requestAnimationFrame(animate);
}
function select(row){
 $("tfGlobeSelected").textContent=row.region+" • "+row.status.toUpperCase();
 $("tfGlobeDescription").textContent="Sales: "+row.sales.toLocaleString("en-US",{style:"currency",currency:"USD"})+
 " · Target: "+row.target.toLocaleString("en-US",{style:"currency",currency:"USD"})+
 " · Returns: "+row.returns.toLocaleString("en-US",{style:"currency",currency:"USD"})+
 ". Color reflects target attainment and return rate; not profitability without costs.";
}
canvas.addEventListener("pointerdown",e=>{drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{
 if(!drag)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
 yaw+=dx*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+dy*.006));
 drag.x=e.clientX;drag.y=e.clientY;
});
canvas.addEventListener("pointerup",e=>{
 if(!drag)return;
 const wasMoved=drag.moved;drag=null;
 if(wasMoved)return;
 const rect=canvas.getBoundingClientRect();
 const x=(e.clientX-rect.left)*canvas.width/rect.width;
 const y=(e.clientY-rect.top)*canvas.height/rect.height;
 const hit=points.find(p=>Math.hypot(p.x-x,p.y-y)<15);
 if(hit)select(hit.row);
});
$("tfGlobeSpin").onclick=()=>{spinning=!spinning;$("tfGlobeSpin").textContent=spinning?"Pause rotation":"Resume rotation";};
$("tfGlobeDemo").onclick=()=>{locations=validate(demo);source="ILLUSTRATIVE SAMPLE • NOT REAL SALES";$("tfGlobeProvenance").textContent="SOURCE: ILLUSTRATIVE SAMPLE ONLY. Thresholds: green ≥85% of target, yellow 40–84%, red <40% or returns >15%.";select(locations[0]);};
$("tfGlobeClear").onclick=()=>{locations=[];source="NO DATA CONNECTED";$("tfGlobeSelected").textContent="No geographic sales loaded";$("tfGlobeDescription").textContent="No sales records supplied. Unreported regions remain uncolored.";$("tfGlobeProvenance").textContent="SOURCE: NO DATA CONNECTED";};
function sync(){wrap.hidden=tier?.value!=="corporate";}
tier?.addEventListener("change",sync);
document.querySelectorAll("[data-tf-select-tier]").forEach(b=>b.addEventListener("click",()=>setTimeout(sync,0)));
sync();
window.TowerflowSalesGlobe=Object.freeze({
 setRegionalSales(rows,{provenance}={}){
  if(typeof provenance!=="string"||provenance.length<8||provenance.length>240)throw Error("Verified data provenance is required");
  locations=validate(rows);source="USER-IMPORTED • "+provenance;
  $("tfGlobeProvenance").textContent="SOURCE: "+source+" (user supplied; not independently verified)";
  $("tfGlobeSelected").textContent=locations.length+" reported regions";
  $("tfGlobeDescription").textContent="Unreported regions remain uncolored. Click any marker for metrics.";
  return locations.length;
 },
 clear:()=>$("tfGlobeClear").click()
});
requestAnimationFrame(animate);
})();
