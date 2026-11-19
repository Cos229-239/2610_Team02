(() => {
  'use strict';
  const panel=document.getElementById('panel'),content=document.getElementById('panelContent'),
    menu=document.getElementById('menu'),toolbar=document.querySelector('#hud .toolbar');
  if(!panel||!content||!menu||!toolbar)return;
  const repo='https://github.com/Cos229-239/2610_Team02';
  const button=document.createElement('button');button.type='button';button.textContent='App integrations';
  button.dataset.appHub='';toolbar.append(button);
  const link=(text,href)=>{const a=document.createElement('a');a.textContent=text;a.href=href;
    a.target='_blank';a.rel='noopener noreferrer';return a;};
  const element=(tag,text,klass)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;
    if(klass)e.className=klass;return e;};
  const get=async(url)=>{const res=await fetch(url,{cache:'no-store',credentials:'same-origin'});
    if(!res.ok)throw Error(res.status===401?'Sign in to the room with GitHub first.':'Unable to load integration data (HTTP '+res.status+').');
    return res.json();};
  const branchOk=b=>typeof b==='string'&&b.length<150&&!b.startsWith('-')&&
    !/[\s~^:?*\[\\]|\.\.|@\{|\/\/|[./]$/.test(b) && !['dev','main'].includes(b);
  async function open(){
    menu.hidden=true;panel.hidden=false;
    document.getElementById('panelTag').textContent='TOWERFLOW · TEAM INTEGRATION';
    document.getElementById('panelTitle').textContent='APP INTEGRATION HUB';
    const host=element('section',undefined,'tf-azure-loadout tf-app-hub');
    content.replaceChildren(host);
    host.append(element('h3','One place for Team 02 contributions'),
      element('p','Choose where your work belongs, connect your contribution, and see review, preview, and publication separately. Merging never edits the live app automatically.'));
    const box=element('div',undefined,'tf-app-hub-grid');
    const controls=element('section',undefined,'tf-app-hub-editor');
    const history=element('section',undefined,'tf-app-hub-feed');
    host.append(box,controls,history);
    const status=element('p','Loading Team 02 integration status…');status.setAttribute('role','status');
    host.prepend(status);
    let data,login,selected='dashboard',workingBranch='';
    const select=element('select');select.setAttribute('aria-label','Choose TowerFlow feature area');
    const areaTitle=element('h3');
    const desc=element('p');
    const paths=element('p');
    const actions=element('div',undefined,'row wrap');
    const source=link('View source',repo+'/tree/dev/TowerFlow');
    const dev=element('button','Try merged web app');dev.type='button';
    const live=link('Open published app','/towerflow/index.html');live.href='/towerflow/index.html';
    const browserEditor=link('Edit source in GitHub browser', 'https://github.dev/Cos229-239/2610_Team02');
    const myDesk=element('button','My development desk');myDesk.type='button';
    const team=link('All team PRs',repo+'/pulls?q=is%3Apr+base%3Adev');
    actions.append(source,browserEditor,dev,live,myDesk,team);
    const form=element('form');
    const flabel=element('label','Feature title');
    const feature=element('input');feature.name='title';feature.required=true;feature.maxLength=120;
    flabel.append(feature);
    const blabel=element('label','My pushed branch (not dev)');
    const branch=element('input');branch.name='branch';branch.required=true;branch.maxLength=150;
    branch.placeholder='work/my-github-user/dashboard';
    blabel.append(branch);
    const nlabel=element('label','What did you change? How can the team test it?');
    const notes=element('textarea');notes.name='notes';notes.rows=4;notes.required=true;notes.maxLength=3000;
    nlabel.append(notes);
    const submit=element('button','Prepare PR to dev');submit.type='submit';
    const formStatus=element('p');formStatus.setAttribute('role','status');
    form.append(flabel,blabel,nlabel,submit,formStatus);
    controls.append(areaTitle,desc,paths,actions,
      element('p','To add code: open the source in your own authorized IDE or AI coding agent, commit and push your branch, then submit it below. A chat-only AI cannot edit GitHub unless its account has working repository tools.'),
      element('h4','Submit to this area'),form);
    const htitle=element('h3','Team contributions');
    const feedStatus=element('p');
    const entries=element('ol');
    history.append(htitle,feedStatus,entries);
    const areaKind={dashboard:'web',market:'web',portfolio:'web',analytics:'web',app:'web',room:'room',native:'native',other:'other'};
    const areaKey=area=>areaKind[area]==='web'?'app':area;
    function match(pr,area){return pr.area===area || (areaKind[area]==='web'&&pr.area==='app') ||
      (area==='app'&&areaKind[pr.area]==='web');}
    function render(){
      const area=data.areas[selected];if(!area)return;
      areaTitle.textContent=area.label;
      desc.textContent=area.description;
      paths.textContent='Reviewed source: '+area.path+' · Base branch: dev';
      source.href=repo+'/'+(area.kind==='native'?'tree':'blob')+'/dev/'+area.path.split('/').map(encodeURIComponent).join('/');
      browserEditor.href='https://github.dev/Cos229-239/2610_Team02/blob/dev/'+area.path.split('/').map(encodeURIComponent).join('/');
      dev.disabled=area.kind!=='web';
      dev.textContent=area.kind==='web'?'Try merged web app':'Native/room work: use team demonstration';
      live.hidden=area.kind!=='web';
      feature.placeholder=area.label+' — describe your change';
      const mine=(login||'your-user').toLowerCase();
      if(!workingBranch || branch.value===workingBranch)branch.value='work/'+mine+'/'+selected;
      workingBranch=branch.value;
      notes.placeholder='Describe the result and reproducible test steps.';
      entries.replaceChildren();
      const relevant=data.prs.filter(p=>match(p,selected));
      feedStatus.textContent=relevant.length?relevant.length+' recent matching contribution(s) (last '+data.limitedTo+' PRs searched).':'No matching recent pull requests. New work can be submitted below.';
      for(const p of relevant){
        const item=element('li');
        const head=link('#'+p.number+' · '+p.title,repo+'/pull/'+p.number);
        const badge=element('span',p.state.toUpperCase(),'tf-app-hub-badge');
        const meta=element('small',' @'+p.author+' · '+(p.sha?p.sha.slice(0,8):'revision unknown')+
          (p.areaVerified?' · files checked':' · module classification unverified'));
        item.append(head,badge,meta);entries.append(item);
      }
      for(const card of box.querySelectorAll('button')){
        const active=card.dataset.area===selected;
        card.setAttribute('aria-pressed',String(active));
        card.dataset.active=String(active);
        const count=data.prs.filter(p=>match(p,card.dataset.area)).length;
        card.querySelector('small').textContent=count+' recent contribution(s)';
      }
    }
    dev.onclick=()=>{if(typeof window.tfOpenMergedAppPreview==='function')window.tfOpenMergedAppPreview();
      else status.textContent='Merged preview is unavailable; open Contribute → Try merged web app.';};
    myDesk.onclick=()=>{const b=document.querySelector('[data-contribute]');if(b)b.click();
      else status.textContent='Development desk is not installed on this host.';};
    form.onsubmit=e=>{
      e.preventDefault();
      const name=branch.value.trim();
      if(!login){formStatus.textContent='Your GitHub identity is unavailable. Sign in and reload this panel.';return;}
      if(!branchOk(name)){formStatus.textContent='Enter an existing pushed feature branch, not dev or main.';return;}
      if(!feature.value.trim()||!notes.value.trim()){formStatus.textContent='Add a feature title and test instructions first.';return;}
      const body='TowerFlow-Area: '+selected+'\n\nWhat changed\n'+notes.value.trim()+
        '\n\nValidation\nPlease attach reproducible test results and screenshots as appropriate.\n\nReview target: dev. Merge does not publish to the live room.';
      const params=new URLSearchParams({quick_pull:'1',title:feature.value.trim(),body});
      window.open(repo+'/compare/dev...'+name.split('/').map(encodeURIComponent).join('/')+'?'+params,'_blank','noopener,noreferrer');
      formStatus.textContent='GitHub comparison opened. Confirm branch, files and review requirements before creating the PR.';
    };
    try{
      const [d,identity]=await Promise.all([
        get('/api/azure-bridge/app-hub'),
        get('/api/azure-bridge/loadout').catch(()=>null)]);
      if(!host.isConnected)return;
      data=d;login=identity?.login||null;
      for(const [id,area] of Object.entries(d.areas)){
        select.add(new Option(area.label,id));
        const card=element('button',undefined,'tf-app-hub-card');card.type='button';card.dataset.area=id;
        card.append(element('strong',area.label),element('small',''));
        card.onclick=()=>{selected=id;select.value=id;render();};
        box.append(card);
      }
      controls.prepend(select);
      select.onchange=()=>{selected=select.value;render();};
      const receipt=await get('/towerflow/towerflow-build.json').catch(()=>null);
      const published=/^[a-f\d]{40}$/i.test(receipt?.revision||'')?receipt.revision.slice(0,10):'unavailable';
      status.textContent='GitHub: '+(login?'@'+login:'identity unavailable')+' · PR index updated '+new Date(d.checkedAt).toLocaleString()+
        ' · Host published app receipt: '+published+' (not proof a specific PR is live).';
      render();
    }catch(err){status.textContent=err.message;controls.hidden=true;history.hidden=true;}
  }
  button.onclick=()=>{void open();};
  window.tfOpenAppIntegrationHub=()=>{void open();};
})();
