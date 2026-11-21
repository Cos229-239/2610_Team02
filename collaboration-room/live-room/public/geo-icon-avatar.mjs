// TowerFlow icon-to-3D visual prototype: transparent icon silhouette -> 2.5D
// extruded UV-textured relief. NOT a 3D face scan, person, or animated rig.
// This module is deliberately not connected to glowAvatar() until independent
// preservation/visual tests pass. No identity inference; only signed-in icon URL.
export const ICON_GEOMETRY_LIMITS=Object.freeze({resolution:48,maxCells:2304,maxTriangles:28000});
export function silhouetteGrid(pixels,width,height,{resolution=48,alphaThreshold=96}={}){
 if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1)
  throw Error('Icon dimensions unavailable');
 if(pixels?.length!==width*height*4)throw Error('Expected RGBA icon pixels');
 if(!Number.isInteger(resolution)||resolution<8||resolution>48)
  throw Error('Icon relief resolution must be between 8 and 48');
 const out=new Uint8Array(resolution*resolution),cx=(resolution-1)/2,radius=resolution*.48;
 let detectedAlpha=false;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]<250){detectedAlpha=true;break;}
 let kept=0;
 for(let row=0;row<resolution;row++){
  for(let col=0;col<resolution;col++){
   const x=Math.min(width-1,Math.floor((col+.5)*width/resolution));
   const y=Math.min(height-1,Math.floor((row+.5)*height/resolution));
   const a=pixels[(y*width+x)*4+3];
   // Opaque rectangular photographs: crop to circular *icon*, never
   // claim to infer a person's body silhouette from unknown background.
   const inside=detectedAlpha?a>=alphaThreshold:
    Math.hypot(col-cx,row-cx)<=radius;
   const id=row*resolution+col;
   out[id]=Number(inside);
   if(inside)kept++;
  }
 }
 if(kept<4)throw Error('Icon has no useful opaque silhouette');
 return {grid:out,resolution,cells:kept,sourceShape:detectedAlpha?'alpha':'circular icon crop',
  silhouetteMeasured:detectedAlpha};
}
export function buildIconReliefGeometry(THREE,silhouette,{width=1.0,height=1.0,depth=.08}={}){
 if(!silhouette?.grid||silhouette.grid.length!==silhouette.resolution**2)
  throw Error('Invalid sampled icon silhouette');
 if(!Number.isFinite(depth)||depth<=0||depth>.3)throw Error('Invalid artistic relief depth');
 const N=silhouette.resolution,g=silhouette.grid,positions=[],uvs=[];
 const push=(x,y,z,u,v)=>{positions.push(x,y,z);uvs.push(u,v);};
 const tri=(a,b,c)=>{for(const v of [a,b,c])push(...v);};
 const quad=(a,b,c,d)=>{tri(a,b,d);tri(b,c,d);};
 const filled=(x,y)=>x>=0&&y>=0&&x<N&&y<N&&g[y*N+x]===1;
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  if(!filled(i,j))continue;
  const x0=(i/N-.5)*width,x1=((i+1)/N-.5)*width;
  const y0=(.5-(j+1)/N)*height,y1=(.5-j/N)*height;
  const u0=i/N,u1=(i+1)/N,v0=1-(j+1)/N,v1=1-j/N;
  // Front preserves exact icon pixels by texture UVs.
  const A=[x0,y0,depth,u0,v0],B=[x1,y0,depth,u1,v0],
        C=[x1,y1,depth,u1,v1],D=[x0,y1,depth,u0,v1];
  quad(A,B,C,D);
  const a=[x0,y0,0,u0,v0],b=[x1,y0,0,u1,v0],
        c=[x1,y1,0,u1,v1],d=[x0,y1,0,u0,v1];
  quad(b,a,d,c);
  if(!filled(i,j-1))quad(d,c,C,D);
  if(!filled(i,j+1))quad(B,A,a,b);
  if(!filled(i-1,j))quad(A,D,d,a);
  if(!filled(i+1,j))quad(C,B,b,c);
 }
 if(positions.length/9>ICON_GEOMETRY_LIMITS.maxTriangles)
  throw Error('Icon geometry exceeded triangle budget');
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.computeVertexNormals();
 return {geometry,report:Object.freeze({
  classification:'icon-textured 2.5D relief (not actual body/face)',
  sourceShape:silhouette.sourceShape,
  silhouetteMeasured:silhouette.silhouetteMeasured,
  sourceCells:silhouette.cells,
  triangles:positions.length/9,
  depthMeters:null,
  depthSceneUnits:depth,
  bodyRigged:false,
  sourcePhotoReconstruction:false})};
}
export async function loadIconRelief(THREE,avatarURL,{resolution=48}={}){
 if(!/^https:\/\//.test(String(avatarURL)))throw Error('HTTPS avatar image required');
 const image=await new Promise((resolve,reject)=>{
  const im=new Image();im.crossOrigin='anonymous';
  im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Icon CORS/load failed'));
  im.src=avatarURL;
 });
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=resolution;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Image pixels inaccessible');
 ctx.drawImage(image,0,0,resolution,resolution);
 const pixels=ctx.getImageData(0,0,resolution,resolution);
 const silhouette=silhouetteGrid(pixels.data,resolution,resolution,{resolution});
 const {geometry,report}=buildIconReliefGeometry(THREE,silhouette);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({
  map:texture,side:THREE.DoubleSide,transparent:true,roughness:.55,
  metalness:0,depthWrite:true
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='TF_IDENTITY_RELIEF_EXPERIMENTAL';
 mesh.raycast=()=>{};
 return {mesh,report,dispose(){
  mesh.parent?.remove(mesh);geometry.dispose();material.dispose();texture.dispose();
 }};
}
