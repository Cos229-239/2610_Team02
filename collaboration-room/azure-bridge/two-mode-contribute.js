(() => {
'use strict';
// Two primary actions. All legacy Team Contributions controls remain intact underneath.
const root=document.getElementById('panelContent');
if(!root)return;
const repo='Cos229-239/2610_Team02';
const make=(tag,label,cls)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=label;if(cls)node.className=cls;return node;};
const pathURL=path=>path.split('/').map(encodeURIComponent).join('/');
const statusText=(node,text)=>{node.textContent=text;};
async function getJSON(path,init){
  const res=await fetch('/api/azure-bridge/'+path,init||{cache:'no-store'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'HTTP '+res.status);
  return data;
}
function mount(){
  const host=root.querySelector('section.tf-azure-loadout');
  if(!host||!host.querySelector('[data-select]')||host.querySelector('[data-two-modes]'))return;
  const dual=make('section',undefined,'tf-two-modes');dual.dataset.twoModes='';
  const headline=make('h3','How would you like to contribute?');
  const chooser=make('div',undefined,'tf-two-choices');
  const vscode=make('button',undefined,'tf-mode-choice'),direct=make('button',undefined,'tf-mode-choice');
  vscode.type=direct.type='button';
  vscode.append(make('strong','1 · Develop in VS Code'),make('small','Choose an app component and jump into its exact code.'));
  direct.append(make('strong','2 · Integrate into TowerFlow'),make('small','Describe a change, review a working preview, and submit a draft PR.'));
  chooser.append(vscode,direct);
  const left=make('section',undefined,'tf-mode-panel'),right=make('section',undefined,'tf-mode-panel');
  left.hidden=right.hidden=true;
  dual.append(headline,chooser,left,right);
  const marker=host.querySelector('.tf-contribute-guide');
  if(marker)marker.before(dual);else host.prepend(dual);
  const login=host.querySelector('[data-name]')?.textContent?.match(/@([a-zA-Z0-9-]{1,39})/)?.[1];
  function activate(which){
    left.hidden=which!=='code';right.hidden=which!=='prompt';
    vscode.setAttribute('aria-pressed',String(which==='code'));
    direct.setAttribute('aria-pressed',String(which==='prompt'));
  }
  vscode.onclick=()=>activate('code');direct.onclick=()=>activate('prompt');
  const codeHelp=make('p','Click a component to open its source in VS Code on this PC. If the companion is not paired, the browser source editor is a fallback (desktop debugging unavailable).');
  const nav=make('div',undefined,'tf-source-tabs');nav.setAttribute('role','group');nav.setAttribute('aria-label','TowerFlow source areas');
  const codeState=make('p','Loading source registry…');codeState.setAttribute('role','status');
  const codeInfo=make('p');
  left.append(make('h4','Source Navigator'),codeHelp,nav,codeInfo,codeState);
  async function navigate(area,entry){
    codeInfo.textContent=entry.file+' · '+entry.description;
    codeState.textContent='Opening '+entry.label+'…';
    const browser='https://github.dev/'+repo+'/blob/dev/'+pathURL(entry.file);
    try{
      if(typeof window.tfLocalCompanionOpenTarget!=='function')throw Error('Local companion is not connected');
      const opened=await window.tfLocalCompanionOpenTarget(area);
      codeState.textContent='VS Code opened '+opened.file+' at line '+opened.line+'. Debugger attachment must still be verified.';
    }catch(error){
      const link=make('a','Open '+entry.label+' in GitHub browser editor');
      link.href=browser;link.target='_blank';link.rel='noopener noreferrer';
      codeState.replaceChildren(document.createTextNode(error.message+'. '),link);
    }
  }
  getJSON('source-navigation').then(data=>{
    if(!left.isConnected)return;
    nav.replaceChildren();
    for(const [id,entry] of Object.entries(data.areas||{})){
      const b=make('button',entry.label);
      b.type='button';b.title=entry.file;
      b.onclick=()=>{for(const item of nav.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===b));void navigate(id,entry);};
      nav.append(b);
    }
    codeState.textContent=nav.children.length?'Select a component. Your selected GitHub identity is '+(login?'@'+login:'not loaded')+'.':'No source areas are available.';
  }).catch(e=>{codeState.textContent=e.message;});
  right.append(make('h4','Direct Change · Controlled Preview'),
    make('p','Describe a modification. The first supported change is the dashboard headline; broader requests require an authorized coding agent. Nothing changes on dev or the live host until reviewed and published.'));
  const label=make('label','What should TowerFlow change?');
  const input=make('textarea');input.rows=3;input.maxLength=240;
  input.placeholder='Change the dashboard headline to TowerFlow Command Center.';
  label.append(input);right.append(label);
  const generate=make('button','Generate change and preview');generate.type='button';
  const resultStatus=make('p','Ready for your change.');resultStatus.setAttribute('role','status');
  const details=make('section',undefined,'tf-direct-review');details.hidden=true;
  const before=make('p'),after=make('p'),proof=make('p');
  const frame=make('iframe');frame.title='Isolated interactive TowerFlow change preview';
  frame.className='tf-merged-app';frame.setAttribute('sandbox','allow-scripts allow-forms allow-downloads');
  frame.referrerPolicy='no-referrer';
  const submit=make('button','Submit reviewed change as draft PR');submit.type='button';
  const notice=make('p','No files have been committed, merged or published.');
  details.append(before,after,proof,frame,submit,notice);
  right.append(generate,resultStatus,details);
  let planned=null,busy=false;
  generate.onclick=async()=>{
    if(busy)return;
    busy=true;generate.disabled=true;submit.disabled=true;details.hidden=true;
    frame.removeAttribute('src');planned=null;
    resultStatus.textContent='Correlating the request with verified source…';
    try{
      const response=await getJSON('direct/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:input.value})});
      if(!/^\/api\/azure-bridge\/direct-preview\/[a-f0-9]{48}\/index\.html$/.test(response.previewUrl))throw Error('Invalid preview response');
      planned=response;
      before.textContent='Before: '+response.before;
      after.textContent='Proposed: '+response.after;
      proof.textContent='File: '+response.file+' · dev base '+response.revision.slice(0,12)+'. HTML patch was derived from verified source bytes; not yet committed.';
      frame.src=response.previewUrl;
      details.hidden=false;submit.disabled=false;
      resultStatus.textContent='Working preview prepared. Inspect the actual dashboard and review before submitting.';
    }catch(e){resultStatus.textContent='Not generated: '+e.message;}
    finally{busy=false;generate.disabled=false;}
  };
  submit.onclick=async()=>{
    if(busy||!planned)return;
    const ok=window.confirm('Create a new GitHub feature branch and DRAFT pull request to dev? This will not merge or publish to the live room.');
    if(!ok)return;
    busy=true;submit.disabled=true;notice.textContent='Submitting on your authenticated GitHub account…';
    try{
      const receipt=await getJSON('direct/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:planned.key})});
      const a=make('a','Review draft PR #'+receipt.number+' on GitHub');a.href=receipt.url;a.target='_blank';a.rel='noopener noreferrer';
      notice.replaceChildren(a,document.createTextNode(' · Branch '+receipt.branch+'. Merge and publication are separate.'));
    }catch(e){notice.textContent='Cannot submit: '+e.message;submit.disabled=false;}
    finally{busy=false;}
  };
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount();});})
  .observe(root,{childList:true,subtree:true});
mount();
})();
