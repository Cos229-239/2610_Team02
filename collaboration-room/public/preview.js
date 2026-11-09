import * as THREE from 'https://esm.sh/three@0.169.0';
import {installWorldInput,moveWorld} from '../input/world-movement.js';
const scene=new THREE.Scene();scene.background=new THREE.Color('#080f1a');scene.fog=new THREE.Fog('#080f1a',23,85);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,140);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x96d7ff,0x1d2944,2));
const key=new THREE.PointLight(0x2cbcf8,75,45);key.position.set(0,8,1);scene.add(key);
const amber=new THREE.PointLight(0xffc57c,65,28);amber.position.set(-14,5,-8);scene.add(amber);
function box(x,y,z,w,h,d,color,emissive=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.56,metalness:.4,emissive,emissiveIntensity:.2}));mesh.position.set(x,y,z);scene.add(mesh);return mesh}
box(0,-.15,0,42,.3,32,0x263345);box(0,9,0,42,.3,32,0x182339);for(const z of [-16,16])box(0,4,z,42,8,.35,0x26364b);for(const x of [-21,21])box(x,4,0,.35,8,32,0x26364b);
for(let x=-18;x<=18;x+=6){box(x,.02,0,.10,.045,30,0x21bfd6,0x21bfd6);box(x,8.7,0,.1,.12,30,0x21bfd6,0x21bfd6)}
box(0,1,-2,7,2,4,0x354258);box(0,2.55,-2,5,.1,3,0x42deec,0x42deec);
for(const [x,z] of [[-15,-9],[15,-9],[-15,9],[15,9]]){box(x,1,z,4,2,3,0x354d60);box(x,2.5,z,3,.08,2.5,0x24adc1,0x24adc1)}
const player=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.45,1.0,4,8),new THREE.MeshStandardMaterial({color:0x65dfff,emissive:0x127aa3,emissiveIntensity:.35}));body.position.y=1.1;player.add(body);scene.add(player);
const position={x:0,z:9},input=installWorldInput();let yaw=0,pitch=.28,old=performance.now();const status=document.getElementById('status');
function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-old)/1000,.1);old=now;
const next=moveWorld(position,input.pressed,dt);position.x=next.x;position.z=next.z;player.position.set(position.x,0,position.z);
if(input.pressed.has('j'))yaw+=dt*1.3;if(input.pressed.has('l'))yaw-=dt*1.3;
if(input.pressed.has('i'))pitch=Math.min(1.1,pitch+dt*.8);if(input.pressed.has('k'))pitch=Math.max(-.35,pitch-dt*.8);
const radius=9;camera.position.set(position.x+Math.sin(yaw)*radius,5+pitch*7,position.z+Math.cos(yaw)*radius);camera.lookAt(position.x,1.4,position.z);renderer.render(scene,camera);status.textContent='World position: '+position.x.toFixed(1)+', '+position.z.toFixed(1)+(input.pressed.has('shift')?' · SPRINT':'');
}requestAnimationFrame(tick);window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
