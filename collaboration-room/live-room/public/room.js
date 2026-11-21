import * as THREE from 'three';
import {installCapitalWorld} from './capital-world.mjs';
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#07101a');scene.fog=new THREE.FogExp2('#0a1623',0.014);
const camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,.1,130),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;$('scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x83b9e5,0x152039,2.1));
function light(color,x,y,z,power=80,range=18){let l=new THREE.PointLight(color,power,range,2);l.position.set(x,y,z);scene.add(l);return l;}
light(0x52cfff,0,7,-3,130,29);light(0x66aaff,-12,5,4,80);light(0x8d81ff,12,5,-7,95);light(0xffbd77,6,4,8,65);
function mat(color,metalness=.28,roughness=.45,emissive=0x000000,intensity=0){return new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity,side:THREE.DoubleSide});}
const wall=mat('#172638',.55,.46),floor=mat('#182432',.36,.63),dark=mat('#050e18',.7,.3),silver=mat('#4d6575',.75,.25),neon=mat('#5cddff',.25,.17,'#1cbaff',2.6),violet=mat('#ab95ff',.2,.24,'#7161ff',1.8),gold=mat('#d6b68d',.52,.36);
function box(w,h,d,x,y,z,m,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function plane(w,h,x,y,z,m,rotate=0){let mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.y=rotate;scene.add(mesh);return mesh;}
box(42,.5,32,0,-.27,0,floor);box(42,.5,32,0,11.4,0,wall);
// Exterior observation window: left atrium wall, original floor/ceiling and room boundary retained.
for(const z of [-12.5,12.5])box(.6,11,7,-21,5.5,z,wall);
box(.6,3.25,18,-21,1.625,0,wall);box(.6,2.75,18,-21,10.025,0,wall);
box(.6,11,32,21,5.5,0,wall);box(42,11,.6,0,5.5,-16,wall);box(42,11,.6,0,5.5,16,wall);
// Reflective seams, luminous ceiling rails, and wall insets.
for(let i=-18;i<=18;i+=3){box(.045,.02,32,i,.02,0,silver);box(.055,.04,32,i,11.12,0,neon);}
for(let i=-13;i<=13;i+=3){box(42,.02,.045,0,.015,i,silver);box(42,.04,.055,0,11.1,i,neon);}
for(let x of [-17,-8,0,8,17]){box(1.5,.12,22,x,10.85,0,dark);box(.08,.08,22,x,10.78,0,neon);}
for(let z of [-10,0,10]){box(.12,9,.12,-20.5,5.5,z,neon);box(.12,9,.12,20.5,5.5,z,neon);}
// Panoramic skyline silhouettes on rear wall.
for(let i=0;i<30;i++){const h=2.1+(Math.sin(i*12.989)*.5+.5)*4.9;box(.72,h,.2,-19.3+i*1.3,h/2,-15.45,mat('#263e58',.7,.28));}
function textTexture(text,subtitle='',width=900){let c=document.createElement('canvas');c.width=width;c.height=220;let g=c.getContext('2d');g.fillStyle='#071523';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#36a8d9';g.lineWidth=7;g.strokeRect(7,7,c.width-14,c.height-14);g.fillStyle='#7ceaff';g.textAlign='center';g.font='bold 69px Segoe UI, sans-serif';g.fillText(text,c.width/2,112);g.fillStyle='#a6bacb';g.font='29px Segoe UI, sans-serif';g.fillText(subtitle,c.width/2,164);return new THREE.CanvasTexture(c);}
function sign(name,sub,x,y,z,w=5,h=1.3,rot=0){let mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:textTexture(name,sub),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rot;scene.add(mesh);return mesh;}
// TF_PHYSICAL_WORKSTATIONS_V1_BEGIN
const stations=[];
function station(id,label,desc,x,z,color=neon){
  stations.push({id,label,x,z}); // Keep existing E interaction IDs and coordinates.
  const chassis=mat('#101923',.43,.54),edge=mat('#34495b',.68,.31);
  const display=mat('#071a2a',.12,.2,'#06334c',.7);
  const screenFrame=mat('#060b12',.45,.35);
  // Solid ergonomic console; no freestanding billboard or luminous platform.
  box(4.5,.16,1.8,x,1.25,z,chassis);
  for(const dx of [-1.88,1.88])box(.13,1.14,1.35,x+dx,.62,z,edge);
  box(4.2,.035,.06,x,1.34,z+.83,color);
  box(2.55,1.25,.11,x,2.15,z-.53,screenFrame);
  box(2.37,1.07,.018,x,2.15,z-.455,display);
  box(2.2,.045,.06,x,1.62,z-.43,color);
  box(1.15,.045,.36,x,1.36,z+.34,edge);
  box(.42,.055,.27,x+1.1,1.36,z+.35,edge);
  sign(label,desc,x,3.28,z-.55,3.9,.8);
}
// TF_PHYSICAL_WORKSTATIONS_V1_END
station('ide','CODE NEXUS','Repository IDE / Git Console',0,-9);station('ai','AI STUDIO','Prompt → Preview → Keep / Discard',-12,-7,violet);station('work','TACTICAL BOARD','Milestones / Tasks / Goals',12,-7,neon);station('team','TEAM PORTAL','GitHub members / Invites / Voice',-13,7,violet);station('music','SOUND GARDEN','Ambient / Focus / Jukebox',13,7,gold);station('links','LINK HUB','Trello / Full Sail / Discord',0,10,neon);
sign('TOWERFLOW','ENTER WORLD    •    FEATURE LAB    •    SHARED DEV',0,8.5,-15.56,10,1.9);
// TF_EARTH_HOLOGRAM_V1_BEGIN
// Self-contained, offline-safe geographic illustration. No live sales claims.
const core=new THREE.Group();core.name='TF_EARTH_HOLOGRAM_V1';core.position.set(0,3.2,-2);scene.add(core);
const earthCanvas=document.createElement('canvas');earthCanvas.width=1024;earthCanvas.height=512;
const ec=earthCanvas.getContext('2d');
ec.fillStyle='#092a4d';ec.fillRect(0,0,1024,512);
const ocean=ec.createLinearGradient(0,0,0,512);ocean.addColorStop(0,'#123e65');ocean.addColorStop(.5,'#0a2847');ocean.addColorStop(1,'#153d63');ec.fillStyle=ocean;ec.fillRect(0,0,1024,512);
const landPaths=[
 [[.06,.21],[.12,.14],[.19,.17],[.24,.25],[.22,.35],[.18,.39],[.17,.47],[.13,.43],[.10,.34],[.06,.32]],
 [[.19,.48],[.25,.49],[.29,.59],[.27,.75],[.24,.89],[.21,.78],[.20,.63]],
 [[.40,.19],[.47,.16],[.50,.23],[.48,.33],[.45,.36],[.43,.30]],
 [[.44,.37],[.52,.35],[.56,.47],[.54,.68],[.50,.81],[.46,.72],[.44,.56]],
 [[.49,.19],[.61,.12],[.72,.17],[.80,.24],[.87,.18],[.94,.28],[.90,.42],[.83,.45],[.78,.39],[.71,.44],[.67,.55],[.60,.47],[.56,.34],[.51,.35]],
 [[.70,.50],[.75,.48],[.77,.59],[.74,.70],[.71,.63]],
 [[.82,.65],[.89,.64],[.93,.72],[.89,.81],[.83,.78]],
 [[.0,.91],[.22,.89],[.48,.93],[.75,.89],[1,.92],[1,1],[0,1]]
];
ec.fillStyle='#3e907c';ec.strokeStyle='#8acbb0';ec.lineWidth=1.6;
for(const poly of landPaths){ec.beginPath();poly.forEach(([x,y],i)=>i?ec.lineTo(x*1024,y*512):ec.moveTo(x*1024,y*512));ec.closePath();ec.fill();ec.stroke();}
ec.strokeStyle='rgba(110,204,238,.18)';ec.lineWidth=1;
for(let x=0;x<=1024;x+=64){ec.beginPath();ec.moveTo(x,0);ec.lineTo(x,512);ec.stroke();}
for(let y=0;y<=512;y+=64){ec.beginPath();ec.moveTo(0,y);ec.lineTo(1024,y);ec.stroke();}
const earthTexture=new THREE.CanvasTexture(earthCanvas);earthTexture.colorSpace=THREE.SRGBColorSpace;
const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.04,64,40),new THREE.MeshStandardMaterial({map:earthTexture,metalness:.05,roughness:.83,emissive:0x052038,emissiveIntensity:.28}));core.add(sphere);
const ringMaterial=new THREE.MeshBasicMaterial({color:0x55dfff,transparent:true,opacity:.7,depthWrite:false});
const coreRing=new THREE.Mesh(new THREE.TorusGeometry(1.53,.022,8,112),ringMaterial);coreRing.rotation.x=.35;core.add(coreRing);
const coreRing2=new THREE.Mesh(new THREE.TorusGeometry(1.37,.018,8,112),new THREE.MeshBasicMaterial({color:0x78b9ff,transparent:true,opacity:.53,depthWrite:false}));coreRing2.rotation.y=1.1;core.add(coreRing2);
const earthStatus=sign('EARTH • VISUAL PROTOTYPE','ILLUSTRATIVE GEOGRAPHY • NO LIVE SALES FEED',0,5.55,-2,5.4,.72);
earthStatus.userData.tfEarthStatus=true;
stations.push({id:'ide',label:'Holographic computer',x:0,z:-2});
// TF_EARTH_HOLOGRAM_V1_END
// Station AI chaperone in left corner.
const guide=new THREE.Group();guide.position.set(-17,0,-12);scene.add(guide);let guideHead=new THREE.Mesh(new THREE.SphereGeometry(.62,24,24),violet);guideHead.position.y=2.8;guide.add(guideHead);let guideTorso=new THREE.Mesh(new THREE.CylinderGeometry(.65,.9,1.9,16),dark);guideTorso.position.y=1.35;guide.add(guideTorso);guide.add(new THREE.PointLight(0xb8a1ff,40,6));stations.push({id:'help',label:'AURA • AI Chaperone',x:-17,z:-12});sign('AURA','Can I assist you? Pun intended.',-17,4.9,-15.4,5,1.1);
// Animated avatar markers; their color/image comes from GitHub sign-in.
// TF_DEV_ROOM_V1 — Interactive development chamber.
// Browser-based workstations; no desktop IDE processes are exposed.

let tfDevRoom = false;
const tfClickable = [];

function tfRegister(mesh, id) {
    tfClickable.push({ mesh, id });
    return mesh;
}

// Large entrance display in the existing collaboration room.
const tfEntrance = sign(
    'TOWERFLOW',
    'CLICK TO ENTER THE DEVELOPMENT ROOM',
    0, 7.4, -15.55, 12, 3.7
);

tfRegister(tfEntrance, 'dev-room');
stations.push({
    id: 'dev-room',
    label: 'ENTER TOWERFLOW DEVELOPMENT ROOM',
    x: 0,
    z: -13.5
});

// Second room, spatially separated from the original chamber.
const tfRoomX = 62;

box(42, .5, 32, tfRoomX, -.27, 0, floor);
box(42, .5, 32, tfRoomX, 11.4, 0, wall);

box(.6, 11, 32, tfRoomX - 21, 5.5, 0, wall);
// Exterior observation window: right development wall. Navigation bounds and other walls unchanged.
for (const z of [-12.5,12.5]) box(.6,11,7,tfRoomX+21,5.5,z,wall);
box(.6,3.25,18,tfRoomX+21,1.625,0,wall);
box(.6,2.75,18,tfRoomX+21,10.025,0,wall);

box(42, 11, .6, tfRoomX, 5.5, -16, wall);
box(42, 11, .6, tfRoomX, 5.5, 16, wall);

light(0x5cddff, 53, 8, -6, 95, 25);
light(0xab95ff, 71, 8, -6, 95, 25);
light(0x5cddff, 62, 8, 9, 75, 25);

sign(
    'TOWERFLOW DEVELOPMENT',
    'FOUR IDE WORKSTATIONS / ONE SHARED REPOSITORY',
    62, 9.2, -15.5, 20, 2.4
);

const tfIDEs = [
    {
        id: 'dev-ide-vs',
        name: 'VISUAL STUDIO COMMUNITY',
        sub: 'SOLUTIONS / DEBUGGING',
        x: 49
    },
    {
        id: 'dev-ide-code',
        name: 'VISUAL STUDIO CODE',
        sub: 'SOURCE / TERMINAL WORKFLOW',
        x: 58
    },
    {
        id: 'dev-ide-cursor',
        name: 'CURSOR',
        sub: 'AI-ASSISTED DEVELOPMENT',
        x: 67
    },
    {
        id: 'dev-ide-antigravity',
        name: 'GOOGLE ANTIGRAVITY',
        sub: 'AGENT DEVELOPMENT',
        x: 76
    }
];

const tfIDENames = {};

for (const item of tfIDEs) {
    tfIDENames[item.id] = item.name;

    station(
        item.id,
        item.name,
        item.sub,
        item.x,
        -8,
        violet
    );

    const screen = sign(
        item.name,
        item.sub,
        item.x,
        5.8,
        -15.5,
        7.8,
        3.2
    );

    tfRegister(screen, item.id);
}

// Return portal on the opposite wall.
const tfReturn = sign(
    'RETURN TO ATRIUM',
    'CLICK TO RETURN TO THE COLLABORATION ROOM',
    62, 6.6, 15.55, 12, 3.2, Math.PI
);

tfRegister(tfReturn, 'dev-return');

stations.push({
    id: 'dev-return',
    label: 'RETURN TO COLLABORATION ROOM',
    x: 62,
    z: 12
});

function tfTeleport(enter) {
    tfDevRoom = enter;

    position.set(
        enter ? 62 : 0,
        1.7,
        12
    );

    yaw = 0;
    pitch = 0;

    keys.clear();
    closePanel();

    send({
        type: 'move',
        x: position.x,
        z: position.z
    });

    $('areaName').textContent =
        enter ? 'TOWERFLOW DEVELOPMENT' : 'THE ATRIUM';

    showToast(
        enter
            ? 'Development room entered. Four IDE workstations available.'
            : 'Returned to collaboration room.'
    );
}

// TF_CONFIG_AGENT_V1_BEGIN
(function(){
  'use strict';
  // This catalog is a verified capability map, NOT a remote desktop or IDE bridge.
  const tfConfig = {"repositoryUrl":"https://github.com/Cos229-239/2610_Team02","stations":[{"id":"dev-ide-vs","title":"Visual Studio Community","description":"Full desktop IDE for solutions and debugging. Browser room shows project files; a secure desktop bridge is not configured.","mode":"desktop-bridge-pending"},{"id":"dev-ide-code","title":"Visual Studio Code","description":"VS Code local workspace is available from the repository. Browser source editor is available inside Towerflow.","mode":"browser-editor"},{"id":"dev-ide-cursor","title":"Cursor","description":"Cursor operates on the same Git checkout. No interactive desktop IDE bridge is exposed through Towerflow.","mode":"desktop-bridge-pending"},{"id":"dev-ide-antigravity","title":"Google Antigravity","description":"Agent development works through the shared repository; remote graphical IDE integration is not configured.","mode":"desktop-bridge-pending"}]};
  window.tfConfigAgent = Object.freeze({
    version: 1,
    stationIds: Object.freeze(tfConfig.stations.map(s => s.id))
  });
  window.tfShowIDEIntegration = function(stationId){
    const station = tfConfig.stations.find(s => s.id === stationId);
    if (!station) return;
    const content = document.getElementById('panelContent');
    if (!content) return;
    const wrap = document.createElement('section');
    wrap.className = 'callout';
    wrap.setAttribute('aria-label', 'Towerflow IDE integration configuration');
    const heading = document.createElement('h3');
    heading.textContent = station.title + ' ΓÇö Integration status';
    const description = document.createElement('p');
    description.textContent = station.description;
    const status = document.createElement('p');
    status.textContent = station.mode === 'browser-editor'
      ? 'Browser repository editor available. This is not the desktop IDE.'
      : 'Desktop IDE bridge not configured. No remote terminal or IDE exposed.';
    const link = document.createElement('a');
    link.href = tfConfig.repositoryUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open shared GitHub repository Γåù';
    wrap.append(heading, description, status, link);
    content.prepend(wrap);
  };
}());
// TF_CONFIG_AGENT_V1_END

function activateTFStation(id) {
    if (id === 'dev-room') {
        tfTeleport(true);
        return;
    }

    if (id === 'dev-return') {
        tfTeleport(false);
        return;
    }

    if (id.startsWith('dev-ide-')) {
        openPanel('ide');

        $('panelTitle').textContent =
            tfIDENames[id] || 'DEVELOPMENT WORKSTATION';

        $('panelContent').insertAdjacentHTML(
            'afterbegin',
            '<div class="callout">' +
            '<strong>TOWERFLOW DEVELOPMENT INTEGRATION</strong><br>' +
            'This workstation uses the existing browser-based ' +
            'repository editor. It does not run a desktop IDE ' +
            'on the server or in your browser. ' +
            'All four environments share the Team 02 GitHub repository.' +
            '</div>'
        );

        window.tfShowIDEIntegration(id);
        return;
    }

    openPanel(id);
}

// Clickable 3D displays.
const tfRaycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('click', event => {
    if (!running || !$('panel').hidden || !$('menu').hidden) {
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();

    const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    tfRaycaster.setFromCamera(pointer, camera);

    const hits = tfRaycaster.intersectObjects(
        tfClickable.map(item => item.mesh),
        false
    );

    if (!hits.length) return;

    const match = tfClickable.find(
        item => item.mesh === hits[0].object
    );

    if (!match) return;

    // Prevent clicking screens through walls or across rooms.
    if (
        tfDevRoom &&
        match.id === 'dev-room'
    ) return;

    if (
        !tfDevRoom &&
        match.id !== 'dev-room'
    ) return;

    activateTFStation(match.id);
});
const remote=new Map(),voicePeers=new Map();let selfId=null,ws=null,micStream=null,localUser=null,permission='',running=false,activePanel='',activeFile='',files=[],proposal=null,selectedStation=null,voiceActive=false;
const keys=new Set();let yaw=0,pitch=0,position=new THREE.Vector3(0,1.7,12),clock=new THREE.Clock(),lastMove=0;
function showToast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>$('toast').style.display='none',4000);}
function api(endpoint,opts={}){return fetch(endpoint,{headers:{'Content-Type':'application/json'},...opts}).then(async r=>{let data=await r.json().catch(()=>({error:'Unexpected server response'}));if(!r.ok)throw new Error(data.error||`HTTP ${r.status}`);return data;});}
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setAuth(user){localUser=user;$('who').textContent=user?`@${user.login} • ${user.permission}`:'GUEST';$('loginBtn').hidden=!!user;$('logoutBtn').hidden=!user;$('authNote').textContent=user?`Authenticated as @${user.login}. Select Enter Chamber.`:'Sign in with GitHub to access the room.';}
try{setAuth(await api('/api/me'));}catch{setAuth(null);}
$('loginBtn').onclick=()=>location.href='/auth/github';$('logoutBtn').onclick=async()=>{await api('/auth/logout',{method:'POST'});location.reload()};$('enterBtn').onclick=()=>{if(!localUser){location.href='/auth/github';return;}running=true;$('welcome').hidden=true;$('hud').hidden=false;$('crosshair').style.display='block';connect();showToast('Welcome to the Team 02 chamber. Approach a workbench and press E.')};
$('helpIntro').onclick=()=>openPanel('help');$('closePanel').onclick=()=>closePanel();$('resume').onclick=()=>{$('menu').hidden=true};document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.panel)));
function closePanel(){activePanel='';$('panel').hidden=true;document.activeElement.blur()};
function openPanel(id){activePanel=id;$('menu').hidden=true;$('panel').hidden=false;$('panelTag').textContent='INTERACTIVE WORKSTATION';$('panelTitle').textContent=({ide:'CODE NEXUS',ai:'AI FEATURE STUDIO',work:'TACTICAL BOARD',team:'TEAM PORTAL',music:'SOUND GARDEN',links:'LINK HUB',help:'AURA • CHAMBER GUIDE'})[id]||'WORKSTATION';$('panelContent').innerHTML='';({ide:idePanel,ai:aiPanel,work:workPanel,team:teamPanel,music:musicPanel,links:linksPanel,help:helpPanel})[id]?.();}
function say(s,spoken=false){const div=document.createElement('div');div.textContent=s;$('captions').appendChild(div);setTimeout(()=>div.remove(),5000);if(spoken&&'speechSynthesis'in window){const u=new SpeechSynthesisUtterance(s);u.pitch=1.07;u.rate=1.08;speechSynthesis.speak(u);}}
window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','i','j','k','l','shift','e','m','t','escape'].includes(k))e.preventDefault();keys.add(k);if(!running)return;if(k==='m')$('menu').hidden=!$('menu').hidden;if(k==='escape'){closePanel();$('menu').hidden=true}if(k==='e'&&selectedStation)activateTFStation(selectedStation.id);if(k==='t'){const message=prompt('Chat bubble (max 140 characters)');if(message?.trim()){say(`You: ${message.slice(0,140)}`);send({type:'chat',text:message.slice(0,140)})}}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function glowAvatar(user){const group=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.37,1.0,6,12),mat('#467caa',.3,.4));body.position.y=1.1;group.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.38,22,22),silver);head.position.y=2.12;group.add(head);if(user.avatar_url){new THREE.TextureLoader().load(user.avatar_url,t=>{t.colorSpace=THREE.SRGBColorSpace;head.material=new THREE.MeshBasicMaterial({map:t});},undefined,()=>{});}const halo=new THREE.Mesh(new THREE.TorusGeometry(.63,.045,8,35),neon);halo.position.y=2.7;halo.rotation.x=Math.PI/2;group.add(halo);scene.add(group);return group;}
function connect(){let proto=location.protocol==='https:'?'wss':'ws';ws=new WebSocket(`${proto}://${location.host}/ws`);ws.onopen=()=>{$('socketStatus').textContent='● LIVE TEAM ROOM'};ws.onclose=()=>{$('socketStatus').textContent='● DISCONNECTED';if(running)setTimeout(connect,5000)};ws.onmessage=async event=>{let data=JSON.parse(event.data);if(data.type==='welcome'){selfId=data.id;data.peers.forEach(p=>addPeer(p));if(voiceActive)for(let p of data.peers)await startCall(p.id)}if(data.type==='join'){addPeer(data);if(voiceActive)await startCall(data.id)}if(data.type==='move'){const peer=remote.get(data.id);if(peer)peer.position.set(data.x,0,data.z)}if(data.type==='chat'){say(`${remote.get(data.id)?.user?.login||'Teammate'}: ${data.text}`)}if(data.type==='leave'){remote.get(data.id)?.group.removeFromParent();remote.delete(data.id);voicePeers.get(data.id)?.close();voicePeers.delete(data.id)}if(['offer','answer','ice'].includes(data.type))await signal(data);};}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data))}
function addPeer(p){if(remote.has(p.id))return;let group=glowAvatar(p.user);group.position.set(p.x||0,0,p.z||0);remote.set(p.id,{...p,group,position:group.position});showToast(`${p.user.login} entered the chamber`)}
async function newConnection(id){const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});voicePeers.set(id,pc);pc.onicecandidate=e=>{if(e.candidate)send({type:'ice',to:id,payload:e.candidate.toJSON()})};pc.ontrack=e=>{let audio=document.getElementById('voice-'+id);if(!audio){audio=document.createElement('audio');audio.id='voice-'+id;audio.autoplay=true;document.body.appendChild(audio)}audio.srcObject=e.streams[0]};if(micStream)micStream.getTracks().forEach(t=>pc.addTrack(t,micStream));return pc;}
async function startCall(id){if(!voiceActive)return;let pc=voicePeers.get(id)||await newConnection(id);const offer=await pc.createOffer();await pc.setLocalDescription(offer);send({type:'offer',to:id,payload:pc.localDescription});}
async function signal(data){try{let pc=voicePeers.get(data.from)||await newConnection(data.from);if(data.type==='offer'){await pc.setRemoteDescription(data.payload);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);send({type:'answer',to:data.from,payload:pc.localDescription})}if(data.type==='answer')await pc.setRemoteDescription(data.payload);if(data.type==='ice')await pc.addIceCandidate(data.payload)}catch(e){console.warn('Voice peer issue',e)}}
async function toggleVoice(){if(voiceActive){micStream?.getTracks().forEach(t=>t.stop());micStream=null;voicePeers.forEach(p=>p.close());voicePeers.clear();voiceActive=false;showToast('Voice disconnected')}else{try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});voiceActive=true;for(const id of remote.keys())await startCall(id);showToast('Microphone live. Wear headphones to avoid echo.')}catch(e){showToast('Microphone unavailable. Use HTTPS for remote access: '+e.message)}}if(activePanel==='team')teamPanel()}
const controls=`<div class="callout"><strong>MOVE</strong> W forward / S back / A left / D right. Shift + WASD sprints.<br><strong>LOOK</strong> I up / K down / J left / L right. Drag the mouse to look around.<br><strong>ACTIONS</strong> E interacts near a workbench; T shows a text bubble; M opens the menu; Escape closes a panel.</div><p>Approach any illuminated station and press E. The holographic computer opens code editing. The AI bench suggests changes, but never writes a file until you select <b>Keep</b>.</p>`;
function helpPanel(){$('panelContent').innerHTML=controls+'<h3>YOUR CHAPERONE</h3><p>AURA is a scripted, friendly voice guide in this version. For advanced reasoning, use the AI Feature Studio with your own API key.</p><button id="greet">🔊 Ask AURA for assistance</button>';$('greet').onclick=()=>say('Hello developer! I can guide you to the IDE, AI studio, task board, voice portal, music station, and portal links. Can I assist you? Pun intended.',true)}
function linksPanel(){$('panelContent').innerHTML=`<p>These links open separately. Sign in on each service, then return to the Towerflow room tab. Embedded login and automatic institutional SSO return are not supported in this starter.</p><div class="row wrap"><a href="https://trello.com/" target="_blank" rel="noopener"><button>▦ Trello</button></a><a href="https://online.fullsail.edu/" target="_blank" rel="noopener"><button>🎓 Full Sail</button></a><a href="https://discord.com/app" target="_blank" rel="noopener"><button>◈ Discord</button></a><a href="https://github.com/Cos229-239/2610_Team02" target="_blank" rel="noopener"><button>⌘ GitHub Repository</button></a></div>`;}
async function teamPanel(){$('panelContent').innerHTML=`<p>Only authenticated collaborators of this repository may join. Active avatars display their GitHub profile pictures.</p><div class="row wrap"><button id="voiceBtn">${voiceActive?'🔴 Disconnect voice':'🎙 Enable voice'}</button><button id="refreshMembers">↻ Refresh members</button><button id="copyRoom">🔗 Copy room link</button></div><div class="status-line">Online in this room: ${remote.size+1}. Voice uses peer-to-peer WebRTC.</div><h3>REPOSITORY COLLABORATORS</h3><div id="members">Loading…</div><h3>INVITE NEW REPOSITORY COLLABORATOR</h3><div class="field"><label>GitHub username (repo admin only)</label><input id="inviteUser" placeholder="github-username"></div><button id="inviteBtn">Invite to GitHub repository</button><p class="muted">Share the room link separately. Invited users must accept their GitHub repository invitation before they can sign in and enter. Repository guests are not enabled.</p>`;$('voiceBtn').onclick=toggleVoice;$('refreshMembers').onclick=()=>teamPanel();$('copyRoom').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/room/team02');showToast('Invite link copied. Invitee must be an accepted repository collaborator.')}catch{showToast('Copy this URL: '+location.origin+'/room/team02')}};$('inviteBtn').onclick=async()=>{try{const d=await api('/api/invite',{method:'POST',body:JSON.stringify({username:$('inviteUser').value})});showToast(d.status)}catch(e){showToast(e.message)}};try{let list=await api('/api/members');$('members').innerHTML=list.map(m=>`<div class="member"><img alt="" src="${escapeHtml(m.avatar_url)}"><div><b>${escapeHtml(m.login)}</b><small>${remote.size&&[...remote.values()].some(r=>r.user.login===m.login)?'In room':'Repository member'}</small></div></div>`).join('')}catch(e){$('members').textContent=e.message}}
let tasks=JSON.parse(localStorage.getItem('towerflow_room_tasks')||'null')||[{type:'MUST HAVE',title:'GitHub-gated room login',done:true},{type:'MUST HAVE',title:'Shared team voice and avatars',done:false},{type:'GOAL',title:'Merge Week 01 changes into dev',done:false},{type:'GOAL',title:'Review AURA API pricing and credits',done:false}];
function workPanel(){function render(){$('panelContent').innerHTML=`<p>Local planning board. This does not automatically sync to Trello. Use Link Hub to access your real board.</p><div class="row wrap"><button id="addTask">+ Add card</button><a href="https://trello.com" target="_blank"><button>Open Trello ↗</button></a></div><div id="cards">${tasks.map((t,i)=>`<div class="task"><span class="tag">${escapeHtml(t.type)}</span><b>${escapeHtml(t.title)}</b><label><input type="checkbox" data-idx="${i}" ${t.done?'checked':''} style="width:auto"> Completed</label> <button data-del="${i}" style="padding:4px 8px">×</button></div>`).join('')}</div>`;$('addTask').onclick=()=>{let title=prompt('New task or goal');if(title?.trim()){tasks.unshift({type:'TASK',title:title.slice(0,120),done:false});save();render()}};document.querySelectorAll('[data-idx]').forEach(e=>e.onchange=()=>{tasks[+e.dataset.idx].done=e.checked;save()});document.querySelectorAll('[data-del]').forEach(e=>e.onclick=()=>{tasks.splice(+e.dataset.del,1);save();render()});}function save(){localStorage.setItem('towerflow_room_tasks',JSON.stringify(tasks))}render()}
async function loadFile(path){try{const d=await api('/api/file?path='+encodeURIComponent(path));activeFile=path;$('selectedFile').textContent=path;$('codeEdit').value=d.content;}catch(e){showToast(e.message)}}
async function idePanel(){$('panelContent').innerHTML=`<div class="callout">The editor changes the host's local clone, not GitHub directly. Review changes and commit/merge using GitHub Desktop. No arbitrary operating-system shell commands are exposed.</div><div class="row wrap"><button id="refreshGit">↻ Refresh Git</button><button id="saveFile" class="glow">Save working tree</button><button id="openDesktop">GitHub Desktop ↗</button></div><pre class="code" id="gitInfo">Loading git status…</pre><h3>REPOSITORY SOURCE BROWSER</h3><div class="split"><div class="filelist" id="fileList">Loading files…</div><div><div class="status-line" id="selectedFile">Select a tracked source file</div><textarea id="codeEdit" class="editor" spellcheck="false" placeholder="Select a file in the left column"></textarea></div></div><h3>SAFE GIT CONSOLE (READ-ONLY)</h3><div class="row wrap">${['git status','git log','git diff','git branch'].map(s=>`<button data-git="${s}">${s}</button>`).join('')}</div><pre class="code" id="gitOutput">Choose a Git command.</pre>`;async function refresh(){try{const d=await api('/api/git/status');$('gitInfo').textContent=`BRANCH: ${d.branch} ${d.dev?'✓ dev':'⚠ NOT dev'}\n\nWORKING TREE:\n${d.status||'(clean)'}\n\nRECENT COMMITS:\n${d.log}`}catch(e){$('gitInfo').textContent=e.message}}$('refreshGit').onclick=refresh;$('openDesktop').onclick=()=>showToast('Open the repository in your installed GitHub Desktop app to commit and merge.');$('saveFile').onclick=async()=>{if(!activeFile)return showToast('Choose a file first');if(!confirm(`Save ${activeFile} to the local Git working tree?`))return;try{await api('/api/file',{method:'PUT',body:JSON.stringify({path:activeFile,content:$('codeEdit').value})});showToast('File saved locally. Review and commit via GitHub Desktop.');refresh()}catch(e){showToast(e.message)}};document.querySelectorAll('[data-git]').forEach(b=>b.onclick=async()=>{try{let d=await api('/api/git/command',{method:'POST',body:JSON.stringify({command:b.dataset.git})});$('gitOutput').textContent=d.output||'(no output)'}catch(e){$('gitOutput').textContent=e.message}});try{files=await api('/api/files');$('fileList').innerHTML=files.map(f=>`<button data-file="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('');document.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>loadFile(b.dataset.file));}catch(e){$('fileList').textContent=e.message}refresh()}
async function aiPanel(){$('panelContent').innerHTML=`<div class="callout">Describe a feature. AI suggests a replacement for ONE existing repository file. You can inspect it and choose <b>Keep</b> or <b>Discard</b>. No automatic deployment, merge, or git push.</div><div class="field"><label>Target source file</label><select id="aiFile"><option>Loading files…</option></select></div><div class="field"><label>What would you like to add to Towerflow?</label><textarea id="featurePrompt" placeholder="Example: Improve keyboard help text and add an accessible onboarding toggle."></textarea></div><button class="glow" id="propose">✧ Generate proposal</button><div id="proposalArea"></div>`;try{files=files.length?files:await api('/api/files');$('aiFile').innerHTML=files.map(f=>`<option value="${escapeHtml(f)}" ${f===activeFile?'selected':''}>${escapeHtml(f)}</option>`).join('')}catch(e){$('aiFile').innerHTML=`<option>${escapeHtml(e.message)}</option>`}$('propose').onclick=async()=>{const path=$('aiFile').value,prompt=$('featurePrompt').value.trim();if(!prompt)return showToast('Describe the feature first.');$('proposalArea').textContent='Generating a preview…';try{proposal=await api('/api/ai/propose',{method:'POST',body:JSON.stringify({path,prompt})});$('proposalArea').innerHTML=`<h3>PROPOSED REPLACEMENT FOR ${escapeHtml(path)}</h3><div class="callout">Inspect both versions carefully. Keep saves to the host working tree. Discard makes no change.</div><div class="split"><div><b>BEFORE</b><pre class="code">${escapeHtml(proposal.original)}</pre></div><div><b>AFTER</b><pre class="code">${escapeHtml(proposal.proposed)}</pre></div></div><div class="row"><button id="keep" class="glow">✓ KEEP</button><button id="discard">✕ DISCARD</button></div>`;$('keep').onclick=async()=>{if(!confirm('Keep proposal and write the replacement file to your local Git working tree?'))return;try{await api('/api/file',{method:'PUT',body:JSON.stringify({path:proposal.path,content:proposal.proposed})});showToast('Proposal kept locally. Commit it in GitHub Desktop after review.');proposal=null;$('proposalArea').innerHTML='<div class="status-line">Saved to local working tree.</div>'}catch(e){showToast(e.message)}};$('discard').onclick=()=>{proposal=null;$('proposalArea').innerHTML='<p>Proposal discarded. Repository file unchanged.</p>'};}catch(e){$('proposalArea').innerHTML=`<div class="callout">${escapeHtml(e.message)}</div>`}}}
let ambience=null,ambientNodes=[];
function stopAmbience(){
  const active=ambience;ambience=null;
  for(const node of ambientNodes){try{node.stop?.()}catch{};try{node.disconnect?.()}catch{}}
  ambientNodes=[];
  if(active)try{void active.close().catch(()=>{});}catch{}
  // Selectively silence environmental audio; never suspend WebRTC voice.
  window.tfFrontier?.stopEnvironmentAudio?.();
}
function startAmbience(){stopAmbience();window.tfFrontier?.resumeEnvironmentAudio?.();ambience=new (window.AudioContext||window.webkitAudioContext)();let ctx=ambience,buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.16;const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=950;const gain=ctx.createGain();gain.gain.value=.26;noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();ambientNodes.push(noise);window.tfFrontier?.trackAmbientAudio?.({gain:gain.gain,context:ctx});for(let f of [220,329.63,440]){const osc=ctx.createOscillator(),volume=ctx.createGain();osc.type='sine';osc.frequency.value=f;volume.gain.value=.008;osc.connect(volume).connect(ctx.destination);osc.start();ambientNodes.push(osc);window.tfFrontier?.trackAmbientAudio?.({gain:volume.gain,context:ctx})}showToast('Rain and meditation drones enabled (synthesized locally).')}
function musicPanel(){$('panelContent').innerHTML=`<p>Set the atmosphere for a calm, focused session. Browser playback requires your click.</p><div class="row wrap"><button id="rain">🌧 Rain + soft meditation tones</button><button id="stopMusic">■ Stop ambient</button><button id="focus">▶ YouTube focus music ↗</button></div><div class="field"><label>Search for music on YouTube</label><input id="searchMusic" placeholder="Forest flute rain meditation"></div><button id="searchYoutube">Search YouTube ↗</button>`;$('rain').onclick=startAmbience;$('stopMusic').onclick=()=>{stopAmbience();showToast('Ambient audio stopped')};$('focus').onclick=()=>window.open('https://www.youtube.com/results?search_query=focus+music+for+coding','_blank','noopener');$('searchYoutube').onclick=()=>window.open('https://www.youtube.com/results?search_query='+encodeURIComponent($('searchMusic').value),'_blank','noopener')}
renderer.domElement.addEventListener('mousedown',e=>{if(!running||!$('panel').hidden)return;renderer.domElement.dataset.dragging='1';renderer.domElement.dataset.lastX=e.clientX;renderer.domElement.dataset.lastY=e.clientY});window.addEventListener('mouseup',()=>renderer.domElement.dataset.dragging='');renderer.domElement.addEventListener('mousemove',e=>{if(renderer.domElement.dataset.dragging!=='1')return;let dx=e.clientX-Number(renderer.domElement.dataset.lastX),dy=e.clientY-Number(renderer.domElement.dataset.lastY);yaw-=dx*.003;pitch=Math.max(-1.15,Math.min(1.15,pitch-dy*.003));renderer.domElement.dataset.lastX=e.clientX;renderer.domElement.dataset.lastY=e.clientY});
function animate(){requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.05),elapsed=clock.elapsedTime;core.rotation.y+=delta*.2;coreRing.rotation.z+=delta*.22;coreRing2.rotation.x+=delta*.13;sphere.rotation.x+=delta*.2;guideHead.position.y=2.8+Math.sin(elapsed*1.4)*.07;
 if(running){if($('panel').hidden&&$('menu').hidden){if(keys.has('j'))yaw+=delta*1.5;if(keys.has('l'))yaw-=delta*1.5;if(keys.has('i'))pitch=Math.min(1.15,pitch+delta);if(keys.has('k'))pitch=Math.max(-1.15,pitch-delta);let fw=+keys.has('w')-+keys.has('s'),side=+keys.has('d')-+keys.has('a'),speed=keys.has('shift')?10:5;if(fw||side){let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side,vz=-Math.cos(yaw)*fw-Math.sin(yaw)*side,len=Math.hypot(vx,vz);position.x=Math.max(tfDevRoom?42.5:-19.5,Math.min(tfDevRoom?81.5:19.5,position.x+vx/len*speed*delta));position.z=Math.max(-14.5,Math.min(14.5,position.z+vz/len*speed*delta));if(elapsed-lastMove>.07){send({type:'move',x:position.x,z:position.z});lastMove=elapsed}}}camera.position.copy(position);camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;let closest=null,distance=3.5;for(let station of stations){let d=Math.hypot(position.x-station.x,position.z-station.z);if(d<distance){closest=station;distance=d}}selectedStation=closest;$('interact').style.opacity=closest?'1':'0';$('interact').innerHTML=closest?`<kbd>E</kbd> ${escapeHtml(closest.label)}`:'Press <kbd>E</kbd> to interact';$('areaName').textContent=closest?.label.toUpperCase()||(tfDevRoom?'TOWERFLOW DEVELOPMENT':'THE ATRIUM');}else{camera.position.set(1,3.5,15);camera.lookAt(0,4,-4)}renderer.render(scene,camera)}animate();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

// TF_AURA_ROOM_CLIENT_V1_BEGIN
// In-world AURA interface. Does not expose Ollama, desktop IDEs, or OS shell.
(function(){
  "use strict";
  if (typeof helpPanel !== "function" || typeof openPanel !== "function") return;
  const originalHelp = helpPanel;
  helpPanel = function auraEnhancedHelpPanel() {
    originalHelp();
    const container = document.getElementById("panelContent");
    if (!container || container.querySelector("#tfAuraArea")) return;
    const area = document.createElement("section");
    area.id = "tfAuraArea";
    area.setAttribute("aria-label", "AURA world-expert assistant");
    const title = document.createElement("h3");
    title.textContent = "AURA ΓÇö TOWERFLOW WORLD EXPERT";
    const note = document.createElement("p");
    note.textContent = "Ask AURA about the world, movement, GitHub, rooms or development. Replies use reviewed world knowledge. The assistant cannot deploy or edit code.";
    const status = document.createElement("div");
    status.setAttribute("role","status");
    status.setAttribute("aria-live","polite");
    status.textContent = "Checking private AURA serviceΓÇª";
    const question = document.createElement("textarea");
    question.placeholder = "What should we improve in Towerflow?";
    question.maxLength = 1200;
    question.setAttribute("aria-label","Question for AURA");
    question.rows = 3;
    const ask = document.createElement("button");
    ask.type = "button";
    ask.textContent = "Ask AURA";
    ask.disabled = true;
    const reply = document.createElement("div");
    reply.setAttribute("aria-live","polite");
    reply.style.whiteSpace = "pre-wrap";
    reply.style.maxHeight = "18rem";
    reply.style.overflowY = "auto";
    const memoryLabel = document.createElement("h4");
    memoryLabel.textContent = "Approved personal memory";
    const memoryInput = document.createElement("input");
    memoryInput.placeholder = "Remember one non-sensitive preferenceΓÇª";
    memoryInput.maxLength = 350;
    memoryInput.setAttribute("aria-label","AURA memory fact");
    const remember = document.createElement("button");
    remember.type = "button";
    remember.textContent = "Save this memory";
    remember.disabled = true;
    const memoryItems = document.createElement("ul");
    area.append(title,note,status,question,ask,reply,memoryLabel,memoryInput,remember,memoryItems);
    container.append(area);
    const headers = { "Content-Type": "application/json" };
    async function request(path, opts={}) {
      const response = await fetch(path,{credentials:"same-origin",cache:"no-store",...opts});
      const json = await response.json().catch(()=>({error:"Invalid API response"}));
      if(!response.ok) throw new Error(json.error || "AURA unavailable");
      return json;
    }
    async function refreshMemories() {
      const {memories}=await request("/api/aura/memory");
      memoryItems.replaceChildren();
      for(const m of memories) {
        const li=document.createElement("li");
        const text=document.createElement("span");
        text.textContent=m.fact+" ";
        const del=document.createElement("button");
        del.type="button";del.textContent="Forget";
        del.setAttribute("aria-label","Forget: "+m.fact);
        del.addEventListener("click",async()=>{
          try{
            await request("/api/aura/memory",{method:"DELETE",headers,body:JSON.stringify({id:m.id})});
            await refreshMemories();
            status.textContent="Memory deleted.";
          }catch(err){status.textContent=err.message;}
        });
        li.append(text,del);
        memoryItems.append(li);
      }
    }
    async function init() {
      try {
        const info = await request("/api/aura/status");
        if (!area.isConnected) return;
        status.textContent = "AURA connected ΓÇö "+info.model+" / "+info.mode+".";
        ask.disabled = false;
        remember.disabled = false;
        await refreshMemories();
      } catch {
        if(area.isConnected) status.textContent =
          "AURA's secure backend is not yet connected. The existing Towerflow room remains available.";
      }
    }
    ask.addEventListener("click",async()=>{
      const text=question.value.trim();
      if(text.length<2){status.textContent="Enter a question.";return;}
      ask.disabled=true;status.textContent="AURA is reasoningΓÇª";
      try {
        const data=await request("/api/aura/chat",{method:"POST",headers,body:JSON.stringify({question:text})});
        reply.textContent=data.answer+"\n\nSource: "+(data.sources||[]).join(", ");
        status.textContent="AURA replied.";
      } catch(err){status.textContent=err.message;}
      finally {ask.disabled=false;}
    });
    remember.addEventListener("click",async()=>{
      const fact=memoryInput.value.trim();
      if(fact.length<3){status.textContent="Enter a non-sensitive fact.";return;}
      remember.disabled=true;
      try{
        await request("/api/aura/memory",{method:"POST",headers,body:JSON.stringify({fact})});
        memoryInput.value="";
        await refreshMemories();
        status.textContent="Approved memory saved privately.";
      } catch(err){status.textContent=err.message;}
      finally {remember.disabled=false;}
    });
    init();
  };
}());
// TF_AURA_ROOM_CLIENT_V1_END

// TF_AURA_LIGHTING_V1_BEGIN
// AURA's first controlled world-design tool: local visual preview and approval.
// Does not modify servers, repository, credentials, or multiplayer state.
(function(){
  "use strict";
  const key="towerflow.aura.lighting.v1";
  const themes={
    aurora:{label:"Vibrant Aurora",colors:[0x00ffd1,0x7b61ff,0xff4cc8,0x27a5ff],background:0x11132c,exposure:1.65},
    sunset:{label:"Solar Sunset",colors:[0xff6537,0xffd94a,0xff4fa8,0x9f6bff],background:0x241025,exposure:1.6},
    cyber:{label:"Cyber Spectrum",colors:[0x08f7fe,0xf803fc,0x7bff28,0xffd000],background:0x09132b,exposure:1.55}
  };
  const statusText="AURA can preview and apply a vivid lighting preset in your browser. Preview is reversible; Apply saves your selection for this browser only. Other teammates' lighting is unchanged.";
  let selected=null,committed=null,activeLights=null;
  let baseFog=null,baseBackground=null,baseExposure=null;
  function parseIntent(text) {
    if(typeof text!=="string" || text.length>1200) return null;
    if(!/\b(light|lighting|illuminat|colour|color|vibrant|neon|glow|bright|ambien|saturat|rainbow|aurora)\w*/i.test(text)) return null;
    if(/\b(sunset|sunrise|warm|orange|gold)\b/i.test(text)) return "sunset";
    if(/\b(cyber|rainbow|rgb|arcade)\b/i.test(text)) return "cyber";
    return "aurora";
  }
  function ready() {
    return typeof THREE!=="undefined" && typeof scene!=="undefined" &&
      typeof renderer!=="undefined" && typeof helpPanel==="function";
  }
  function ensureLights() {
    if(activeLights) return;
    baseBackground=scene.background.clone();
    baseFog=scene.fog?.color?.clone()||null;
    baseExposure=renderer.toneMappingExposure;
    activeLights=[];
    // Three atrium accent lights and three matching lights in the second chamber.
    // No alteration of original meshes, walls or movement behavior.
    const locations=[
      [-13,7,0],[12,6,-5],[0,8,8],
      [49,7,-4],[62,8,3],[75,7,-4]
    ];
    locations.forEach(([x,y,z],index)=>{
      const light=new THREE.PointLight(0xffffff,0,19,2);
      light.position.set(x,y,z);
      scene.add(light);
      activeLights.push(light);
    });
  }
  function applyVisual(theme) {
    ensureLights();
    if(!theme || !themes[theme]) {
      activeLights.forEach(light=>{light.intensity=0;light.visible=false;});
      scene.background.copy(baseBackground);
      if(scene.fog?.color && baseFog) scene.fog.color.copy(baseFog);
      renderer.toneMappingExposure=baseExposure;
      selected=null;
      return;
    }
    const preset=themes[theme];
    activeLights.forEach((light,i)=>{
      light.color.setHex(preset.colors[i%preset.colors.length]);
      light.intensity=105;
      light.visible=true;
    });
    scene.background.setHex(preset.background);
    if(scene.fog?.color) scene.fog.color.setHex(preset.background);
    renderer.toneMappingExposure=preset.exposure;
    selected=theme;
  }
  function storedTheme() {
    try {
      const value=localStorage.getItem(key);
      return themes[value] ? value : null;
    } catch { return null; }
  }
  function saveTheme(value) {
    try {
      if(value) localStorage.setItem(key,value);
      else localStorage.removeItem(key);
    } catch {
      // Private browsing can disable storage. Visual preview still works.
    }
  }
  function activateUI() {
    if(!ready()) return;
    committed=storedTheme();
    if(committed) applyVisual(committed);
    const oldHelp=helpPanel;
    helpPanel=function auraLightingHelp() {
      oldHelp();
      const area=document.getElementById("tfAuraArea");
      if(!area || area.querySelector("#tfAuraLighting")) return;
      const panel=document.createElement("section");
      panel.id="tfAuraLighting";
      panel.setAttribute("aria-label","AURA room-design lighting controls");
      const heading=document.createElement("h3");
      heading.textContent="AURA ΓÇö ROOM DESIGN ACTIONS";
      const note=document.createElement("p");
      note.textContent=statusText;
      const choices=document.createElement("div");
      const preview=document.createElement("button");
      preview.type="button";preview.textContent="Preview Aurora lighting";
      const commit=document.createElement("button");
      commit.type="button";commit.textContent="Apply lighting";commit.disabled=true;
      const undo=document.createElement("button");
      undo.type="button";undo.textContent="Revert preview";
      const reset=document.createElement("button");
      reset.type="button";reset.textContent="Restore original lighting";
      const status=document.createElement("p");
      status.setAttribute("role","status");
      status.setAttribute("aria-live","polite");
      function setStatus(text){status.textContent=text;}
      function choose(name) {
        applyVisual(name);
        preview.textContent="Preview "+themes[name].label;
        commit.disabled=false;
        setStatus("Previewing "+themes[name].label+". Click Apply lighting to save it for this browser.");
      }
      for(const [id,preset] of Object.entries(themes)) {
        const button=document.createElement("button");
        button.type="button";button.textContent=preset.label;
        button.addEventListener("click",()=>choose(id));
        choices.append(button);
      }
      preview.addEventListener("click",()=>choose(selected||"aurora"));
      commit.addEventListener("click",()=>{
        if(!selected) return;
        committed=selected;saveTheme(committed);
        commit.disabled=true;
        setStatus("Applied "+themes[committed].label+" locally. Other visitors' views are unchanged.");
      });
      undo.addEventListener("click",()=>{
        applyVisual(committed);
        commit.disabled=true;
        setStatus(committed?"Reverted to saved "+themes[committed].label+".":"Reverted to the original scene.");
      });
      reset.addEventListener("click",()=>{
        committed=null;applyVisual(null);saveTheme(null);commit.disabled=true;
        setStatus("Original Towerflow lighting restored.");
      });
      const question=area.querySelector("textarea");
      const ask=area.querySelector("button");
      if(question && ask) {
        // Runs only after an explicit user interaction. No AI-generated code is executed.
        ask.addEventListener("click",()=>{
          const intent=parseIntent(question.value);
          if(intent) {
            const label=themes[intent].label;
            setStatus("AURA identified a room-lighting request. Choose "+label+
              " above to preview; click Apply lighting to keep it.");
          }
        });
      }
      panel.append(heading,note,choices,preview,commit,undo,reset,status);
      area.append(panel);
      setStatus(committed ? "Saved local theme: "+themes[committed].label : "Original Towerflow lighting is active.");
    };
  }
  if(ready()) activateUI();
}());
// TF_AURA_LIGHTING_V1_END

// TF_FRONTIER_LOBBY_V1_BEGIN
/* TF_FRONTIER_CYBER_AMBIENCE_V1: Non-interactive, instanced perimeter architecture. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowCyberAmbience=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const KEY="towerflow.frontier.cyber-ambience.v1";
  const activeScenes=new WeakMap();
  const box=(x,y,z,w,h,d)=>Object.freeze({x,y,z,w,h,d});
  // The original room is approximately x +/-20.58, z +/-15.28.
  // The wall projection spans +/-9.55m on any wall; leave it unobstructed.
  // AURA's orb near (16.9, 3.1, 12.4) remains clear.
  function layout(){
    const chrome=[],azure=[],violet=[];
    for(const side of [-1,1]){
      const x=side*20.08;
      for(const y of [.18,8.76])chrome.push(box(x,y,0,.075,.085,24));
      chrome.push(box(x,4.5,-12,.12,7.9,.2));
      for(const y of [1.25,2.4,3.55,4.7,5.85,7]){
        azure.push(box(side*19.97,y,-11.98,.035,.26,.06));
      }
      for(const z of [-10,-6,-2,2,6]){
        chrome.push(box(x,8.76,z,.25,.075,.095));
        azure.push(box(side*19.97,8.78,z,.035,.028,.4));
      }
      // Front projection is deliberately kept free of ornamentation.
      for(const y of [1.1,2.55,4,5.45,6.9,8.35]){
        chrome.push(box(side*19.35,y,-15.02,.1,.72,.12));
        violet.push(box(side*19.23,y,-14.94,.028,.21,.035));
      }
    }
    // Back-of-room and technical spine: architectural insets, not overlays.
    chrome.push(box(0,8.74,15.02,36,.075,.09));
    for(const x of [-16,-12,-8,-4,0,4,8,12]){
      chrome.push(box(x,8.75,14.97,.055,.22,.18));
      azure.push(box(x,8.78,14.82,.022,.055,.25));
    }
    // Thin metallic risers; avoid rear-right corner occupied by AURA.
    for(const x of [-18.9,-17.5,-16.1]){
      chrome.push(box(x,3.7,14.94,.095,6.2,.12));
      for(const y of [1.25,2.05,2.85,3.65,4.45,5.25,6.05])
        violet.push(box(x,y,14.82,.052,.10,.034));
    }
    const plans={chrome,azure,violet};
    for(const list of Object.values(plans)){
      for(const p of list){
        if(![p.x,p.y,p.z,p.w,p.h,p.d].every(Number.isFinite)||p.w<=0||p.h<=0||p.d<=0)
          throw Error("Invalid cyber scene geometry");
      }
    }
    return Object.freeze({
      chrome:Object.freeze(chrome),azure:Object.freeze(azure),violet:Object.freeze(violet),
      instances:chrome.length+azure.length+violet.length,drawCallBudget:5
    });
  }
  function install({THREE,scene,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
    if(!THREE?.InstancedMesh||!THREE?.MeshStandardMaterial||!THREE?.Object3D||!scene?.add||!scene?.remove)
      throw Error("Existing Three.js world scene required; no scene replacement");
    if(activeScenes.has(scene))return activeScenes.get(scene);
    const plan=layout();
    const geometry=new THREE.BoxGeometry(1,1,1);
    const materials=[
      new THREE.MeshStandardMaterial({color:0x263c49,metalness:.86,roughness:.27}),
      new THREE.MeshStandardMaterial({color:0x183b4b,metalness:.48,roughness:.30,emissive:0x30b6e8,emissiveIntensity:1.05}),
      new THREE.MeshStandardMaterial({color:0x32213f,metalness:.57,roughness:.35,emissive:0xb14ae3,emissiveIntensity:.68})
    ];
    const group=new THREE.Group();
    group.name="TF_FRONTIER_CYBER_AMBIENCE_V1";
    group.userData.tfDecorativeOnly=true;
    const proxy=new THREE.Object3D();
    const sizes=[plan.chrome,plan.azure,plan.violet];
    sizes.forEach((records,index)=>{
      const instanced=new THREE.InstancedMesh(geometry,materials[index],records.length);
      instanced.name=["CYBER_TITANIUM_BACKBONE","CYBER_FIBER_OPTIC_AZURE","CYBER_FIBER_OPTIC_VIOLET"][index];
      instanced.userData.tfDecorativeOnly=true;
      // Never take wall clicks, E interactions, pointer focus or doorway controls.
      instanced.raycast=()=>{};
      instanced.castShadow=false;
      instanced.receiveShadow=false;
      for(let i=0;i<records.length;i++){
        const p=records[i];
        proxy.position.set(p.x,p.y,p.z);
        proxy.scale.set(p.w,p.h,p.d);
        proxy.updateMatrix();
        instanced.setMatrixAt(i,proxy.matrix);
      }
      instanced.instanceMatrix.needsUpdate=true;
      group.add(instanced);
    });
    // Low-cost additive aura makes strip light visibly bleed beyond thin geometry.
    // A full-screen bloom composer would modify the original renderer and is not injected.
    const haloMaterials=[
      new THREE.MeshBasicMaterial({color:0x31d4ff,transparent:true,opacity:.16,
        blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),
      new THREE.MeshBasicMaterial({color:0xd15bff,transparent:true,opacity:.12,
        blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false})
    ];
    [plan.azure,plan.violet].forEach((records,index)=>{
      const aura=new THREE.InstancedMesh(geometry,haloMaterials[index],records.length);
      aura.name=index?"VIOLET_NEON_HALO":"AZURE_NEON_HALO";
      aura.userData.tfDecorativeOnly=true;aura.raycast=()=>{};
      aura.castShadow=false;aura.receiveShadow=false;
      records.forEach((p,i)=>{
        proxy.position.set(p.x,p.y,p.z);
        proxy.scale.set(Math.max(.09,p.w*3),Math.max(.16,p.h*2),Math.max(.12,p.d*3));
        proxy.updateMatrix();aura.setMatrixAt(i,proxy.matrix);
      });
      aura.instanceMatrix.needsUpdate=true;group.add(aura);
    });
    let enabled=true,lastUpdate=-Infinity,glowIntensity=1;
    try{enabled=storage?.getItem(KEY)!=="off";}catch{enabled=true;}
    group.visible=enabled;
    scene.add(group);
    let disposed=false;
    const controller=Object.freeze({
      setEnabled(value){
        if(disposed)return false;
        enabled=Boolean(value);
        group.visible=enabled;
        try{storage?.setItem(KEY,enabled?"on":"off");}catch{}
        return enabled;
      },
      update(now){
        if(disposed||!enabled||!Number.isFinite(now)||now-lastUpdate<160)return;
        lastUpdate=now;
        // Single soft breathing curve. No extra animation loop, shadow or lights.
        materials[1].emissiveIntensity=glowIntensity*(1.35+.16*Math.sin(now*.00043));
        materials[2].emissiveIntensity=glowIntensity*(1.08+.14*Math.sin(now*.00036+1.1));
        haloMaterials[0].opacity=Math.min(.32,.16*glowIntensity);
        haloMaterials[1].opacity=Math.min(.30,.12*glowIntensity);
      },
      setGlowIntensity(value){
        if(disposed)throw Error("Cyber ambience disposed");
        if(!Number.isFinite(value)||value<0||value>1.6)throw Error("Glow intensity outside validated range");
        glowIntensity=value;return glowIntensity;
      },
      stats(){
        return Object.freeze({enabled,instances:plan.instances,glowIntensity,estimatedExtraDrawCalls:plan.drawCallBudget,
          changesSceneBackground:false,lightsAdded:0,shadowCastersAdded:0,
          clickTargetsAdded:0,newAnimationLoops:0,verifiedFrameRate:null});
      },
      dispose(){
        if(disposed)return;
        disposed=true;scene.remove(group);
        geometry.dispose();[...materials,...haloMaterials].forEach(material=>material.dispose());
        activeScenes.delete(scene);
      }
    });
    activeScenes.set(scene,controller);
    return controller;
  }
  return Object.freeze({layout,install,KEY});
});

/* TF_FRONTIER_CINEMATIC_FIDELITY_V1 — optional original-room PBR detail and reviewed local GLB mounting.
 * Never replaces scene, renderer, controls, lighting, world state, or input handlers.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowCinematicFidelity=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const KEY="towerflow.frontier.cinematic-fidelity.v1";
  const installed=new WeakMap();
  const box=(x,y,z,w,h,d)=>Object.freeze({x,y,z,w,h,d});
  function layout(){
    const chassis=[],signal=[],optics=[];
    // Server-blade housings are inset into the left perimeter; no traversable-floor obstruction.
    for(const z of [-11.2,-8.4,-5.6,-2.8,0,2.8,5.6,8.4]){
      chassis.push(box(-19.82,4.9,z,.09,5.9,1.18));
      for(const y of [2.65,3.14,3.63,4.12,4.61,5.10,5.59,6.08,6.57]){
        chassis.push(box(-19.72,y,z,.12,.20,.95));
        signal.push(box(-19.635,y,z-.29,.045,.035,.16));
        signal.push(box(-19.635,y,z+.29,.045,.035,.16));
      }
    }
    // Back-left optical terminals, outside every projector wall rectangle.
    for(const x of [-18.05,-16.65,-15.25,-13.85]){
      for(const y of [2.1,3.5,4.9,6.3]){
        optics.push(Object.freeze({x,y,z:14.67,r:.19}));
      }
    }
    const safe=p=>p.x>=-20.58&&p.x<=20.58&&p.z>=-15.28&&p.z<=15.28 &&
      !(p.z< -14.7&&Math.abs(p.x)<9.6&&p.y<8.5) &&
      !(Math.abs(p.x)>19.9&&Math.abs(p.z)<9.6&&p.y>1.8&&p.y<8.5) &&
      Math.hypot(p.x-16.9,p.z-12.4)>2;
    // Left-wall blades are a reviewed exception to a generic *screen* corridor:
    // side projection is at +X; this installation is at -X and confined behind -19.6.
    for(const p of [...chassis,...signal,...optics]){
      if(![p.x,p.y,p.z].every(Number.isFinite)||!safe(p))throw Error("Optics intersect protected world zones");
    }
    return Object.freeze({chassis:Object.freeze(chassis),signal:Object.freeze(signal),
      optics:Object.freeze(optics),instances:chassis.length+signal.length+optics.length,
      estimatedDrawCalls:3});
  }
  function approveManifest(m){
    if(!m||typeof m!=="object"||Array.isArray(m))throw Error("Approved asset manifest required");
    if(!/^\/assets\/frontier\/[a-zA-Z0-9_/-]+\.glb$/.test(m.url) ||
       m.url.includes("//")||m.url.includes(".."))
      throw Error("GLB must be an explicitly local Frontier asset");
    if(!/^[a-f0-9]{64}$/i.test(m.sha256))throw Error("Expected SHA-256 is required");
    if(!["owner","licensed","permission","public-domain"].includes(m.rights))
      throw Error("Rights record required");
    if(typeof m.source!=="string"||m.source.length<8||m.source.length>400)
      throw Error("Asset origin required");
    const v=m.position;
    if(!v||![v.x,v.y,v.z].every(Number.isFinite)||v.y<.5||v.y>8.5||
       !(v.x< -19.1 && Math.abs(v.z)<=12 || v.x< -11 && v.z>=14.3&&v.z<=14.85))
      throw Error("GLB placement must be in the reserved decorative perimeter");
    if(m.scale!==undefined && (!Number.isFinite(m.scale)||m.scale<=0||m.scale>3))
      throw Error("Invalid model scale");
    return Object.freeze({url:m.url,sha256:m.sha256.toLowerCase(),rights:m.rights,
      source:m.source,position:Object.freeze({...v}),scale:m.scale??1});
  }
  function assertEmbeddedGLB(data){
    if(!(data instanceof ArrayBuffer)||data.byteLength<20||data.byteLength>25*1024*1024)
      throw Error("Invalid or over-budget GLB");
    const v=new DataView(data);
    if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
       v.getUint32(8,true)!==data.byteLength||v.getUint32(16,true)!==0x4e4f534a)
      throw Error("GLB v2 envelope required");
    const size=v.getUint32(12,true);
    if(size<2||size>1024*1024||20+size>data.byteLength)throw Error("GLB JSON chunk exceeds limit");
    const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,size)).replace(/[\u0000\s]+$/g,""));
    for(const row of [...(meta.buffers||[]),...(meta.images||[])]){
      if(row.uri!==undefined)throw Error("External GLB resource URI prohibited");
    }
    if(meta.extensionsRequired?.some(x=>typeof x!=="string"))throw Error("Invalid GLB extensions");
    return true;
  }
  function install({THREE,scene,renderer,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
    if(!THREE?.InstancedMesh||!THREE?.MeshStandardMaterial||!THREE?.Group||!scene?.add||!scene?.remove)
      throw Error("Original Three.js scene required");
    if(installed.has(scene))return installed.get(scene);
    const plan=layout(),group=new THREE.Group();group.name="TF_FRONTIER_CINEMATIC_FIDELITY_V1";
    group.userData.tfDecorativeOnly=true;
    const physical=THREE.MeshPhysicalMaterial||THREE.MeshStandardMaterial;
    const materials=[
      new physical({color:0x45596a,metalness:.92,roughness:.31,...(THREE.MeshPhysicalMaterial?{clearcoat:.16,clearcoatRoughness:.33}:{})}),
      new THREE.MeshStandardMaterial({color:0x153b51,metalness:.48,roughness:.37,emissive:0x1394d0,emissiveIntensity:.48}),
      new physical({color:0x1f3543,metalness:.72,roughness:.19,emissive:0x399dce,emissiveIntensity:.18,
        ...(THREE.MeshPhysicalMaterial?{clearcoat:.45,clearcoatRoughness:.15}:{})})
    ];
    const geometries=[new THREE.BoxGeometry(1,1,1),new THREE.BoxGeometry(1,1,1),
      new THREE.TorusGeometry(.19,.035,8,24)];
    const specs=[plan.chassis,plan.signal,plan.optics];
    const instance=new THREE.Object3D();
    specs.forEach((rows,k)=>{
      const m=new THREE.InstancedMesh(geometries[k],materials[k],rows.length);
      m.name=["COMPUTE_RACK_CERAMIC_METAL","NETWORK_FIBER_STATUS","OPTICAL_TERMINAL_RINGS"][k];
      m.userData.tfDecorativeOnly=true;m.castShadow=false;m.receiveShadow=false;m.raycast=()=>{};
      rows.forEach((p,i)=>{
        instance.position.set(p.x,p.y,p.z);
        instance.scale.set(p.w||1,p.h||1,p.d||1);
        instance.updateMatrix();
        m.setMatrixAt(i,instance.matrix);
      });
      m.instanceMatrix.needsUpdate=true;group.add(m);
    });
    let enabled=true,disposed=false,stamp=-Infinity;
    try{enabled=storage?.getItem(KEY)!=="off";}catch{}
    group.visible=enabled;scene.add(group);
    const loaded=[];
    const controller={
      setEnabled(flag){
        if(disposed)return false;enabled=Boolean(flag);group.visible=enabled;
        try{storage?.setItem(KEY,enabled?"on":"off");}catch{}
        return enabled;
      },
      update(now){
        if(disposed||!enabled||!Number.isFinite(now)||now-stamp<180)return;
        stamp=now;materials[1].emissiveIntensity=.43+.07*Math.sin(now*.00039);
      },
      async mountGLB({manifest,loader,fetcher=typeof fetch==="function"?fetch:null,cryptoApi=globalThis.crypto}={}){
        if(disposed)throw Error("Fidelity layer disposed");
        const entry=approveManifest(manifest);
        if(!loader||typeof loader.parseAsync!=="function"||typeof fetcher!=="function"||
           typeof cryptoApi?.subtle?.digest!=="function")
          throw Error("GLTFLoader, same-origin fetch and SHA-256 verification required");
        const response=await fetcher(entry.url,{credentials:"same-origin",cache:"no-store"});
        if(!response.ok||response.type==="opaque")throw Error("Asset fetch refused");
        const bytes=await response.arrayBuffer();
        assertEmbeddedGLB(bytes);
        const digest=Array.from(new Uint8Array(await cryptoApi.subtle.digest("SHA-256",bytes)))
          .map(v=>v.toString(16).padStart(2,"0")).join("");
        if(digest!==entry.sha256)throw Error("Asset SHA-256 mismatch");
        if(disposed)throw Error("Fidelity layer disposed");
        const output=await loader.parseAsync(bytes,"/assets/frontier/");
        const model=output?.scene;
        if(!model?.traverse||!model?.position?.set||!model?.scale?.setScalar)
          throw Error("GLB scene missing");
        model.traverse(obj=>{if(obj.isMesh){obj.userData.tfDecorativeOnly=true;obj.raycast=()=>{};
          obj.castShadow=false;obj.receiveShadow=false;}});
        model.position.set(entry.position.x,entry.position.y,entry.position.z);
        model.scale.setScalar(entry.scale);
        model.userData.tfDecorativeOnly=true;
        if(disposed)throw Error("Fidelity layer disposed");
        group.add(model);loaded.push(model);
        return Object.freeze({url:entry.url,rights:entry.rights,source:entry.source,
          sha256:entry.sha256,verifiedBytes:true});
      },
      stats(){
        const gpu=renderer?.info;
        return Object.freeze({enabled,proceduralDetails:plan.instances,
          estimatedAdditionalDrawCalls:plan.estimatedDrawCalls,
          loadedGLB:loaded.length,installedToOriginalScene:true,
          observedRendererCalls:Number.isFinite(gpu?.render?.calls)?gpu.render.calls:null,
          observedRendererTriangles:Number.isFinite(gpu?.render?.triangles)?gpu.render.triangles:null,
          verifiedFrameRate:null,globalLightingChanged:false,newAnimationLoops:0,
          userInputChanged:false,assetsArePhotogrammetry:false});
      },
      dispose(){
        if(disposed)return;disposed=true;scene.remove(group);
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
        // Imported GLB resources are owned by their caller; do not dispose shared materials.
        installed.delete(scene);
      }
    };
    installed.set(scene,controller);
    return controller;
  }
  return Object.freeze({KEY,layout,approveManifest,assertEmbeddedGLB,install});
});

/* TF_FRONTIER_KINETIC_PEDESTALS_V1
 * Four ORIGINAL retractable room exhibits: typed user configuration, deterministic motion,
 * reversible faux-fragment effect. The existing platform and projector lift are not replaced.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TowerflowKineticPedestals=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="towerflow.frontier.kinetic-pedestals.v1";
 const SHAPES=Object.freeze(["original","icosahedron","dodecahedron","octahedron","sphere","cube","torus","torusKnot","cone"]);
 const PATTERNS=Object.freeze(["spin","hover","orbit","figure8","pendulum","helix","static"]);
 const COLORS=Object.freeze({azure:0x4bd8ff,violet:0x9b69ff,magenta:0xff49b5,gold:0xffc85a,emerald:0x57efab,white:0xeafaff});
 const defaults=i=>Object.freeze({shape:"original",pattern:"spin",color:["azure","violet","magenta","gold"][i%4],speed:1,intensity:1});
 function validated(input,i){
   if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid pedestal configuration");
   const allowed=["shape","pattern","color","speed","intensity"];
   if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error("Unknown pedestal setting");
   const merged={...defaults(i),...input};
   if(!SHAPES.includes(merged.shape)||!PATTERNS.includes(merged.pattern)||
      !Object.hasOwn(COLORS,merged.color)||!Number.isFinite(merged.speed)||
      merged.speed<.1||merged.speed>2||!Number.isFinite(merged.intensity)||
      merged.intensity<0||merged.intensity>2)throw Error("Unsupported pedestal setting");
   return Object.freeze(merged);
 }
 function motion(config,now,index){
   if(!Number.isFinite(now)||now<0)throw Error("Invalid monotonic clock");
   const t=now*.001*config.speed+index*.2,s=Math.sin(t),c=Math.cos(t);
   switch(config.pattern){
     case "hover":return {x:0,y:.15*s,z:0,ry:0,rz:0,scale:1};
     case "orbit":return {x:.31*c,y:.10*s,z:.31*s,ry:t,rz:0,scale:1};
     case "figure8":return {x:.33*s,y:.08*Math.cos(t*2),z:.18*Math.sin(t*2),ry:t*.6,rz:0,scale:1};
     case "pendulum":return {x:0,y:0,z:0,ry:0,rz:.33*s,scale:1};
     case "helix":return {x:.24*c,y:.12*s,z:.24*s,ry:t,rz:0,scale:1};
     case "static":return {x:0,y:0,z:0,ry:0,rz:0,scale:1};
     default:return {x:0,y:0,z:0,ry:t*.55,rz:0,scale:1};
   }
 }
 function geometry(THREE,shape){
   switch(shape){
     case "icosahedron":return new THREE.IcosahedronGeometry(.7,1);
     case "dodecahedron":return new THREE.DodecahedronGeometry(.72,0);
     case "octahedron":return new THREE.OctahedronGeometry(.73,0);
     case "sphere":return new THREE.SphereGeometry(.68,32,20);
     case "cube":return new THREE.BoxGeometry(1.12,1.12,1.12);
     case "torus":return new THREE.TorusGeometry(.6,.18,12,40);
     case "torusKnot":return new THREE.TorusKnotGeometry(.45,.13,72,12);
     case "cone":return new THREE.ConeGeometry(.62,1.25,32);
     default:throw Error("Unrecognized shape");
   }
 }
 const live=new WeakMap();
 function install({THREE,platforms,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
   if(!THREE?.InstancedMesh||!THREE?.Object3D||!THREE?.MeshStandardMaterial||
      !Array.isArray(platforms)||platforms.length!==4||
      platforms.some(p=>!p.group?.add||!p.holo?.add||!p.holo?.position))
     throw Error("Four existing Frontier platforms and Three.js required");
   if(live.has(platforms))return live.get(platforms);
   let previous=null;
   try{previous=JSON.parse(storage?.getItem(KEY)||"null");}catch{}
   const rows=platforms.map((p,i)=>{
     const original=p.holo.children.map(child=>{
       const priorMaterial=child.material;
       const priorVisible=child.visible;
       if(priorMaterial?.clone)child.material=priorMaterial.clone();
       return {child,priorMaterial,priorVisible,cloned:child.material!==priorMaterial};
     });
     const shardGeo=new THREE.TetrahedronGeometry(.18,0);
     const shardMat=new THREE.MeshBasicMaterial({color:COLORS.azure,transparent:true,opacity:.85,
       depthWrite:false,blending:THREE.AdditiveBlending});
     const shards=new THREE.InstancedMesh(shardGeo,shardMat,16);
     shards.visible=false;shards.raycast=()=>{};shards.castShadow=false;shards.receiveShadow=false;
     shards.userData.tfDecorativeOnly=true;
     p.group.add(shards);
     p.holo.userData.tfPedestalId=i;
     return {p,original,setting:validated(previous?.[i]||{},i),shards,shardGeo,shardMat,
       custom:null,shatteredAt:-Infinity,origPosition:p.holo.position.clone(),origRotation:p.holo.rotation.clone(),
       origScale:p.holo.scale.clone()};
   });
   let disposed=false;
   const persist=()=>{
     try{storage?.setItem(KEY,JSON.stringify(rows.map(r=>r.setting)));}catch{}
   };
   function updateShape(row){
     if(row.custom){
       row.p.holo.remove(row.custom);
       row.custom.geometry.dispose();row.custom.material.dispose();row.custom=null;
     }
     const useOriginal=row.setting.shape==="original";
     for(const record of row.original){
       record.child.visible=useOriginal&&record.priorVisible;
       const material=record.child.material;
       material?.color?.setHex?.(COLORS[row.setting.color]);
       material?.emissive?.setHex?.(COLORS[row.setting.color]);
       if(material && "emissiveIntensity" in material)
         material.emissiveIntensity=row.setting.intensity*.65;
     }
     if(!useOriginal){
       const mat=new THREE.MeshStandardMaterial({
         color:COLORS[row.setting.color],metalness:.52,roughness:.19,transparent:true,opacity:.94,
         emissive:COLORS[row.setting.color],emissiveIntensity:row.setting.intensity*.55
       });
       row.custom=new THREE.Mesh(geometry(THREE,row.setting.shape),mat);
       row.custom.userData.tfPedestalId=rows.indexOf(row);
       row.p.holo.add(row.custom);
     }
     row.shardMat.color.setHex(COLORS[row.setting.color]);
   }
   rows.forEach(updateShape);
   const dummy=new THREE.Object3D();
   const api={
     configure(index,patch){
       if(disposed)throw Error("Pedestals disposed");
       if(!Number.isInteger(index)||index<0||index>=4)throw Error("Invalid pedestal index");
       const row=rows[index],next=validated({...row.setting,...patch},index);
       row.setting=next;row.shatteredAt=-Infinity;row.shards.visible=false;
       updateShape(row);persist();return Object.freeze({...next});
     },
     reset(index){return api.configure(index,defaults(index));},
     shatter(index,now){
       if(disposed)throw Error("Pedestals disposed");
       if(!Number.isInteger(index)||index<0||index>=4||!Number.isFinite(now))
         throw Error("Invalid shatter request");
       rows[index].shatteredAt=now;
       return true;
     },
     update(now,clearing=0){
       if(disposed||!Number.isFinite(now))return;
       for(let i=0;i<4;i++){
         const r=rows[i],c=r.setting,move=motion(c,Math.max(0,now),i);
         // Do not alter the parent platform's y or original lift animation.
         r.p.holo.position.set(r.origPosition.x+move.x,r.origPosition.y+move.y,r.origPosition.z+move.z);
         r.p.holo.rotation.set(r.origRotation.x,r.origRotation.y+move.ry,r.origRotation.z+move.rz);
         r.p.holo.scale.copy(r.origScale).multiplyScalar(1+(c.pattern==="hover"?.045*Math.sin(now*.002*c.speed):0));
         if(r.custom){r.custom.material.color.setHex(COLORS[c.color]);
           r.custom.material.emissiveIntensity=c.intensity*(.48+.07*Math.sin(now*.0018*c.speed));}
         // Shatter is cosmetic and reversible; suppressed while platforms are descending.
         const delta=now-r.shatteredAt,shattering=clearing<.02&&delta>=0&&delta<1400;
         r.p.holo.visible=!shattering;
         r.shards.visible=shattering;
         if(shattering){
           const travel=delta/1400;
           r.shards.position.copy(r.origPosition);
           r.shardMat.opacity=Math.max(.01,.85*(1-travel));
           for(let j=0;j<16;j++){
             const a=j*2.39996323+ i,spread=.12+travel*1.6;
             dummy.position.set(Math.cos(a)*spread,.16+Math.sin(j*1.5)*spread,Math.sin(a)*spread);
             dummy.scale.setScalar(Math.max(.06,(1-travel)*1.1));
             dummy.rotation.set(travel*(j%3+1),a,travel*(j%4+1));
             dummy.updateMatrix();r.shards.setMatrixAt(j,dummy.matrix);
           }
           r.shards.instanceMatrix.needsUpdate=true;
         }
         // Keep original fixture input disabled during clearing/flight; exact pose restores.
         r.p.holo.userData.tfPedestalSelectable=clearing<.02;
       }
     },
     get(index){
       if(!Number.isInteger(index)||index<0||index>=4)throw Error("Invalid pedestal index");
       return Object.freeze({...rows[index].setting});
     },
     stats(){return Object.freeze({configured:4,shapes:SHAPES.length,patterns:PATTERNS.length,
       totalShardInstances:64,additionalAnimationLoops:0,networkWrites:0,
       originalPlatformLiftPreserved:true,teamSynced:false,verifiedFrameRate:null});},
     dispose(){
       if(disposed)return;disposed=true;
       for(const r of rows){
         if(r.custom){r.p.holo.remove(r.custom);r.custom.geometry.dispose();r.custom.material.dispose();}
         r.p.group.remove(r.shards);r.shardGeo.dispose();r.shardMat.dispose();
         for(const record of r.original){
           if(record.cloned)record.child.material?.dispose?.();
           record.child.material=record.priorMaterial;
           record.child.visible=record.priorVisible;
         }
         r.p.holo.position.copy(r.origPosition);r.p.holo.rotation.copy(r.origRotation);r.p.holo.scale.copy(r.origScale);
         delete r.p.holo.userData.tfPedestalId;delete r.p.holo.userData.tfPedestalSelectable;
       }
       live.delete(platforms);
     }
   };
   live.set(platforms,api);return api;
 }
 return Object.freeze({KEY,SHAPES,PATTERNS,COLORS,defaults,validated,motion,install});
});

/* TF_FRONTIER_NEON_LIGHTING_V1
 * Original photonic ring and circuitry ambience, influenced by vibrant electronic
 * album-lighting design; NOT copied artwork, not a reproduction or branded asset.
 * 4 halo rings + 2 shadowless local PointLights. No renderer/postprocess replacement.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TowerflowNeonLighting=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="towerflow.frontier.neon.v1";
 const PRESETS=Object.freeze({
  "electric-dusk":Object.freeze([0x39dbff,0x845aff,0xff4dbc,0xffb15e]),
  "ember-portal":Object.freeze([0xffa24c,0xff654f,0xffcc6e,0x72cfff]),
  "prismatic":Object.freeze([0x53f1fd,0xeb63fd,0xff4f9e,0xffcf6c]),
  "spectral-blue":Object.freeze([0x3cafff,0x62dfff,0x496dff,0xab8dff]),
  "phoenix-spectrum":Object.freeze([0xff9b3b,0xffdc65,0x49e7ff,0xa259ff])
 });
 const installed=new WeakMap();
 function validate({preset="electric-dusk",intensity=1,reducedMotion=false}={}){
   if(!Object.hasOwn(PRESETS,preset)||!Number.isFinite(intensity)||intensity<0||intensity>1.6||
     typeof reducedMotion!=="boolean")throw Error("Invalid illumination profile");
   return Object.freeze({preset,intensity,reducedMotion});
 }
 function pulse(now,index,{intensity,reducedMotion}){
   if(!Number.isFinite(now))throw Error("Invalid animation clock");
   return intensity*(reducedMotion?1:1+.12*Math.sin(now*.00055+index*.65));
 }
 function install({THREE,platforms,storage=typeof localStorage!=="undefined"?localStorage:null}={}){
   if(!THREE?.MeshBasicMaterial||!THREE?.TorusGeometry||!THREE?.Mesh||!THREE?.Group||
      !THREE?.PointLight||!Array.isArray(platforms)||platforms.length!==4||
      platforms.some(p=>!p.group?.add||!p.group?.remove))throw Error("Existing room platforms and Three.js required");
   if(installed.has(platforms))return installed.get(platforms);
   let initial;try{initial=JSON.parse(storage?.getItem(KEY)||"null");}catch{}
   let config;try{config=validate(initial||{});}catch{config=validate();}
   const layers=[],lights=[],materials=[];
   for(let i=0;i<4;i++){
     const main=new THREE.Group();
     main.name="TF_ORIGINAL_RING_PHOTONIC_AURA_"+i;
     main.position.y=.25;main.rotation.x=Math.PI/2;
     main.userData.tfDecorativeOnly=true;
     const aura=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.13,
       blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,
       toneMapped:false
     });
     const core=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.9,
       blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
     });
     // Layered additive scattering and moving energized arc; visual glow without
     // a renderer-wide bloom composer or changing the original scene exposure.
     const geoOuter=new THREE.TorusGeometry(1.52,.24,10,72);
     const geoCore=new THREE.TorusGeometry(1.5,.045,8,72);
     const geoHaze=new THREE.TorusGeometry(1.52,.43,10,72);
     const geoArc=new THREE.TorusGeometry(1.505,.038,8,48,Math.PI*.64);
     const haze=new THREE.MeshBasicMaterial({
       color:PRESETS[config.preset][i],transparent:true,opacity:.055,
       blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
       depthTest:true,depthWrite:false,toneMapped:false
     });
     const spark=new THREE.MeshBasicMaterial({
       color:0xffffff,transparent:true,opacity:.78,
       blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
     });
     const outer=new THREE.Mesh(geoOuter,aura),inner=new THREE.Mesh(geoCore,core);
     const veil=new THREE.Mesh(geoHaze,haze),arc=new THREE.Mesh(geoArc,spark);
     for(const m of [veil,outer,inner,arc]){
       m.raycast=()=>{};m.castShadow=false;m.receiveShadow=false;
       m.userData.tfDecorativeOnly=true;main.add(m);
     }
     platforms[i].group.add(main);
     layers.push({group:main,geoOuter,geoCore,geoHaze,geoArc,
       outer,inner,veil,arc,aura,core,haze,spark});
     materials.push(aura,core,haze,spark);
     if(i===0||i===3){
       // Actual nearby illumination: no shadows; opt-in intensity is bounded.
       const lamp=new THREE.PointLight(PRESETS[config.preset][i],2.2*config.intensity,5.5,2);
       lamp.position.set(0,1.2,0);lamp.castShadow=false;
       lamp.userData.tfDecorativeOnly=true;platforms[i].group.add(lamp);
       lights.push({lamp,index:i,platform:platforms[i]});
     }
   }
   let disposed=false;
   function setConfig(next){
     if(disposed)throw Error("Neon layer disposed");
     config=validate({...config,...next});
     for(let i=0;i<4;i++){
       const color=PRESETS[config.preset][i];
       layers[i].aura.color.setHex(color);layers[i].core.color.setHex(color);
       layers[i].haze.color.setHex(color);
     }
     for(const {lamp,index} of lights)lamp.color.setHex(PRESETS[config.preset][index]);
     try{storage?.setItem(KEY,JSON.stringify(config));}catch{}
     return config;
   }
   const controller=Object.freeze({
     configure:setConfig,
     update(now,clearing=0){
       if(disposed||!Number.isFinite(now))return;
       const level=Math.max(0,Math.min(1,1-clearing));
       for(let i=0;i<4;i++){
         const p=pulse(now,i,config)*level;
         layers[i].aura.opacity=Math.min(.49,.22*p);
         layers[i].core.opacity=Math.min(1,.97*p);
         layers[i].haze.opacity=Math.min(.13,.072*p);
         layers[i].spark.opacity=Math.min(1,.82*p);
         // Animated energized streak is genuinely in the world, not a UI effect.
         // It is subordinate to the projector and stays hidden during descent.
         layers[i].arc.rotation.z=config.reducedMotion?0:now*.00028*(i%2?1:-1);
         layers[i].group.visible=level>.01;
       }
       for(const {lamp,index} of lights)lamp.intensity=2.2*pulse(now,index,config)*level;
     },
     stats(){return Object.freeze({
       preset:config.preset,intensity:config.intensity,rings:4,
       newLocalLights:lights.length,newShadowCasters:0,extraRaycastTargets:0,
       estimatedMeshDrawCalls:16,newAnimationLoops:0,globalRendererChanges:0,
       bloomComposerAdded:false,verifiedFrameRate:null
     });},
     dispose(){
       if(disposed)return;disposed=true;
       layers.forEach((l,i)=>{
         platforms[i].group.remove(l.group);
         l.geoOuter.dispose();l.geoCore.dispose();l.geoHaze.dispose();l.geoArc.dispose();
       });
       lights.forEach(l=>l.platform.group.remove(l.lamp));
       materials.forEach(m=>m.dispose());
       installed.delete(platforms);
     }
   });
   installed.set(platforms,controller);return controller;
 }
 return Object.freeze({KEY,PRESETS,validate,pulse,install});
});

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

/* TF_FRONTIER_ENVIRONMENT_AUDIO_V1 — selective, idempotent environmental-audio stop control.
 * Audio from team voice/WebRTC, AURA speech, and source-code editor is NOT controlled.
 * To guarantee silence, the actual Sound Garden startAmbience must register its audio
 * sources with this controller, using track(). Never suspend global AudioContexts.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowEnvironmentAudio=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const AUDIO_SELECTOR='audio[data-tf-ambient],video[data-tf-ambient],audio[data-sound-role="environment"],video[data-sound-role="environment"]';
  const BUTTON_SELECTOR='#stopMusic,[data-tf-stop-ambient]';
  function classify(source){
    if(!source||typeof source!=="object")throw Error("Environmental source required");
    if(typeof source.pause==="function"&&"currentTime" in source){
      if(source.srcObject)throw Error("MediaStream tracks must not be registered as ambient");
      return "media";
    }
    if(typeof source.stop==="function"&&(typeof source.isPlaying==="boolean"||typeof source.getVolume==="function"))return "three";
    if(source.gain&&typeof source.gain.setValueAtTime==="function")return "gain";
    if(typeof source.stop==="function")return "source";
    throw Error("Unsupported environment audio source");
  }
  function create({doc=typeof document!=="undefined"?document:null}={}){
    const tracked=new Map();
    let muted=false,disposed=false,stops=0,domBound=false;
    const STORAGE_KEY="towerflow.frontier.environment-muted.v1";
    try{muted=globalThis.localStorage?.getItem(STORAGE_KEY)==="1";}catch{}
    function persist(){try{globalThis.localStorage?.setItem(STORAGE_KEY,muted?"1":"0");}catch{}}
    function stopOne(entry){
      const {source,kind}=entry;
      try{
        if(kind==="media"){
          source.pause();
          try{source.currentTime=0}catch{}
        }else if(kind==="gain"){
          const param=source.gain;
          if(typeof param.cancelScheduledValues==="function")
            param.cancelScheduledValues(source.context?.currentTime??0);
          param.setValueAtTime(0,source.context?.currentTime??0);
        }else if(kind==="three"){
          if(source.isPlaying)source.stop();
          if(typeof source.setVolume==="function")source.setVolume(0);
        }else if(kind==="source"&&!entry.stopped)source.stop();
        entry.stopped=true;return true;
      }catch(error){entry.error=error?.message??"Unknown audio stop failure";return false;}
    }
    function track(source,{role="environment"}={}){
      if(disposed)throw Error("Environment audio controller disposed");
      if(role!=="environment")throw Error("Only explicitly identified environmental sources may be tracked");
      const kind=classify(source);
      if(tracked.has(source))return source;
      const entry={source,kind,stopped:false,error:null,
        originalLevel:kind==="gain"?source.gain.value:
          kind==="three"&&typeof source.getVolume==="function"?source.getVolume():undefined};
      tracked.set(source,entry);
      if(muted)stopOne(entry);
      return source;
    }
    function untrack(source){return tracked.delete(source);}
    function stop(){
      if(disposed)return Object.freeze({stopped:0,errors:0,remaining:0});
      muted=true;persist();let completed=0,errors=0;
      for(const entry of tracked.values()){
        if(stopOne(entry))completed++;else errors++;
      }
      if(doc?.querySelectorAll){
        for(const source of doc.querySelectorAll(AUDIO_SELECTOR)){
          if(source?.srcObject)continue; // Never touch WebRTC voice <audio>.
          if(tracked.has(source))continue;
          try{source.pause?.();if("currentTime" in source)source.currentTime=0;completed++;}
          catch{errors++;}
        }
      }
      stops++;
      return Object.freeze({stopped:completed,errors,remaining:tracked.size,muted});
    }
    function arm(){
      if(disposed)throw Error("Environment audio controller disposed");
      muted=false;persist();
      for(const entry of tracked.values()){
        entry.stopped=false;
        if(typeof entry.originalLevel==="number"&&Number.isFinite(entry.originalLevel)){
          if(entry.kind==="gain")entry.source.gain.setValueAtTime(entry.originalLevel,entry.source.context?.currentTime??0);
          if(entry.kind==="three")entry.source.setVolume?.(entry.originalLevel);
        }
      }
      return true;
    }
    const onClick=e=>{
      if(e.target?.closest?.(BUTTON_SELECTOR))stop();
      else if(e.target?.closest?.('#rain,[data-tf-start-ambient]'))arm();
    };
    function bindButtons(){
      if(!doc?.addEventListener)return false;
      if(!domBound){doc.addEventListener("click",onClick,true);domBound=true;}
      return true;
    }
    function dispose(){
      if(disposed)return;disposed=true;
      if(domBound)doc.removeEventListener("click",onClick,true);
      tracked.clear();domBound=false;
    }
    const ctl=Object.freeze({
      track,untrack,stop,arm,bindButtons,dispose,
      get muted(){return muted},
      stats:()=>Object.freeze({tracked:tracked.size,muted,stopInvocations:stops,
        browserAudioGraphUntouched:true,teamVoiceTracksUntouched:true,
        guaranteedSilenceOnlyForRegisteredSources:true})
    });
    bindButtons();if(muted)stop();return ctl;
  }
  return Object.freeze({AUDIO_SELECTOR,BUTTON_SELECTOR,classify,create});
});

/* TF_PROJECTOR_MACHINE_V1: deterministic, no on-load activation or network access. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowProjectorMachine=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const STAGES=Object.freeze(["IDLE","CLEARING","DESCENDING","BOOT_DELAY","PROJECTING","RETARGETING","RETRACTING","RESTORING"]);
  const DURATIONS=Object.freeze({CLEARING:1500,DESCENDING:3300,BOOT_DELAY:3000,RETARGETING:650,RETRACTING:2300,RESTORING:1500});
  const WALLS=Object.freeze(["front","back","left","right"]);
  const clamp=x=>Math.max(0,Math.min(1,x));
  function create({clock=()=>performance.now(),onChange=()=>{}}={}){
    let stage="IDLE",started=clock(),wall=null,previousWall=null,cleared=0,descended=0,revision=0;
    function transition(next,t){
      stage=next;started=t;revision++;
      onChange({stage,wall,previousWall,revision,at:t});
    }
    function activate(target,t=clock()){
      if(!WALLS.includes(target))return false;
      if(stage==="IDLE"){wall=target;previousWall=null;transition("CLEARING",t);return true;}
      if(stage==="PROJECTING"&&wall!==target){previousWall=wall;wall=target;transition("RETARGETING",t);return true;}
      return false;
    }
    function powerOff(t=clock()){
      if(stage==="IDLE"||stage==="RETRACTING"||stage==="RESTORING")return false;
      // Mid-transition abort safely retracts without showing the portal again.
      tick(t);
      transition("RETRACTING",t);
      return true;
    }
    function tick(now=clock()){
      if(!Number.isFinite(now))throw Error("Invalid animation clock");
      if(now<started)now=started;
      // Consume skipped frames, retaining the exact 3 seconds AFTER descent.
      let guard=0;
      while(stage!=="IDLE"&&stage!=="PROJECTING"&&guard++<8){
        const length=DURATIONS[stage];
        if(now-started<length)break;
        const finish=started+length;
        if(stage==="CLEARING"){cleared=1;transition("DESCENDING",finish);}
        else if(stage==="DESCENDING"){descended=1;transition("BOOT_DELAY",finish);}
        else if(stage==="BOOT_DELAY"){transition("PROJECTING",finish);}
        else if(stage==="RETARGETING"){previousWall=null;transition("PROJECTING",finish);}
        else if(stage==="RETRACTING"){descended=0;transition("RESTORING",finish);}
        else if(stage==="RESTORING"){cleared=0;wall=null;previousWall=null;transition("IDLE",finish);}
      }
      const p=stage==="IDLE"?0:clamp((now-started)/(DURATIONS[stage]||1));
      if(stage==="CLEARING")cleared=p;
      if(stage==="DESCENDING")descended=p;
      if(stage==="RETRACTING")descended=1-p;
      if(stage==="RESTORING")cleared=1-p;
      return Object.freeze({
        stage,wall,previousWall,revision,
        cleared:clamp(cleared),descended:clamp(descended),
        lightOn:stage==="PROJECTING"||stage==="RETARGETING",
        portalEnabled:stage==="PROJECTING",
        retargetProgress:stage==="RETARGETING"?p:1,
        bootRemainingMs:stage==="BOOT_DELAY"?Math.max(0,3000-(now-started)):0
      });
    }
    const snapshot=()=>tick(clock());
    return Object.freeze({activate,powerOff,tick,snapshot,get stage(){return stage;}});
  }
  return Object.freeze({create,STAGES,WALLS,DURATIONS});
});

// Preserves original atrium as FRONTIER lobby; three interactive wall sections.
// Real source editor uses the existing authenticated /api/files and /api/file APIs.
// No OS shell, remote desktop, browser filesystem access, or arbitrary commands.
(function(){
  "use strict";
  if(typeof THREE==="undefined" || typeof scene==="undefined" || typeof stations==="undefined" ||
     typeof renderer==="undefined" || typeof tfRegister!=="function" ||
     typeof openPanel!=="function" || typeof activateTFStation!=="function" ||
     !window.TowerflowProjectorMachine) return;
  const lobbyId="frontier";
  const projectorState=window.TowerflowProjectorMachine.create({clock:()=>performance.now()});
  // Additive photogenic cyber architecture. Decorative mesh never receives wall clicks.
  let cyberAmbience=null;
  try {cyberAmbience=window.TowerflowCyberAmbience?.install({THREE,scene})??null;}
  catch(error){console.warn("Optional Frontier cyber ambience failed; original room preserved:",error?.message);}
  // Versioned, non-interactive 3D PBR rack details and rights-checked GLB fixture support.
  let cinematicFidelity=null;
  try {cinematicFidelity=window.TowerflowCinematicFidelity?.install({THREE,scene,renderer})??null;}
  catch(error){console.warn("Optional Frontier cinematic fidelity failed; original scene preserved:",error?.message);}
  // Physical fixtures from the ORIGINAL room; preserve each object's identity.
  const originalFixtures=scene.children.filter(obj=>{
    if(!obj.isMesh||!obj.geometry?.parameters)return false;
    const p=obj.position,g=obj.geometry.parameters;
    const near=[{x:0,z:-9},{x:-12,z:-7},{x:12,z:-7}].some(d=>Math.abs(p.x-d.x)<2.6&&Math.abs(p.z-d.z)<1.7);
    return near&&p.y>=.2&&p.y<=5.5&&(g.width===undefined||g.width<6)&&(g.depth===undefined||g.depth<4);
  }).map(mesh=>({mesh,y:mesh.position.y,visible:mesh.visible}));
  const frontStations=stations.filter(item=>["ide","ai","work"].includes(item.id)&&item.z< -5)
    .map(item=>({station:item,x:item.x,z:item.z}));

  const darkTheme={background:"#071522",border:"#7ceaff",primary:"#c6efff"};
  const surface=document.createElement("canvas");
  surface.width=1536;surface.height=864;
  const ctx=surface.getContext("2d");
  const texture=new THREE.CanvasTexture(surface);
  texture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(19.1,6.6),new THREE.MeshBasicMaterial({
    map:texture,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
  }));
  screen.position.set(0,5.15,-15.17);
  scene.add(screen);screen.visible=false;
  const bezel=new THREE.Mesh(new THREE.BoxGeometry(19.5,6.95,.16),new THREE.MeshStandardMaterial({
    color:0x10293b,metalness:.7,roughness:.28,emissive:0x105e86,emissiveIntensity:.25
  }));
  bezel.position.set(0,5.15,-15.31);
  scene.add(bezel);bezel.visible=false;
  // No walk-up / collision activation station: the wall click is the only trigger.
  // The original Development Room entrance remains a separate clickable object.
  // Move the existing entry logo out of the projection rectangle.
  if(typeof tfEntrance!=="undefined" && tfEntrance){
    tfEntrance.position.y=8.95;
    tfEntrance.scale.set(1.48,.65,1);
    // The sign remains clickable for the development chamber.
  }
  // Luminous wall entry signs flank the main front-wall dashboard.
  const left=sign("WORLD STUDIO","AURA / ENVIRONMENT DESIGN",-15.2,4.75,-15.19,9.2,3);
  const right=sign("DEVELOPMENT IDE","EDIT / REVIEW / CONTRIBUTE",15.2,4.75,-15.19,9.2,3);
  tfRegister(left,"frontier-world");
  tfRegister(right,"frontier-ide");
  stations.push({id:"frontier-world",label:"WORLD STUDIO",x:-15,z:-12.5});
  stations.push({id:"frontier-ide",label:"DEVELOPMENT IDE",x:15,z:-12.5});
  // Decorative projector: physical body lowers from ceiling to cast an animated cone.
  const projector=new THREE.Group();
  projector.position.set(0,12.0,-1.5);
  scene.add(projector);
  const graphite=new THREE.MeshStandardMaterial({color:0xb8d1e7,metalness:1,roughness:.12});
  const glass=new THREE.MeshStandardMaterial({color:0x7ceaff,emissive:0x34bbff,emissiveIntensity:1.5});
  const housing=new THREE.Mesh(new THREE.BoxGeometry(1.65,.58,1.35),graphite);
  projector.add(housing);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.35,.45,.25,32),glass);
  lens.rotation.x=Math.PI/2;lens.position.set(0,-.05,-.78);projector.add(lens);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1.45,12),graphite);
  arm.position.y=.92;projector.add(arm);
  // Layered spacecraft-inspired projector assembly. Geometry is authored
  // procedurally, NOT represented as a photographic scan or exact spacecraft.
  projector.scale.setScalar(1.42);
  const secondaryMetal=new THREE.MeshStandardMaterial({color:0x9adfff,metalness:.96,roughness:.16});
  const graphiteTrim=new THREE.MeshStandardMaterial({color:0x061424,metalness:.63,roughness:.34});
  const opticGlow=new THREE.MeshStandardMaterial({color:0x5edcfb,metalness:.15,roughness:.08,emissive:0x31afe0,emissiveIntensity:1.4});
  for(const side of [-1,1]){
    const wing=new THREE.Mesh(new THREE.BoxGeometry(1.38,.16,1.52),secondaryMetal);
    wing.position.set(side*1.33,-.02,.11);wing.rotation.z=side*.13;projector.add(wing);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.11,.26,1.8),graphiteTrim);
    edge.position.set(side*2.02,-.03,.14);projector.add(edge);
    const fanHousing=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.16,24),graphiteTrim);
    fanHousing.position.set(side*1.3,.21,.35);projector.add(fanHousing);
    const fanCore=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.2,24),opticGlow);
    fanCore.position.set(side*1.3,.22,.35);projector.add(fanCore);
    for(let i=0;i<3;i++){
      const vent=new THREE.Mesh(new THREE.BoxGeometry(.14,.02,.36),graphiteTrim);
      vent.position.set(side*(.62+i*.22),.34,.26);projector.add(vent);
    }
    const thruster=new THREE.Mesh(new THREE.CylinderGeometry(.22,.32,.42,20),secondaryMetal);
    thruster.rotation.x=Math.PI/2;thruster.position.set(side*1.5,-.12,1.05);projector.add(thruster);
    const flame=new THREE.Mesh(new THREE.CircleGeometry(.17,24),opticGlow);
    flame.position.set(side*1.5,-.12,1.29);projector.add(flame);
  }
  const opticRing=new THREE.Mesh(new THREE.TorusGeometry(.53,.065,12,40),secondaryMetal);
  opticRing.position.set(0,-.06,-.94);projector.add(opticRing);
  const opticGlass=new THREE.Mesh(new THREE.SphereGeometry(.31,28,20),opticGlow);
  opticGlass.scale.set(1,1,.43);opticGlass.position.set(0,-.05,-.93);projector.add(opticGlass);
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(.84,.16,1.36),graphiteTrim);
  bridge.position.set(0,.41,.1);projector.add(bridge);
  const navigation=new THREE.PointLight(0x59daff,.55,6);
  navigation.position.set(0,.48,-.3);projector.add(navigation);
  const beam=new THREE.SpotLight(0x81d8ff,0,35,Math.PI/6,.7,1);
  beam.position.set(0,10,-1.5);
  beam.target.position.set(0,5.1,-15.2);
  scene.add(beam,beam.target);
  const coneMaterial=new THREE.MeshBasicMaterial({color:0x69c9ff,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(6.8,13,28,1,true),coneMaterial);
  cone.position.set(0,6.2,-8);
  cone.rotation.x=Math.PI/2;
  scene.add(cone);
  let projection=0,projectionOn=false,currentTab="OVERVIEW",isPanel=false;
  // Cinematic projector aperture and descending display platforms, visual only.
  // Kept separate from gameplay, so Dev Room portals and controls are unchanged.
  const iris=new THREE.Group();iris.position.set(0,11.85,-1.5);scene.add(iris);
  const irisParts=[];
  const aperture=new THREE.Mesh(new THREE.CircleGeometry(3.98,64),
    new THREE.MeshBasicMaterial({color:0x010710,side:THREE.DoubleSide,depthWrite:false}));
  aperture.rotation.x=Math.PI/2;aperture.position.y=-.035;aperture.scale.setScalar(.001);
  iris.add(aperture);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(4,.085,12,64),
    new THREE.MeshStandardMaterial({color:0x66c9ff,emissive:0x2f95de,emissiveIntensity:1.2,metalness:.75,roughness:.18}));
  rim.rotation.x=Math.PI/2;rim.position.y=-.055;rim.scale.setScalar(.001);
  iris.add(rim);

  const irisMaterial=new THREE.MeshStandardMaterial({color:0x17354a,metalness:.82,roughness:.26,side:THREE.DoubleSide});
  for(let i=0;i<8;i++){
    const wedge=new THREE.Mesh(new THREE.RingGeometry(.28,4.1,10,1,i*Math.PI/4,Math.PI/4-.025),irisMaterial);
    wedge.rotation.x=-Math.PI/2;
    iris.add(wedge);irisParts.push(wedge);
  }
  // TF_FRONTIER_DISPLAY_LIFT_V2: the visible platforms, their pedestals and
  // holographic displays form ONE movable assembly. Previous code only lowered
  // decorative pads: other front-of-board objects looked stationary.
  const platforms=[];
  const displayMaterial=new THREE.MeshStandardMaterial({
    color:0x49cfff,metalness:.18,roughness:.12,transparent:true,opacity:.86,
    emissive:0x168dcf,emissiveIntensity:1.7,depthWrite:false
  });
  const orbTextureCanvas=document.createElement("canvas");
  orbTextureCanvas.width=512;orbTextureCanvas.height=256;
  const orbContext=orbTextureCanvas.getContext("2d");
  const orbTexture=new THREE.CanvasTexture(orbTextureCanvas);
  function labelOrb(text){
    orbContext.clearRect(0,0,512,256);
    orbContext.fillStyle="#e7faff";
    orbContext.font="bold 96px Segoe UI,Arial";
    orbContext.textAlign="center";
    orbContext.shadowColor="#42d9ff";orbContext.shadowBlur=24;
    orbContext.fillText(text,256,153);
    orbTexture.needsUpdate=true;
  }
  labelOrb("AURA");
  const orb=new THREE.Group();
  const orbBody=new THREE.Mesh(new THREE.SphereGeometry(.95,48,32),displayMaterial);
  orb.add(orbBody);
  const orbGlow=new THREE.PointLight(0x36cfff,1.25,6);
  orb.add(orbGlow);
  const orbHalo=new THREE.Mesh(new THREE.TorusGeometry(1.18,.045,12,70),
    new THREE.MeshBasicMaterial({color:0x50ddff,transparent:true,opacity:.9,depthWrite:false}));
  orb.add(orbHalo);
  const orbText=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.95),
    new THREE.MeshBasicMaterial({map:orbTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  orbText.position.z=.97;orb.add(orbText);
  let orbAgent="AURA";
  // AURA orb occupies the opposite corner; it is no longer carried by a floor platform.
  orb.position.set(16.9,3.1,12.4);scene.add(orb);
  // The four platform assemblies are renderer-owned.
  for(const [i,x] of [-5.7,-1.9,1.9,5.7].entries()){
    const pad=new THREE.Group();
    pad.position.set(x,0,-3.3);
    const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.65,.24,48),
      new THREE.MeshStandardMaterial({color:0x102a42,metalness:.84,roughness:.26,
        emissive:0x0b5875,emissiveIntensity:.5}));
    platform.position.y=.11;pad.add(platform);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(1.5,.07,10,56),
      new THREE.MeshBasicMaterial({color:0x43d9ff}));
    rim.rotation.x=Math.PI/2;rim.position.y=.25;pad.add(rim);
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.22,.5,.85,24),
      new THREE.MeshStandardMaterial({color:0x152d42,metalness:.75,roughness:.24}));
    pedestal.position.y=.5;pad.add(pedestal);
    const holo=new THREE.Group();holo.position.y=1.6;
    if(i===0){
      holo.add(new THREE.Mesh(new THREE.TorusGeometry(.7,.1,16,56),displayMaterial));
    }else{
      const shape=i===1?new THREE.IcosahedronGeometry(.64,1):
        i===2?new THREE.TorusKnotGeometry(.45,.14,70,10):
          new THREE.OctahedronGeometry(.68,1);
      const crystal=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({
        color:0x6adfff,wireframe:i===3,metalness:.4,roughness:.2,transparent:true,
        opacity:.78,emissive:0x189bdd,emissiveIntensity:1.1
      }));
      holo.add(crystal);
    }
    pad.add(holo);scene.add(pad);
    platforms.push({group:pad,holo,baseY:0,homeX:x});
  }
  // Original retractable displays now support configurable geometry, kinetic patterns,
  // colors and reversible fracture effects. The lift owns platform position.
  let kineticPedestals=null,neonLighting=null,teamChatDock=null,environmentAudio=null;
  try {kineticPedestals=window.TowerflowKineticPedestals?.install({THREE,platforms})??null;}
  catch(error){console.warn("Optional kinetic pedestal controls unavailable:",error?.message);}
  try {neonLighting=window.TowerflowNeonLighting?.install({THREE,platforms})??null;}
  catch(error){console.warn("Optional photonic illumination unavailable:",error?.message);}
  try {teamChatDock=window.TowerflowTeamChatDock?.install({doc:document})??null;}
  catch(error){console.warn("Optional C-key team chat dock unavailable:",error?.message);}
  // Existing Sound Garden's #stopMusic button is dynamic. Capture its click
  // and stop ONLY explicitly tagged ambient sources, never teammates' voice.
  // The original stopAmbience() handler remains in place. To guarantee silence,
  // host Sound Garden source creation must be registered through trackAmbientAudio.
  try {environmentAudio=window.TowerflowEnvironmentAudio?.create({doc:document})??null;}
  catch(error){console.warn("Optional Sound Garden audio gate unavailable:",error?.message);}
  // Explicit Sound Garden integration contract. Call trackAmbientAudio(source)
  // at each environmental source creation site, not for voice, speech or editor audio.
  // Expose the stop and resume operations to the original environment UI.
  const trackAmbientAudio=(source)=>environmentAudio?.track(source,{role:"environment"});
  const stopEnvironmentAudio=()=>environmentAudio?.stop();
  const resumeEnvironmentAudio=()=>environmentAudio?.arm();


  // Source-matched to the original uploaded live-room client contract:
  // original ws sends {type:'chat',text} and receives {type:'chat',id,text}.
  // Attach a SECOND listener to the EXISTING authenticated socket. Never create
  // another WebSocket, override ws.onmessage, or bypass member authorization.
  if(teamChatDock&&typeof send==="function"&&typeof ws!=="undefined"&&
     typeof remote!=="undefined"){
    const subscribers=new Set();
    let socket=null,checkTimer=null;
    const onExistingChat=(event)=>{
      let data;try{data=JSON.parse(event.data);}catch{return;}
      if(data?.type!=="chat"||typeof data.text!=="string")return;
      const author=remote.get(data.id)?.user?.login||"Teammate";
      for(const fn of subscribers)fn({author,text:data.text,time:Date.now()});
    };
    const observeSocket=()=>{
      if(typeof ws==="undefined"||ws===socket)return;
      socket?.removeEventListener?.("message",onExistingChat);
      socket=ws;
      socket?.addEventListener?.("message",onExistingChat);
    };
    teamChatDock.attachTransport({
      subscribe(fn){
        subscribers.add(fn);observeSocket();
        if(!checkTimer)checkTimer=setInterval(observeSocket,800);
        return ()=>{
          subscribers.delete(fn);
          if(!subscribers.size){
            clearInterval(checkTimer);checkTimer=null;
            socket?.removeEventListener?.("message",onExistingChat);
            socket=null;
          }
        };
      },
      async send(text){
        observeSocket();
        if(!localUser?.login||!socket||socket.readyState!==WebSocket.OPEN)
          throw Error("Sign in and reconnect to the original team room");
        if(typeof text!=="string"||text.trim().length>140)
          throw Error("Original room chat limit is 140 characters");
        const outbound=text.trim();
        send({type:"chat",text:outbound});
        // The original protocol has no delivery receipt; mark the local echo
        // as submitted, NOT verified delivered or acknowledged by teammates.
        for(const fn of subscribers)fn({
          author:localUser.login+" • submitted",text:outbound,self:true,time:Date.now()
        });
      }
    });
  }
  function setOrbAgent(agent){
    if(agent!=="AURA"&&agent!=="FLOW")return false;
    orbAgent=agent;labelOrb(agent);return true;
  }
  let towerflowReveal=0,towerflowRevealStarted=0;
  // Four walk-up 3D tabs are hidden until the ceiling projector lands.
  // Their panels open the ACTUAL TowerFlow app, never a counterfeit dashboard.
  const towerflowTabs=[
    ["inventory","INVENTORY",-6.15],
    ["revenue","REVENUE",-2.05],
    ["finance","STOCK MARKET",2.05],
    ["business","START HERE",6.15]
  ];
  const tabMeshes=[];
  for(const [tab,label,x] of towerflowTabs){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
    const c=canvas.getContext("2d");
    c.fillStyle="#071a2d";c.fillRect(0,0,512,256);
    c.strokeStyle="#46dcff";c.lineWidth=17;c.strokeRect(8,8,496,240);
    c.fillStyle="#e5fcff";c.font="bold 42px Segoe UI,Arial";c.textAlign="center";
    c.fillText(label,256,122);
    c.font="24px Segoe UI,Arial";c.fillText("WALK UP / CLICK TO ENTER",256,184);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(3.48,3.4,.27),
      new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),emissive:0x085b78,emissiveIntensity:.6,metalness:.45,roughness:.28}));
    mesh.position.set(x,3.9,-12.45);mesh.visible=false;scene.add(mesh);
    tfRegister(mesh,"frontier-towerflow-"+tab);
    tabMeshes.push({mesh,tab,x});
  }
  let towerflowDesiredTab="inventory",lastTabEnter=0;

  const wallLayout={
    front:{x:0,z:-15.28,ry:0,w:39},back:{x:0,z:15.28,ry:Math.PI,w:39},
    left:{x:-20.58,z:0,ry:Math.PI/2,w:29},
    right:{x:20.58,z:0,ry:-Math.PI/2,w:29}
  };
  const wallTargets=[];
  for(const [id,w] of Object.entries(wallLayout)){
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w.w,9.8),
      new THREE.MeshBasicMaterial({color:0x00ffff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    face.position.set(w.x,5.25,w.z);face.rotation.y=w.ry;
    face.userData.tfWall=id;scene.add(face);wallTargets.push(face);
  }
  function aimAtWall(id){
    const w=wallLayout[id];if(!w)return;
    const normal=new THREE.Vector3(Math.sin(w.ry),0,Math.cos(w.ry));
    const edge=new THREE.Vector3(Math.cos(w.ry),0,-Math.sin(w.ry));
    screen.position.set(w.x+normal.x*.08,5.15,w.z+normal.z*.08);
    bezel.position.set(w.x-normal.x*.03,5.15,w.z-normal.z*.03);
    screen.rotation.y=w.ry;bezel.rotation.y=w.ry;
    for(const tile of tabMeshes){
      tile.mesh.position.set(
        w.x+normal.x*.4+edge.x*tile.x,3.9,
        w.z+normal.z*.4+edge.z*tile.x);
      tile.mesh.rotation.y=w.ry;
    }
    const target=new THREE.Vector3(w.x,5.15,w.z);
    const source=new THREE.Vector3(0,5.4,-1.5);
    beam.target.position.copy(target);
    const direction=target.clone().sub(source);
    projector.rotation.y=Math.atan2(-direction.x,-direction.z);
    const length=direction.length();
    cone.position.copy(source.clone().add(target).multiplyScalar(.5));
    cone.scale.set(1,length/13,1);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  }
  function startWallProjection(id){
    const state=projectorState.tick(performance.now());
    if(state.stage==="IDLE"){
      if(projectorState.activate(id)){aimAtWall(id);showToast("Projector: clearing workstation zone");}
    }else if(state.stage==="PROJECTING"&&state.wall!==id){
      if(projectorState.activate(id)){aimAtWall(id);showToast("Projector: switching to "+id+" wall");}
    }
  }
  function projectorSettings(){
    const current=projectorState.tick(performance.now());
    if(current.stage==="IDLE")return;
    openPanel("towerflow-projector");
    document.getElementById("panelTitle").textContent="PROJECTOR • CONTROLS";
    const root=document.getElementById("panelContent");root.replaceChildren();
    root.append(makeEl("p","Beam theme and power. Floor workstations retain their original state and interactions when raised."));
    for(const [label,color] of [["AZURE",0x81d8ff],["ROYAL BLUE",0x476dff],["MAGENTA",0xf13ed3],["GOLD",0xf2c15a]]){
      const button=makeEl("button",label);button.type="button";
      button.onclick=()=>{beam.color.setHex(color);cone.material.color.setHex(color);showToast("Projector: "+label);};
      root.append(button);
    }
    const off=makeEl("button","POWER OFF / RESTORE FLOOR");off.type="button";
    off.onclick=()=>{projectorState.powerOff();closePanel();showToast("Projector retracting");};
    root.append(off);
  }

  const titles=["OVERVIEW","REPOSITORY","TEAM","TASKS","AURA"];
  const metrics={branch:"dev",files:"—",members:"—",state:"READY"};
  function fit(text,max=52){return String(text||"").slice(0,max);}
  function draw(){
    const w=surface.width,h=surface.height;
    const gradient=ctx.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,"#071424");gradient.addColorStop(1,"#0c3452");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.lineWidth=13;ctx.strokeStyle="#25caeb";ctx.strokeRect(19,19,w-38,h-38);
    ctx.fillStyle="#80eaff";ctx.font="bold 76px Segoe UI, Arial";ctx.textAlign="left";
    ctx.fillText("FRONTIER  /  TOWERFLOW",78,145);
    ctx.font="32px Segoe UI, Arial";ctx.fillStyle="#b8d0dd";
    ctx.fillText("TEAM 02     •     LIVE COLLABORATION CONTROL CENTER",82,201);
    titles.forEach((label,i)=>{
      const x=85+i*280,y=274;
      ctx.fillStyle=label===currentTab?"#2dbad6":"#173b52";
      ctx.fillRect(x,y,262,65);
      ctx.fillStyle="#f4fbff";ctx.font="bold 28px Segoe UI, Arial";ctx.textAlign="center";
      ctx.fillText(label,x+131,y+43);
    });
    ctx.textAlign="left";
    ctx.fillStyle="#e8f9ff";ctx.font="bold 54px Segoe UI, Arial";
    ctx.fillText(currentTab==="OVERVIEW"?"ONE WORLD • THREE DESTINATIONS":currentTab+"  /  LIVE VIEW",86,442);
    ctx.font="33px Segoe UI, Arial";ctx.fillStyle="#a9d6e6";
    const lines={
      OVERVIEW:["DASHBOARD PROJECTOR  →  LIVE ROOM OPERATIONS","DEVELOPMENT IDE  →  SHARED REPOSITORY","WORLD STUDIO  →  AURA + DESIGN TOOLS"],
      REPOSITORY:["GITHUB  /  COS229-239 / 2610_TEAM02","CURRENT BRANCH: "+fit(metrics.branch,22),"TRACKED FILES: "+metrics.files],
      TEAM:["AUTHENTICATED COLLABORATORS ONLY","MEMBERS: "+metrics.members,"INVITE AND VOICE PORTAL AVAILABLE"],
      TASKS:["TEAM TASK BOARD + MILESTONES","LOCAL BOARD IN CURRENT RELEASE","CONNECT TRELLO FOR TEAM-SHARED TASKS"],
      AURA:["QWEN3 WORLD ASSISTANT + PERSISTENT MEMORY","PROJECT CHANGES REQUIRE REVIEW","ENVIRONMENT TOOLS: WORLD STUDIO"]
    }[currentTab];
    lines.forEach((line,i)=>ctx.fillText(fit(line,70),92,520+i*79));
    ctx.fillStyle="#52ddff";ctx.fillRect(87,778,1360,5);
    ctx.fillStyle="#bedfe8";ctx.font="25px Segoe UI, Arial";
    ctx.fillText("APPROACH + PRESS E, OR CLICK THE SCREEN TO OPEN INTERACTIVE DASHBOARD",86,830);
    texture.needsUpdate=true;
  }
  draw();
  async function updateMetrics() {
    try {
      const g=await api("/api/git/status");
      metrics.branch=g.branch||"unknown";
      draw();
    } catch {metrics.branch="not available";}
    try {
      const r=await api("/api/files");
      metrics.files=Array.isArray(r)?String(r.length):"—";
      draw();
    } catch {}
    try {
      const m=await api("/api/members");
      metrics.members=Array.isArray(m)?String(m.length):"—";
      draw();
    } catch {}
  }
  function makeEl(tag,text,cls){
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    if(cls)el.className=cls;
    return el;
  }
  function renderDashboard(){
    const root=document.getElementById("panelContent");
    if(!root)return;
    root.replaceChildren();
    const app=makeEl("section",undefined,"tf-frontier-dash");
    app.style.cssText="color:#e8f8ff;background:linear-gradient(125deg,#0b1c30,#0c3348);padding:20px;border:2px solid #2bc9e9;border-radius:10px;min-height:60vh";
    const heading=makeEl("h2","FRONTIER • TEAM 02");
    heading.style.color="#8feaff";
    app.append(heading,makeEl("p","Projected wall dashboard • GitHub-gated collaboration"));
    const nav=makeEl("div");
    nav.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin:15px 0";
    for(const tab of titles){
      const button=makeEl("button",tab);
      button.type="button";button.setAttribute("aria-pressed",String(tab===currentTab));
      button.onclick=()=>{currentTab=tab;draw();renderDashboard();};
      nav.append(button);
    }
    app.append(nav);
    const content=makeEl("div");
    app.append(content);
    if(currentTab==="OVERVIEW"){
      content.append(makeEl("p","Click a room wall to activate the TowerFlow projector before entering the app."));
      content.append(makeEl("h3","THREE WORLD SECTIONS"));
      const zones=[
        ["Towerflow Gateway","Click any wall to deploy the interactive projector.",()=>{closePanel();showToast("Click a room wall to deploy the projector");}],
        ["Development","Enter the preserved four-station Development Room.",()=>{tfTeleport(true);}],
        ["World Studio","AURA, world knowledge and visual design.",()=>{openPanel("help");}]
      ];
      for(const [title,description,action] of zones){
        const card=makeEl("div");card.style.cssText="border:1px solid #327b9b;padding:13px;margin:9px 0;border-radius:7px";
        const button=makeEl("button","OPEN "+title.toUpperCase());button.onclick=action;
        card.append(makeEl("strong",title),makeEl("p",description),button);content.append(card);
      }
    }else if(currentTab==="REPOSITORY"){
      content.append(makeEl("p","Source of truth: Cos229-239/2610_Team02. Editing the host checkout does not automatically commit/push."));
      content.append(makeEl("p","Current local branch: "+metrics.branch+" • Tracked files visible: "+metrics.files));
      const webide=makeEl("a","Open real browser IDE (github.dev) ↗");
      webide.href="https://github.dev/Cos229-239/2610_Team02";
      webide.target="_blank";webide.rel="noopener noreferrer";
      content.append(webide,makeEl("br"));
      const codespace=makeEl("a","CREATE ISOLATED CODSPACE / RUN + DEBUG ↗");
      codespace.href="https://codespaces.new/Cos229-239/2610_Team02";
      codespace.target="_blank";codespace.rel="noopener noreferrer";
      content.append(codespace,makeEl("br"));
      const open=makeEl("button","OPEN IN-ROOM SOURCE EDITOR");open.onclick=openFrontierIDE;content.append(open);
    }else if(currentTab==="TEAM"){
      content.append(makeEl("p","GitHub collaborators can enter with approved access. Members with write permission can edit tracked source files; all changes require review before production."));
      const button=makeEl("button","TEAM PORTAL / INVITES / VOICE");button.onclick=()=>openPanel("team");content.append(button);
      content.append(makeEl("p","Collaborators: "+metrics.members));
    }else if(currentTab==="TASKS"){
      const button=makeEl("button","OPEN TASK BOARD");button.onclick=()=>openPanel("work");content.append(button);
      content.append(makeEl("p","Current tasks are browser-local; project-wide sharing needs a backend or Trello integration."));
    }else if(currentTab==="AURA"){
      const button=makeEl("button","OPEN AURA WORLD STUDIO");button.onclick=()=>openPanel("help");content.append(button);
      content.append(makeEl("p","AURA can explain and propose. Use approved actions for actual world changes."));
    }
    root.append(app);
    updateMetrics();
  }
  function openBusinessPanel(tab="inventory"){
    if(typeof tab!=="string"||!["inventory","revenue","finance","business"].includes(tab))tab="inventory";
    towerflowDesiredTab=tab;
    if(projectorState.tick(performance.now()).stage!=="PROJECTING")return;
    isPanel=true;
    openPanel("towerflow-business");
    const panel=document.getElementById("panel");
    panel.style.width="min(98vw,1650px)";panel.style.maxWidth="98vw";
    document.getElementById("panelTag").textContent="TOWERFLOW / IMMERSIVE BUSINESS PRODUCT";
    document.getElementById("panelTitle").textContent="INVENTORY • REVENUE • MARKETS • BUSINESS";
    const root=document.getElementById("panelContent");root.replaceChildren();
    const controls=makeEl("div");
    controls.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:12px";
    const back=makeEl("button","FRONTIER CONTROL CENTER");back.type="button";back.onclick=openDashboard;
    const info=makeEl("p","A real, interactive TowerFlow application. Inventory figures are illustrative until imported; finance and theme settings remain available. Local browser data is not shared with teammates.");
    controls.append(back);root.append(controls,info);
    const frame=document.createElement("iframe");
    frame.title="TowerFlow Business Inventory and Financial Portfolio";
    frame.src="/towerflow/index.html?tab="+encodeURIComponent(tab);
    frame.referrerPolicy="same-origin";
    frame.style.cssText="display:block;width:100%;height:min(76vh,950px);min-height:480px;border:2px solid #29c9e6;border-radius:10px;background:#071523";
    root.append(frame);
  }
  function openDashboard(){
    isPanel=true;openPanel("frontier");
    document.getElementById("panelTag").textContent="FRONTIER PROJECTOR";
    document.getElementById("panelTitle").textContent="INTERACTIVE DASHBOARD";
    const panel=document.getElementById("panel");
    panel.style.width="min(96vw,1300px)";
    panel.style.maxWidth="96vw";
    renderDashboard();
  }
  // Every exhibit has its own maintained preset; shattering is purely visual.
  // Settings use the original world UI; user-local until trusted shared-world sync is wired.
  function openPedestalSettings(index){
    if(!kineticPedestals||!Number.isInteger(index)||index<0||index>=4)return false;
    if(projectorState.tick(performance.now()).cleared>.02)return false;
    isPanel=true;openPanel("frontier-pedestal");
    document.getElementById("panelTag").textContent="FRONTIER / COMPUTATIONAL EXHIBITS";
    document.getElementById("panelTitle").textContent="KINETIC MATRIX • "+String(index+1).padStart(2,"0");
    const root=document.getElementById("panelContent");root.replaceChildren();
    const intro=makeEl("p","Customizable 3D geometry, motion and illumination. Changes persist on this browser; authenticated shared-room replication requires a reviewed backend event.");
    root.append(intro);
    const current=kineticPedestals.get(index);
    for(const [field,values] of [
      ["shape",window.TowerflowKineticPedestals.SHAPES],
      ["pattern",window.TowerflowKineticPedestals.PATTERNS],
      ["color",Object.keys(window.TowerflowKineticPedestals.COLORS)]
    ]){
      const wrap=makeEl("label",field.toUpperCase()+" ");
      const select=makeEl("select");select.setAttribute("aria-label","Pedestal "+field);
      for(const value of values){
        const opt=makeEl("option",value);opt.value=value;opt.selected=current[field]===value;
        select.append(opt);
      }
      select.onchange=()=>{kineticPedestals.configure(index,{[field]:select.value});};
      wrap.append(select);wrap.style.cssText="display:inline-flex;flex-direction:column;gap:5px;margin:10px";
      root.append(wrap);
    }
    for(const [field,min,max,step] of [["speed",.1,2,.1],["intensity",0,2,.1]]){
      const wrap=makeEl("label",field.toUpperCase()+" ");
      const slider=makeEl("input");slider.type="range";slider.min=String(min);slider.max=String(max);
      slider.step=String(step);slider.value=String(current[field]);slider.setAttribute("aria-label","Pedestal "+field);
      const value=makeEl("span",String(current[field]));
      slider.oninput=()=>{value.textContent=slider.value;kineticPedestals.configure(index,{[field]:Number(slider.value)});};
      wrap.append(slider,value);wrap.style.cssText="display:inline-flex;flex-direction:column;gap:5px;margin:10px";
      root.append(wrap);
    }
    const row=makeEl("div");row.style.cssText="display:flex;flex-wrap:wrap;gap:10px;margin-top:15px";
    const fragment=makeEl("button","FRACTURE / REFORM");
    fragment.onclick=()=>{kineticPedestals.shatter(index,performance.now());closePanel();showToast("Kinetic exhibit "+(index+1)+" • reversible fracture");};
    const reset=makeEl("button","RESTORE DEFAULT GEOMETRY");
    reset.onclick=()=>{kineticPedestals.reset(index);openPedestalSettings(index);};
    const light=makeEl("button","PHOTONIC LIGHTING");
    light.onclick=()=>{
      if(!neonLighting)return;
      const presets=Object.keys(window.TowerflowNeonLighting.PRESETS);
      const now=neonLighting.stats().preset,idx=presets.indexOf(now);
      const next=presets[(idx+1)%presets.length];
      neonLighting.configure({preset:next});
      showToast("Illumination • "+next);
    };
    row.append(fragment,reset,light);root.append(row);
    // Separate opt-in visual controls; does not alter projector, ceiling, browser
    // renderer exposure, scene materials outside these two decorative layers.
    for(const [title,layer,maximum] of [
      ["RING LUMINANCE",neonLighting,1.6],
      ["CIRCUIT LUMINANCE",cyberAmbience,1.6]
    ]){
      if(!layer)continue;
      const available=layer.stats(),valueNow=title==="RING LUMINANCE"?available.intensity:available.glowIntensity;
      if(!Number.isFinite(valueNow))continue;
      const label=makeEl("label",title+" ");
      label.style.cssText="display:flex;align-items:center;gap:12px;margin:10px 0;color:#d5f6ff";
      const slider=makeEl("input");slider.type="range";slider.min="0";slider.max=String(maximum);
      slider.step=".05";slider.value=String(valueNow);slider.setAttribute("aria-label",title);
      const amount=makeEl("span",Number(valueNow).toFixed(2));
      slider.oninput=()=>{
        const next=Number(slider.value);amount.textContent=next.toFixed(2);
        if(title==="RING LUMINANCE")layer.configure({intensity:next});
        else layer.setGlowIntensity(next);
      };
      label.append(slider,amount);root.append(label);
    }
    return true;
  }
  function pedestalPick(ray){
    if(!kineticPedestals||projectorState.tick(performance.now()).cleared>.02)return false;
    const hits=ray.intersectObjects(platforms.map(p=>p.group),true);
    const nearest=hits.find(hit=>hit.distance<=13&&hit.object?.visible!==false);
    if(!nearest)return false;
    const index=platforms.findIndex(p=>{
      let parent=nearest.object;
      while(parent){if(parent===p.group)return true;parent=parent.parent;}
      return false;
    });
    return index>=0&&openPedestalSettings(index);
  }
  let filePaths=[],chosenFile=null,originalCode="",editingDirty=false;
  function openFrontierIDE(){
    isPanel=true;openPanel("ide");
    document.getElementById("panelTitle").textContent="FRONTIER DEVELOPMENT • BROWSER IDE";
    const panel=document.getElementById("panel");
    panel.style.width="min(98vw,1520px)";panel.style.maxWidth="98vw";
    const root=document.getElementById("panelContent");
    root.replaceChildren();
    const top=makeEl("section");top.style.cssText="background:#0b1d2c;color:#e1f7ff;padding:14px;border:1px solid #40acde";
    top.append(makeEl("h3","LIVE REPOSITORY WORKSPACE"),makeEl("p","Choose tracked source files. Read permissions permit viewing; write permissions permit saving to the host checkout. Saving does NOT push to GitHub."));
    const links=makeEl("div");links.style.cssText="display:flex;gap:12px;flex-wrap:wrap";
    const link=makeEl("a","OPEN github.dev IDE ↗");
    link.href="https://github.dev/Cos229-239/2610_Team02";link.target="_blank";link.rel="noopener noreferrer";
    links.append(link);
    const other=makeEl("a","Review PRs and commits ↗");
    other.href="https://github.com/Cos229-239/2610_Team02/pulls";other.target="_blank";other.rel="noopener noreferrer";
    links.append(other);
    // github.dev edits code but cannot run/debug. Codespaces has an isolated
    // runtime + real debugger. Never execute teammate code on the production host.
    const debug=makeEl("a","RUN + DEBUG IN CODESPACES ↗");
    debug.href="https://codespaces.new/Cos229-239/2610_Team02";
    debug.target="_blank";debug.rel="noopener noreferrer";
    debug.setAttribute("aria-label","Open isolated GitHub Codespaces debugger");
    links.append(debug);
    top.append(links,makeEl("p","DEBUG CONTRACT: Source editor = authenticated review and save. Codespaces = actual breakpoints, stack traces, watches, tests and terminal. No guest host-process execution."));

    const tool=makeEl("div");tool.style.cssText="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0";
    const status=makeEl("span","Loading repository permissions and files…");
    status.setAttribute("role","status");
    status.style.cssText="color:#b5deef;white-space:pre-wrap";
    const refresh=makeEl("button","REFRESH REPOSITORY");
    const save=makeEl("button","SAVE CHANGES");save.disabled=true;
    tool.append(refresh,save,status);top.append(tool);
    const layout=makeEl("div");layout.style.cssText="display:grid;grid-template-columns:minmax(200px,27%) minmax(300px,1fr);gap:10px";
    const sidebar=makeEl("div");sidebar.style.cssText="max-height:52vh;overflow:auto;border:1px solid #30617e;padding:8px";
    const filter=makeEl("input");filter.placeholder="Filter repository files";filter.setAttribute("aria-label","Filter repository files");filter.style.width="100%";
    const list=makeEl("div");sidebar.append(filter,list);
    const editor=makeEl("textarea");editor.spellcheck=false;editor.setAttribute("aria-label","Repository code editor");
    editor.style.cssText="width:100%;height:54vh;font:13px/1.45 Consolas,monospace;resize:vertical;background:#071220;color:#d7edff;border:1px solid #32688a";
    editor.placeholder="Select a file from the repository tree.";
    editor.addEventListener("input",()=>{editingDirty=editor.value!==originalCode;save.disabled=!editingDirty;});
    layout.append(sidebar,editor);top.append(layout);root.append(top);
    let canWrite=false;
    async function pick(file){
      if(editingDirty&&!confirm("Discard unsaved changes in the current file?"))return;
      try {
        const result=await api("/api/file?path="+encodeURIComponent(file));
        chosenFile=file;originalCode=result.content;editor.value=result.content;editingDirty=false;
        save.disabled=true;status.textContent="Loaded "+file+(canWrite?" • Can save working tree":" • Read only");
      } catch(e) {status.textContent=e.message;}
    }
    function renderFiles(){
      list.replaceChildren();
      const query=filter.value.trim().toLowerCase();
      for(const path of filePaths.filter(s=>s.toLowerCase().includes(query)).slice(0,350)){
        const button=makeEl("button",path);
        button.type="button";
        button.style.cssText="display:block;width:100%;text-align:left;overflow-wrap:anywhere;margin:3px 0;font:12px Consolas,monospace";
        button.onclick=()=>pick(path);
        list.append(button);
      }
    }
    filter.addEventListener("input",renderFiles);
    refresh.addEventListener("click",loadFiles);
    save.onclick=async()=>{
      if(!chosenFile||!canWrite||!editingDirty)return;
      if(!confirm("Save "+chosenFile+" to the HOST working tree? This does not commit or deploy."))return;
      save.disabled=true;
      try{
        const server=await api("/api/file?path="+encodeURIComponent(chosenFile));
        if(server.content!==originalCode)throw Error("File changed since it was opened. Refresh before saving; no overwrite performed.");
        await api("/api/file",{method:"PUT",body:JSON.stringify({path:chosenFile,content:editor.value})});
        originalCode=editor.value;editingDirty=false;
        status.textContent="Saved to host checkout. Review and commit on GitHub before deployment.";
      }catch(e){status.textContent=e.message;save.disabled=false;}
    };
    async function loadFiles(){
      try{
        const me=await api("/api/me");canWrite=["write","maintain","admin"].includes(me.permission);
        filePaths=await api("/api/files");
        if(!Array.isArray(filePaths))throw Error("Invalid repository file list.");
        filePaths=filePaths.filter(s=>typeof s==="string");
        status.textContent="Branch: "+(me.branch||"dev")+" • "+(canWrite?"Editor enabled":"Read-only collaborator")+" • "+filePaths.length+" tracked files";
        renderFiles();editor.readOnly=!canWrite;
      }catch(e){status.textContent="Repository unavailable: "+e.message;}
    }
    loadFiles();
  }
  const originalActivate=activateTFStation;
  activateTFStation=function frontierStation(id){
    if(id==="frontier-dashboard"){showToast("Click a room wall to activate the projector");return;}
    if(id==="frontier-ide"){openFrontierIDE();return;}
    if(id==="frontier-world"){openPanel("help");return;}
    if(id.startsWith("dev-ide-")){
      // Let the original workstation open first, then attach an isolated runnable
      // environment link. Native desktop IDE processes cannot be started on remote guests.
      originalActivate(id);
      const content=document.getElementById("panelContent");
      if(content){
        const tools=makeEl("section");
        tools.setAttribute("aria-label","Real development environment access");
        const h=makeEl("h3","REAL CODE / BUILD / TEST / DEBUG");
        const expl=makeEl("p","Use a Codespace for an isolated terminal, debugger and browser preview, or open the repository in your OWN installed desktop IDE. The room never runs guest commands on the production host.");
        const cloud=makeEl("a","OPEN ISOLATED GITHUB CODESPACES ↗");
        cloud.href="https://codespaces.new/Cos229-239/2610_Team02";
        cloud.target="_blank";cloud.rel="noopener noreferrer";
        const review=makeEl("a","VIEW CONTRIBUTION PULL REQUESTS ↗");
        review.href="https://github.com/Cos229-239/2610_Team02/pulls";
        review.target="_blank";review.rel="noopener noreferrer";
        tools.append(h,expl,cloud,makeEl("br"),review);
        content.append(tools);
      }
      return;
    }
    if(typeof id==="string"&&id.startsWith("frontier-towerflow-")){
      if(projectorState.tick(performance.now()).stage!=="PROJECTING")return;
      openBusinessPanel(id.slice("frontier-towerflow-".length));
      return;
    }
    return originalActivate(id);
  };
  // Explicit wall engagement: mouse click OR aiming at a wall and pressing E.
  // Never intercept Development Room input, foreground stations, or avatar movement.
  const raycaster=new THREE.Raycaster();
  function projectorPick(ray,allowControls=true){
    const state=projectorState.tick(performance.now());
    const targets=[left,right,...(state.portalEnabled?[screen,...tabMeshes.map(p=>p.mesh)]:[]),...wallTargets];
    const hits=ray.intersectObjects(targets,false);
    const closest=hits.find(hit=>hit.distance<=35);
    const bodyHit=allowControls&&state.descended>.8?
      ray.intersectObject(projector,true).find(hit=>hit.distance<=30):null;
    if(bodyHit&&(!closest||bodyHit.distance<closest.distance)){
      projectorSettings();return true;
    }
    if(!closest)return false;
    const object=closest.object;
    // A foreground interactive floor object wins over a wall behind it.
    // Ignore room architecture (large wall/floor/ceiling geometry) and
    // invisible decorative elements, which otherwise masked ALL wall clicks.
    if(object.userData.tfWall){
      const blockers=ray.intersectObjects(scene.children,true);
      const blocked=blockers.some(hit=>{
        if(hit.distance>=closest.distance-.1)return false;
        const o=hit.object,geo=o.geometry?.parameters||{};
        if(o===object||wallTargets.includes(o)||o===screen||o===bezel||o===cone)return false;
        if(!o.visible||o.material?.visible===false||o.material?.opacity===0)return false;
        if(geo.width>=20||geo.depth>=20||geo.height>=12)return false; // architecture
        if(o.parent===projector||o===projector)return false;
        // Only identified interactable objects may block the trigger.
        return !!o.userData?.tfStationId||!!o.userData?.stationId||
          o===left||o===right||(typeof tfEntrance!=="undefined"&&o===tfEntrance);
      });
      if(blocked)return false;
      startWallProjection(object.userData.tfWall);return true;
    }
    if(object===left){openPanel("help");return true;}
    if(object===right){openFrontierIDE();return true;}
    if(object===screen){openBusinessPanel("business");return true;}
    const entry=tabMeshes.find(p=>p.mesh===object);
    if(entry){openBusinessPanel(entry.tab);return true;}
    return false;
  }
  function frontierInputReady(){
    return running&&!tfDevRoom&&document.getElementById("panel")?.hidden&&
      document.getElementById("menu")?.hidden;
  }
  renderer.domElement.addEventListener("click",e=>{
    if(!frontierInputReady()||renderer.domElement.dataset.dragging==="1")return;
    const bounds=renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2(
      (e.clientX-bounds.left)/bounds.width*2-1,
      -(e.clientY-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    if(pedestalPick(raycaster)||projectorPick(raycaster))e.stopImmediatePropagation();
  },true);
  window.addEventListener("keydown",e=>{
    if(e.code!=="KeyE"||e.repeat||e.altKey||e.ctrlKey||e.metaKey||
      !frontierInputReady()||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName))return;
    // Aimed interaction (screen center) is deliberately limited to wall
    // and projector targets. Do not hijack E on a workstation or Dev portal.
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    if(pedestalPick(raycaster)){e.preventDefault();e.stopImmediatePropagation();return;}
    const state=projectorState.tick(performance.now());
    const nearest=raycaster.intersectObjects([
      ...wallTargets,...(state.portalEnabled?[screen]:[])
    ],false).find(hit=>hit.distance<=18);
    if(!nearest)return;
    // Do not consume E if the original room has a nearer interactable station.
    if(stations.some(st=>Math.hypot(position.x-st.x,position.z-st.z)<3.0))return;
    if(projectorPick(raycaster,false)){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  // Preserve original Enter handler; do not intercept any Development Room return portal.
  // Ensure all first entries land in the Frontier dashboard atrium.
  const previousEnter=document.getElementById("enterBtn").onclick;
  document.getElementById("enterBtn").onclick=function(e){
    previousEnter?.call(this,e);
    if(!running)return;
    tfDevRoom=false;
    position.set(0,1.7,12);
    yaw=0;pitch=0;send({type:"move",x:0,z:12});
    document.getElementById("areaName").textContent="FRONTIER • CONTROL CENTER";
    projectionOn=false;
    showToast("Welcome to Frontier. Click a wall to activate the projector.");
    updateMetrics();
  };
  // TF_ROCKY_GREETING_PROPOSAL_V1_BEGIN
  // Authentic Rocky excerpt: NO audio or manifest shipped. Only a local
  // rights-verified, host-installed asset may be played. No voice synthesis.
  const greetingStatus=document.createElement("div");
  greetingStatus.id="tfRockyGreetingStatus";
  greetingStatus.setAttribute("role","status");
  greetingStatus.style.cssText="position:fixed;left:12px;bottom:12px;z-index:200;padding:8px 12px;background:#08131de8;color:#f3f6fa;border:1px solid #6689a4;max-width:min(92vw,420px);font:13px system-ui";
  greetingStatus.hidden=true;
  const greetingText=document.createElement("span");
  const skipGreeting=document.createElement("button");
  skipGreeting.type="button";
  skipGreeting.textContent="Skip greeting";
  skipGreeting.style.marginLeft="12px";
  const greetingAudio=document.createElement("audio");
  greetingAudio.preload="none";
  greetingAudio.volume=.65;
  greetingStatus.append(greetingText,skipGreeting,greetingAudio);
  document.body.append(greetingStatus);
  let active=false,attempt=0;
  function stopRockyGreeting(){
    ++attempt;active=false;greetingAudio.pause();greetingAudio.removeAttribute("src");
    greetingStatus.hidden=true;
  }
  skipGreeting.addEventListener("click",stopRockyGreeting);
  greetingAudio.addEventListener("ended",stopRockyGreeting);
  greetingAudio.addEventListener("error",stopRockyGreeting);
  async function playRockyGreeting(){
    if(localStorage.getItem("tfRockyGreetingMuted")==="1")return false;
    const current=++attempt;
    // The manifest is supplied ONLY by a separate, explicit host-side
    // licensed-media installer. 404/malformed/expired means silence.
    let config;
    try{
      const response=await fetch("/room-assets/approved/rocky-greeting.json",{
        credentials:"same-origin",cache:"no-store",mode:"same-origin"
      });
      if(!response.ok)return false;
      config=await response.json();
    }catch{return false;}
    if(current!==attempt||!config||config.version!==1||config.enabled!==true||
       config.rightsVerified!==true||typeof config.licenseExpires!=="string"||
       !Number.isFinite(Date.parse(config.licenseExpires))||
       Date.now()>=Date.parse(config.licenseExpires))return false;
    const url=config.assetPath;
    if(typeof url!=="string"||
       !/^\/room-assets\/approved\/rocky-[a-f0-9]{64}\.(mp3|ogg|wav)$/.test(url))return false;
    if(localStorage.getItem("tfRockyGreetingMuted")==="1")return false;
    greetingText.textContent="Rocky Balboa • licensed film excerpt";
    greetingAudio.src=url;
    greetingStatus.hidden=false;
    // Invoked by click, but manifest fetch introduces an async boundary:
    // browsers may reject autoplay. Never block the room or voice chat.
    try{
      await greetingAudio.play();
      if(current!==attempt){greetingAudio.pause();return false;}
      active=true;return true;
    }catch{if(current===attempt)stopRockyGreeting();return false;}
  }
  window.tfRockyGreeting=Object.freeze({
    onEnter:playRockyGreeting,
    stop:stopRockyGreeting,
    disable:()=>{localStorage.setItem("tfRockyGreetingMuted","1");stopRockyGreeting();},
    enable:()=>localStorage.removeItem("tfRockyGreetingMuted"),
    get playing(){return active;}
  });
  // TF_ROCKY_GREETING_PROPOSAL_V1_END
  // No scene-mount or proximity start. State changes ONLY from wall activation
  // or projector power controls, with the 3s wait after descent completes.
  let lastProjectorStage="IDLE",lastProjectedWall=null;
  function drawProjectedGateway(){
    const w=surface.width,h=surface.height;
    const grad=ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0,"#061426");grad.addColorStop(1,"#093c5b");
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#62deff";ctx.lineWidth=13;ctx.strokeRect(18,18,w-36,h-36);
    ctx.textAlign="center";ctx.fillStyle="#b9eaff";ctx.font="bold 110px Segoe UI,Arial";
    ctx.fillText("TOWERFLOW",w/2,230);
    ctx.font="bold 46px Segoe UI,Arial";
    ctx.fillText("INTERACTIVE PROJECTION • ENTER WORKSPACE",w/2,360);
    ctx.font="34px Segoe UI,Arial";
    ctx.fillText("Select the illuminated business destination below",w/2,490);
    ctx.fillText("Three tiers • distinct licensed business experiences",w/2,570);
    ctx.fillText("Click the projection to enter within Frontier",w/2,730);
    texture.needsUpdate=true;
  }
  // Passive frame telemetry piggybacks on the existing projector loop.
  // It is after-version observation only, not pre-upgrade proof of no degradation.
  const frameSamples=[];let previousFrame=0;
  function frameTelemetry(){
    const arr=[...frameSamples].sort((a,b)=>a-b),p=x=>arr.length?arr[Math.min(arr.length-1,Math.floor((arr.length-1)*x))]:null;
    const median=p(.5),p95=p(.95);
    return Object.freeze({samples:arr.length,p50FrameMs:median,p95FrameMs:p95,
      estimatedMedianFps:median>0?Math.round(1000/median):null,
      drawCalls:Number.isFinite(renderer.info?.render?.calls)?renderer.info.render.calls:null,
      triangles:Number.isFinite(renderer.info?.render?.triangles)?renderer.info.render.triangles:null,
      beforeBaselineRecorded:false,frameRateRegressionVerified:false});
  }
  function animateProjector(){
    requestAnimationFrame(animateProjector);
    const now=performance.now();
    if(previousFrame){const dt=now-previousFrame;if(dt>0&&dt<300){frameSamples.push(dt);if(frameSamples.length>240)frameSamples.shift();}}
    previousFrame=now;
    cyberAmbience?.update(now);
    cinematicFidelity?.update(now);
    const state=projectorState.tick(now);
    const active=state.lightOn;
    const descended=state.descended;
    const clearing=state.cleared;
    if(state.stage!==lastProjectorStage){
      if(state.stage==="PROJECTING"){
        drawProjectedGateway();
        showToast("TOWERFLOW • wall projection online");
      }else if(state.stage==="IDLE"){
        projectionOn=false;
        draw();
      }
      lastProjectorStage=state.stage;
    }
    if(state.wall!==lastProjectedWall){
      lastProjectedWall=state.wall;
      if(state.wall)aimAtWall(state.wall);
    }
    screen.visible=state.portalEnabled;
    bezel.visible=state.portalEnabled;
    for(const p of tabMeshes)p.mesh.visible=state.portalEnabled;
    // Original station meshes and signs descend AND return with exact coordinates.
    // Their original E/IDE/AI/TASK BOARD actions remain intact while raised.
    for(const f of originalFixtures){
      f.mesh.position.y=f.y-clearing*7.3;
      f.mesh.visible=f.visible&&clearing<.999;
    }
    for(const row of frontStations){
      row.station.x=clearing>.02?1e6:row.x;
      row.station.z=clearing>.02?1e6:row.z;
    }
    // New platform assemblies are also lowered, preserving their geometry.
    for(const pad of platforms){
      pad.group.position.y=pad.baseY-clearing*4.6;
      pad.group.visible=clearing<.999;
      if(!kineticPedestals)pad.holo.rotation.y=now*.00035;
    }
    kineticPedestals?.update(now,clearing);
    neonLighting?.update(now,clearing);
    orbHalo.rotation.y=now*.0006;
    const opening=clearing;
    aperture.scale.setScalar(Math.max(.001,opening));
    rim.scale.setScalar(Math.max(.001,opening));
    for(let i=0;i<irisParts.length;i++){
      const angle=i*Math.PI/4;
      irisParts[i].position.x=Math.cos(angle)*opening*3.8;
      irisParts[i].position.z=Math.sin(angle)*opening*3.8;
      irisParts[i].rotation.z=opening*(i%2===0?.7:-.7);
    }
    projector.position.y=12.1-descended*8.5;
    beam.position.copy(projector.position);
    if(state.wall){
      const w=wallLayout[state.wall];
      const target=new THREE.Vector3(w.x,5.15,w.z);
      const direction=target.clone().sub(projector.position);
      const length=direction.length();
      beam.target.position.copy(target);
      cone.position.copy(projector.position.clone().add(target).multiplyScalar(.5));
      cone.scale.set(1,length/13,1);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      projector.rotation.y=Math.atan2(-direction.x,-direction.z);
    }
    const fade=state.stage==="RETARGETING"?Math.max(.2,state.retargetProgress):1;
    beam.intensity=active?23*fade:0;
    cone.material.opacity=active?.032*fade:0;
    cone.visible=active;
  }
  animateProjector();
  window.tfFrontier=Object.freeze({trackAmbientAudio,stopEnvironmentAudio,resumeEnvironmentAudio,get environmentAudio(){return environmentAudio?.stats()??null;},openDashboard,openBusiness:openBusinessPanel,openIDE:openFrontierIDE,refresh:updateMetrics,setOrbAgent,activateWall:startWallProjection,powerOff:()=>projectorState.powerOff(),get projector(){return projectorState.snapshot();},get orbAgent(){return orbAgent;},get cyberAtmosphere(){return cyberAmbience?.stats()??null;},setCyberAtmosphere:(enabled)=>cyberAmbience?.setEnabled(enabled),get cinematicFidelity(){return cinematicFidelity?.stats()??null;},setCinematicFidelity:(enabled)=>cinematicFidelity?.setEnabled(enabled),mountReviewedGLB:({manifest,loader})=>cinematicFidelity?.mountGLB({manifest,loader}),get performance(){return frameTelemetry();},get lighting(){return neonLighting?.stats()??null;},setLighting:(preset,intensity)=>neonLighting?.configure({preset,intensity}),get kineticPedestals(){return kineticPedestals?.stats()??null;},configurePedestal:(index,settings)=>kineticPedestals?.configure(index,settings),shatterPedestal:(index)=>kineticPedestals?.shatter(index,performance.now()),get chat(){return teamChatDock?.stats()??null;},toggleChat:()=>teamChatDock?.setOpen(!teamChatDock.open),bindTeamChatTransport:(adapter)=>teamChatDock?.attachTransport(adapter),get ambientAudio(){return environmentAudio?.stats()??null;},trackAmbientAudio:(source)=>environmentAudio?.track(source),stopAmbientAudio:()=>environmentAudio?.stop(),armAmbientAudio:()=>environmentAudio?.arm()});
}());
// TF_FRONTIER_LOBBY_V1_END

// TF_WORLD_EMULATION_V1_BEGIN
// Towerflow hidden object-vault renderer: photography-informed procedural sky,
// realistic-shaded 3D celestial exhibit, and centered ceiling messages.
// No filesystem, shell, model credentials, network, room state or server writes.
(function(){
  "use strict";
  const STORAGE="towerflow.world-emulation.v1";
  const THEMES=["sunset","solar-system","aurora","ceiling-text"];
  const colors={red:"#ff465d",orange:"#ffa63a",yellow:"#ffec74",green:"#59ffb1",blue:"#62bfff",purple:"#ae82ff",pink:"#ff73c5",white:"#f7fbff",gold:"#ffe19c",cyan:"#48f5e4"};
  const labels={"sunset":"REALISTIC SUNSET","solar-system":"SOLAR SYSTEM OBSERVATORY","aurora":"AURORA BOREALIS","ceiling-text":"COLORED CEILING MESSAGE"};
  const savedDefault={mode:null,text:"TOWERFLOW",color:"rainbow"};
  let active={...savedDefault},saved={...savedDefault};
  let vault=[],canvases=[],planets=[],sunlight=[],lastDraw=-1;
  let installed=false,controller=null,clock=0;
  const previousBackground={};
  function available(){
    return typeof THREE!=="undefined"&&typeof scene!=="undefined"&&
      typeof renderer!=="undefined"&&typeof helpPanel==="function";
  }
  function cleanState(v){
    const mode=THEMES.includes(v?.mode)?v.mode:null;
    const text=(typeof v?.text==="string"?v.text:"TOWERFLOW").replace(/[\r\n\t]/g," ").trim().slice(0,36)||"TOWERFLOW";
    const color=v?.color==="rainbow"||Object.hasOwn(colors,v?.color)?v.color:"rainbow";
    return {mode,text,color};
  }
  function restoreState(){
    try {return cleanState(JSON.parse(localStorage.getItem(STORAGE)));}
    catch{return {...savedDefault};}
  }
  function storeState(value){
    try{localStorage.setItem(STORAGE,JSON.stringify(value));}
    catch{/* localStorage disabled; current preview still works */ }
  }
  function deleteState(){
    try{localStorage.removeItem(STORAGE);}
    catch{}
  }
  function hasPersonalSetting(){
    try {
      const raw=localStorage.getItem(STORAGE);
      return raw!==null&&!!cleanState(JSON.parse(raw)).mode;
    }catch{return false;}
  }
  function rgba(hex,alpha){
    const c=new THREE.Color(hex);
    return "rgba("+Math.round(c.r*255)+","+Math.round(c.g*255)+","+Math.round(c.b*255)+","+alpha+")";
  }
  function random(seed){let x=Math.sin(seed*127.1+78.233)*43758.5453123;return x-Math.floor(x);}
  function drawStars(ctx,w,h,seed=0,count=260){
    for(let i=0;i<count;i++){
      const x=random(i+1+seed)*w,y=random(i+987+seed)*h;
      const a=.18+random(i+455+seed)*.72,r=.35+random(i+2000+seed)*1.2;
      ctx.fillStyle="rgba(218,239,255,"+a.toFixed(2)+")";
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
  }
  function skyTexture(){
    const canvas=document.createElement("canvas");
    canvas.width=1024;canvas.height=640;
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return {canvas,texture:tex,context:canvas.getContext("2d",{alpha:false})};
  }
  function paintSunset(ctx,w,h,t){
    const horizon=h*.73;
    const sky=ctx.createLinearGradient(0,0,0,h);
    [[0,"#101b46"],[.32,"#7b466e"],[.51,"#d76b67"],[.69,"#ffb759"],[.85,"#fe7d34"],[1,"#2c1835"]].forEach(([stop,color])=>sky.addColorStop(stop,color));
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    // Photographic-inspired atmospheric haze: long exposure-like soft gradients.
    for(let i=0;i<9;i++){
      const x=w*(.05+random(i+12)*.9);
      const y=h*(.51+random(i+79)*.26);
      const rad=w*(.15+random(i+44)*.16);
      const g=ctx.createRadialGradient(x,y,2,x,y,rad);
      g.addColorStop(0,"rgba(255,202,136,.085)");g.addColorStop(1,"rgba(255,168,114,0)");
      ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
    }
    const phase=(t%135)/135;
    const sunY=h*(.43+.44*phase);
    const sx=w*.52,r=46;
    const glow=ctx.createRadialGradient(sx,sunY,0,sx,sunY,165);
    glow.addColorStop(0,"rgba(255,255,222,.95)");
    glow.addColorStop(.22,"rgba(255,226,139,.70)");
    glow.addColorStop(.52,"rgba(255,167,74,.24)");
    glow.addColorStop(1,"rgba(255,128,60,0)");
    ctx.fillStyle=glow;ctx.fillRect(sx-165,sunY-165,330,330);
    ctx.fillStyle="#fff7bf";ctx.beginPath();ctx.arc(sx,sunY,r,0,Math.PI*2);ctx.fill();
    // Repeated blurred horizon cloud banks with subtle left-to-right drift.
    for(let i=0;i<22;i++){
      const x=((random(i+98)*1.25-.14+t*(.00012+random(i+78)*.00004))%1.32)*w;
      const y=h*(.31+random(i+38)*.45),rw=35+random(i+451)*160;
      const hh=3+random(i+988)*12;
      ctx.fillStyle=i%3===0?"rgba(46,38,79,.36)":"rgba(113,56,80,.23)";
      ctx.beginPath();ctx.ellipse(x,y,rw,hh,.04,0,Math.PI*2);ctx.fill();
    }
    // Distant dark land silhouette conceals the setting sun at the horizon.
    ctx.fillStyle="#17132c";ctx.beginPath();ctx.moveTo(0,h);
    for(let x=0;x<=w+12;x+=12){
      const y=horizon+16+Math.sin(x*.011)*16+Math.sin(x*.031)*8+random(x+28)*4;
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    ctx.fillStyle="rgba(255,183,110,.30)";
    ctx.fillRect(0,horizon-3,w,3);
  }
  function paintAurora(ctx,w,h,t){
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#030918");sky.addColorStop(.6,"#07122c");sky.addColorStop(1,"#112c3a");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,1,320);
    for(let band=0;band<4;band++){
      const tint=["46,255,161","159,86,255","58,198,231","247,92,203"][band];
      const base=h*(.28+band*.095);
      for(let i=0;i<110;i++){
        const x=i*w/109;
        const wave=Math.sin(x*.015+t*.48+band*.9)*48+
          Math.sin(x*.04-t*.32+band*1.5)*24;
        const top=base+wave;
        const length=85+Math.sin(x*.036+t*.72+band)*45+band*8;
        const gradient=ctx.createLinearGradient(x,top,x,top+length);
        gradient.addColorStop(0,"rgba("+tint+",0)");
        gradient.addColorStop(.18,"rgba("+tint+",.13)");
        gradient.addColorStop(.55,"rgba("+tint+",.18)");
        gradient.addColorStop(1,"rgba("+tint+",0)");
        ctx.fillStyle=gradient;ctx.fillRect(x,top,w/109+3,length);
      }
    }
    const glow=ctx.createLinearGradient(0,h*.73,0,h);
    glow.addColorStop(0,"rgba(35,178,127,0)");glow.addColorStop(1,"rgba(34,208,127,.12)");
    ctx.fillStyle=glow;ctx.fillRect(0,h*.73,w,h*.27);
  }
  function paintSpace(ctx,w,h){
    const g=ctx.createRadialGradient(w*.53,h*.4,0,w*.53,h*.4,w*.85);
    g.addColorStop(0,"#112048");g.addColorStop(.5,"#050e25");g.addColorStop(1,"#01050e");
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const nebula=ctx.createRadialGradient(w*.3,h*.45,0,w*.3,h*.45,w*.48);
    nebula.addColorStop(0,"rgba(64,86,142,.19)");nebula.addColorStop(1,"rgba(40,45,100,0)");
    ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,3,530);
  }
  function paintText(ctx,w,h,text,color){
    const sky=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,w*.66);
    sky.addColorStop(0,"#182f53");sky.addColorStop(1,"#050b1c");
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    drawStars(ctx,w,h,8,90);
    ctx.textAlign="center";ctx.textBaseline="middle";
    const len=[...text].length;
    let size=Math.min(132,Math.floor(1050/Math.max(5,len)*1.5));
    size=Math.max(26,size);
    ctx.font="900 "+size+"px Segoe UI, Arial, sans-serif";
    while(ctx.measureText(text).width>w*.92&&size>25){size-=2;ctx.font="900 "+size+"px Segoe UI, Arial, sans-serif";}
    ctx.shadowBlur=27;ctx.shadowColor=color==="rainbow"?"#69eefa":colors[color];
    if(color==="rainbow"){
      const rainbow=["#ff647c","#ffbe69","#ffec75","#63ffc5","#5ec9ff","#b58cff"];
      let px=(w-ctx.measureText(text).width)/2;
      ctx.textAlign="left";
      for(let i=0;i<text.length;i++){
        const ch=text[i];ctx.fillStyle=rainbow[i%rainbow.length];
        ctx.fillText(ch,px,h*.53);px+=ctx.measureText(ch).width;
      }
    }else{ctx.fillStyle=colors[color];ctx.fillText(text,w/2,h*.53);}
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(94,221,255,.48)";ctx.lineWidth=7;ctx.strokeRect(15,15,w-30,h-30);
  }
  const planetData=[
    ["MERCURY",.22,"#807f82"],["VENUS",.34,"#c9a373"],
    ["EARTH",.38,"#2b72b8"],["MARS",.29,"#b85a3c"],
    ["JUPITER",.73,"#d4a878"],["SATURN",.64,"#d9c09c"],
    ["URANUS",.47,"#9ee5e8"],["NEPTUNE",.46,"#4268cc"]
  ];
  function planetTexture(name,base) {
    const c=document.createElement("canvas");c.width=512;c.height=256;
    const ctx=c.getContext("2d");
    ctx.fillStyle=base;ctx.fillRect(0,0,c.width,c.height);
    for(let i=0;i<80;i++){
      const y=random(i+name.length)*256;
      const h=2+random(i+918)*11;
      const a=(.035+random(i+301)*.09).toFixed(3);
      ctx.fillStyle=(i%3===0?"rgba(250,242,219,":"rgba(26,35,54,")+a+")";
      ctx.fillRect(0,y,512,h);
    }
    if(name==="EARTH"){
      for(let i=0;i<17;i++){
        const x=random(i+70)*512,y=random(i+85)*256;
        ctx.fillStyle=i%3===0?"rgba(238,250,240,.8)":"rgba(78,165,115,.78)";
        ctx.beginPath();ctx.ellipse(x,y,8+random(i+34)*38,5+random(i+11)*18,random(i+8)*3,0,Math.PI*2);ctx.fill();
      }
    }
    if(name==="JUPITER"){
      for(let i=0;i<12;i++) {
        const y=random(i+81)*256;
        ctx.fillStyle=i%2?"rgba(126,74,58,.32)":"rgba(255,237,185,.24)";
        ctx.fillRect(0,y,512,6+random(i+66)*17);
      }
      ctx.fillStyle="rgba(177,68,49,.8)";ctx.beginPath();ctx.ellipse(360,172,26,13,-.2,0,Math.PI*2);ctx.fill();
    }
    if(name==="MARS"){
      for(let i=0;i<16;i++){
        ctx.fillStyle="rgba(96,43,35,.17)";ctx.beginPath();
        ctx.arc(random(i+19)*512,random(i+28)*256,4+random(i+38)*26,0,Math.PI*2);ctx.fill();
      }
    }
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  function labelTexture(label) {
    const c=document.createElement("canvas");c.width=256;c.height=72;
    const cx=c.getContext("2d");
    cx.fillStyle="#d5eaff";cx.font="bold 36px Segoe UI, Arial";cx.textAlign="center";
    cx.fillText(label,128,48);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    return tex;
  }
  function makeCanopy(centerX) {
    const group=new THREE.Group();group.position.x=centerX;scene.add(group);
    const border=new THREE.Mesh(new THREE.BoxGeometry(39,.10,28),new THREE.MeshStandardMaterial({
      color:0x1d4569,metalness:.65,roughness:.24,emissive:0x165d88,emissiveIntensity:.32
    }));
    border.position.y=10.93;group.add(border);
    const sky=skyTexture();
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(38.4,27.4),new THREE.MeshBasicMaterial({
      map:sky.texture,side:THREE.DoubleSide,depthWrite:false
    }));
    screen.position.set(0,10.87,0);
    screen.rotation.x=Math.PI/2;
    group.add(screen);
    const solar=new THREE.Group();
    solar.visible=false;group.add(solar);
    const sunGeometry=new THREE.SphereGeometry(1.05,32,20);
    const sun=new THREE.Mesh(sunGeometry,new THREE.MeshBasicMaterial({color:0xffd778}));
    sun.position.set(-16,10.08,0);solar.add(sun);
    const sunGlow=new THREE.PointLight(0xffc36e,55,12,2);
    sunGlow.position.copy(sun.position);solar.add(sunGlow);
    sunlight.push(sunGlow);
    const bodies=[];
    const positions=[-12.4,-9.7,-7,-4.3,-.9,3.2,8.1,13.1];
    for(let i=0;i<planetData.length;i++){
      const [name,radius,base]=planetData[i];
      const body=new THREE.Group();
      body.position.set(positions[i],9.86,0);
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,26,18),new THREE.MeshStandardMaterial({
        map:planetTexture(name,base),metalness:0,roughness:.82,
        emissive:new THREE.Color(base),emissiveIntensity:.16
      }));
      body.add(mesh);
      if(name==="SATURN") {
        const ring=new THREE.Mesh(new THREE.RingGeometry(.79,1.23,48),new THREE.MeshBasicMaterial({
          color:0xa89c77,side:THREE.DoubleSide,transparent:true,opacity:.74,depthWrite:false
        }));
        ring.rotation.set(.58,.24,.35);body.add(ring);
      }
      const tag=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.42),new THREE.MeshBasicMaterial({
        map:labelTexture(name),transparent:true,depthWrite:false,side:THREE.DoubleSide
      }));
      tag.position.set(0,-.99,.06);tag.rotation.x=Math.PI/2;body.add(tag);
      bodies.push(mesh);
      solar.add(body);
    }
    planets.push(...bodies);
    canvases.push({...sky,group,solar});
    vault.push(group);
    return group;
  }
  function establish(){
    if(installed)return;
    if(!available())return;
    makeCanopy(0);
    makeCanopy(62);
    installed=true;
    const ticker=new THREE.Clock();
    const loop=()=>{
      requestAnimationFrame(loop);
      if(!installed || !active.mode)return;
      clock+=Math.min(.08,ticker.getDelta());
      if(clock-lastDraw<.085)return;
      lastDraw=clock;
      for(const layer of canvases){
        const {context:ctx,canvas,texture,solar}=layer;
        solar.visible=active.mode==="solar-system";
        if(active.mode==="sunset")paintSunset(ctx,canvas.width,canvas.height,clock);
        else if(active.mode==="aurora")paintAurora(ctx,canvas.width,canvas.height,clock);
        else if(active.mode==="solar-system")paintSpace(ctx,canvas.width,canvas.height);
        else paintText(ctx,canvas.width,canvas.height,active.text,active.color);
        texture.needsUpdate=true;
      }
      if(active.mode==="solar-system")planets.forEach((mesh,i)=>{mesh.rotation.y+=.005+(i%3)*.002;});
    };
    // Render only while mode selected; otherwise original opaque ceiling stays visible.
    loop();
    renderMode(saved);
  }
  function renderMode(state){
    active=cleanState(state);
    for(const layer of vault)layer.visible=!!active.mode;
    if(!active.mode)return;
    lastDraw=-1;
    for(const layer of canvases)layer.solar.visible=active.mode==="solar-system";
  }
  function interpret(text){
    if(typeof text!=="string")return null;
    const q=text.trim().slice(0,1200),m=q.match(/(?:write|display|place|insert|show|put)\s+["“']([^"”']{1,36})["”']/i);
    if(m) {
      const color=Object.keys(colors).find(c=>new RegExp("\\b"+c+"\\b","i").test(q))||"rainbow";
      return {mode:"ceiling-text",text:m[1],color};
    }
    if(/\b(?:solar system|planets|planetarium|saturn|jupiter)\b/i.test(q))return {mode:"solar-system"};
    if(/\b(?:aurora|northern lights|southern lights|borealis)\b/i.test(q))return {mode:"aurora"};
    if(/\b(?:sunset|sun setting|setting sun|twilight|golden hour)\b/i.test(q))return {mode:"sunset"};
    return null;
  }
  function ui(){
    const previous=helpPanel;
    helpPanel=function worldEmulatorHelp(){
      previous();
      const root=document.getElementById("tfAuraArea");
      if(!root || root.querySelector("#tfWorldEmulator"))return;
      const panel=document.createElement("section");panel.id="tfWorldEmulator";
      panel.setAttribute("aria-label","AURA sky metaverse and object emulation");
      const heading=document.createElement("h3");heading.textContent="AURA — WORLD EMULATION VAULT";
      const description=document.createElement("p");
      description.textContent="A hidden, photography-informed object library generates visible sky scenes when you preview them. The original room remains preserved. Scenes are artistic representations, not literal photo scans or scale-accurate astronomy.";
      const status=document.createElement("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
      const controls=document.createElement("div");
      const presets={sunset:"Sun actually sets", "solar-system":"Sun + eight planets + stars",aurora:"Moving aurora + stars","ceiling-text":"Center-ceiling colored text"};
      let draft={...saved};
      const textInput=document.createElement("input");
      textInput.placeholder="Ceiling words (maximum 36)";
      textInput.maxLength=36;textInput.value=draft.text;
      textInput.setAttribute("aria-label","Ceiling message");
      const colorSelect=document.createElement("select");
      colorSelect.setAttribute("aria-label","Text color");
      for(const color of ["rainbow",...Object.keys(colors)]){
        const opt=document.createElement("option");opt.value=color;opt.textContent=color.toUpperCase();colorSelect.append(opt);
      }
      colorSelect.value=draft.color;
      const preview=document.createElement("button");preview.type="button";preview.textContent="Preview selected world";
      const apply=document.createElement("button");apply.type="button";apply.textContent="Keep this design";apply.disabled=true;
      const revert=document.createElement("button");revert.type="button";revert.textContent="Discard preview";
      const reset=document.createElement("button");reset.type="button";reset.textContent="Restore original ceiling";
      function inform(s){status.textContent=s;}
      function show(d){
        draft=cleanState(d);
        if(draft.mode==="ceiling-text"){
          draft.text=textInput.value.trim().slice(0,36)||"TOWERFLOW";
          draft.color=colorSelect.value;
        }
        renderMode(draft);
        document.dispatchEvent(new Event("tfWorldPreviewStart"));
        apply.disabled=false;
        inform("PREVIEW: "+labels[draft.mode]+". Look at the central ceiling in either room. Keep this design or discard it.");
      }
      for(const [mode,label] of Object.entries(presets)){
        const button=document.createElement("button");button.type="button";button.textContent=label;
        button.addEventListener("click",()=>show({...draft,mode}));
        controls.append(button);
      }
      preview.addEventListener("click",()=>show(draft.mode?draft:{...draft,mode:"sunset"}));
      apply.addEventListener("click",()=>{
        if(!draft.mode)return;
        saved=cleanState(draft);storeState(saved);apply.disabled=true;
        document.dispatchEvent(new Event("tfWorldPreviewEnd"));
        inform("PRESERVED: "+labels[saved.mode]+" in this browser. Teammates' scenes are unchanged.");
      });
      revert.addEventListener("click",()=>{renderMode(saved);document.dispatchEvent(new Event("tfWorldPreviewEnd"));apply.disabled=true;inform("Reverted to the last saved scene.");});
      reset.addEventListener("click",()=>{saved={...savedDefault};renderMode(saved);deleteState();document.dispatchEvent(new Event("tfWorldPreviewEnd"));apply.disabled=true;inform("Original Towerflow ceiling restored.");});
      panel.append(heading,description,controls,textInput,colorSelect,preview,apply,revert,reset,status);
      root.append(panel);
      inform(saved.mode?"Saved scene: "+labels[saved.mode]+".":"Original ceiling remains active until a preview is selected.");
      const ask=root.querySelector("button");
      const question=root.querySelector("textarea");
      if(ask&&question){
        ask.addEventListener("click",()=>{
          const intent=interpret(question.value);
          if(!intent)return;
          if(intent.mode==="ceiling-text"){textInput.value=intent.text;colorSelect.value=intent.color;}
          show({...draft,...intent});
          inform("I created a reversible "+labels[intent.mode]+" preview from your request. Look at the ceiling, then choose Keep this design.");
        });
      }
    };
  }
  if(available()){
    saved=restoreState();
    establish();ui();
  }
  window.tfWorldEmulator=Object.freeze({
    version:1,
    supportedModes:Object.freeze([...THEMES]),
    getActive:()=>Object.freeze({...active}),
    hasPersonalSetting,
    applyAuthoritative:(scene,approvedAt)=>{
      if(typeof approvedAt==="string"){
        const stamp=Date.parse(approvedAt);
        if(Number.isFinite(stamp))clock=Math.max(0,(Date.now()-stamp)/1000)%3600;
      }
      // Shared scene updates never overwrite a browser-owned saved design.
      // The room sync client also checks this before applying changes.
      if(hasPersonalSetting())return false;
      if(!scene){saved={...savedDefault};renderMode(saved);return true;}
      saved=cleanState(scene);renderMode(saved);return true;
    },
    requestPreview:request=>{const intent=interpret(request);if(!intent)return false;renderMode({...active,...intent});return true;},
    reset:()=>{saved={...savedDefault};renderMode(saved);deleteState();}
  });
}());
// TF_WORLD_EMULATION_V1_END

// TF_SHARED_WORLD_CLIENT_V1_BEGIN
// Optional approved-scene sync. It does nothing if the trusted backend is not installed.
// No arbitrary user content becomes HTML or script. No access to Node, shell or host files.
(function(){
 "use strict";
 const engine=window.tfWorldEmulator;
 if(!engine||typeof engine.applyAuthoritative!=="function")return;
 let lastRevision=-1,connected=false,paused=false,admin=false,busy=false;
 const endpoint="/api/world/state";
 const settings={credentials:"same-origin",cache:"no-store"};
 const state=document.createElement("span");
 state.setAttribute("role","status");state.setAttribute("aria-live","polite");
 function say(text){state.textContent=text;}
 document.addEventListener("tfWorldPreviewStart",()=>{paused=true;});
 document.addEventListener("tfWorldPreviewEnd",()=>{paused=false;});
 async function get(){
   const r=await fetch(endpoint,settings);
   if(!r.ok)throw Error("World sync unavailable (HTTP "+r.status+").");
   return r.json();
 }
 async function refresh(){
  if(busy)return;
  busy=true;
  try{
   const data=await get();
   if(data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error("Invalid shared scene state");
   connected=true;
   const current=engine.getActive();
   const desired=data.scene;
   const diverged=desired
     ? current.mode!==desired.mode || (desired.mode==="ceiling-text" &&
       (current.text!==desired.text || current.color!==desired.color))
     : current.mode!==null;
   if(!paused&&engine.hasPersonalSetting?.()){
     // Personal scene preferences persist, even when a shared room revision
     // is polled every eight seconds. They are never silently overwritten.
     lastRevision=data.revision;
     say("Personal saved ceiling preserved. To follow shared settings, restore your original ceiling in AURA World Studio.");
   }else if(!paused&&(data.revision!==lastRevision||diverged)){
     const applied=engine.applyAuthoritative(data.scene,data.updatedAt);
     if(applied!==false){
       lastRevision=data.revision;
       say(data.scene?"Shared scene "+data.scene.mode+" • revision "+data.revision:"Original shared room • revision "+data.revision);
     }
   }
  }catch(err){
   if(!connected)say("Shared scene service not yet active. Local previews remain available.");
   connected=false;
  }finally{busy=false;}
 }
 async function publish(scene){
   if(!admin)throw Error("Only a repository maintainer can approve room-wide changes.");
   const latest=await get();
   if(!confirm("Publish this approved scene to ALL Towerflow visitors? Existing teammates will see the same environment."))return;
   const response=await fetch(endpoint,{
     ...settings,method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({baseRevision:latest.revision,scene:scene??null,reason:"Approved through in-room World Studio"})
   });
   const result=await response.json().catch(()=>({error:"Invalid server response"}));
   if(!response.ok)throw Error(result.error||"Publish failed");
   paused=false;document.dispatchEvent(new Event("tfWorldPreviewEnd"));
   await refresh();
 }
 async function init(){
   let who;
   try{
     const r=await fetch("/api/me",settings);
     if(r.ok)who=await r.json();
   }catch{}
   admin=who?.permission==="admin"||who?.permission==="maintain";
   // UI is additive to the existing panel: old AURA tools remain functional.
   const originalHelp=helpPanel;
   helpPanel=function worldSyncHelp(){
     originalHelp();
     const area=document.getElementById("tfWorldEmulator");
     if(!area||area.querySelector("#tfWorldSyncControls"))return;
     const container=document.createElement("div");
     container.id="tfWorldSyncControls";
     const title=document.createElement("h4");
     title.textContent="SHARED ROOM • APPROVED PUBLISHING";
     const note=document.createElement("p");
     note.textContent="Only maintainers can publish. All teammates then see the authoritative scene; personal previews remain local until approved.";
     container.append(title,note,state);
     if(admin){
       const publishButton=document.createElement("button");
       publishButton.type="button";publishButton.textContent="PUBLISH PREVIEW TO ALL";
       const restoreButton=document.createElement("button");
       restoreButton.type="button";restoreButton.textContent="RESTORE ORIGINAL FOR ALL";
       publishButton.onclick=async()=>{
         publishButton.disabled=true;
         try{await publish(engine.getActive());say("Published authoritative environment.");}
         catch(e){say(e.message);}
         finally{publishButton.disabled=false;}
       };
       restoreButton.onclick=async()=>{
         restoreButton.disabled=true;
         try{await publish(null);say("Restored original shared scene.");}
         catch(e){say(e.message);}
         finally{restoreButton.disabled=false;}
       };
       container.append(publishButton,restoreButton);
     }
     area.append(container);
   };
   await refresh();
   setInterval(refresh,8000);
 }
 init().catch(()=>{});
 window.tfWorldSync=Object.freeze({get connected(){return connected;},refresh,publish});
}());
// TF_SHARED_WORLD_CLIENT_V1_END

// TF_CINEMATIC_V2_BEGIN
(function () {
  "use strict";

  if (window.tfCinematicV2) return;

  const original = {
    exposure: renderer.toneMappingExposure,
    shadowEnabled: renderer.shadowMap.enabled,
    shadowType: renderer.shadowMap.type,
    fog: scene.fog,
    background: scene.background
  };

  const materials = new Map();
  const lights = new Map();
  const meshes = new Map();

  scene.traverse(object => {
    if (object.isMesh) {
      meshes.set(object, {
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow
      });

      const list = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of list) {
        if (!material || materials.has(material)) continue;

        materials.set(material, {
          roughness: material.roughness,
          metalness: material.metalness,
          envMapIntensity: material.envMapIntensity
        });
      }
    }

    if (object.isLight) {
      lights.set(object, {
        intensity: object.intensity,
        castShadow: object.castShadow
      });
    }
  });

  const key = new THREE.DirectionalLight(0xe5efff, 0);
  key.position.set(-9, 10, 5);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;

  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -24;
  key.shadow.camera.right = 24;
  key.shadow.camera.top = 19;
  key.shadow.camera.bottom = -19;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 65;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;

  scene.add(key, key.target);

  let enabled = false;

  function apply() {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;

    renderer.toneMappingExposure = 1.12;

    for (const [object, state] of lights) {
      if (object.isHemisphereLight) {
        object.intensity = state.intensity * 0.52;
      } else if (object.isPointLight) {
        object.intensity = state.intensity * 0.72;
      }
    }

    for (const [material, state] of materials) {
      if (!material || material.isMeshBasicMaterial) continue;

      if (typeof state.roughness === "number") {
        material.roughness = Math.max(0.2, state.roughness * 0.86);
      }

      if (typeof state.metalness === "number") {
        material.metalness = Math.min(0.9, state.metalness);
      }

      material.needsUpdate = true;
    }

    for (const [object] of meshes) {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    }

    if (scene.fog?.isFogExp2) {
      scene.fog.density = 0.009;
    }

    key.intensity = 3.2;
    enabled = true;
  }

  function restore() {
    renderer.shadowMap.enabled = original.shadowEnabled;
    renderer.shadowMap.type = original.shadowType;
    renderer.shadowMap.needsUpdate = true;

    renderer.toneMappingExposure = original.exposure;

    for (const [object, state] of lights) {
      object.intensity = state.intensity;
      object.castShadow = state.castShadow;
    }

    for (const [material, state] of materials) {
      if (typeof state.roughness === "number") {
        material.roughness = state.roughness;
      }

      if (typeof state.metalness === "number") {
        material.metalness = state.metalness;
      }

      if (typeof state.envMapIntensity === "number") {
        material.envMapIntensity = state.envMapIntensity;
      }

      material.needsUpdate = true;
    }

    for (const [object, state] of meshes) {
      object.castShadow = state.castShadow;
      object.receiveShadow = state.receiveShadow;
    }

    if (scene.fog?.isFogExp2) {
      scene.fog.density = 0.014;
    }

    key.intensity = 0;
    enabled = false;
  }

  function toggle() {
    if (enabled) restore();
    else apply();

    console.info(
      "[TowerFlow Cinematic V2]",
      enabled ? "CINEMATIC" : "ORIGINAL"
    );

    return enabled;
  }

  window.addEventListener("keydown", event => {
    if (
      event.altKey &&
      event.code === "KeyV" &&
      !event.repeat &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      toggle();
    }
  });

  window.tfCinematicV2 = Object.freeze({
    toggle,
    enable: () => { if (!enabled) apply(); },
    disable: () => { if (enabled) restore(); },
    get enabled() { return enabled; }
  });

  apply();
  console.info("[TowerFlow Cinematic V2] initialized");
}());
// TF_CINEMATIC_V2_END

// TF_TIER4_ATMOSPHERE_V1_BEGIN
// Opt-in additive atmosphere. Does not change room geometry, navigation or fixtures.
(function () {
  'use strict';
  if (typeof THREE === 'undefined' || typeof scene === 'undefined' || typeof renderer === 'undefined') return;
  if (window.tfTier4Atmosphere) return;
  const KEY = 'towerflow.tier4.atmosphere.v1';
  const settings = { enabled: true, quality: 'auto', intensity: 0.45 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof saved.enabled === 'boolean') settings.enabled = saved.enabled;
    if (['auto','low','balanced','high'].includes(saved.quality)) settings.quality = saved.quality;
    if (Number.isFinite(saved.intensity)) settings.intensity = Math.max(0, Math.min(1, saved.intensity));
  } catch (_) {}
  const authoredFog = scene.fog;
  const group = new THREE.Group();
  group.name = 'TF_TIER4_ATMOSPHERE';
  scene.add(group);
  const fog = authoredFog ? null : new THREE.FogExp2(0x111d29, 0.0012);
  const fill = new THREE.HemisphereLight(0xb5d7ff, 0x28303c, 0);
  group.add(fill);
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({ color: 0xdbe9f5, size: 0.024, transparent: true, opacity: 0.1, depthWrite: false });
  const dust = new THREE.Points(geometry, material);
  group.add(dust);
  let positions, phases, count, raf = 0, last = 0, frames = 0, average = 16.7;
  function desiredCount() {
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    return ({ low: 45, balanced: 110, high: 190 })[settings.quality === 'auto' ? (mobile ? 'low' : 'balanced') : settings.quality];
  }
  function rand(seed) { const n = Math.sin(seed * 127.1 + 78.233) * 43758.5453; return n - Math.floor(n); }
  function rebuild() {
    count = desiredCount();
    positions = new Float32Array(count * 3);
    phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[3*i] = (rand(i*3+1)-0.5)*37;
      positions[3*i+1] = 0.7+rand(i*3+2)*10;
      positions[3*i+2] = (rand(i*3+3)-0.5)*28;
      phases[i] = rand(i+812)*Math.PI*2;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  function apply() {
    group.visible = settings.enabled;
    if (!authoredFog && (scene.fog === null || scene.fog === fog)) scene.fog = settings.enabled && settings.intensity > 0 ? fog : null;
    if (fog) fog.density = 0.0006 + settings.intensity * 0.0015;
    fill.intensity = settings.enabled ? settings.intensity * 0.17 : 0;
    material.opacity = settings.enabled ? settings.intensity * 0.23 : 0;
  }
  rebuild(); apply();
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!settings.enabled || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, Math.max(0, (now - (last || now))/1000)); last = now;
    average = average * 0.98 + dt * 1000 * 0.02;
    if (++frames % 2) return;
    for (let i = 0; i < count; i++) {
      const p = 3*i, t = now*0.00011+phases[i];
      positions[p] += (Math.sin(t*0.73+positions[p+2]*0.1)*0.012+0.001)*dt;
      positions[p+1] += Math.sin(t+phases[i])*0.004*dt;
      positions[p+2] += Math.cos(t*0.83+positions[p]*0.1)*0.012*dt;
      if (positions[p] > 18.5) positions[p] = -18.5;
    }
    geometry.attributes.position.needsUpdate = true;
    if (settings.quality === 'auto' && frames % 240 === 0 && average > 28) { settings.quality = 'low'; rebuild(); }
  }
  raf = requestAnimationFrame(tick);
  function configure(patch = {}) {
    if (typeof patch.enabled === 'boolean') settings.enabled = patch.enabled;
    if (['auto','low','balanced','high'].includes(patch.quality)) settings.quality = patch.quality;
    if (Number.isFinite(patch.intensity)) settings.intensity = Math.max(0, Math.min(1, patch.intensity));
    if (desiredCount() !== count) rebuild();
    apply();
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    return { ...settings };
  }
  function dispose() {
    cancelAnimationFrame(raf);
    if (!authoredFog && scene.fog === fog) scene.fog = null;
    scene.remove(group); geometry.dispose(); material.dispose();
    delete window.tfTier4Atmosphere;
  }
  window.tfTier4Atmosphere = Object.freeze({ configure, get settings() { return { ...settings }; }, dispose });
}());
// TF_TIER4_ATMOSPHERE_V1_END

// TF_FRONTIER_MATERIAL_REALISM_V1_BEGIN
// Reversible, asset-free surface upgrade; preserves navigation, panels, geometry and world state.
(function(){
  "use strict";
  if(window.tfFrontierMaterialRealism)return;
  const previous={floorMap:floor.map,wallMap:wall.map,floorColor:floor.color.clone(),wallColor:wall.color.clone(),
    floorRoughness:floor.roughness,wallRoughness:wall.roughness,exposure:renderer.toneMappingExposure};
  const generated=[];
  function surface(kind){
    const canvas=document.createElement("canvas");canvas.width=canvas.height=512;
    const ctx=canvas.getContext("2d");if(!ctx)return null;
    const image=ctx.createImageData(512,512);
    // Seeded fine-grain mineral plaster / stone: stable across refreshes, no network assets.
    let seed=kind==="floor"?92173:37199;
    function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const i=(y*512+x)*4;
      const grain=(rand()-.5)*23;
      const vein=Math.sin(x*.028+y*.014+Math.sin(y*.032)*2.3)*3;
      const base=kind==="floor"?[77,83,87]:[89,94,96];
      for(let k=0;k<3;k++)image.data[i+k]=Math.max(0,Math.min(255,base[k]+grain+vein));
      image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);
    ctx.strokeStyle=kind==="floor"?"rgba(25,29,32,.34)":"rgba(34,37,39,.19)";
    ctx.lineWidth=2;
    if(kind==="floor"){
      for(let x=0;x<=512;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
      for(let y=0;y<=512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
    }else{
      for(let y=0;y<=512;y+=256){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
    }
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    tex.repeat.set(kind==="floor"?6:3,kind==="floor"?5:2);
    generated.push(tex);return tex;
  }
  function apply(){
    floor.map=surface("floor");wall.map=surface("wall");
    floor.color.set("#ffffff");wall.color.set("#ffffff");
    floor.roughness=.86;wall.roughness=.92;
    floor.metalness=.06;wall.metalness=.04;
    floor.needsUpdate=true;wall.needsUpdate=true;
  }
  try{apply();}catch(error){console.warn("Frontier material upgrade unavailable",error);}
  window.tfFrontierMaterialRealism=Object.freeze({dispose(){
    floor.map=previous.floorMap;wall.map=previous.wallMap;
    floor.color.copy(previous.floorColor);wall.color.copy(previous.wallColor);
    floor.roughness=previous.floorRoughness;wall.roughness=previous.wallRoughness;
    floor.needsUpdate=true;wall.needsUpdate=true;
    generated.forEach(t=>t.dispose());delete window.tfFrontierMaterialRealism;
  }});
}());
// TF_FRONTIER_MATERIAL_REALISM_V1_END

// TF_REFERENCE_STUDIO_V1_BEGIN
(function(){
"use strict";
if(window.tfReferenceStudio)return;
const group=new THREE.Group();group.name="TF_REFERENCE_STUDIO_V1";
const materials=[];
function mat(color,metalness,roughness,emissive=0,intensity=0){const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity});materials.push(m);return m;}
const graphite=mat(0x171b21,.12,.83),black=mat(0x090d12,.07,.91),steel=mat(0x687781,.62,.28),cyan=mat(0x12d4ed,.05,.38,0x00b9ee,1.9),green=mat(0x3af557,.05,.39,0x14dc34,1.6),upholstery=mat(0x11161a,.02,.98),monitor=mat(0x112c3d,.05,.22,0x065b8d,.36);
function cube(w,h,d,x,y,z,m){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
for(const z of [-14.7,14.7])cube(37,.065,.075,0,10.7,z,cyan);
for(const x of [-19.6,19.6])cube(.075,.065,27,x,10.7,0,cyan);
for(const x of [-18.6,-18.25,-17.9,-17.55,17.55,17.9,18.25,18.6])cube(.16,5.4,.18,x,6.5,-15.35,black);
for(const x of [-16.9,16.9]){
 const z=11.8;
 cube(3.1,.13,1.4,x,1.23,z,graphite);
 for(const dx of [-1.35,1.35])for(const dz of [-.52,.52])cube(.09,1.15,.09,x+dx,.58,z+dz,steel);
 cube(1.45,.87,.075,x,2.03,z-.43,black);
 cube(1.32,.72,.012,x,2.03,z-.38,monitor);
 cube(.075,.42,.075,x,1.49,z-.43,steel);
 cube(.5,.055,.37,x,1.35,z+.35,black);
 cube(1.35,.22,.64,x,.48,z+1.65,upholstery);
 cube(1.35,.72,.18,x,.84,z+1.95,upholstery);
 cube(2.8,.045,.07,x,.12,z+1.15,green);
}
for(const z of [-12.5,-12.15,-11.8,-11.45,11.45,11.8,12.15,12.5])cube(.14,4.4,.14,-20.42,6.5,z,black);
scene.add(group);
window.tfReferenceStudio=Object.freeze({dispose(){scene.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose();});materials.forEach(m=>m.dispose());delete window.tfReferenceStudio;}});
}());
// TF_REFERENCE_STUDIO_V1_END

// TF_CAPITAL_WORLD_V1_BEGIN
// Real geometrical openings and 3D city layers are generated outside the existing rooms.
// Independent browser-only activity selection, no world-sync publication or changes to tools.
try{installCapitalWorld({THREE,scene,renderer,document});}
catch(error){console.error('Capital exterior unavailable; original TowerFlow remains active.',error);}
// TF_CAPITAL_WORLD_V1_END
