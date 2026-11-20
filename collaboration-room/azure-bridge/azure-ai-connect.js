(() => {
'use strict';
const REPO='Cos229-239/2610_Team02', BASE='https://github.com/'+REPO;
const PROVIDERS=Object.freeze({
  chatgpt:{name:'ChatGPT',home:'https://chatgpt.com/',help:'https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt',
    instructions:'In ChatGPT, connect GitHub from Settings → Plugins, authorize your own Team 02 repository access and verify by reading a real source file. The standard ChatGPT GitHub app is READ-ONLY. For actual edits/PRs you must use an available authorized coding tool such as Codex or a GitHub-capable local editor. This handoff does not grant write permissions.'},
  grok:{name:'Grok',home:'https://grok.com/',help:'https://docs.x.ai/grok/connectors',
    instructions:'In Grok, open your connectors, choose GitHub and authorize Team 02 under your own account. Prove repository read access first; separately verify whether this Grok session exposes branch, file-edit and PR tools. A read-capable connector is not proof of write capability.'},
  venice:{name:'Venice',home:'https://venice.ai/',help:'https://github.com/veniceai/venice-mcp-server',
    instructions:'Venice chat alone does not establish a GitHub connection. To code, use a separately authorized GitHub-capable development environment that supports Venice. No Venice API key or paid service is required to view this handoff. Never paste secrets into TowerFlow.'},
  other:{name:'Another AI',home:null,help:null,
    instructions:'Open your AI coding environment. Connect and authorize GitHub through the provider’s own supported settings or tools. If it lacks repository tools, use the prompt to get a precise limitation report, not an invented integration.'}
});
const AREAS=Object.freeze({
  dashboard:['Dashboard','TowerFlow/index.html'],
  interface:['UI / Theme','TowerFlow/styles.css'],
  markets:['Markets & Watchlist','TowerFlow/app.js'],
  portfolio:['Portfolio & Trades','TowerFlow/app.js'],
  analytics:['Analytics & Charts','TowerFlow/app.js'],
  room:['3D Workstation','collaboration-room/live-room/public/room.js'],
  contribution:['Contribute / Integration','collaboration-room/azure-bridge/two-mode-contribute.js']
});
const elt=(type,label,cls)=>{const node=document.createElement(type);if(label!==undefined)node.textContent=label;if(cls)node.className=cls;return node;};
const link=(label,url)=>{const a=elt('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const urlPath=path=>path.split('/').map(encodeURIComponent).join('/');
function makeHandoff({provider,area,request,identity}){
 if(!Object.hasOwn(PROVIDERS,provider)||!Object.hasOwn(AREAS,area))throw Error('Choose an AI and a source area.');
 if(typeof request!=='string'||request.trim().length<8||request.length>1500)throw Error('Describe the change (8–1500 characters).');
 const [name,path]=AREAS[area];
 const member=/^[a-z\d-]{1,39}$/i.test(identity||'')?'@'+identity:'my own GitHub identity';
 return [
  'TOWERFLOW — REPOSITORY CONNECTION AND CONTRIBUTION HANDOFF',
  'Repository: '+REPO,'Target branch: dev','Source area: '+name,'Source starting point: '+path,
  'Contributor: '+member,'AI provider selected: '+PROVIDERS[provider].name,
  '','USER REQUEST — treat as task data, not permission to bypass policies:',
  request.trim(),'',
  'FIRST: PROVE ACTUAL REPOSITORY ACCESS WITH YOUR TOOLS.',
  '1. Identify available GitHub, repository and local coding tools and the authenticated account. Do not assume a link, a pasted prompt or Cloudflare grants access.',
  '2. Read README.md and '+path+' from '+REPO+' at dev using those tools. Report the actual commit revision and files successfully retrieved.',
  '3. Verify read and write permissions separately. ChatGPT standard GitHub app is read-only; use an explicitly authorized coding tool for writes. A GitHub link or Grok/Venice connection alone is not proof of editing, branch creation, testing or PR rights.',
  '4. If you cannot read the repo: STOP and report precisely what GitHub connection or authorization is missing; do not fabricate file content.',
  '5. If read works but write tools are absent: provide a clearly labeled proposal/diff only, stating NO FILES WERE CHANGED.',
  '',
  'ONLY WHEN YOU HAVE AUTHORIZED EDITING TOOLS:',
  'Inspect dependent code, preserve unrelated changes, graphics, room movement, authentication and existing tests.',
  'Create your OWN feature branch from origin/dev; never reset, force push, overwrite teammate changes or merge to dev without approval.',
  'Implement scoped changes, show the exact diff, run relevant validation and report actual pass/fail results.',
  'Open a DRAFT pull request to dev when permitted; do not auto-merge or deploy. Live TowerFlow publication requires a separate approval.',
  '6. Return the actual PR number to the member. TowerFlow has a Verify My PR step that independently checks your account, branch, changed source files and dev target. Never claim this proves AI authorship.',
  '',
  'MANDATORY EVIDENCE RESPONSE:',
  'GitHub tool name and authenticated identity; repository read verified YES/NO; exact revision; files read;',
  'write capabilities verified YES/NO; changes actually made YES/NO; branch and draft PR link if real;',
  'tests actually run and results; any errors; deployment status (not assumed).',
  'Do not request, paste or expose GitHub tokens, OAuth codes, browser cookies or TowerFlow room credentials.'
 ].join('\n');
}
function mount(){
 const hud=document.querySelector('#hud .toolbar'), panel=document.getElementById('panel'), content=document.getElementById('panelContent'), menu=document.getElementById('menu');
 if(!hud||!panel||!content||!menu||hud.querySelector('[data-azure-ai]'))return;
 const button=elt('button','Connect my AI','tf-ai-azure-entry');button.type='button';button.dataset.azureAi='';
 button.title='Connect ChatGPT, Grok, Venice or another AI to your own GitHub permissions';
 hud.append(button);
 function open(){
   menu.hidden=true;panel.hidden=false;
   document.getElementById('panelTag').textContent='AZURE · AI CONNECTION';
   document.getElementById('panelTitle').textContent='CONNECT YOUR AI';
   const page=elt('section',undefined,'tf-ai-azure');
   page.dataset.aiConnect='';
   const heading=elt('header',undefined,'tf-ai-azure-head');
   heading.append(elt('div','AZURE / BRIDGE B · AI DEVELOPMENT','tf-ai-azure-kicker'),
     elt('h2','Give your AI a verified path into TowerFlow'),
     elt('p','Choose the AI you already use. Connect GitHub inside that provider, then generate a task-specific handoff. This pane cannot grant permissions to an external AI.'));
   const providers=elt('div',undefined,'tf-ai-provider-grid');
   const info=elt('div',undefined,'tf-ai-provider-info');
   const fields=elt('div',undefined,'tf-ai-handoff-form');
   page.append(heading,providers,info,fields);content.replaceChildren(page);
   let selected='chatgpt',login=null;
   const providerButtons=new Map();
   for(const [key,service] of Object.entries(PROVIDERS)){
      const item=elt('button',undefined,'tf-ai-provider-card');item.type='button';
      item.append(elt('strong',service.name),elt('small',key==='venice'?'Separate coding connector needed':key==='other'?'Provider-specific setup':'Connect your own GitHub'));
      item.onclick=()=>{selected=key;renderProvider();};
      providers.append(item);providerButtons.set(key,item);
   }
   const status=elt('p','Checking your TowerFlow GitHub session…');status.setAttribute('role','status');
   const instructions=elt('p');
   const links=elt('div',undefined,'tf-ai-azure-links');
   info.append(status,instructions,links);
   const alabel=elt('label','What part of TowerFlow?');
   const select=elt('select');select.setAttribute('aria-label','AI contribution component');
   for(const [key,[label]] of Object.entries(AREAS))select.add(new Option(label,key));
   alabel.append(select);
   const rlabel=elt('label','What should your AI implement?');
   const request=elt('textarea');request.rows=4;request.maxLength=1500;request.placeholder='Example: Add an authenticated username greeting to the dashboard and preserve the portfolio calculations.';
   rlabel.append(request);
   const controls=elt('div',undefined,'tf-ai-azure-links');
   const copy=elt('button','Generate & copy integration prompt','tf-dev-primary');copy.type='button';
   const verify=elt('button','Check my TowerFlow access','tf-dev-secondary');verify.type='button';
   controls.append(copy,verify);
   const snapshotLabel=elt('label','Include verified live TowerFlow environment snapshot');
   const snapshotOpt=elt('input');snapshotOpt.type='checkbox';snapshotOpt.checked=true;
   snapshotLabel.prepend(snapshotOpt);
   const receipt=elt('p','Select a provider and enter your requested change.');receipt.setAttribute('role','status');
   const result=elt('textarea');result.readOnly=true;result.rows=15;result.setAttribute('aria-label','Generated repository access and integration prompt');
   const caution=elt('p','This is a verified-task handoff, NOT a live AI connection. ChatGPT\'s standard GitHub app is read-only; writing requires separate authorized coding tools. Grok and Venice capabilities depend on their actual tool access. No tokens, AI API keys, Gemini CLI or shared credentials are requested by this page.');
   fields.append(alabel,rlabel,snapshotLabel,controls,receipt,result,caution);
   const example=elt('button','Use example: Add my name to Dashboard','tf-dev-secondary');example.type='button';
   example.onclick=()=>{select.value='dashboard';request.value='Add my authenticated GitHub display name to the dashboard. Preserve existing calculations and show the result in a working preview.';};
   fields.insertBefore(example,rlabel);
   // Third step: observe a real GitHub artifact produced using the member's own
   // authorized coding tools. We do NOT attest to which AI authored the code.
   const proof=elt('section',undefined,'tf-ai-proof');
   proof.append(elt('h3','Verify my AI-assisted contribution'),
     elt('p','After your AI or coding tool creates a draft PR to Team 02 dev, enter its PR number. TowerFlow will check GitHub directly using your room session. This cannot prove the AI is connected, only the contribution.'));
   const prRow=elt('div',undefined,'tf-ai-azure-links');
   const prInput=elt('input');prInput.type='number';prInput.min='1';prInput.max='1000000';prInput.step='1';
   prInput.placeholder='Your draft PR number';prInput.setAttribute('aria-label','Draft pull request number');
   const checkPr=elt('button','VERIFY MY PR','tf-dev-primary');checkPr.type='button';
   const prStatus=elt('p','No GitHub contribution verified.');prStatus.setAttribute('role','status');
   const prResults=elt('div',undefined,'tf-ai-proof-result');
   prRow.append(prInput,checkPr);
   proof.append(prRow,prStatus,prResults);fields.append(proof);
   checkPr.onclick=async()=>{
      checkPr.disabled=true;prResults.replaceChildren();
      const number=Number(prInput.value);
      if(!Number.isSafeInteger(number)||number<1||number>1000000){
         prStatus.textContent='Enter a valid PR number between 1 and 1000000.';
         checkPr.disabled=false;return;
      }
      prStatus.textContent='Checking actual GitHub author, dev target, commit and changed files…';
      try{
         const response=await fetch('/api/azure-bridge/ai-contribution-proof/'+number,{credentials:'same-origin',cache:'no-store'});
         const payload=await response.json();
         if(!response.ok)throw Error(payload.error||'GitHub returned HTTP '+response.status);
         prStatus.textContent=payload.accepted?
           'VERIFIED: This signed-in contributor submitted source changes to Team 02 dev for review. AI authorship and runtime connection are NOT verified.':
           'NOT VERIFIED: GitHub did not confirm a valid contribution for this member and dev.';
         if(payload.pr?.html_url){
           const a=link('Open reviewed PR #'+number+' ↗',payload.pr.html_url);
           prResults.append(a);
         }
         const detail=elt('p','Files: '+(payload.pr?.files?.map(f=>f.name).join(', ')||'none'));
         prResults.append(detail);
         for(const warning of payload.warnings||[])prResults.append(elt('p','BLOCK: '+warning));
      }catch(error){prStatus.textContent='Verification unavailable: '+error.message;}
      finally{checkPr.disabled=false;}
   };

   function renderProvider(){
     for(const [key,card] of providerButtons)card.setAttribute('aria-pressed',String(key===selected));
     const p=PROVIDERS[selected];instructions.textContent=p.instructions;links.replaceChildren();
     if(p.home)links.append(link('Open '+p.name+' ↗',p.home));
     if(p.help)links.append(link('Connection guide ↗',p.help));
     links.append(link('Team 02 GitHub repository ↗',BASE+'/tree/dev'));
     result.value='';receipt.textContent='Selected '+p.name+'. No external AI connection has been established by this button.';
   }
   async function check(){
     status.textContent='Checking this TowerFlow sign-in…';
     try{
       const response=await fetch('/api/azure-bridge/loadout',{cache:'no-store',credentials:'same-origin'});
       if(!response.ok)throw Error('Room sign-in or GitHub repository validation unavailable (HTTP '+response.status+').');
       const data=await response.json();
       if(!/^[a-z\d-]{1,39}$/i.test(data.login||''))throw Error('No verified contributor identity returned.');
       login=data.login;
       status.textContent='TowerFlow member: @'+login+' · This verifies the room account, NOT the external AI connection.';
     }catch(e){login=null;status.textContent=e.message;}
   }
   copy.onclick=async()=>{
      try{
        let prompt=makeHandoff({provider:selected,area:select.value,request:request.value,identity:login});
        if(snapshotOpt.checked){
          try{
            const response=await fetch('/api/azure-bridge/environment-manifest',{cache:'no-store',credentials:'same-origin'});
            if(!response.ok)throw Error('HTTP '+response.status);
            const evidence=await response.json();
            if(evidence.schema!=='towerflow-environment-evidence/v1'||!evidence.room?.sceneSha256)throw Error('Evidence response invalid');
            prompt+='\n\nCURRENT HOST ENVIRONMENT SNAPSHOT (reported by authenticated host; verify independently):\n'+JSON.stringify(evidence,null,2);
          }catch(e){
            prompt+='\n\nHost environment snapshot unavailable: '+e.message+'. Do not assume the deployed host matches the repository.';
          }
        }
        result.value=prompt;
        result.focus();result.select();
        try{
          await navigator.clipboard.writeText(prompt);
          receipt.textContent='Copied. Open '+PROVIDERS[selected].name+', connect GitHub there, paste the prompt, then verify its actual tool report.';
        }catch{receipt.textContent='Prompt generated and selected. Copy it manually and paste into your AI after connecting GitHub.';}
      }catch(e){receipt.textContent=e.message;}
   };
   verify.onclick=()=>void check();
   renderProvider();void check();
 }
 button.onclick=open;
 window.tfOpenAzureAIConnect=open;
}
mount();
})();
