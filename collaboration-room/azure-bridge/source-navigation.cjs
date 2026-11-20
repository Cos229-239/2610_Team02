'use strict';
// Deliberately explicit: one repo, audited source paths, no client-controlled path.
const fs=require('node:fs/promises');
const path=require('node:path');
const SOURCE_AREAS=Object.freeze({
  ui:{label:'UI / Interface',file:'TowerFlow/styles.css',anchor:':root{',description:'Theme tokens and layout styling',related:['TowerFlow/index.html','TowerFlow/app.js'],debugProfile:'web'},
  dashboard:{label:'Dashboard',file:'TowerFlow/index.html',anchor:'INVESTMENT WORKSPACE / OVERVIEW',description:'Dashboard headline, metrics and layout',related:['TowerFlow/styles.css','TowerFlow/app.js'],debugProfile:'web'},
  markets:{label:'Markets',file:'TowerFlow/app.js',anchor:'function marketTick(){',description:'Market session timer and labels'},
  watchlist:{label:'Watchlist',file:'TowerFlow/app.js',anchor:'$("watchlist").innerHTML=',description:'Watchlist rendering'},
  portfolio:{label:'Portfolio',file:'TowerFlow/app.js',anchor:'function totals(){',description:'Portfolio totals and positions'},
  holdings:{label:'Holdings',file:'TowerFlow/app.js',anchor:'$("holdingsBody").innerHTML=',description:'Holdings table rendering'},
  trading:{label:'Trading',file:'TowerFlow/app.js',anchor:'function transact(',description:'Buy/sell transaction handling'},
  analytics:{label:'Analytics',file:'TowerFlow/app.js',anchor:'function project(){',description:'What-if projections'},
  charts:{label:'Charts',file:'TowerFlow/app.js',anchor:'function drawChart(){',description:'Portfolio allocation chart'},
  settings:{label:'Settings',file:'TowerFlow/app.js',anchor:'$("themeSelect").addEventListener(',description:'Theme selection and persistence'},
  backend:{label:'Backend / API',file:'TowerFlow/server.js',anchor:"const http = require(\"node:http\");",description:'Web application server entry point',related:['TowerFlow/app.js'],debugProfile:'node'},
  room:{label:'Collaboration Room',file:'collaboration-room/azure-bridge/desk.js',anchor:'const root =',description:'Contributor desk UI and controls',related:['collaboration-room/live-room/public/room.js','collaboration-room/azure-bridge/server.cjs'],debugProfile:'room'},
  roomscene:{label:'3D Room Scene',file:'collaboration-room/live-room/public/room.js',anchor:'// TF_PHYSICAL_WORKSTATIONS_V1_BEGIN',description:'Physical workstation meshes and E/click interactions',related:['collaboration-room/azure-bridge/ide-workstations.js'],debugProfile:'room'}
});
function areaFor(id){if(typeof id!=='string'||!Object.hasOwn(SOURCE_AREAS,id))throw Error('Unknown source area');return SOURCE_AREAS[id];}
function sourceLine(source,id){
  const entry=areaFor(id),at=source.indexOf(entry.anchor);
  if(at<0)throw Error('Source anchor missing for '+id+'. Refresh mapping before editing.');
  if(source.indexOf(entry.anchor,at+entry.anchor.length)!==-1)throw Error('Ambiguous source anchor for '+id+'. Requires a reviewed mapping before opening.');
  return 1+source.slice(0,at).split('\n').length-1;
}
async function sourceTarget(checkout,id){
  const entry=areaFor(id);
  const root=await fs.realpath(checkout);
  const target=path.resolve(root,entry.file);
  if(!target.startsWith(root+path.sep))throw Error('Source path outside checkout');
  const real=await fs.realpath(target);
  if(!real.startsWith(root+path.sep))throw Error('Symlink escapes workspace');
  const src=await fs.readFile(real,'utf8');
  const line=sourceLine(src,id);
  return {area:id,file:entry.file,fullPath:real,line,label:entry.label};
}
module.exports={SOURCE_AREAS,areaFor,sourceLine,sourceTarget};
