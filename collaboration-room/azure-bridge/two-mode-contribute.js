(() => {
'use strict';
// One user-centered entry point. It layers on the real source registry and reviewed change API.
const root=document.getElementById('panelContent');
if(!root)return;
const REPO='Cos229-239/2610_Team02';
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const safeURL=path=>path.split('/').map(encodeURIComponent).join('/');
const link=(label,url)=>{const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
async function api(route,options){
  const res=await fetch('/api/azure-bridge/'+route,options||{cache:'no-store',credentials:'same-origin'});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(body.error||('Server returned HTTP '+res.status));
  return body;
}
function mount(){
  const host=root.querySelector('section.tf-azure-loadout');
  if(!host||!host.querySelector('[data-select]')||host.querySelector('[data-two-modes]'))return;
  const center=el('section',undefined,'tf-developer-center');
  center.dataset.twoModes='';
  center.setAttribute('aria-label','TowerFlow Development Center');
  const top=el('header',undefined,'tf-dev-header');
  const eyebrow=el('span','TOWERFLOW  /  MY DEVELOPMENT CENTER','tf-dev-eyebrow');
  const title=el('h2','What would you like to build?');
  const intro=el('p','Choose a feature and open its code, or describe a supported change and see the real result before sharing it with your team.');
  const identity=el('div',undefined,'tf-dev-identity');
  const githubLogin=host.querySelector('[data-name]')?.textContent?.match(/@([a-zA-Z0-9-]{1,39})/)?.[1];
  identity.append(el('span','GitHub account: '+(githubLogin?'@'+githubLogin:'checking sign-in…')),
    el('span','Your work stays in your own branch'));
  top.append(eyebrow,title,intro,identity);center.append(top);
  const choices=el('div',undefined,'tf-dev-choices');
  const source=el('button',undefined,'tf-dev-choice');
  const prompt=el('button',undefined,'tf-dev-choice');
  source.type=prompt.type='button';
  source.setAttribute('aria-controls','tf-dev-source-panel');
  prompt.setAttribute('aria-controls','tf-dev-prompt-panel');
  source.append(el('span','OPTION 01  /  CODE','tf-dev-choice-kicker'),
    el('strong','Open & edit TowerFlow'),
    el('span','Dashboard, Markets, Portfolio, UI, and more — jump to the correct code.'),
    el('span','CHOOSE COMPONENT  →','tf-dev-choice-cta'));
  prompt.append(el('span','OPTION 02  /  QUICK CHANGE','tf-dev-choice-kicker'),
    el('strong','Describe a change'),
    el('span','Preview a supported update in the actual app before submitting it.'),
    el('span','OPEN CHANGE BUILDER  →','tf-dev-choice-cta'));
  choices.append(source,prompt);center.append(choices);
  const section=el('div',undefined,'tf-dev-main');
  const codePane=el('section',undefined,'tf-dev-workspace');
  const changePane=el('section',undefined,'tf-dev-workspace');
  codePane.id='tf-dev-source-panel';changePane.id='tf-dev-prompt-panel';
  codePane.hidden=changePane.hidden=true;section.append(codePane,changePane);center.append(section);
  const footer=el('div',undefined,'tf-dev-footer');
  const appHub=el('button','Explore all App Integrations  →','tf-dev-secondary');
  appHub.type='button';
  appHub.onclick=()=>{if(typeof window.tfOpenAppIntegrationHub==='function')window.tfOpenAppIntegrationHub();else window.alert('The App Integration Hub is not installed on this room host.');};
  const toolsJump=el('button','Connection & other team tools  ↓','tf-dev-secondary');
  toolsJump.type='button';
  const teamTools=el('div',undefined,'tf-dev-legacy');
  teamTools.append(el('strong','Your existing Team Contributions, GitHub history, debugging and collaboration tools remain below.'));
  toolsJump.onclick=()=>{const companion=host.querySelector('.tf-local-companion');(companion||host.querySelector('.tf-contribute-guide')||teamTools).scrollIntoView({behavior:'smooth',block:'start'});};
  footer.append(appHub,toolsJump);center.append(footer,teamTools);
  const marker=host.querySelector('.tf-repo-bar')||host.querySelector('.tf-contribute-guide');
  if(marker)marker.before(center);else host.prepend(center);
  function select(which){
    const isCode=which==='source';
    codePane.hidden=!isCode;changePane.hidden=isCode;
    source.setAttribute('aria-pressed',String(isCode));
    prompt.setAttribute('aria-pressed',String(!isCode));
    if(isCode)codePane.querySelector('.tf-dev-section-title')?.focus({preventScroll:true});
    else changePane.querySelector('.tf-dev-section-title')?.focus({preventScroll:true});
  }
  source.onclick=()=>select('source');prompt.onclick=()=>select('prompt');

  // OPTION 1: one-click, source-backed navigation.
  const codeTitle=el('h3','Find the part of TowerFlow you want to change','tf-dev-section-title');
  codeTitle.tabIndex=-1;
  const codeSub=el('p','Pick a component. We locate its real source; your paired PC opens VS Code at that location.');
  const nav=el('div',undefined,'tf-dev-component-grid');
  nav.setAttribute('role','group');nav.setAttribute('aria-label','Choose TowerFlow component');
  const codeResult=el('div',undefined,'tf-dev-action-result');
  const codeMessage=el('p','Loading components…');
  codeMessage.setAttribute('role','status');codeMessage.setAttribute('aria-live','polite');
  const connect=el('button','Connect my PC','tf-dev-action');
  connect.type='button';
  connect.onclick=()=>{const companion=host.querySelector('.tf-local-companion');if(companion)companion.scrollIntoView({behavior:'smooth',block:'center'});else codeMessage.textContent='The optional local companion is not installed here. Use the GitHub browser editor.';};
  const codeFooter=el('div',undefined,'tf-dev-action-row');
  codeFooter.append(connect,link('Open complete repository', 'https://github.dev/'+REPO));
  codeResult.append(codeMessage,codeFooter);
  codePane.append(codeTitle,codeSub,nav,codeResult);
  let opening=false;
  async function openArea(id,meta,button){
    if(opening)return;
    for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
    opening=true;
    const browser='https://github.dev/'+REPO+'/blob/dev/'+safeURL(meta.file);
    codeMessage.textContent='Opening '+meta.label+'…';
    try{
      if(typeof window.tfLocalCompanionOpenTarget!=='function')throw Error('Local VS Code bridge is unavailable');
      const result=await window.tfLocalCompanionOpenTarget(id);
      if(!result?.launched||result?.file!==meta.file||!Number.isInteger(result.line))throw Error('VS Code launch could not be verified');
      codeMessage.replaceChildren(el('strong','Opened '+meta.label+' in VS Code'),
        el('span',' · '+result.file+', line '+result.line+'.'),
        el('p','VS Code started on this PC. Debugger attachment is not yet verified.'),
        link('Or open in browser',browser));
    }catch(error){
      codeMessage.replaceChildren(el('strong','Ready to edit '+meta.label+' in your browser.'),
        el('p',error.message+'. Pair your PC for one-click desktop navigation.'),
        link('OPEN '+meta.label.toUpperCase()+' CODE  →',browser));
    }finally{opening=false;}
  }
  api('source-navigation').then(data=>{
    if(!codePane.isConnected)return;
    nav.replaceChildren();
    for(const [id,meta] of Object.entries(data.areas||{})){
      const b=el('button',undefined,'tf-dev-component');
      b.type='button';
      b.append(el('strong',meta.label),el('small',meta.description||meta.file),el('span','OPEN CODE  ↗','tf-dev-component-foot'));
      b.setAttribute('aria-label','Open '+meta.label+' source');
      b.onclick=()=>void openArea(id,meta,b);
      nav.append(b);
    }
    codeMessage.textContent=nav.children.length?'Select a component to navigate to its source.':'No source locations were returned by the host.';
  }).catch(e=>{codeMessage.textContent='Component registry is unavailable: '+e.message;});

  // OPTION 2: make real supported scope explicit; never misrepresent it as open-ended AI.
  const changeTitle=el('h3','Describe the result you want','tf-dev-section-title');changeTitle.tabIndex=-1;
  const changeSub=el('p','Changes are prepared in a separate preview. Nothing is applied to the shared live room or dev automatically.');
  const supported=el('div',undefined,'tf-dev-scope');
  supported.append(el('strong','AVAILABLE NOW  ·  Dashboard headline'),
    el('p','You can rename the main dashboard headline. Other natural-language code edits are not enabled yet; the app will tell you when a request is unsupported.'));
  const examples=el('div',undefined,'tf-dev-examples');
  examples.append(el('span','TRY AN EXAMPLE:'));
  const textLabel=el('label','Your change request');
  const input=el('textarea');input.rows=3;input.maxLength=240;input.placeholder='Change the dashboard headline to TowerFlow Command Center.';
  textLabel.append(input);
  for(const example of ['Change the dashboard headline to TowerFlow Command Center.','Change the dashboard headline to My Investment Dashboard.']){
    const b=el('button',example.replace('Change the dashboard headline to ','').replace(/\.$/,''),'tf-dev-example');
    b.type='button';b.onclick=()=>{input.value=example;input.focus();};examples.append(b);
  }
  const generate=el('button','GENERATE PREVIEW  →','tf-dev-primary');
  generate.type='button';
  const changeMessage=el('p','Choose an example or describe your own headline.','tf-dev-status');
  changeMessage.setAttribute('role','status');changeMessage.setAttribute('aria-live','polite');
  const process=el('div',undefined,'tf-dev-process');
  process.append(el('span','1  Describe'),el('span','2  Preview'),el('span','3  Review'),el('span','4  Submit draft PR'));
  const review=el('section',undefined,'tf-dev-review');review.hidden=true;
  const summary=el('div',undefined,'tf-dev-change-summary');
  const frame=el('iframe');frame.title='Interactive isolated TowerFlow preview';
  frame.className='tf-merged-app';frame.setAttribute('sandbox','allow-scripts allow-forms allow-downloads');
  frame.referrerPolicy='no-referrer';
  const actions=el('div',undefined,'tf-dev-action-row');
  const revise=el('button','Revise request','tf-dev-secondary');revise.type='button';
  revise.onclick=()=>{input.focus();changeMessage.textContent='Update your request and generate a new preview.';};
  const submit=el('button','SUBMIT FOR TEAM REVIEW  →','tf-dev-primary');submit.type='button';
  const receipt=el('p','No GitHub changes have been submitted.');receipt.setAttribute('role','status');
  actions.append(revise,submit);review.append(summary,frame,actions,receipt);
  changePane.append(changeTitle,changeSub,supported,examples,textLabel,generate,changeMessage,process,review);
  let plan=null,busy=false;
  generate.onclick=async()=>{
    if(busy)return;
    busy=true;generate.disabled=true;submit.disabled=true;review.hidden=true;frame.removeAttribute('src');plan=null;
    changeMessage.textContent='Building a verified source preview…';
    try{
      const result=await api('direct/plan',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:input.value})});
      if(!/^\/api\/azure-bridge\/direct-preview\/[a-f0-9]{48}\/index\.html$/.test(result.previewUrl))throw Error('The host returned an invalid preview address');
      plan=result;
      summary.replaceChildren(el('h4','Preview your proposed change'),
        el('p','BEFORE  ·  '+result.before),el('p','AFTER  ·  '+result.after),
        el('small','Verified source: '+result.file+' · dev revision '+result.revision.slice(0,10)+' · Not published'));
      frame.src=result.previewUrl;review.hidden=false;submit.disabled=false;
      changeMessage.textContent='Preview ready. Interact with the app below; submit only when the result is correct.';
    }catch(error){changeMessage.textContent='Cannot generate this change: '+error.message;}
    finally{busy=false;generate.disabled=false;}
  };
  submit.onclick=async()=>{
    if(busy||!plan)return;
    if(!window.confirm('Create a DRAFT GitHub pull request for team review? This does not merge code or update the live room.'))return;
    busy=true;submit.disabled=true;receipt.textContent='Creating your feature branch and draft PR…';
    try{
      const result=await api('direct/submit',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:plan.key})});
      if(!/^https:\/\/github\.com\/Cos229-239\/2610_Team02\/pull\/\d+$/.test(result.url))throw Error('PR was created but the returned review link was not verified');
      receipt.replaceChildren(el('strong','Draft PR #'+result.number+' created. '),
        link('OPEN TEAM REVIEW  ↗',result.url),el('p','Branch: '+result.branch+' · No merge or live publication performed.'));
    }catch(error){receipt.textContent='Submission not completed: '+error.message;submit.disabled=false;}
    finally{busy=false;}
  };
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount();});})
  .observe(root,{subtree:true,childList:true});
mount();
})();
