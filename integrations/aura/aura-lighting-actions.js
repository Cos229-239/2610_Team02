// TF_AURA_LIGHTING_V1_BEGIN
// AURA's first controlled world-design tool: local visual preview and approval.
// Does not modify servers, repository, credentials, or multiplayer state.
(function(){
  "use strict";
  const key="towerflow.aura.lighting.v1";
  const themes={
    aurora:{label:"Vibrant Aurora",colors:[0x00ffd1,0x7b61ff,0xff4cc8,0x27a5ff],background:0x11132c,exposure:1.65},
    sunset:{label:"Solar Sunset",colors:[0xff6537,0xffd94a,0xff4fa8,0x9f6bff],background:0x241025,exposure:1.6},
    cyber:{label:"Cyber Spectrum",colors:[0x08f7fe,0xf803fc,0x7bff28,0xffd000],background:0x09132b,exposure:1.55}
  };
  const statusText="AURA can preview and apply a vivid lighting preset in your browser. Preview is reversible; Apply saves your selection for this browser only. Other teammates' lighting is unchanged.";
  let selected=null,committed=null,activeLights=null;
  let baseFog=null,baseBackground=null,baseExposure=null;
  function parseIntent(text) {
    if(typeof text!=="string" || text.length>1200) return null;
    if(!/\b(light|lighting|illuminat|colour|color|vibrant|neon|glow|bright|ambien|saturat|rainbow|aurora)\w*/i.test(text)) return null;
    if(/\b(sunset|sunrise|warm|orange|gold)\b/i.test(text)) return "sunset";
    if(/\b(cyber|rainbow|rgb|arcade)\b/i.test(text)) return "cyber";
    return "aurora";
  }
  function ready() {
    return typeof THREE!=="undefined" && typeof scene!=="undefined" &&
      typeof renderer!=="undefined" && typeof helpPanel==="function";
  }
  function ensureLights() {
    if(activeLights) return;
    baseBackground=scene.background.clone();
    baseFog=scene.fog?.color?.clone()||null;
    baseExposure=renderer.toneMappingExposure;
    activeLights=[];
    // Three atrium accent lights and three matching lights in the second chamber.
    // No alteration of original meshes, walls or movement behavior.
    const locations=[
      [-13,7,0],[12,6,-5],[0,8,8],
      [49,7,-4],[62,8,3],[75,7,-4]
    ];
    locations.forEach(([x,y,z],index)=>{
      const light=new THREE.PointLight(0xffffff,0,19,2);
      light.position.set(x,y,z);
      scene.add(light);
      activeLights.push(light);
    });
  }
  function applyVisual(theme) {
    ensureLights();
    if(!theme || !themes[theme]) {
      activeLights.forEach(light=>{light.intensity=0;light.visible=false;});
      scene.background.copy(baseBackground);
      if(scene.fog?.color && baseFog) scene.fog.color.copy(baseFog);
      renderer.toneMappingExposure=baseExposure;
      selected=null;
      return;
    }
    const preset=themes[theme];
    activeLights.forEach((light,i)=>{
      light.color.setHex(preset.colors[i%preset.colors.length]);
      light.intensity=105;
      light.visible=true;
    });
    scene.background.setHex(preset.background);
    if(scene.fog?.color) scene.fog.color.setHex(preset.background);
    renderer.toneMappingExposure=preset.exposure;
    selected=theme;
  }
  function storedTheme() {
    try {
      const value=localStorage.getItem(key);
      return themes[value] ? value : null;
    } catch { return null; }
  }
  function saveTheme(value) {
    try {
      if(value) localStorage.setItem(key,value);
      else localStorage.removeItem(key);
    } catch {
      // Private browsing can disable storage. Visual preview still works.
    }
  }
  function activateUI() {
    if(!ready()) return;
    committed=storedTheme();
    if(committed) applyVisual(committed);
    const oldHelp=helpPanel;
    helpPanel=function auraLightingHelp() {
      oldHelp();
      const area=document.getElementById("tfAuraArea");
      if(!area || area.querySelector("#tfAuraLighting")) return;
      const panel=document.createElement("section");
      panel.id="tfAuraLighting";
      panel.setAttribute("aria-label","AURA room-design lighting controls");
      const heading=document.createElement("h3");
      heading.textContent="AURA — ROOM DESIGN ACTIONS";
      const note=document.createElement("p");
      note.textContent=statusText;
      const choices=document.createElement("div");
      const preview=document.createElement("button");
      preview.type="button";preview.textContent="Preview Aurora lighting";
      const commit=document.createElement("button");
      commit.type="button";commit.textContent="Apply lighting";commit.disabled=true;
      const undo=document.createElement("button");
      undo.type="button";undo.textContent="Revert preview";
      const reset=document.createElement("button");
      reset.type="button";reset.textContent="Restore original lighting";
      const status=document.createElement("p");
      status.setAttribute("role","status");
      status.setAttribute("aria-live","polite");
      function setStatus(text){status.textContent=text;}
      function choose(name) {
        applyVisual(name);
        preview.textContent="Preview "+themes[name].label;
        commit.disabled=false;
        setStatus("Previewing "+themes[name].label+". Click Apply lighting to save it for this browser.");
      }
      for(const [id,preset] of Object.entries(themes)) {
        const button=document.createElement("button");
        button.type="button";button.textContent=preset.label;
        button.addEventListener("click",()=>choose(id));
        choices.append(button);
      }
      preview.addEventListener("click",()=>choose(selected||"aurora"));
      commit.addEventListener("click",()=>{
        if(!selected) return;
        committed=selected;saveTheme(committed);
        commit.disabled=true;
        setStatus("Applied "+themes[committed].label+" locally. Other visitors' views are unchanged.");
      });
      undo.addEventListener("click",()=>{
        applyVisual(committed);
        commit.disabled=true;
        setStatus(committed?"Reverted to saved "+themes[committed].label+".":"Reverted to the original scene.");
      });
      reset.addEventListener("click",()=>{
        committed=null;applyVisual(null);saveTheme(null);commit.disabled=true;
        setStatus("Original Towerflow lighting restored.");
      });
      const question=area.querySelector("textarea");
      const ask=area.querySelector("button");
      if(question && ask) {
        // Runs only after an explicit user interaction. No AI-generated code is executed.
        ask.addEventListener("click",()=>{
          const intent=parseIntent(question.value);
          if(intent) {
            const label=themes[intent].label;
            setStatus("AURA identified a room-lighting request. Choose "+label+
              " above to preview; click Apply lighting to keep it.");
          }
        });
      }
      panel.append(heading,note,choices,preview,commit,undo,reset,status);
      area.append(panel);
      setStatus(committed ? "Saved local theme: "+themes[committed].label : "Original Towerflow lighting is active.");
    };
  }
  if(ready()) activateUI();
}());
// TF_AURA_LIGHTING_V1_END
