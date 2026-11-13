/* TF_FRONTIER_ENVIRONMENT_AUDIO_V1 — selective, idempotent environmental-audio stop control.
 * Audio from team voice/WebRTC, AURA speech, and source-code editor is NOT controlled.
 * To guarantee silence, the actual Sound Garden startAmbience must register its audio
 * sources with this controller, using track(). Never suspend global AudioContexts.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowEnvironmentAudio=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const AUDIO_SELECTOR='audio[data-tf-ambient],video[data-tf-ambient],audio[data-sound-role="environment"],video[data-sound-role="environment"]';
  const BUTTON_SELECTOR='#stopMusic,[data-tf-stop-ambient]';
  function classify(source){
    if(!source||typeof source!=="object")throw Error("Environmental source required");
    if(typeof source.pause==="function"&&"currentTime" in source){
      if(source.srcObject)throw Error("MediaStream tracks must not be registered as ambient");
      return "media";
    }
    if(typeof source.stop==="function"&&(typeof source.isPlaying==="boolean"||typeof source.getVolume==="function"))return "three";
    if(source.gain&&typeof source.gain.setValueAtTime==="function")return "gain";
    if(typeof source.stop==="function")return "source";
    throw Error("Unsupported environment audio source");
  }
  function create({doc=typeof document!=="undefined"?document:null}={}){
    const tracked=new Map();
    let muted=false,disposed=false,stops=0,domBound=false;
    const STORAGE_KEY="towerflow.frontier.environment-muted.v1";
    try{muted=globalThis.localStorage?.getItem(STORAGE_KEY)==="1";}catch{}
    function persist(){try{globalThis.localStorage?.setItem(STORAGE_KEY,muted?"1":"0");}catch{}}
    function stopOne(entry){
      const {source,kind}=entry;
      try{
        if(kind==="media"){
          source.pause();
          try{source.currentTime=0}catch{}
        }else if(kind==="gain"){
          const param=source.gain;
          if(typeof param.cancelScheduledValues==="function")
            param.cancelScheduledValues(source.context?.currentTime??0);
          param.setValueAtTime(0,source.context?.currentTime??0);
        }else if(kind==="three"){
          if(source.isPlaying)source.stop();
          if(typeof source.setVolume==="function")source.setVolume(0);
        }else if(kind==="source"&&!entry.stopped)source.stop();
        entry.stopped=true;return true;
      }catch(error){entry.error=error?.message??"Unknown audio stop failure";return false;}
    }
    function track(source,{role="environment"}={}){
      if(disposed)throw Error("Environment audio controller disposed");
      if(role!=="environment")throw Error("Only explicitly identified environmental sources may be tracked");
      const kind=classify(source);
      if(tracked.has(source))return source;
      const entry={source,kind,stopped:false,error:null,
        originalLevel:kind==="gain"?source.gain.value:
          kind==="three"&&typeof source.getVolume==="function"?source.getVolume():undefined};
      tracked.set(source,entry);
      if(muted)stopOne(entry);
      return source;
    }
    function untrack(source){return tracked.delete(source);}
    function stop(){
      if(disposed)return Object.freeze({stopped:0,errors:0,remaining:0});
      muted=true;persist();let completed=0,errors=0;
      for(const entry of tracked.values()){
        if(stopOne(entry))completed++;else errors++;
      }
      if(doc?.querySelectorAll){
        for(const source of doc.querySelectorAll(AUDIO_SELECTOR)){
          if(source?.srcObject)continue; // Never touch WebRTC voice <audio>.
          if(tracked.has(source))continue;
          try{source.pause?.();if("currentTime" in source)source.currentTime=0;completed++;}
          catch{errors++;}
        }
      }
      stops++;
      return Object.freeze({stopped:completed,errors,remaining:tracked.size,muted});
    }
    function arm(){
      if(disposed)throw Error("Environment audio controller disposed");
      muted=false;persist();
      for(const entry of tracked.values()){
        entry.stopped=false;
        if(typeof entry.originalLevel==="number"&&Number.isFinite(entry.originalLevel)){
          if(entry.kind==="gain")entry.source.gain.setValueAtTime(entry.originalLevel,entry.source.context?.currentTime??0);
          if(entry.kind==="three")entry.source.setVolume?.(entry.originalLevel);
        }
      }
      return true;
    }
    const onClick=e=>{
      if(e.target?.closest?.(BUTTON_SELECTOR))stop();
      else if(e.target?.closest?.('#rain,[data-tf-start-ambient]'))arm();
    };
    function bindButtons(){
      if(!doc?.addEventListener)return false;
      if(!domBound){doc.addEventListener("click",onClick,true);domBound=true;}
      return true;
    }
    function dispose(){
      if(disposed)return;disposed=true;
      if(domBound)doc.removeEventListener("click",onClick,true);
      tracked.clear();domBound=false;
    }
    const ctl=Object.freeze({
      track,untrack,stop,arm,bindButtons,dispose,
      get muted(){return muted},
      stats:()=>Object.freeze({tracked:tracked.size,muted,stopInvocations:stops,
        browserAudioGraphUntouched:true,teamVoiceTracksUntouched:true,
        guaranteedSilenceOnlyForRegisteredSources:true})
    });
    bindButtons();if(muted)stop();return ctl;
  }
  return Object.freeze({AUDIO_SELECTOR,BUTTON_SELECTOR,classify,create});
});
