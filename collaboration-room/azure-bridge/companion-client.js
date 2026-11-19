(() => {
    'use strict';
    // Optional local pairing UI; does not replace existing desk, debug or PR workflows.
    const service='http://127.0.0.1:4179';
    let token='', busy=false;
    const html=document.createElement('section');
    html.className='tf-local-companion';
    html.style.cssText='border:1px solid #65849c;border-radius:10px;padding:12px;margin:12px 0;display:grid;gap:8px';
    const title=document.createElement('strong');title.textContent='My local development workspace';
    const explanation=document.createElement('small');
    explanation.textContent='Open your actual project on this PC and see real local file changes. Requires the optional local companion; it does not merge, push or change files automatically.';
    const instructions=document.createElement('details'), summary=document.createElement('summary');
    summary.textContent='Start the free Windows companion (once per session)';
    const instructionText=document.createElement('p');
    instructionText.textContent='In your own Team 02 repository checkout, run the PowerShell command below. Keep its window open. Copy the private token it prints, then paste it here. Do not share that token.';
    const command=document.createElement('code');
    command.style.cssText='display:block;white-space:pre-wrap;overflow-wrap:anywhere;user-select:all';
    const copy=document.createElement('button');copy.type='button';copy.textContent='Copy start command';
    instructions.append(summary,instructionText,command,copy);
    const connection=document.createElement('div');
    connection.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    const pairing=document.createElement('input');pairing.type='password';
    pairing.placeholder='Private companion token';pairing.autocomplete='off';
    pairing.setAttribute('aria-label','Private local companion pairing token');
    const connect=document.createElement('button');connect.type='button';connect.textContent='Connect this PC';
    const disconnect=document.createElement('button');disconnect.type='button';disconnect.textContent='Disconnect';disconnect.hidden=true;
    connection.append(pairing,connect,disconnect);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    const open=document.createElement('button');open.type='button';open.textContent='Open My Project';open.disabled=true;
    const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh My Changes';refresh.disabled=true;
    const review=document.createElement('button');review.type='button';review.textContent='Review My Changes';review.disabled=true;
    actions.append(open,refresh,review);
    const diff=document.createElement('pre');diff.hidden=true;diff.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto;font-size:12px';
    const state=document.createElement('p');state.setAttribute('role','status');
    state.textContent='Not connected to a local workspace.';
    const files=document.createElement('ul');files.setAttribute('aria-label','Actual local Git changes');
    html.append(title,explanation,instructions,connection,actions,state,files,diff);
    let panel;
    function current() {
        if (!panel || !panel.isConnected) throw Error('Open your Contribute workspace first.');
        const login=(panel.querySelector('[data-name]')?.textContent||'').match(/@([a-zA-Z0-9-]{1,39})$/)?.[1];
        const project=panel.querySelector('[data-select]')?.value;
        if(!login || !/^[a-z0-9_-]+$/i.test(project||''))throw Error('Wait for the signed-in project to load.');
        return {login,project};
    }
    function startCommand() {
        const {login}=current();
        const repo='Join-Path ([Environment]::GetFolderPath("MyDocuments")) "GitHub/2610_Team02"';
        return '& { $repo = '+repo+'; if (!(Test-Path (Join-Path $repo "tools/towerflow-companion.cjs"))) { throw "Open a Team 02 checkout with this feature installed first." }; & node (Join-Path $repo "tools/towerflow-companion.cjs") --origin='+JSON.stringify(location.origin)+' --login='+login+' }';
    }
    function updateCommand() {try{command.textContent=startCommand();}catch{command.textContent='Sign into the room and open Contribute first.';}}
    copy.onclick=async()=>{updateCommand();try{await navigator.clipboard.writeText(command.textContent);state.textContent='Start command copied. Paste into Windows PowerShell in your own PC.';}catch{state.textContent='Select the displayed command and copy it manually.';}};
    async function call(route,payload) {
        if(!token)throw Error('Connect your PC first.');
        const response=await fetch(service+route,{method:payload?'POST':'GET',mode:'cors',
            headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
            ...(payload?{body:JSON.stringify(payload)}:{}) ,
            signal:AbortSignal.timeout(20000),cache:'no-store'});
        const json=await response.json().catch(()=>({}));
        if(!response.ok || !json.ok)throw Error(json.error||'Local companion HTTP '+response.status);
        return json;
    }
    function renderStatus(value) {
        files.replaceChildren();
        const w=value.workspace;
        state.textContent=w.ready?'Workspace ready · '+w.branch+' · '+w.changeCount+' changed file(s)':
            (w.reason||'Workspace is not ready. Use Open My Project to prepare it.');
        for(const line of (w.changed||[]).slice(0,100)){const li=document.createElement('li');li.textContent=line;files.append(li);}
    }
    async function perform(action) {
        if(busy)return;
        busy=true;open.disabled=true;refresh.disabled=true;review.disabled=true;connect.disabled=true;
        state.textContent=action==='open'?'Preparing and opening your project…':'Reading local workspace status…';
        try {
            const data=await call(action==='open'?'/open':'/status',current());
            renderStatus(data);
            if(data.opened)state.textContent+=' · '+data.opened.editor+' started (debugger attachment not yet verified).';
        }catch(err){state.textContent='Not completed: '+err.message;}
        finally{busy=false;open.disabled=!token;refresh.disabled=!token;review.disabled=!token;connect.disabled=false;}
    }
    connect.onclick=async()=>{
        if(busy)return;
        const candidate=pairing.value.trim();
        if(!/^[a-f0-9]{48}$/.test(candidate)){state.textContent='Enter the 48-character token printed by your local companion.';return;}
        token=candidate;pairing.value='';
        try {
            const health=await call('/health');
            state.textContent='Connected to your local PC (companion protocol '+health.version+').';
            pairing.hidden=true;connect.hidden=true;disconnect.hidden=false;
            open.disabled=false;refresh.disabled=false;review.disabled=false;await perform('status');
        }catch(err){
            token='';state.textContent='Connection failed: '+err.message+'. Check the local companion, allowed room origin and browser permissions.';
        }
    };
    disconnect.onclick=()=>{token='';pairing.value='';pairing.hidden=false;connect.hidden=false;disconnect.hidden=true;open.disabled=true;refresh.disabled=true;review.disabled=true;diff.hidden=true;diff.textContent='';files.replaceChildren();state.textContent='Disconnected; the local companion is still running on your PC.';};
    window.tfLocalCompanionOpenTarget=async area=>{
        if(!token)throw Error('Pair the local development companion below first.');
        const {login}=current();
        const result=await call('/open-target',{login,project:'integration',area});
        return result.target;
    };
    open.onclick=()=>perform('open');
    refresh.onclick=()=>perform('status');
    review.onclick=async()=>{try{const result=await call('/diff',current());diff.textContent=(result.review.patch||'No tracked source changes to display.')+(result.review.truncated?'\n[Diff shortened at 32 KiB.]':'')+'\n'+result.review.note;diff.hidden=false;state.textContent='Read-only local diff loaded. Nothing has been committed or pushed.';}catch(err){state.textContent='Cannot review: '+err.message;}};
    function mount(){
        const target=Array.from(document.querySelectorAll('section.tf-azure-loadout')).find(el=>el.querySelector('[data-windows]') && el.querySelector('[data-select]'));
        if(!target || (panel===target && target.contains(html)))return;
        panel=target;updateCommand();
        const guide=target.querySelector('.tf-contribute-guide');
        if(guide)guide.before(html);
        else target.prepend(html);
        if(token)void perform('status');
    }
    let scheduled=false;
    new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;mount();});})
        .observe(document.body,{subtree:true,childList:true});
    mount();
})();
