/* TF_FRONTIER_TEAM_CHAT_DOCK_V1 — "C" opens a left team chat dock.
 * Binds to the ORIGINAL authenticated room transport via subscribe/send; no duplicate WebSocket.
 */
(function(root,factory){
  const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowTeamChatDock=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const MAX=180,LIMIT=140; // Preserve the original deployed WebSocket chat limit.
 function isTyping(t){return !!t&&(t.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(String(t.tagName||"").toUpperCase())||
   !!t.closest?.('[contenteditable="true"],[role="textbox"]'));}
 function shouldToggle(e){return !!e&&(e.code==="KeyC"||e.key==="c"||e.key==="C")&&!e.repeat&&!e.isComposing&&
   !e.altKey&&!e.ctrlKey&&!e.metaKey&&!isTyping(e.target);}
 function safeMessage(m){
   if(!m||typeof m!=="object"||Array.isArray(m))return null;
   const author=typeof m.author==="string"?m.author:typeof m.user==="string"?m.user:"";
   const text=typeof m.text==="string"?m.text:typeof m.body==="string"?m.body:"";
   if(!author.trim()||author.length>80||!text.trim()||text.length>LIMIT)return null;
   return Object.freeze({author:author.trim(),text:text.trim(),time:Number.isFinite(m.time)?m.time:Date.now(),
     id:typeof m.id==="string"&&m.id.length<100?m.id:null,self:m.self===true});
 }
 function createFeed(){
   const messages=[],ids=new Set();
   return Object.freeze({
     push(raw){const m=safeMessage(raw);if(!m||m.id&&ids.has(m.id))return false;
       messages.push(m);if(m.id)ids.add(m.id);
       while(messages.length>MAX){const o=messages.shift();if(o.id)ids.delete(o.id);}
       return true;},
     list(){return messages.slice()},
     clear(){messages.length=0;ids.clear();}
   });
 }
 function validTransport(t){
   if(!t||typeof t.subscribe!=="function"||typeof t.send!=="function"||
     t.history!==undefined&&typeof t.history!=="function")
     throw Error("Existing authenticated room transport must provide subscribe/send");
   return t;
 }
 function install({doc=typeof document!=="undefined"?document:null,transport=null}={}){
   if(!doc?.createElement||!doc?.body||!doc?.addEventListener)throw Error("Original room document required");
   const original=doc.getElementById("tf-frontier-chat-dock");
   if(original?.__tfController)return original.__tfController;
   const style=doc.createElement("style");
   style.textContent=[
     '#tf-frontier-chat-dock{position:fixed;inset:0 auto 0 0;width:min(390px,93vw);z-index:1500;display:flex;flex-direction:column;background:linear-gradient(135deg,#0b2d40,#06121e);border-right:1px solid #4ccffc;box-shadow:15px 0 45px #0009;color:#e4faff;font:14px/1.4 system-ui,Arial;transform:translateX(-103%);visibility:hidden;transition:transform .18s ease,visibility .18s}',
     '#tf-frontier-chat-dock[data-open="true"]{transform:translateX(0);visibility:visible}',
     '#tf-frontier-chat-dock *{box-sizing:border-box}',
     '#tf-frontier-chat-dock header{padding:16px;background:#14374b;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #3287a8}',
     '#tf-frontier-chat-dock header strong{color:#b5f4ff;letter-spacing:.16em}',
     '#tf-frontier-chat-dock .tf-status{padding:8px 14px;color:#93bace;font-size:12px}',
     '#tf-frontier-chat-dock .tf-log{flex:1;overflow-y:auto;padding:14px;overscroll-behavior:contain;min-height:0}',
     '#tf-frontier-chat-dock .tf-msg{background:#163448;padding:9px;border:1px solid #30627d;border-radius:7px;margin-bottom:9px;overflow-wrap:anywhere}',
     '#tf-frontier-chat-dock .tf-msg[data-self="true"]{border-color:#68d4ef;background:#194257}',
     '#tf-frontier-chat-dock .tf-who{font:11px Consolas,monospace;color:#86e6ff;margin-bottom:4px}',
     '#tf-frontier-chat-dock .tf-text{white-space:pre-wrap;word-break:break-word}',
     '#tf-frontier-chat-dock form{padding:12px;display:grid;gap:8px;border-top:1px solid #31607c}',
     '#tf-frontier-chat-dock textarea{background:#092134;border:1px solid #3481a7;color:#e4faff;padding:10px;border-radius:6px;width:100%;min-height:70px;max-height:170px;resize:vertical}',
     '#tf-frontier-chat-dock button{background:#185679;color:#e3faff;border:1px solid #4dc8f9;padding:9px 12px;border-radius:5px;cursor:pointer}',
     '#tf-frontier-chat-dock button:disabled,#tf-frontier-chat-dock textarea:disabled{opacity:.5}',
     '#tf-frontier-chat-dock :focus-visible{outline:2px solid #86f1ff}',
     '@media(prefers-reduced-motion:reduce){#tf-frontier-chat-dock{transition:none}}'
   ].join("\n");
   const dock=doc.createElement("aside");dock.id="tf-frontier-chat-dock";
   dock.dataset.open="false";dock.setAttribute("aria-label","Frontier team chat");
   dock.setAttribute("aria-hidden","true");
   const head=doc.createElement("header"),name=doc.createElement("strong");name.textContent="FRONTIER / TEAM COMMS";
   const close=doc.createElement("button");close.type="button";close.textContent="CLOSE";
   head.append(name,close);
   const status=doc.createElement("div");status.className="tf-status";status.setAttribute("role","status");
   status.textContent="Waiting for verified room chat transport";
   const log=doc.createElement("div");log.className="tf-log";log.setAttribute("role","log");
   log.setAttribute("aria-live","polite");
   const form=doc.createElement("form"),textarea=doc.createElement("textarea");
   textarea.setAttribute("aria-label","Team message");textarea.placeholder="Write to your team…";
   textarea.maxLength=LIMIT;textarea.disabled=true;
   const submit=doc.createElement("button");submit.type="submit";submit.textContent="SEND";submit.disabled=true;
   form.append(textarea,submit);dock.append(head,status,log,form);
   doc.head.append(style);doc.body.append(dock);
   let open=false,adapter=null,unsubscribe=null,disposed=false;
   const records=createFeed();
   function receive(input){
     if(!records.push(input)||disposed)return false;
     const m=safeMessage(input),row=doc.createElement("div");row.className="tf-msg";row.dataset.self=String(m.self);
     const who=doc.createElement("div");who.className="tf-who";who.textContent=m.author+" • "+new Date(m.time).toLocaleTimeString();
     const body=doc.createElement("div");body.className="tf-text";body.textContent=m.text;
     row.append(who,body);log.append(row);
     while(log.childNodes.length>MAX)log.firstChild.remove();
     log.scrollTop=log.scrollHeight;return true;
   }
   function setOpen(flag){
     if(disposed)return false;
     open=!!flag;dock.dataset.open=String(open);dock.setAttribute("aria-hidden",String(!open));
     if(open){if(doc.pointerLockElement)doc.exitPointerLock?.();textarea.focus();}
     else close.focus({preventScroll:true});
     return open;
   }
   function attachTransport(next){
     if(disposed)throw Error("Chat disposed");
     validTransport(next);
     unsubscribe?.();records.clear();log.replaceChildren();
     const fn=next.subscribe(receive);
     if(typeof fn!=="function")throw Error("subscribe() must return unsubscriber");
     adapter=next;unsubscribe=fn;textarea.disabled=false;submit.disabled=false;
     status.textContent="Authenticated team chat connected";
     if(next.history)Promise.resolve(next.history()).then(rows=>{
       if(adapter===next&&!disposed&&Array.isArray(rows))rows.slice(-MAX).forEach(receive);
     }).catch(()=>{status.textContent="Connected • previous messages unavailable";});
     return true;
   }
   function detachTransport(){
     unsubscribe?.();unsubscribe=null;adapter=null;textarea.disabled=true;submit.disabled=true;
     status.textContent="Room chat disconnected";return true;
   }
   async function sendText(value){
     if(!adapter)throw Error("Chat is disconnected");
     if(typeof value!=="string"||value.trim().length<1||value.length>LIMIT)throw Error("Invalid message");
     await adapter.send(value.trim());
     return true; // Server echo provides the authoritative sent message, not optimistic local fiction.
   }
   const key=e=>{
     if(shouldToggle(e)){e.preventDefault();e.stopImmediatePropagation();setOpen(!open);}
     else if(e.code==="Escape"&&open&&doc.activeElement?.closest?.("#tf-frontier-chat-dock")){
       setOpen(false);e.stopImmediatePropagation();
     }
   };
   const submitHandler=async e=>{
     e.preventDefault();if(!adapter||!textarea.value.trim())return;
     submit.disabled=true;
     try{await sendText(textarea.value);textarea.value="";status.textContent="Submitted to room transport";}
     catch(error){status.textContent="Not sent: "+(error?.message||"unknown error");}
     finally{submit.disabled=!adapter;}
   };
   doc.addEventListener("keydown",key,true);
   textarea.addEventListener("keydown",e=>{
     if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}
   });
   close.addEventListener("click",()=>setOpen(false));form.addEventListener("submit",submitHandler);
   const controller=Object.freeze({setOpen,attachTransport,detachTransport,receive,sendText,
     get connected(){return !!adapter},get open(){return open},
     stats(){return Object.freeze({connected:!!adapter,open,messageCount:records.list().length,
       roomTransportRequired:true,backendProvisionedByDock:false});},
     dispose(){if(disposed)return;disposed=true;unsubscribe?.();doc.removeEventListener("keydown",key,true);
       dock.remove();style.remove();}
   });
   dock.__tfController=controller;
   if(transport)attachTransport(transport);
   return controller;
 }
 return Object.freeze({isTyping,shouldToggle,safeMessage,createFeed,validTransport,install});
});
