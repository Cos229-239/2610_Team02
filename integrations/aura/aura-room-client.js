
// TF_AURA_ROOM_CLIENT_V1_BEGIN
// In-world AURA interface. Does not expose Ollama, desktop IDEs, or OS shell.
(function(){
  "use strict";
  if (typeof helpPanel !== "function" || typeof openPanel !== "function") return;
  const originalHelp = helpPanel;
  helpPanel = function auraEnhancedHelpPanel() {
    originalHelp();
    const container = document.getElementById("panelContent");
    if (!container || container.querySelector("#tfAuraArea")) return;
    const area = document.createElement("section");
    area.id = "tfAuraArea";
    area.setAttribute("aria-label", "AURA world-expert assistant");
    const title = document.createElement("h3");
    title.textContent = "AURA — TOWERFLOW WORLD EXPERT";
    const note = document.createElement("p");
    note.textContent = "Ask AURA about the world, movement, GitHub, rooms or development. Replies use reviewed world knowledge. The assistant cannot deploy or edit code.";
    const status = document.createElement("div");
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    status.textContent = "Checking private AURA service…";
    const question = document.createElement("textarea");
    question.placeholder = "What should we improve in Towerflow?";
    question.maxLength = 1200;
    question.setAttribute("aria-label","Question for AURA");
    question.rows = 3;
    const ask = document.createElement("button");
    ask.type = "button";
    ask.textContent = "Ask AURA";
    ask.disabled = true;
    const reply = document.createElement("div");
    reply.setAttribute("aria-live","polite");
    reply.style.whiteSpace = "pre-wrap";
    reply.style.maxHeight = "18rem";
    reply.style.overflowY = "auto";
    const memoryLabel = document.createElement("h4");
    memoryLabel.textContent = "Approved personal memory";
    const memoryInput = document.createElement("input");
    memoryInput.placeholder = "Remember one non-sensitive preference…";
    memoryInput.maxLength = 350;
    memoryInput.setAttribute("aria-label","AURA memory fact");
    const remember = document.createElement("button");
    remember.type = "button";
    remember.textContent = "Save this memory";
    remember.disabled = true;
    const memoryItems = document.createElement("ul");
    area.append(title,note,status,question,ask,reply,memoryLabel,memoryInput,remember,memoryItems);
    container.append(area);
    const headers = { "Content-Type": "application/json" };
    async function request(path, opts={}) {
      const response = await fetch(path,{credentials:"same-origin",cache:"no-store",...opts});
      const json = await response.json().catch(()=>({error:"Invalid API response"}));
      if(!response.ok) throw new Error(json.error || "AURA unavailable");
      return json;
    }
    async function refreshMemories() {
      const {memories}=await request("/api/aura/memory");
      memoryItems.replaceChildren();
      for(const m of memories) {
        const li=document.createElement("li");
        const text=document.createElement("span");
        text.textContent=m.fact+" ";
        const del=document.createElement("button");
        del.type="button";del.textContent="Forget";
        del.setAttribute("aria-label","Forget: "+m.fact);
        del.addEventListener("click",async()=>{
          try{
            await request("/api/aura/memory",{method:"DELETE",headers,body:JSON.stringify({id:m.id})});
            await refreshMemories();
            status.textContent="Memory deleted.";
          }catch(err){status.textContent=err.message;}
        });
        li.append(text,del);
        memoryItems.append(li);
      }
    }
    async function init() {
      try {
        const info = await request("/api/aura/status");
        if (!area.isConnected) return;
        status.textContent = "AURA connected — "+info.model+" / "+info.mode+".";
        ask.disabled = false;
        remember.disabled = false;
        await refreshMemories();
      } catch {
        if(area.isConnected) status.textContent =
          "AURA's secure backend is not yet connected. The existing Towerflow room remains available.";
      }
    }
    ask.addEventListener("click",async()=>{
      const text=question.value.trim();
      if(text.length<2){status.textContent="Enter a question.";return;}
      ask.disabled=true;status.textContent="AURA is reasoning…";
      try {
        const data=await request("/api/aura/chat",{method:"POST",headers,body:JSON.stringify({question:text})});
        reply.textContent=data.answer+"\n\nSource: "+(data.sources||[]).join(", ");
        status.textContent="AURA replied.";
      } catch(err){status.textContent=err.message;}
      finally {ask.disabled=false;}
    });
    remember.addEventListener("click",async()=>{
      const fact=memoryInput.value.trim();
      if(fact.length<3){status.textContent="Enter a non-sensitive fact.";return;}
      remember.disabled=true;
      try{
        await request("/api/aura/memory",{method:"POST",headers,body:JSON.stringify({fact})});
        memoryInput.value="";
        await refreshMemories();
        status.textContent="Approved memory saved privately.";
      } catch(err){status.textContent=err.message;}
      finally {remember.disabled=false;}
    });
    init();
  };
}());
// TF_AURA_ROOM_CLIENT_V1_END
