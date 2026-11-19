'use strict';
// Deliberately explicit: one repo, audited source paths, no client-controlled path.
const fs=require('node:fs/promises');
const path=require('node:path');
const SOURCE_AREAS=Object.freeze({
  ui:{label:'UI / Interface',file:'TowerFlow/styles.css',anchor:':root{',description:'Theme tokens and layout styling'},
  dashboard:{label:'Dashboard',file:'TowerFlow/index.html',anchor:'INVESTMENT WORKSPACE / OVERVIEW',description:'Dashboard headline, metrics and layout'},
  markets:{label:'Markets',file:'TowerFlow/app.js',anchor:'function marketTick(){',description:'Market session timer and labels'},
  watchlist:{label:'Watchlist',file:'TowerFlow/app.js',anchor:'$("watchlist").innerHTML=',description:'Watchlist rendering'},
  portfolio:{label:'Portfolio',file:'TowerFlow/app.js',anchor:'function totals(){',description:'Portfolio totals and positions'},
  holdings:{label:'Holdings',file:'TowerFlow/app.js',anchor:'$("holdingsBody").innerHTML=',description:'Holdings table rendering'},
  trading:{label:'Trading',file:'TowerFlow/app.js',anchor:'function transact(',description:'Buy/sell transaction handling'},
  analytics:{label:'Analytics',file:'TowerFlow/app.js',anchor:'function project(){',description:'What-if projections'},
  charts:{label:'Charts',file:'TowerFlow/app.js',anchor:'function drawChart(){',description:'Portfolio allocation chart'},
  settings:{label:'Settings',file:'TowerFlow/app.js',anchor:'$("themeSelect").addEventListener(',description:'Theme selection and persistence'},
  backend:{label:'Backend / API',file:'TowerFlow/server.js',anchor:'require(',description:'App server; inspect actual entry point'},
  room:{label:'Collaboration Room',file:'collaboration-room/azure-bridge/desk.js',anchor:'const root =',description:'Room contributor desk and APIs'}
});
function areaFor(id){if(typeof id!=='string'||!Object.hasOwn(SOURCE_AREAS,id))throw Error('Unknown source area');return SOURCE_AREAS[id];}
function sourceLine(source,id){
  const entry=areaFor(id),at=source.indexOf(entry.anchor);
  if(at<0)throw Error('Source anchor missing for '+id+'. Refresh mapping before editing.');
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
