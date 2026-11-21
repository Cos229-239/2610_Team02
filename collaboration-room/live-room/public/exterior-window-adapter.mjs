/**
 * TowerFlow exterior window adapter v0.1 (opt-in; no scene, renderer or geometry replacement).
 * Modifies only the existing 1024x512 CanvasTexture pixels and restores them on dispose.
 * Rain/snow are lightweight graphical probes, NOT modeled 3D city/weather fidelity.
 * Never automatically mounts itself.
 */
export const WINDOW_CONTRACT = Object.freeze({
  group:'TF_REFERENCE_ATRIUM_V2',width:12,height:5.5,
  x:-20.66,y:6.6,z:0,rotationY:Math.PI/2,canvasWidth:1024,canvasHeight:512
});
const close=(a,b,epsilon=0.005)=>Math.abs(a-b)<=epsilon;
export function locateOriginalWindow({scene,THREE}){
  if(!scene||!THREE)throw Error('scene and THREE are required');
  const group=scene.getObjectByName?.(WINDOW_CONTRACT.group);
  if(!group)throw Error('Original atrium group not found; no changes made');
  const candidates=[];
  group.traverse?.(mesh)=>{
    const geometry=mesh.geometry?.parameters,map=mesh.material?.map;
    if(!mesh.isMesh||!geometry||!map?.image)return;
    if(!close(geometry.width,12)||!close(geometry.height,5.5))return;
    if(!close(mesh.position.x,-20.66)||!close(mesh.position.y,6.6)||
       !close(mesh.position.z,0)||!close(mesh.rotation.y,Math.PI/2))return;
    if(map.image.width!==1024||map.image.height!==512)return;
    candidates.push(mesh);
  });
  if(candidates.length!==1)throw Error('Expected one exact original window, found '+candidates.length);
  return candidates[0];
}
function seeded(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};}
function drawWeather(ctx,width,height,weather,phase,seed){
  if(weather==='clear')return;
  const r=seeded(seed);
  ctx.save();
  if(weather==='rain'){
    ctx.strokeStyle='rgba(176,210,234,0.22)';ctx.lineWidth=1.25;
    for(let i=0;i<85;i++){
      const x=r()*width,y=(r()*height+phase*80)%height;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+26);ctx.stroke();
    }
  }else if(weather==='snow'){
    ctx.fillStyle='rgba(243,250,255,0.7)';
    for(let i=0;i<75;i++){
      const x=(r()*width+Math.sin(phase+i)*10+width)%width;
      const y=(r()*height+phase*17)%height;
      ctx.beginPath();ctx.arc(x,y,0.65+r()*1.2,0,2*Math.PI);ctx.fill();
    }
  }else{ctx.restore();throw Error('Unsupported weather mode');}
  ctx.restore();
}
export function createExteriorWindowAdapter({scene,THREE,autoStart=false,seed=10091}={}){
  if(autoStart)throw Error('Autostart forbidden: explicit opt-in required');
  const mesh=locateOriginalWindow({scene,THREE}),map=mesh.material.map,canvas=map.image;
  const context=canvas.getContext?.('2d',{willReadFrequently:true})??canvas.getContext?.('2d');
  if(!context?.getImageData||!context?.putImageData)throw Error('Canvas readback unavailable');
  if(mesh.userData?.tfExteriorWindowAdapter)throw Error('Already mounted');
  const original=context.getImageData(0,0,canvas.width,canvas.height);
  const originalMap=mesh.material.map,originalMatrix=mesh.matrixWorld?.clone?.();
  let disposed=false,weather='clear',phase=0,frames=0;
  function render(){
    if(disposed)return false;
    context.putImageData(original,0,0);
    drawWeather(context,canvas.width,canvas.height,weather,phase,seed);
    map.needsUpdate=true;frames++;return true;
  }
  const api=Object.freeze({
    setWeather(mode){
      if(disposed)throw Error('Adapter disposed');
      if(!['clear','rain','snow'].includes(mode))throw Error('Allowed: clear, rain, snow');
      weather=mode;render();return mode;
    },
    advance(seconds){
      if(disposed)return false;
      if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid time');
      phase=seconds;return render();
    },
    get state(){return Object.freeze({weather,frames,active:!disposed})},
    verifyPreservation(){return !disposed&&mesh.material.map===originalMap&&
      (!originalMatrix||mesh.matrixWorld?.equals?.(originalMatrix)!==false)&&!!mesh.parent},
    dispose(){
      if(disposed)return;
      disposed=true;context.putImageData(original,0,0);map.needsUpdate=true;
      delete mesh.userData.tfExteriorWindowAdapter;
    }
  });
  mesh.userData ||= {};
  mesh.userData.tfExteriorWindowAdapter=api;
  return api;
}
