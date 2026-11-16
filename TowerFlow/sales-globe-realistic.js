/* TOWERFLOW_EARTH_WEBGL_V1
 * Corporate Command realistic Earth prototype. No mock geographic outlines.
 * Uses NASA Blue Marble, staged locally, and a WebGL2 sphere with day/night
 * shading. Sales dots are rendered ONLY for actual user-submitted records or
 * explicitly requested DEMONSTRATION records.
 * Original sales-globe.js owns the panel and controls; this renderer upgrades
 * its canvas only once and never accesses credentials or external business APIs.
 */
(function(){
"use strict";
const REQUIRED="tfGlobeCanvas";
const NASA_CREDIT="NASA/Goddard Space Flight Center Scientific Visualization Studio · Blue Marble";
const surface=document.getElementById(REQUIRED);
if(!surface)return;
const stage=document.createElement("div");
stage.className="tf-globe-webgl-stage";
stage.style.cssText="position:relative;max-width:820px;aspect-ratio:820/610;width:100%;min-width:0;overflow:hidden";
surface.parentElement.insertBefore(stage,surface);
stage.append(surface);
const parent=stage;
const oldLabel=document.createElement("div");
oldLabel.id="tfGlobeEarthStatus";
oldLabel.setAttribute("role","status");
oldLabel.style.cssText="position:absolute;left:12px;bottom:14px;right:12px;pointer-events:none;text-align:center;color:#b9e9fa;font:12px system-ui";
parent.style.position="relative";
parent.append(oldLabel);
oldLabel.textContent="Loading NASA Blue Marble 3D Earth…";
const original=window.TowerflowSalesGlobe;
if(!original)return;
const canvas=document.createElement("canvas");
canvas.setAttribute("aria-label","Photorealistic textured Earth with color-coded regional sales markers");
canvas.width=820;canvas.height=610;
canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab";
const gl=canvas.getContext("webgl2",{alpha:true,antialias:true,premultipliedAlpha:false});
if(!gl){oldLabel.textContent="WebGL2 is unavailable: using the basic geographic renderer.";return;}
const overlay=document.createElement("canvas");
overlay.width=820;overlay.height=610;
overlay.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none";

parent.append(canvas,overlay);
surface.style.visibility="hidden";
const ctx=overlay.getContext("2d");
const state={yaw:-.25,pitch:.14,spin:true,down:null,last:0,records:[],textureReady:false,source:"NO DATA CONNECTED",disposed:false};
function shader(type,source){
 const item=gl.createShader(type);gl.shaderSource(item,source);gl.compileShader(item);
 if(!gl.getShaderParameter(item,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(item));
 return item;
}
const VERTEX=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;
layout(location=1) in vec2 uv;
uniform mat4 uModel;
out vec3 vNormal;
out vec2 vUv;
void main(){vec4 p=uModel*vec4(position,1.);vNormal=normalize(p.xyz);vUv=uv;gl_Position=vec4(p.xy*.79,p.z*.12,1.);}`;
const FRAGMENT=`#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uEarth;
out vec4 outColor;
void main(){
 vec3 normal=normalize(vNormal);
 vec3 sun=normalize(vec3(-.66,.47,.58));
 float light=max(dot(normal,sun),0.);
 float ambient=.23;
 vec3 albedo=texture(uEarth,vUv).rgb;
 vec3 col=albedo*(ambient+.92*light);
 float view=max(0.,dot(normal,vec3(0.,0.,1.)));
 float edge=pow(1.-view,3.2);
 col+=vec3(.05,.27,.48)*edge*.85;
 float ocean=clamp((albedo.b-albedo.r)*2.8,0.,1.);
 col+=vec3(.6,.7,.95)*ocean*pow(max(dot(reflect(-sun,normal),vec3(0,0,1)),0.),28.)*.21;
 outColor=vec4(col,1.);
}`;
function program(){
 const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,VERTEX));
 gl.attachShader(p,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
}
let gpu;
try{gpu=program();}catch(e){oldLabel.textContent="3D renderer initialization failed: "+String(e.message).slice(0,120);surface.style.visibility="visible";canvas.remove();overlay.remove();return;}
gl.useProgram(gpu);
const model=gl.getUniformLocation(gpu,"uModel");
const textureUniform=gl.getUniformLocation(gpu,"uEarth");
const PI=Math.PI;
const strips=96,sectors=192,vertex=[],index=[];
for(let j=0;j<=strips;j++){
 const latitude=PI*(j/strips-.5);
 for(let i=0;i<=sectors;i++){
  const longitude=2*PI*(i/sectors-.5);
  const c=Math.cos(latitude);
  vertex.push(c*Math.sin(longitude),Math.sin(latitude),c*Math.cos(longitude),i/sectors,1-j/strips);
 }
}
for(let j=0;j<strips;j++)for(let i=0;i<sectors;i++){
 const k=j*(sectors+1)+i;
 index.push(k,k+sectors+1,k+1,k+1,k+sectors+1,k+sectors+2);
}
const vao=gl.createVertexArray();gl.bindVertexArray(vao);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertex),gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);
gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);
const idx=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(index),gl.STATIC_DRAW);
const earth=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,earth);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const colors={green:"#39e584",yellow:"#f4d75a",red:"#fb536c"};
function setRotation(){
 const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
 // y-axis rotation followed by x-axis tilt.
 const m=new Float32Array([
  cy,sp*sy,-cp*sy,0,
  0,cp,sp,0,
  sy,-sp*cy,cp*cy,0,
  0,0,0,1
 ]);
 gl.uniformMatrix4fv(model,false,m);return m;
}
function project(lat,lon,m){
 const a=lat*PI/180,b=lon*PI/180,c=Math.cos(a);
 const x=c*Math.sin(b),y=Math.sin(a),z=c*Math.cos(b);
 const tx=m[0]*x+m[4]*y+m[8]*z;
 const ty=m[1]*x+m[5]*y+m[9]*z;
 const tz=m[2]*x+m[6]*y+m[10]*z;
 return {x:410+tx*610*.79/2,y:305-ty*610*.79/2,visible:tz>0};
}
function draw(time){
 if(state.disposed)return;
 if(state.spin&&!state.down&&state.last)state.yaw+=(time-state.last)*.00013;
 state.last=time;
 if(surface.closest(".tf-sales-globe")?.hidden){requestAnimationFrame(draw);return;}
 gl.viewport(0,0,canvas.width,canvas.height);
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
 gl.useProgram(gpu);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);
 gl.bindTexture(gl.TEXTURE_2D,earth);gl.uniform1i(textureUniform,0);
 const m=setRotation();if(state.textureReady)gl.drawElements(gl.TRIANGLES,index.length,gl.UNSIGNED_INT,0);
 ctx.clearRect(0,0,overlay.width,overlay.height);
 if(state.textureReady){
  ctx.beginPath();ctx.arc(410,305,241,0,2*PI);ctx.strokeStyle="#4bc8ff66";ctx.lineWidth=2;ctx.stroke();
  for(const row of state.records){
   const p=project(row.lat,row.lon,m);if(!p.visible)continue;
   ctx.beginPath();ctx.arc(p.x,p.y,15,0,2*PI);
   ctx.fillStyle=colors[row.status]+"44";ctx.fill();
   ctx.beginPath();ctx.arc(p.x,p.y,6,0,2*PI);ctx.fillStyle=colors[row.status];ctx.fill();
   ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke();
  }
 }
 requestAnimationFrame(draw);
}
const image=new Image();
image.crossOrigin="anonymous";
image.onload=()=>{
 try{
  gl.bindTexture(gl.TEXTURE_2D,earth);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.generateMipmap(gl.TEXTURE_2D);
  state.textureReady=true;
  oldLabel.textContent=NASA_CREDIT+" • Demo data is not actual sales";
 }catch(e){oldLabel.textContent="Earth asset is not WebGL-compatible: "+e.message;canvas.remove();overlay.remove();surface.style.visibility="visible";}
};
image.onerror=()=>{oldLabel.textContent="NASA Blue Marble texture not installed. Run approved asset installer. Basic globe remains available.";canvas.remove();overlay.remove();surface.style.visibility="visible";};
image.src="./assets/earth-blue-marble.png";
function coordinate(e){
 const rect=canvas.getBoundingClientRect();
 return {x:(e.clientX-rect.left)*canvas.width/rect.width,
 y:(e.clientY-rect.top)*canvas.height/rect.height};
}
canvas.addEventListener("pointerdown",e=>{state.down={...coordinate(e),moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{
 if(!state.down)return;
 const p=coordinate(e),dx=p.x-state.down.x,dy=p.y-state.down.y;
 if(Math.abs(dx)+Math.abs(dy)>1)state.down.moved=true;
 state.yaw+=dx*.009;state.pitch=Math.max(-1.15,Math.min(1.15,state.pitch+dy*.006));
 state.down.x=p.x;state.down.y=p.y;
});
canvas.addEventListener("pointerup",e=>{
 if(!state.down)return;
 const moved=state.down.moved;state.down=null;if(moved)return;
 const p=coordinate(e),m=setRotation();
 const hit=state.records.map(row=>({row,point:project(row.lat,row.lon,m)}))
  .filter(x=>x.point.visible).find(x=>Math.hypot(x.point.x-p.x,x.point.y-p.y)<17);
 if(hit){
  document.getElementById("tfGlobeSelected").textContent=hit.row.region+" • "+hit.row.status.toUpperCase();
  document.getElementById("tfGlobeDescription").textContent=
   "Recorded sales: "+hit.row.sales.toLocaleString("en-US",{style:"currency",currency:"USD"})+
   " • Target: "+hit.row.target.toLocaleString("en-US",{style:"currency",currency:"USD"})+
   " • Returns: "+hit.row.returns.toLocaleString("en-US",{style:"currency",currency:"USD"})+
   ". Interpret relative performance only after verifying regional coverage.";
 }
});
const sample=[
 {region:"US Northeast",lat:40.7,lon:-74,sales:860000,target:600000,returns:11000},
 {region:"US West",lat:37.8,lon:-122.4,sales:230000,target:580000,returns:72000},
 {region:"Brazil Southeast",lat:-23.5,lon:-46.6,sales:88000,target:400000,returns:14000},
 {region:"United Kingdom",lat:51.5,lon:-.12,sales:520000,target:510000,returns:20000},
 {region:"Germany",lat:52.5,lon:13.4,sales:97000,target:280000,returns:12000},
 {region:"India West",lat:19.1,lon:72.9,sales:410000,target:380000,returns:8500},
 {region:"Japan",lat:35.7,lon:139.7,sales:720000,target:510000,returns:12000}
];
function valid(data){
 if(!Array.isArray(data)||data.length>500)throw Error("Expected up to 500 regions");
 return data.map(v=>{
  if(!v||typeof v.region!=="string"||v.region.length<2||v.region.length>100)throw Error("Invalid region label");
  for(const name of ["lat","lon","sales","target","returns"])
   if(!Number.isFinite(v[name]))throw Error("Invalid "+name);
  if(Math.abs(v.lat)>90||Math.abs(v.lon)>180||v.sales<0||v.target<=0||v.returns<0||v.returns>v.sales)
   throw Error("Invalid regional sales metrics");
  const share=v.sales/v.target;
  return Object.freeze({...v,status:v.returns/Math.max(1,v.sales)>.15||share<.4?"red":share<.85?"yellow":"green"});
 });
}
document.getElementById("tfGlobeDemo")?.addEventListener("click",()=>{state.records=valid(sample);state.source="DEMONSTRATION";},true);
document.getElementById("tfGlobeClear")?.addEventListener("click",()=>{state.records=[];state.source="NO DATA CONNECTED";},true);
document.getElementById("tfGlobeSpin")?.addEventListener("click",()=>{state.spin=!state.spin;},true);
window.TowerflowEarthWebGL=Object.freeze({
 setRegionalSales(data,{provenance}={}){
  if(typeof provenance!=="string"||provenance.length<8||provenance.length>240)throw Error("Provenance required");
  state.records=valid(data);state.source="USER DATA • "+provenance;
  original?.setRegionalSales(data,{provenance});
  return state.records.length;
 },
 get status(){return Object.freeze({webglReady:state.textureReady,regions:state.records.length,source:state.source});}
});
requestAnimationFrame(draw);
})();