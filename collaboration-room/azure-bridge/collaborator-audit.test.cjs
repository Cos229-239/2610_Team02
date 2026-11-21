'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {targets,summarize,makeCollaboratorAudit}=require('./collaborator-audit.cjs');
const h='a'.repeat(40), c='b'.repeat(40), d='c'.repeat(40);
test('expected files absent from both refs are red and not called broken',()=>{
 const t=targets.lopobunnie;
 const r=summarize(t,[],[],{});
 assert.equal(r.counts.red,4);
 assert.equal(r.notWorking.length,0);
 assert.equal(r.working.length,0);
 assert.equal(r.missing.length,4);
 assert.ok(r.files.every(f=>f.color==='red'&&f.runtime==='unverified'));
});
test('personal-only source is amber and cannot masquerade as merged dev',()=>{
 const t=targets.lopobunnie;
 const r=summarize(t,[],[{path:t.expected[0]}],{});
 assert.equal(r.files[0].color,'amber');
 assert.equal(r.files[0].inDev,false);
 assert.equal(r.files[0].inPersonal,true);
});
test('verified author history distinguishes source evidence from passing runtime',()=>{
 const t=targets.daynaperezcolon,path=t.expected[0];
 const r=summarize(t,[{path}],[],{[path]:true});
 assert.equal(r.files[0].color,'green');
 assert.equal(r.files[0].runtime,'unverified');
 assert.equal(r.working.length,0);
});
test('audit fetches exact dev tree and checks author scoped by path, with 30s cache',async()=>{
 const t=targets.daynaperezcolon;const path=t.expected[0];let calls=[];
 const read=async(url,opts)=>{
  const u=new URL(url);calls.push(u);
  assert.equal(opts.headers.Authorization,'Bearer own-session');
  if(u.pathname.endsWith('/commits/dev'))return {ok:true,json:async()=>({sha:h,commit:{tree:{sha:c}}})};
  if(u.pathname.endsWith('/git/trees/'+c))return {ok:true,json:async()=>({truncated:false,tree:[{type:'blob',path}]})};
  if(u.pathname.endsWith('/commits')&&u.searchParams.has('path')){
   assert.equal(u.searchParams.get('author'),t.login);
   return {ok:true,json:async()=>[{sha:d}]};
  }
  throw Error('Unexpected GitHub endpoint '+url);
 };
 let tick=12345;const audit=makeCollaboratorAudit(read,()=>tick);
 const a=await audit(t.login,'own-session'),b=await audit(t.login,'own-session');
 assert.deepEqual(a,b); assert.equal(calls.length,3);assert.equal(a.revision,h);
 assert.equal(a.files[0].color,'green');
 tick+=31000;
 await audit(t.login,'own-session');assert.equal(calls.length,6);
});
test('unknown account is rejected before making any GitHub call',async()=>{
 const audit=makeCollaboratorAudit(async()=>{throw Error('should not fetch')});
 await assert.rejects(audit('Unknown','token'),{status:400});
});
