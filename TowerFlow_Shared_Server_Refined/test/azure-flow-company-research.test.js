'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {subjects,researchBusiness,observation,urlFor,wikipediaBackground}=require('../lib/azure-flow-company-research');
const {responseSummary}=require('../lib/azure-flow-intelligence');
const {createApp}=require('../server');
function entity(id,label,desc,site){
 return {id,labels:{en:{value:label}},descriptions:{en:{value:desc}},
   claims:{P31:[{rank:'normal',mainsnak:{snaktype:'value',
     datavalue:{value:{id:'Q4830453'}}}}],
   ...(site?{P856:[{mainsnak:{snaktype:'value',datavalue:{value:site}}}]}:{})}};
}
const mock={
 Q41187:entity('Q41187','Sony Group Corporation','Japanese multinational conglomerate corporation','https://www.sony.com/'),
 Q2283:entity('Q2283','Microsoft','American multinational technology corporation','https://www.microsoft.com/')
};
const calls=[];
async function requester(url){
 calls.push(url);
 const parsed=new URL(url);
 const action=parsed.searchParams.get('action');
 if(action==='wbsearchentities'){
   const q=parsed.searchParams.get('search');
   if(q==='Sony')return {search:[{id:'Q41187',label:'Sony Group Corporation',match:{text:'Sony'}}]};
   if(q==='Microsoft')return {search:[{id:'Q2283',label:'Microsoft',match:{text:'Microsoft'}}]};
   if(q==='Example')return {search:[{id:'Q41187',label:'Sony Group Corporation'}]};
   return {search:[]};
 }
 if(action==='wbgetentities'){
   const ids=parsed.searchParams.get('ids').split('|');
   return {entities:Object.fromEntries(ids.map(id=>[id,mock[id]]).filter(x=>x[1]))};
 }
 throw Error('unexpected endpoint');
}
test('company prompts normalize varied generic business requests, no names hardcoded',()=>{
 assert.deepEqual(subjects('Investigate Sony'),['Sony']);
 assert.deepEqual(subjects('Compare Sony and Microsoft'),['Sony','Microsoft']);
 assert.deepEqual(subjects('research Microsoft'),['Microsoft']);
 assert.deepEqual(subjects('Sony, Microsoft'),['Sony','Microsoft']);
 assert.throws(()=>subjects(''),/Enter a business name/);
 assert.throws(()=>subjects('Sony, Microsoft, Apple, Samsung'),/one to three/);
});
test('real provider protocol yields sourced Sony and Microsoft profiles with exact alias',async()=>{
 calls.length=0;
 const result=await researchBusiness('Compare Sony and Microsoft',{requester,now:Date.parse('2026-11-22T23:00:00Z')});
 assert.equal(result.status,'SOURCES_FOUND');
 assert.equal(result.hits.length,2);
 assert.deepEqual(result.outcomes.map(x=>x.status),['ENTITY_MATCHED','ENTITY_MATCHED']);
 assert.ok(result.hits[0].excerpt.includes('Japanese multinational'));
 assert.ok(result.hits[1].excerpt.includes('American multinational'));
 assert.match(result.hits[0].url,/wikidata\.org\/wiki\/Q41187/);
 assert.match(result.hits[1].sha256,/^[a-f0-9]{64}$/);
 assert.ok(calls.every(x=>x.startsWith('https://www.wikidata.org/w/api.php?')));
 const answer=responseSummary(null,[{capability:'research.company',status:result.status,evidence:result.hits}]);
 assert.match(answer,/Sony Group Corporation/);assert.match(answer,/Microsoft/);
 assert.doesNotMatch(answer,/revenue of \$/);
});
test('observed search collision: Microsoft exact label outranks products, Sony Group parent selected only with organization evidence',async()=>{
 const seen=[];
 const source=async url=>{
  const u=new URL(url);
  seen.push(u.searchParams.get('action')+':'+(u.searchParams.get('search')||u.searchParams.get('ids')));
  if(u.searchParams.get('action')==='wbsearchentities'){
   if(u.searchParams.get('search')==='Microsoft')return {search:[
    {id:'Q2283',label:'Microsoft',description:'American multinational technology corporation',match:{text:'Microsoft'}},
    {id:'Q1406',label:'Microsoft Windows',description:'operating system',match:{text:'Microsoft'}},
    {id:'Q135288',label:'Microsoft Store',description:'application store',match:{text:'Microsoft'}}]};
   return {search:[
    {id:'Q41187',label:'Sony Group',description:'Japanese multinational conglomerate corporation',match:{text:'Sony'}},
    {id:'Q10683',label:'PlayStation 3',description:'video game console',match:{text:'Sony'}},
    {id:'Q330629',label:'Sony Music',description:'music company',match:{text:'Sony'}}]};
  }
  const id=u.searchParams.get('ids');
  return {entities:{[id]:id==='Q41187'?entity('Q41187','Sony Group',
    'Japanese multinational conglomerate corporation'):mock.Q2283}};
 };
 const got=await researchBusiness('Compare Sony and Microsoft',{requester:source});
 assert.deepEqual(got.outcomes.map(x=>x.status),['ENTITY_MATCHED','ENTITY_MATCHED']);
 assert.deepEqual(got.outcomes.map(x=>x.id),['Q41187','Q2283']);
 assert.deepEqual(got.outcomes.map(x=>x.resolution),['RANKED_PARENT_ORGANIZATION','EXACT_ENTITY_LABEL']);
 assert.deepEqual(seen.filter(x=>x.startsWith('wbgetentities:')),
   ['wbgetentities:Q41187','wbgetentities:Q2283']);
 const obscure=await researchBusiness('Sony',{requester:async url=>{
  const u=new URL(url);
  if(u.searchParams.get('action')==='wbsearchentities')return {search:[
   {id:'Q41187',label:'Sony Group',description:'Japanese multinational conglomerate corporation',match:{text:'Sony'}},
   {id:'Q330629',label:'Sony Music',description:'music company',match:{text:'Sony'}}]};
  return {entities:{Q41187:entity('Q41187','Sony Group','Japanese multinational conglomerate corporation')}};
 }});
 assert.equal(obscure.outcomes[0].status,'ENTITY_MATCHED');
 const noGuess=await researchBusiness('Sony',{requester:async()=>({search:[
   {id:'Q330629',label:'Sony Music',description:'music company',match:{text:'Sony'}},
   {id:'Q10683',label:'PlayStation 3',description:'video game console',match:{text:'Sony'}}]
 })});
 assert.equal(noGuess.hits.length,0);
 assert.equal(noGuess.outcomes[0].status,'AMBIGUOUS_OR_NOT_EXACT');
});
test('ambiguous and unavailable company matches do not invent facts',async()=>{
 const unmatched=await researchBusiness('Example',{requester});
 assert.equal(unmatched.hits.length,0);
 assert.equal(unmatched.outcomes[0].status,'AMBIGUOUS_OR_NOT_EXACT');
 const unavailable=await researchBusiness('Sony',{requester:async()=>{throw Error('blocked')}});
 assert.equal(unavailable.hits.length,0);
 assert.equal(unavailable.outcomes[0].status,'SOURCE_UNAVAILABLE');
 assert.equal(observation({id:'Q9',labels:{en:{value:'Random'}},
   descriptions:{en:{value:'fictional fictional'}},claims:{}},'Random',Date.now()),null);
});
test('linked Wikipedia business context requires exact article identity and is source-attributed',async()=>{
 const t='Sony';
 const hits=[];
 const provider=async(url,options)=>{
   hits.push(url);
   return {ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify({
     query:{pages:[{pageid:9123,title:t,extract:
       'Sony Group Corporation is a Japanese multinational conglomerate corporation. The group operates across entertainment, gaming, imaging, and electronics businesses.'}]}
   }))};
 };
 const background=await wikipediaBackground(t,{fetchImpl:provider,now:Date.parse('2026-11-22T23:00:00Z')});
 assert.equal(background.source,'English Wikipedia (community-edited)');
 assert.match(background.excerpt,/entertainment, gaming/);
 assert.equal(background.url,'https://en.wikipedia.org/wiki/Sony');
 assert.ok(hits[0].startsWith('https://en.wikipedia.org/w/api.php?'));
 const wrong=await wikipediaBackground(t,{fetchImpl:async()=>({
   ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify({query:{pages:[{
     pageid:9123,title:'Other',extract:'Unrelated article with sufficient text to pass a basic string-length threshold.'}]}}))
 })});
 assert.equal(wrong,null);
});
test('authenticated HTTP company mode bypasses LLM and SEC with mandatory consent',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-company-'));
 let calls=0,plannerInput=null;
 const app=createApp({directory,researchImpl:async(question,params)=>{
   calls++;
   plannerInput=await params.planner(question);
   return {schema:'azure-flow-investigation/v1',answer:'Sourced company results',
     plan:{status:plannerInput.status,capabilities:plannerInput.capabilities},
     provenance:{evidenceId:'a'.repeat(64)},sources:[]};
 }});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>app.close(resolve));fs.rmSync(directory,{recursive:true,force:true})});
 const base='http://127.0.0.1:'+app.address().port;
 const post=(url,body,cookie='')=>fetch(base+url,{method:'POST',
   headers:{Origin:base,'X-TowerFlow-Request':'1','Content-Type':'application/json',
     ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 assert.equal((await post('/api/azure-flow/research',{question:'Sony',allowPublic:true,sourceMode:'company'})).status,401);
 const setup=await post('/api/auth/setup',{username:'companyowner',password:'CompanyTestPass!2026'});
 assert.equal(setup.status,201);
 const cookie=setup.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('/api/azure-flow/research',{question:'Sony',allowPublic:false,sourceMode:'company'},cookie)).status,400);
 assert.equal(calls,0);
 const result=await post('/api/azure-flow/research',{question:'Compare Sony and Microsoft',allowPublic:true,sourceMode:'company'},cookie);
 assert.equal(result.status,200);
 const obj=await result.json();
 assert.equal(obj.plan.status,'USER_SELECTED_COMPANY_RESEARCH');
 assert.deepEqual(obj.plan.capabilities,['research.company']);
 assert.equal(calls,1);
 assert.equal(fs.existsSync(path.join(directory,'inventory.json')),false);
});
test('UI defaults to publicly sourced business research but retains experimental and SEC options',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'..','public','azure-flow.js'),'utf8');
 assert.match(html,/<option value="company" selected>/);
 assert.match(html,/data-af-example="Microsoft"/);
 assert.match(js,/USER_SELECTED_COMPANY_RESEARCH/);
 assert.match(js,/www\\.wikidata\\.org/);
});
