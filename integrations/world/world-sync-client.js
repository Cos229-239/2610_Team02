// TF_SHARED_WORLD_CLIENT_V1_BEGIN
// Optional approved-scene sync. It does nothing if the trusted backend is not installed.
// No arbitrary user content becomes HTML or script. No access to Node, shell or host files.
(function(){
 "use strict";
 const engine=window.tfWorldEmulator;
 if(!engine||typeof engine.applyAuthoritative!=="function")return;
 let lastRevision=-1,connected=false,paused=false,admin=false,busy=false;
 const endpoint="/api/world/state";
 const settings={credentials:"same-origin",cache:"no-store"};
 const state=document.createElement("span");
 state.setAttribute("role","status");state.setAttribute("aria-live","polite");
 function say(text){state.textContent=text;}
 document.addEventListener("tfWorldPreviewStart",()=>{paused=true;});
 document.addEventListener("tfWorldPreviewEnd",()=>{paused=false;});
 async function get(){
   const r=await fetch(endpoint,settings);
   if(!r.ok)throw Error("World sync unavailable (HTTP "+r.status+").");
   return r.json();
 }
 async function refresh(){
  if(busy)return;
  busy=true;
  try{
   const data=await get();
   if(data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error("Invalid shared scene state");
   connected=true;
   if(!paused&&data.revision!==lastRevision){
     engine.applyAuthoritative(data.scene,data.updatedAt);
     lastRevision=data.revision;
     say(data.scene?"Shared scene "+data.scene.mode+" • revision "+data.revision:"Original shared room • revision "+data.revision);
   }
  }catch(err){
   if(!connected)say("Shared scene service not yet active. Local previews remain available.");
   connected=false;
  }finally{busy=false;}
 }
 async function publish(scene){
   if(!admin)throw Error("Only a repository maintainer can approve room-wide changes.");
   const latest=await get();
   if(!confirm("Publish this approved scene to ALL Towerflow visitors? Existing teammates will see the same environment."))return;
   const response=await fetch(endpoint,{
     ...settings,method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({baseRevision:latest.revision,scene:scene??null,reason:"Approved through in-room World Studio"})
   });
   const result=await response.json().catch(()=>({error:"Invalid server response"}));
   if(!response.ok)throw Error(result.error||"Publish failed");
   paused=false;document.dispatchEvent(new Event("tfWorldPreviewEnd"));
   await refresh();
 }
 async function init(){
   let who;
   try{
     const r=await fetch("/api/me",settings);
     if(r.ok)who=await r.json();
   }catch{}
   admin=who?.permission==="admin"||who?.permission==="maintain";
   // UI is additive to the existing panel: old AURA tools remain functional.
   const originalHelp=helpPanel;
   helpPanel=function worldSyncHelp(){
     originalHelp();
     const area=document.getElementById("tfWorldEmulator");
     if(!area||area.querySelector("#tfWorldSyncControls"))return;
     const container=document.createElement("div");
     container.id="tfWorldSyncControls";
     const title=document.createElement("h4");
     title.textContent="SHARED ROOM • APPROVED PUBLISHING";
     const note=document.createElement("p");
     note.textContent="Only maintainers can publish. All teammates then see the authoritative scene; personal previews remain local until approved.";
     container.append(title,note,state);
     if(admin){
       const publishButton=document.createElement("button");
       publishButton.type="button";publishButton.textContent="PUBLISH PREVIEW TO ALL";
       const restoreButton=document.createElement("button");
       restoreButton.type="button";restoreButton.textContent="RESTORE ORIGINAL FOR ALL";
       publishButton.onclick=async()=>{
         publishButton.disabled=true;
         try{await publish(engine.getActive());say("Published authoritative environment.");}
         catch(e){say(e.message);}
         finally{publishButton.disabled=false;}
       };
       restoreButton.onclick=async()=>{
         restoreButton.disabled=true;
         try{await publish(null);say("Restored original shared scene.");}
         catch(e){say(e.message);}
         finally{restoreButton.disabled=false;}
       };
       container.append(publishButton,restoreButton);
     }
     area.append(container);
   };
   await refresh();
   setInterval(refresh,8000);
 }
 init().catch(()=>{});
 window.tfWorldSync=Object.freeze({get connected(){return connected;},refresh,publish});
}());
// TF_SHARED_WORLD_CLIENT_V1_END
