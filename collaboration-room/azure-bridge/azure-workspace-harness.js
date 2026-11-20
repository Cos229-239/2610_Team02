(() => {
'use strict';
// Azure is a bounded, user-directed workspace controller, not a magically
// authenticated LLM. Model/chat execution requires a separate approved adapter.
const make=(type,label)=>{const x=document.createElement(type);if(label!==undefined)x.textContent=label;return x;};
function show(){
 const panel=document.getElementById('panel'),host=document.getElementById('panelContent');
 if(!panel||!host)return false;
 document.getElementById('menu').hidden=true;panel.hidden=false;
 document.getElementById('panelTag').textContent='AZURE / WORKSPACE';
 document.getElementById('panelTitle').textContent='AZURE';
 const root=make('section');root.className='tf-azure-harness';
 const title=make('h2','What should we work on?');
 const subtitle=make('p','I can locate verified code and open it in your selected IDE. Code edits require your authorized coding tool.');
 const prompt=make('textarea');
 prompt.placeholder='Example: Open the Dashboard source in VS Code and inspect the layout.';
 prompt.maxLength=1800;prompt.rows=3;
 prompt.setAttribute('aria-label','Describe your TowerFlow task');
 const row=make('div');row.className='row wrap';
 const ide=make('select');ide.setAttribute('aria-label','Choose your IDE');
 const choices=[['vscode','Visual Studio Code'],['vscommunity','Visual Studio Community'],
   ['cursor','Cursor'],['antigravity','Google Antigravity']];
 for(const [value,label] of choices){const opt=make('option',label);opt.value=value;ide.append(opt);}
 const planButton=make('button','Find code');planButton.type='button';
 row.append(ide,planButton);
 const status=make('p','Ready to inspect a real source target.');status.setAttribute('role','status');
 const results=make('section');
 const more=make('details');more.append(make('summary','Architecture and integration limits'),
  make('p','Azure plans work and routes to a verified source file. An IDE must be paired to your own PC. ChatGPT, Grok, Gemini and Venice need their own GitHub-enabled coding tools. No private Megan/Laura/Pixi code is exposed to teammates.'));
 root.append(title,subtitle,prompt,row,status,results,more);
 host.replaceChildren(root);
 async function find(){
   planButton.disabled=true;
   results.replaceChildren();status.textContent='Matching request and verifying GitHub source…';
   try{
     const resp=await fetch('/api/azure-bridge/azure-harness/plan',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt:prompt.value,editor:ide.value})
     });
     const output=await resp.json();
     if(!resp.ok)throw Error(output.error||'Azure planner unavailable');
     if(!output.target){
       status.textContent='Choose a component. I will not guess when the request has no unique source target.';
       const pick=make('select');
       for(const id of output.choices){const opt=make('option',id);opt.value=id;pick.append(opt);}
       if(output.choices.length) {
         const submit=make('button','Use selected area');
         submit.onclick=()=>{prompt.value='Open '+pick.value+' source: '+prompt.value;void find();};
         results.append(pick,submit);
       }else{
         const hint=make('p','Try: Dashboard, Markets, Trading, Backend, 3D room, or Portfolio.');
         results.append(hint);
       }
       return;
     }
     const source=output.source;
     const exact=output.sourceProof?.status==='SOURCE_READ_VERIFIED';
     status.textContent=exact?
       'GitHub dev source verified · '+source.path:
       'Source mapping found, but GitHub access/source proof is unavailable.';
     const header=make('h3','Source: '+output.target);
     const path=make('p',source.path);
     const revision=make('p',exact?'GitHub blob '+output.sourceProof.blobSha.slice(0,12):
       'Not verified against current dev branch.');
     const actions=make('div');actions.className='row wrap';
     const open=make('button','Open in '+choices.find(x=>x[0]===output.editor)?.[1]);
     open.type='button';open.disabled=!exact;
     open.onclick=()=>{
       if(typeof window.tfOpenIDEStation!=='function'){
         status.textContent='IDE adapter is not installed on this host.';return;
       }
       if(!window.tfOpenIDEStation(output.station,output.target))
         status.textContent='Unable to open the chosen IDE station.';
     };
     const link=make('a','View verified file on GitHub ↗');
     link.href='https://github.com/Cos229-239/2610_Team02/blob/dev/'+source.path.split('/').map(encodeURIComponent).join('/');
     link.target='_blank';link.rel='noopener noreferrer';
     actions.append(open,link);
     const limit=make('p','This is a navigation receipt, not a completed code change or attached debugger.');
     results.append(header,path,revision,actions,limit);
   }catch(error){status.textContent='Azure could not verify the request: '+error.message;}
   finally{planButton.disabled=false;}
 }
 planButton.onclick=()=>void find();
 prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void find();}});
 prompt.focus();
 return true;
}
window.tfOpenAzureWorkspace=show;
})();
