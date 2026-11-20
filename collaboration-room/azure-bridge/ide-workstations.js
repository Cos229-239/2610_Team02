(() => {
'use strict';
// One actionable workspace per physical development-room computer.
// Only the contributor's paired Windows companion can start native IDEs.
const REPO='Cos229-239/2610_Team02';
const IDE=Object.freeze({
 'dev-ide-vs':{id:'vscommunity',title:'Visual Studio Community',summary:'Open the native TowerFlow solution, or edit a verified app source file.',defaultArea:'native'},
 'dev-ide-code':{id:'vscode',title:'Visual Studio Code',summary:'Open and debug TowerFlow web app source on your own PC.',defaultArea:'dashboard'},
 'dev-ide-cursor':{id:'cursor',title:'Cursor IDE',summary:'Open your actual personal TowerFlow checkout in Cursor, then edit and review.',defaultArea:'dashboard'},
 'dev-ide-antigravity':{id:'antigravity',title:'Google Antigravity IDE',summary:'Open the contributor workspace in Antigravity if installed; agent tools require your own account.',defaultArea:'dashboard'}
});
const fallbackAreas=Object.freeze({
 dashboard:{label:'Dashboard',file:'TowerFlow/index.html'},
 ui:{label:'UI / Appearance',file:'TowerFlow/styles.css'},
 markets:{label:'Markets',file:'TowerFlow/app.js'},
 portfolio:{label:'Portfolio',file:'TowerFlow/app.js'},
 analytics:{label:'Analytics',file:'TowerFlow/app.js'},
 room:{label:'Room',file:'collaboration-room/azure-bridge/desk.js'}
});
const make=(type,label,cls)=>{
 const el=document.createElement(type);
 if(label!==undefined)el.textContent=label;
 if(cls)el.className=cls;return el;
};
const anchor=(text,url)=>{const a=make('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function display(station,requestedArea){
 if(!Object.hasOwn(IDE,station))return false;
 const panel=document.getElementById('panel'),content=document.getElementById('panelContent'),menu=document.getElementById('menu');
 if(!panel||!content)return false;
 const conf=IDE[station];
 if(menu)menu.hidden=true;
 panel.hidden=false;
 document.getElementById('panelTag').textContent='DEVELOPMENT ROOM  /  IDE WORKSTATION';
 document.getElementById('panelTitle').textContent=conf.title.toUpperCase();
 const root=make('section',undefined,'tf-dev-ide-station');
 const intro=make('header',undefined,'tf-ide-station-head');
 intro.append(make('span','TOWERFLOW / ACTUAL DEVELOPMENT ENVIRONMENT','tf-dev-eyebrow'),
   make('h2',conf.title),
   make('p',conf.summary),
   make('p','Works against your own GitHub-authorized checkout. TowerFlow never runs a teammate’s desktop IDE on the shared server.'));
 root.append(intro);
 const info=make('div',undefined,'tf-ide-availability');info.setAttribute('role','status');
 info.textContent='Checking the local workstation companion…';
 const label=make('label','What code should this IDE open?');
 const area=make('select');area.setAttribute('aria-label','Source area for selected IDE');
 const actions=make('div',undefined,'tf-dev-action-row');
 const launch=make('button','OPEN IN '+conf.title.toUpperCase(),'tf-dev-primary');launch.type='button';
 const connect=make('button','CONNECT THIS COMPUTER','tf-dev-secondary');connect.type='button';
 const web=anchor('EDIT SOURCE IN BROWSER ↗','https://github.dev/'+REPO);
 actions.append(launch,connect,web);
 const sourceLinks=make('div',undefined,'tf-ide-related-files');
 const debug=make('details',undefined,'tf-ide-debug-guide');
 debug.append(make('summary','Debugger (F5)'));
 const debugMessage=make('p','Select the source area to see the matching debugger preset.');
 debug.append(debugMessage);
 const evidence=make('p','No IDE has been launched or debugger verified.');evidence.setAttribute('role','status');
 const steps=make('div',undefined,'tf-ide-steps');
 steps.append(make('strong','How this works'),make('p','1. Connect your PC once in Contribute.  2. Select a component.  3. Open your locally installed IDE.  4. Run and test there.  5. Return to Team Contributions to review and submit.'));
 root.append(info,label,sourceLinks,actions,debug,evidence,steps);
 content.replaceChildren(root);
 const setAreas=entries=>{
   area.replaceChildren();
   if(conf.id==='vscommunity')area.add(new Option('Native Portfolio Solution','native'));
   for(const [key,meta] of Object.entries(entries)){
     area.add(new Option(meta.label,key));
   }
   area.value=requestedArea&&Object.hasOwn(entries,requestedArea)?requestedArea:conf.defaultArea;
   if(!area.value)area.selectedIndex=0;
   label.append(area);
   updateLink(entries);
   area.onchange=()=>updateLink(entries);
 };
 function updateLink(entries){
   const selected=entries[area.value];
   web.href=selected?'https://github.dev/'+REPO+'/blob/dev/'+selected.file.split('/').map(encodeURIComponent).join('/'):'https://github.com/'+REPO+'/tree/dev/TowerFlow/TowerFlow.Native';
   sourceLinks.replaceChildren();
   if(selected){
     sourceLinks.append(make('strong','Primary source: '+selected.file));
     const related=Array.isArray(selected.related)?selected.related:[];
     for(const file of related.slice(0,5)){
       if(typeof file!=='string'||file.startsWith('/')||file.includes('..'))continue;
       const url='https://github.com/'+REPO+'/blob/dev/'+file.split('/').map(encodeURIComponent).join('/');
       sourceLinks.append(anchor('Related: '+file+' ↗',url));
     }
   }else sourceLinks.append(make('strong','Native solution: TowerFlow/TowerFlow.Native/TowerFlow.Native.sln'));
   const profile=selected?.debugProfile||'web';
   const instruction=area.value==='native'?
     'Visual Studio Community: choose Debug/x64 where available, set a breakpoint, then press F5. The native solution and installed C++ workload must be verified on this PC.':
     profile==='node'?
       'VS Code: select “TowerFlow — Debug server / Codespaces” in Run and Debug, set a breakpoint in TowerFlow/server.js, press F5. It uses isolated port 4174, not the shared room server.':
     profile==='room'?
       'Room frontend: browser developer tools can inspect the live room after sign-in. 3D room source is served dynamically, so F5 breakpoint mapping is NOT verified; do not debug against the shared room backend.':
       'VS Code: select “TowerFlow — Run with F5” in Run and Debug, set a breakpoint in TowerFlow/app.js and press F5. The checked-in profile starts a local port 4174 web app, not the shared room. For CSS use browser inspection.';
   debugMessage.textContent=instruction+
     ' IDE process launch and debugger attachment are two separate checks; a successful launch is not debugger proof.';
 }
 async function refresh(){
   if(typeof window.tfContributorIDEStatus!=='function'){
     info.textContent='Local PC companion not available in this room. Use the browser editor or connect your computer.';
     return;
   }
   try{
     const installed=await window.tfContributorIDEStatus();
     const state=installed?.[conf.id];
     info.textContent=state?.available?
       conf.title+' executable detected on your PC. Launch and debug still require verification.':
       conf.title+' not detected or the PC is not paired. Install it on YOUR PC or use the browser editor.';
   }catch(error){info.textContent='PC not connected: '+error.message;}
 }
 async function refreshSources(){
   try{
     const r=await fetch('/api/azure-bridge/source-navigation',{credentials:'same-origin',cache:'no-store'});
     if(!r.ok)throw Error('HTTP '+r.status);
     const result=await r.json();
     setAreas(result.areas||fallbackAreas);
   }catch{setAreas(fallbackAreas);}
 }
 connect.onclick=()=>{
   if(typeof window.tfOpenMemberDesk==='function'){
     window.tfOpenMemberDesk();return;
   }
   evidence.textContent='Open Contribute from the room toolbar and pair your local computer.';
 };
 launch.onclick=async()=>{
   launch.disabled=true;evidence.textContent='Checking your authenticated local workspace and starting '+conf.title+'…';
   try{
     if(typeof window.tfLaunchContributorIDE!=='function')throw Error('This room host does not have the contributor IDE adapter.');
     const output=await window.tfLaunchContributorIDE(conf.id,area.value);
     if(output?.id!==conf.id||output?.launched!==true)throw Error('The companion did not confirm the process launch.');
     evidence.textContent='Launch observed: '+output.label+' · Personal branch: '+output.workspaceBranch+
       ' · Source: '+output.source+(output.line?' · Reference line '+output.line:'')+
       (typeof output.sourceSha256==='string'?' · SHA-256 '+output.sourceSha256.slice(0,12):'')+
       '. Debugger and loaded source must be verified in the desktop IDE.';
     void refresh();
   }catch(error){
     evidence.textContent='IDE did not open: '+error.message+' Use Connect This Computer or the browser editor.';
   }finally{launch.disabled=false;}
 };
 void refreshSources();void refresh();
 return true;
}
window.tfOpenIDEStation=display;
})();
