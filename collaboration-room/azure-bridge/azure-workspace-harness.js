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
 const subtitle=make('p','Describe a request. Azure verifies source, previews registered edits and opens your selected IDE. Unverified actions stay blocked.');
 const prompt=make('textarea');
 prompt.placeholder='Example: Open the Dashboard source in VS Code and inspect the layout.';
 prompt.maxLength=1800;prompt.rows=3;
 prompt.setAttribute('aria-label','Describe your TowerFlow task');
 const areaLabel=make('label','Target component');
 const target=make('select');target.setAttribute('aria-label','Target source component');
 target.append(new Option('Detect from request',''));
 areaLabel.append(target);
 const row=make('div');row.className='row wrap';
 const ide=make('select');ide.setAttribute('aria-label','Choose your IDE');
 const choices=[['vscode','Visual Studio Code'],['vscommunity','Visual Studio Community'],
   ['cursor','Cursor'],['antigravity','Google Antigravity']];
 for(const [value,label] of choices){const opt=make('option',label);opt.value=value;ide.append(opt);}
 const planButton=make('button','Locate source');planButton.type='button';
 const previewButton=make('button','Preview supported edit');previewButton.type='button';
 const reasonButton=make('button','Ask local Azure AI');reasonButton.type='button';reasonButton.hidden=true;
 row.append(ide,planButton,previewButton,reasonButton);
 const status=make('p','Ready to inspect a real source target.');status.setAttribute('role','status');
 const results=make('section');
 const more=make('details');more.append(make('summary','Architecture and integration limits'),
  make('p','Azure plans work and routes to a verified source file. An IDE must be paired to your own PC. ChatGPT, Grok, Gemini and Venice need their own GitHub-enabled coding tools. No private Megan/Laura/Pixi code is exposed to teammates.'));
 root.append(title,subtitle,prompt,areaLabel,row,status,results,more);
 void fetch('/api/azure-bridge/azure-harness/capabilities',{credentials:'same-origin',cache:'no-store'})
  .then(r=>r.ok?r.json():null).then(data=>{
    for(const [id,item] of Object.entries(data?.areas||{}))target.append(new Option(item.label||id,id));
    if(data?.model?.state==='MODEL_AVAILABLE'){
      reasonButton.hidden=false;reasonButton.title='Local Ollama structured intent suggestion. Never edits files.';
    }
  }).catch(()=>{});
 reasonButton.onclick=async()=>{
   reasonButton.disabled=true;status.textContent='Asking configured local model for a bounded source suggestion…';
   try{
     const response=await fetch('/api/azure-bridge/azure-harness/reason',{
       method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt:prompt.value})
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Model unavailable');
     if(data.state!=='MODEL_SUGGESTION_NOT_VERIFIED'||!data.proposal)
       throw Error(data.reason||data.state);
     results.replaceChildren();
     const suggestion=make('p','Suggested source: '+data.proposal.area+' · '+data.proposal.reason);
     const approve=make('button','Use this source suggestion');approve.type='button';
     approve.onclick=()=>{prompt.value='Inspect '+data.proposal.area+' source. Original request: '+prompt.value;void find();};
     results.append(suggestion,approve);
     status.textContent='Local model generated a suggestion, NOT a verified code edit.';
   }catch(error){status.textContent='Local reasoning unavailable: '+error.message;}
   finally{reasonButton.disabled=false;}
 };
 host.replaceChildren(root);
 async function find(){
   planButton.disabled=true;
   results.replaceChildren();status.textContent='Matching request and verifying GitHub source…';
   try{
     const resp=await fetch('/api/azure-bridge/azure-harness/plan',{
       method:'POST',credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt:prompt.value,editor:ide.value,...(target.value?{area:target.value}:{})})
     });
     const output=await resp.json();
     if(!resp.ok)throw Error(output.error||'Azure planner unavailable');
     if(!output.target){
       status.textContent='Choose a component. I will not guess when the request has no unique source target.';
       const pick=make('select');
       for(const id of output.choices){const opt=make('option',id);opt.value=id;pick.append(opt);}
       if(output.choices.length) {
         const submit=make('button','Use selected area');
         submit.onclick=()=>{target.value=pick.value;void find();};
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
     const revision=make('p',exact?'GitHub blob '+output.sourceProof.blobSha.slice(0,12)+(output.sourceProof.referenceLine?' · line '+output.sourceProof.referenceLine:''):
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
     const copy=make('button','Copy coding task');copy.type='button';
     copy.onclick=async()=>{
       const instruction=[
         'TOWERFLOW CODING TASK — USER-DIRECTED',
         'Original request (preserve exactly): '+output.originalPrompt,
         'Repository: Cos229-239/2610_Team02',
         'Team base branch: dev. Create only a personal working branch or draft PR; do not merge automatically.',
         'Selected code area: '+output.target,
         'Actual source: '+source.path,
         'GitHub source state: '+(exact?'VERIFIED blob '+output.sourceProof.blobSha:'UNVERIFIED'),
         'Related files: '+source.related.join(', '),
         'Editor: '+output.editor+'; F5 debugger session must be separately demonstrated.',
         'Before changing code: use your own authorized GitHub/IDE tools to read source, inspect existing tests, and verify write permissions.',
         'Preserve existing room.js graphics, OAuth, source changes, and teammates work. No force push or shared-host edits.',
         'Implement minimum scoped diff. Run syntax/unit/browser tests and report actual PASS/FAIL evidence.',
         'Produce a draft PR to dev for team review, do not auto-deploy.',
         'Do not claim AI/repo connection from this prompt alone. If you lack code tools, report missing access instead of guessing.'
       ].join('\n');
       try{await navigator.clipboard.writeText(instruction);status.textContent='Task copied for your own authorized coding AI.';}
       catch{status.textContent='Clipboard unavailable; copy directly from the preview field.';const field=make('textarea');field.readOnly=true;field.value=instruction;field.rows=10;results.append(field);field.select();}
     };
     actions.append(open,link,copy);
     const limit=make('p','This is a navigation receipt, not a completed code change or attached debugger.');
     results.append(header,path,revision,actions,limit);
   }catch(error){status.textContent='Azure could not verify the request: '+error.message;}
   finally{planButton.disabled=false;}
 }

 previewButton.onclick=async()=>{
   previewButton.disabled=true;results.replaceChildren();
   status.textContent='Checking supported edit and preparing isolated preview…';
   try{
     if(!prompt.value.trim())throw Error('Describe an edit first');
     const response=await fetch('/api/azure-bridge/direct/plan',{
       method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({prompt:prompt.value})
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unsupported change');
     if(!/^\/api\/azure-bridge\/direct-preview\/[a-f0-9]{48}\/index\.html$/.test(data.previewUrl))
       throw Error('Untrusted preview location');
     const title=make('h3','Isolated source preview');
     const info=make('p','Source is not applied. A draft PR requires separate review and authorization.');
     const frame=make('iframe');frame.title='Azure TowerFlow change preview';
     frame.src=data.previewUrl;
     frame.style.cssText='width:100%;height:420px;min-height:340px;border:1px solid #5bb8dd;border-radius:7px;background:#081524';
     const submit=make('button','Submit draft PR for review');submit.type='button';
     submit.onclick=async()=>{
       if(!confirm('Submit only this reviewed preview as a DRAFT PR to dev? No automatic merge or live publication.'))return;
       submit.disabled=true;status.textContent='Creating authorized draft pull request…';
       try{
         const response=await fetch('/api/azure-bridge/direct/submit',{
           method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
           body:JSON.stringify({key:data.key})
         });
         const outcome=await response.json();
         if(!response.ok)throw Error(outcome.error||'Draft PR not created');
         const url=outcome.url||outcome.html_url||outcome.pullRequestUrl;
         if(typeof url!=='string'||!/^https:\/\/github\.com\/Cos229-239\/2610_Team02\/pull\/[0-9]+$/.test(url))
           throw Error('Draft submitted, but response URL was not verified. Check the Team 02 pull requests list.');
         const link=make('a','Open draft PR ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
         results.append(link);
         status.textContent='Draft PR created for team review. Not merged or deployed.';
       }catch(error){status.textContent='Submission unavailable: '+error.message;}
       finally{submit.disabled=false;}
     };
     results.append(title,info,frame,submit);
     status.textContent='Preview generated from a registered change. Nothing has been merged or deployed.';
   }catch(error){status.textContent='Preview unavailable: '+error.message+'. Open verified source in your IDE for other requests.';}
   finally{previewButton.disabled=false;}
 };
 planButton.onclick=()=>void find();
 prompt.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void find();}});
 prompt.focus();
 return true;
}
window.tfOpenAzureWorkspace=show;
})();
