
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
    // AURA speech belongs exclusively to this assistant, NEVER multiplayer
    // teammate audio. Browser voices differ across Windows installations.
    const voiceKey="towerflow.aura.voice.v1";
    let voiceSettings={enabled:false,voiceURI:"",rate:.94,pitch:1.04};
    try {
      const old=JSON.parse(localStorage.getItem(voiceKey)||"null");
      if(old&&typeof old==="object"){
        voiceSettings.enabled=old.enabled===true;
        if(typeof old.voiceURI==="string")voiceSettings.voiceURI=old.voiceURI.slice(0,200);
      }
    }catch{}
    const voiceSection=document.createElement("fieldset");
    voiceSection.setAttribute("aria-label","AURA feminine voice settings");
    const voiceLegend=document.createElement("legend");
    voiceLegend.textContent="AURA • NATURAL FEMININE VOICE";
    const voiceEnabled=document.createElement("label");
    const voiceToggle=document.createElement("input");
    voiceToggle.type="checkbox";voiceToggle.checked=voiceSettings.enabled;
    voiceEnabled.append(voiceToggle,document.createTextNode(" Speak AURA replies"));
    const voiceSelect=document.createElement("select");
    voiceSelect.setAttribute("aria-label","AURA speech voice");
    const sample=document.createElement("button");
    sample.type="button";sample.textContent="Preview voice";
    const stopVoice=document.createElement("button");
    stopVoice.type="button";stopVoice.textContent="Stop AURA voice";
    const voiceStatus=document.createElement("small");
    const tts=window.speechSynthesis;
    const voiceSupported=typeof SpeechSynthesisUtterance!=="undefined"&&!!tts;
    const preferred=/aria|jenny|zira|samantha|ava|susan|hazel|sonia|female|feminine/i;
    const storeVoice=()=>{
      try{localStorage.setItem(voiceKey,JSON.stringify(voiceSettings));}catch{}
    };
    function availableVoices(){
      return voiceSupported?tts.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang)): [];
    }
    function loadVoiceOptions(){
      if(!voiceSupported)return;
      const voices=availableVoices();
      voiceSelect.replaceChildren();
      for(const v of voices){
        const option=document.createElement("option");
        option.value=v.voiceURI;option.textContent=v.name+" ("+v.lang+")";
        voiceSelect.append(option);
      }
      const chosen=voices.find(v=>v.voiceURI===voiceSettings.voiceURI)||
        voices.find(v=>preferred.test(v.name))||voices[0];
      if(chosen){voiceSelect.value=chosen.voiceURI;voiceSettings.voiceURI=chosen.voiceURI;}
      voiceStatus.textContent=voices.length?
        "Installed browser voice. Quality and voice identity depend on your device.":
        "No English voices installed. Add a Windows speech voice.";
    }
    function speakAura(text){
      if(!voiceSupported||!text||typeof text!=="string")return false;
      tts.cancel();
      const utterance=new SpeechSynthesisUtterance(text.slice(0,4000));
      utterance.rate=voiceSettings.rate;utterance.pitch=voiceSettings.pitch;utterance.volume=.85;
      const chosen=availableVoices().find(v=>v.voiceURI===voiceSettings.voiceURI);
      if(chosen)utterance.voice=chosen;
      utterance.onerror=()=>{voiceStatus.textContent="Speech failed or was blocked by the browser.";};
      tts.speak(utterance);
      return true;
    }
    if(voiceSupported){
      loadVoiceOptions();
      tts.addEventListener?.("voiceschanged",loadVoiceOptions);
    }else{
      voiceToggle.disabled=true;voiceSelect.disabled=true;sample.disabled=true;stopVoice.disabled=true;
      voiceStatus.textContent="Browser speech is not available; AURA text remains functional.";
    }
    voiceToggle.addEventListener("change",()=>{
      voiceSettings.enabled=voiceToggle.checked;storeVoice();
      if(!voiceSettings.enabled&&voiceSupported)tts.cancel();
    });
    voiceSelect.addEventListener("change",()=>{
      voiceSettings.voiceURI=voiceSelect.value;storeVoice();
    });
    sample.addEventListener("click",()=>speakAura("Hello, welcome to Frontier. I'm AURA. I'm here to help you build, explore, and create."));
    stopVoice.addEventListener("click",()=>{if(voiceSupported)tts.cancel();});
    voiceSection.append(voiceLegend,voiceEnabled,voiceSelect,sample,stopVoice,voiceStatus);
    area.append(title,note,status,question,ask,reply,voiceSection,memoryLabel,memoryInput,remember,memoryItems);
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
        if(voiceSettings.enabled)speakAura(data.answer);
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
