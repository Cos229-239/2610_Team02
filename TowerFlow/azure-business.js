(() => {
'use strict';
if(document.getElementById('tf-azure-business'))return;
const el=(tag,content)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;return n;};
const style=el('style');
style.textContent=[
'#tf-azure-business{position:fixed;z-index:90;right:18px;bottom:18px;max-width:min(350px,92vw);font:14px/1.45 system-ui,sans-serif}',
'#tf-azure-business button{cursor:pointer;font:inherit}',
'#tf-azure-business .tf-azure-toggle{border:1px solid #8eeaff;color:#d7fbff;background:#143651;padding:9px 15px;border-radius:24px;font-weight:800;box-shadow:0 2px 14px #0006}',
'#tf-azure-business .tf-azure-menu{margin-bottom:8px;padding:14px;border:1px solid #5d98b4;background:#10283d;color:#ecfaff;border-radius:12px;box-shadow:0 10px 24px #0008}',
'#tf-azure-business .tf-azure-menu[hidden]{display:none}',
'#tf-azure-business .tf-azure-menu h3{font-size:1.08rem;margin:0 0 .25rem}',
'#tf-azure-business .tf-azure-menu p{margin:.3rem 0 .8rem;color:#c8dfea}',
'#tf-azure-business .tf-azure-actions{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}',
'#tf-azure-business .tf-azure-actions button{border:1px solid #517f96;background:#184563;color:#e9faff;border-radius:7px;padding:.55rem;text-align:left}',
'#tf-azure-business .tf-azure-actions button:focus-visible,#tf-azure-business .tf-azure-toggle:focus-visible{outline:3px solid #b9f3ff}'
].join('\n');
const host=el('div');host.id='tf-azure-business';
const menu=el('section');menu.className='tf-azure-menu';menu.hidden=true;
menu.append(el('h3','Azure · Business Studio'),
 el('p','Native controls. No external AI model connected.'));
const actions=el('div');actions.className='tf-azure-actions';
const status=el('p','TowerFlow remains in this browser. AI providers require their own authorized GitHub tools.');status.setAttribute('role','status');
const toggle=el('button','AZURE');toggle.className='tf-azure-toggle';toggle.type='button';toggle.setAttribute('aria-expanded','false');
toggle.onclick=()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));};
for(const [label,action] of [
 ['Connect AI','connect-ai'],['World sales','world-sales'],
 ['Development IDE','code'],['Team stations','team'],['Business projector','business']
]){
 const button=el('button',label);button.type='button';
 button.onclick=()=>{
   if(window.parent===window){
     status.textContent='Open the authenticated Collaboration Room to access shared Azure controls. This standalone web app has no remote AI connection.';
     return;
   }
   try{window.parent.postMessage({type:'TOWERFLOW_AZURE_BUSINESS_ACTION',action},location.origin);
      status.textContent='Requested '+label+' in the authenticated collaboration room.';}
   catch{status.textContent='Collaboration room is not connected.';}
 };
 actions.append(button);
}
menu.append(actions,status);host.append(menu,toggle);
document.head.append(style);document.body.append(host);
})();
