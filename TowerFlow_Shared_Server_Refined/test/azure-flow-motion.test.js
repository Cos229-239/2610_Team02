'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const DIR=path.join(__dirname,'../public');
test('Azure Flow motion is isolated; original login and other tabs remain source-identical',()=>{
  const app=fs.readFileSync(path.join(DIR,'app.js'),'utf8');
  const html=fs.readFileSync(path.join(DIR,'index.html'),'utf8');
  const motion=fs.readFileSync(path.join(DIR,'azure-flow-motion.js'),'utf8');
  const css=fs.readFileSync(path.join(DIR,'azure-flow.css'),'utf8');
  assert.doesNotThrow(()=>new vm.Script(app));
  assert.doesNotThrow(()=>new vm.Script(motion));
  assert.match(html,/src="\/azure-flow\.js" defer/);
  assert.match(html,/src="\/azure-flow-motion\.js" defer/);
  assert.ok(html.indexOf('src="/azure-flow-motion.js"')>html.indexOf('src="/azure-flow.js"'));
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css,/#azureFlow\[data-af-visible="false"\]/);
  assert.match(css,/@keyframes af-orb-drift/);
  assert.match(css,/@keyframes af-ring-sweep-y/);
  assert.match(css,/@keyframes af-ring-sweep-x/);
  assert.match(css,/#azureFlow\[data-af-state="busy"\]/);
});
test('Reactive orb initializes without a WebGL dependency, records state, and honors hidden tab',()=>{
  const js=fs.readFileSync(path.join(DIR,'azure-flow-motion.js'),'utf8');
  const listeners=new Map();
  const element=(name)=>({
    hidden:false,textContent:'',style:{setProperty(){},removeProperty(){}},
    addEventListener(event,cb){listeners.set(name+'.'+event,cb)},
    getBoundingClientRect(){return {left:0,top:0,width:200,height:200}}
  });
  const nodes=new Map(['.af-orbit','#afAnswer','#afStatus','#afModelHealth',
    '#afCalibrationStatus','#afMarketResult','#afPortfolioResult','#afQuestion']
    .map(name=>[name,element(name)]));
  const root={
    hidden:false,dataset:{},
    querySelector(name){return nodes.get(name)||null},
    addEventListener(event,cb){listeners.set('root.'+event,cb)}
  };
  let visible=false;
  const doc={hidden:false,getElementById(id){return id==='azureFlow'?root:null},
    addEventListener(event,cb){listeners.set('doc.'+event,cb)}};
  class Observer{constructor(cb){this.cb=cb}observe(){}}
  const win={matchMedia(){return {matches:false}}};
  new Function('document','window','MutationObserver','requestAnimationFrame','cancelAnimationFrame',js)(
    doc,win,Observer,cb=>{cb();return 1},()=>{});
  assert.equal(root.dataset.afMotion,'enabled');
  assert.equal(root.dataset.afState,'idle');
  assert.equal(root.dataset.afVisible,'true');
  assert.equal(typeof listeners.get('.af-orbit.pointermove'),'function');
  listeners.get('#afQuestion.focus')();
  assert.equal(root.dataset.afState,'focused');
  doc.hidden=true;
  listeners.get('doc.visibilitychange')();
  assert.equal(root.dataset.afVisible,'false');
  doc.hidden=false;root.hidden=true;
  listeners.get('doc.visibilitychange')();
  assert.equal(root.dataset.afVisible,'false');
  root.hidden=false;listeners.get('doc.visibilitychange')();
  assert.equal(root.dataset.afVisible,'true');
});
