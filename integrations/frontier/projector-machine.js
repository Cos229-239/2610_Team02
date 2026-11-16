/* TF_PROJECTOR_MACHINE_V1: deterministic, no on-load activation or network access. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowProjectorMachine=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const STAGES=Object.freeze(["IDLE","CLEARING","DESCENDING","BOOT_DELAY","PROJECTING","RETARGETING","RETRACTING","RESTORING"]);
  const DURATIONS=Object.freeze({CLEARING:1500,DESCENDING:3300,BOOT_DELAY:3000,RETARGETING:650,RETRACTING:2300,RESTORING:1500});
  const WALLS=Object.freeze(["front","back","left","right"]);
  const clamp=x=>Math.max(0,Math.min(1,x));
  function create({clock=()=>performance.now(),onChange=()=>{}}={}){
    let stage="IDLE",started=clock(),wall=null,previousWall=null,cleared=0,descended=0,revision=0;
    function transition(next,t){
      stage=next;started=t;revision++;
      onChange({stage,wall,previousWall,revision,at:t});
    }
    function activate(target,t=clock()){
      if(!WALLS.includes(target))return false;
      if(stage==="IDLE"){wall=target;previousWall=null;transition("CLEARING",t);return true;}
      if(stage==="PROJECTING"&&wall!==target){previousWall=wall;wall=target;transition("RETARGETING",t);return true;}
      return false;
    }
    function powerOff(t=clock()){
      if(stage==="IDLE"||stage==="RETRACTING"||stage==="RESTORING")return false;
      // Mid-transition abort safely retracts without showing the portal again.
      tick(t);
      transition("RETRACTING",t);
      return true;
    }
    function tick(now=clock()){
      if(!Number.isFinite(now))throw Error("Invalid animation clock");
      if(now<started)now=started;
      // Consume skipped frames, retaining the exact 3 seconds AFTER descent.
      let guard=0;
      while(stage!=="IDLE"&&stage!=="PROJECTING"&&guard++<8){
        const length=DURATIONS[stage];
        if(now-started<length)break;
        const finish=started+length;
        if(stage==="CLEARING"){cleared=1;transition("DESCENDING",finish);}
        else if(stage==="DESCENDING"){descended=1;transition("BOOT_DELAY",finish);}
        else if(stage==="BOOT_DELAY"){transition("PROJECTING",finish);}
        else if(stage==="RETARGETING"){previousWall=null;transition("PROJECTING",finish);}
        else if(stage==="RETRACTING"){descended=0;transition("RESTORING",finish);}
        else if(stage==="RESTORING"){cleared=0;wall=null;previousWall=null;transition("IDLE",finish);}
      }
      const p=stage==="IDLE"?0:clamp((now-started)/(DURATIONS[stage]||1));
      if(stage==="CLEARING")cleared=p;
      if(stage==="DESCENDING")descended=p;
      if(stage==="RETRACTING")descended=1-p;
      if(stage==="RESTORING")cleared=1-p;
      return Object.freeze({
        stage,wall,previousWall,revision,
        cleared:clamp(cleared),descended:clamp(descended),
        lightOn:stage==="PROJECTING"||stage==="RETARGETING",
        portalEnabled:stage==="PROJECTING",
        retargetProgress:stage==="RETARGETING"?p:1,
        bootRemainingMs:stage==="BOOT_DELAY"?Math.max(0,3000-(now-started)):0
      });
    }
    const snapshot=()=>tick(clock());
    return Object.freeze({activate,powerOff,tick,snapshot,get stage(){return stage;}});
  }
  return Object.freeze({create,STAGES,WALLS,DURATIONS});
});
