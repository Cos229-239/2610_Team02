import {createExteriorWindowAdapter,locateOriginalWindow} from './exterior-window-adapter.mjs';

// Experimental preview only. No automatic activation; the preserved room must opt in via URL.
export function installExteriorWindowPreview({scene,THREE,window:browserWindow=window,document:doc=document}={}){
  if(browserWindow.tfExteriorPreview) return browserWindow.tfExteriorPreview;
  const query=new URLSearchParams(browserWindow.location.search);
  if(query.get('tfExteriorPreview')!=='1')return null;
  const target=locateOriginalWindow({scene,THREE});
  const originalMap=target.material.map;
  const adapter=createExteriorWindowAdapter({scene,THREE});
  const panel=doc.createElement('div');
  panel.id='tf-exterior-probe-controls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','Exterior graphics preview');
  panel.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483000;background:#07131ceF;color:#e8f7ff;border:1px solid #52acc8;border-radius:8px;padding:12px;max-width:300px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 6px 30px #0008';
  const title=doc.createElement('strong');
  title.textContent='WINDOW WEATHER • SAFE PREVIEW';
  const help=doc.createElement('p');
  help.textContent='Same window, same scene, same camera. Compare Clear / Rain / Snow. No city geometry added.';
  help.style.cssText='margin:6px 0;';
  const status=doc.createElement('output');
  status.style.cssText='display:block;margin:6px 0;color:#aee6d1';
  const buttons=doc.createElement('div');
  buttons.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
  const button=(label,action)=>{
    const b=doc.createElement('button');
    b.type='button';b.textContent=label;b.style.cssText='background:#153646;border:1px solid #58aec8;color:white;padding:5px 9px;border-radius:4px;cursor:pointer';
    b.addEventListener('click',action);
    buttons.appendChild(b);return b;
  };
  let disposed=false,mode='clear',tick=0,raf=0,last=0;
  const update=()=>{
    if(disposed)return;
    status.textContent='Mode: '+mode+' • original mesh: '+(adapter.verifyPreservation()?'preserved':'CHECK FAILED')+' • experimental 2D overlay';
  };
  const setWeather=weather=>{mode=adapter.setWeather(weather);update()};
  const stop=()=>{
    if(disposed)return;
    disposed=true;
    browserWindow.cancelAnimationFrame(raf);
    adapter.dispose();
    panel.remove();
    if(browserWindow.tfExteriorPreview===api)delete browserWindow.tfExteriorPreview;
  };
  button('Clear',()=>setWeather('clear'));
  button('Rain',()=>setWeather('rain'));
  button('Snow',()=>setWeather('snow'));
  button('Restore / Close',stop);
  panel.append(title,help,buttons,status);
  doc.body.appendChild(panel);
  const api=Object.freeze({
    get state(){return Object.freeze({mode,originalTexture:target.material.map===originalMap,geometryPreserved:adapter.verifyPreservation(),active:!disposed})},
    setWeather,
    dispose:stop
  });
  browserWindow.tfExteriorPreview=api;
  adapter.setWeather('clear');
  update();
  const frame=(time)=>{
    if(disposed)return;
    raf=browserWindow.requestAnimationFrame(frame);
    if(mode==='clear'||time-last<50)return;
    last=time;tick+=0.05;
    adapter.advance(tick);
  };
  raf=browserWindow.requestAnimationFrame(frame);
  return api;
}
