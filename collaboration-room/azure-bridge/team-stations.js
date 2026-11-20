(() => {
'use strict';
// A station displays only remote GitHub evidence. It is not a copy of another
// contributor's local working tree and cannot see unpushed GitHub Desktop commits.
const $=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const repo='https://github.com/Cos229-239/2610_Team02';
function anchor(text,href){const a=$('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
async function open(login){
 if(!/^[a-z0-9-]{1,39}$/i.test(login))return false;
 const panel=document.getElementById('panel'),root=document.getElementById('panelContent');
 if(!panel||!root)return false;
 const menu=document.getElementById('menu');if(menu)menu.hidden=true;
 panel.hidden=false;
 document.getElementById('panelTag').textContent='TEAM 02 / CONTRIBUTIONS';
 document.getElementById('panelTitle').textContent='MEMBER STATION';
 const container=$('section');container.className='tf-member-station';
 const title=$('h2','Loading member station…'),status=$('p','Checking the actual GitHub branch…');
 status.setAttribute('role','status');
 const button=$('button','Refresh GitHub');button.type='button';
 const evidence=$('div');
 container.append(title,status,button,evidence);root.replaceChildren(container);
 let active=true;
 const update=async()=>{
   button.disabled=true;status.textContent='Reading remote GitHub commit and source files…';
   evidence.replaceChildren();
   try{
     const resp=await fetch('/api/azure-bridge/team-stations/'+encodeURIComponent(login),
       {credentials:'same-origin',cache:'no-store'});
     const data=await resp.json();
     if(!resp.ok)throw Error(data.error||'GitHub unavailable');
     if(!active||!container.isConnected)return;
     title.textContent=data.label+' · '+data.project;
     const abbrev=data.commit.sha.slice(0,10);
     status.textContent='Branch '+data.branch+' · '+abbrev+' · '+(data.commit.date||'date unavailable');
     const summary=$('p',data.commit.title);
     const links=$('div');links.className='row wrap';
     links.append(anchor('Latest pushed commit ↗',data.commit.url),
       anchor('Open '+data.branch+' ↗',repo+'/tree/'+encodeURIComponent(data.branch)),
       anchor('Compare with dev ↗',repo+'/compare/dev...'+encodeURIComponent(data.branch)));
     const files=$('div');files.append($('h3','Verified source files'));
     for(const file of data.files){
       const row=$('p');
       row.append(document.createTextNode(file.available?'✓ ':'Not found on branch: '));
       if(file.available)row.append(anchor(file.path+' ↗',file.url));
       else row.append(document.createTextNode(file.path));
       files.append(row);
     }
     const recent=$('div');recent.append($('h3','Latest pushed file changes'));
     const changed=Array.isArray(data.recentFiles)?data.recentFiles:[];
     if(!changed.length)recent.append($('p','GitHub did not return a changed-file list for this commit.'));
     for(const item of changed.slice(0,20)){
       const row=$('p',item.status+' · ');row.append(anchor(item.path+' ↗',item.url));
       recent.append(row);
     }
     const caveat=$('small',data.note);
     evidence.append(summary,links,recent,files,caveat);
     document.dispatchEvent(new CustomEvent('tfTeamStationUpdate',{detail:{
       login:data.member,label:data.label,commit:abbrev,sourceCount:data.files.filter(x=>x.available).length
     }}));
   }catch(error){status.textContent='No verified branch update: '+error.message;}
   finally{button.disabled=false;}
 };
 button.onclick=()=>void update();
 await update();
 return true;
}
window.tfOpenMemberStation=open;
})();
