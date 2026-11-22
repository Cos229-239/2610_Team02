'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {emptyInventory}=require('../lib/inventory');
const {validatePlan,authorized,execute}=require('../lib/azure-flow-capabilities');
const {plan,investigate}=require('../lib/azure-flow-intelligence');
const {validate:synthesisValidation}=require('../lib/azure-flow-synthesis');
const {retrieve,rank}=require('../lib/azure-flow-retrieval');
const {publicSearch}=require('../lib/azure-flow-public-research');
const {reportMarkdown,persist}=require('../lib/azure-flow-evidence-record');
const learning=require('../lib/azure-flow-learning');

function cleanup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'tf-azure-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root}
test('model-selected harnesses must be both registered and authorized',()=>{
  const local=authorized({allowPublic:false});
  assert.equal(local.some(h=>h.id==='research.public'),false);
  assert.equal(authorized({allowPublic:true}).some(h=>h.id==='research.public'),true);
  assert.deepEqual(validatePlan({capabilities:['knowledge.markdown','workspace.inventory'],question:'Audit this business'},local).capabilities,
    ['knowledge.markdown','workspace.inventory']);
  assert.throws(()=>validatePlan({capabilities:['research.public'],question:'Search'},local),/Unauthorized/);
  assert.throws(()=>validatePlan({capabilities:['shell.exec'],question:'Execute shell'},local),/Unauthorized/);
  assert.throws(()=>validatePlan({capabilities:['workspace.inventory','workspace.inventory'],question:'Duplicate'},local),/Unauthorized/);
});
test('local semantic retrieval does not follow unregistered paths or symlinks',t=>{
  const root=cleanup(t);const dir=path.join(root,'docs/azure-flow/knowledge');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'cash-flow.md'),'# Cash flow\nCash runway is the available cash divided by net operating burn. Compare liquidity and timing, not only revenue.');
  fs.writeFileSync(path.join(root,'secret.txt'),'top secret cash financial private credentials');
  const found=retrieve('cash runway burn',{root});
  assert.ok(found.hits.length>0);
  assert.ok(found.hits[0].source.includes('cash-flow.md'));
  assert.equal(JSON.stringify(found).includes('secret.txt'),false);
  assert.equal(JSON.stringify(found).includes('top secret'),false);
  assert.ok(found.hits[0].sha256.length===64);
});
test('optional public source never invents data on provider block',async()=>{
  const blocked=await publicSearch('Microsoft',{fetchImpl:async()=>{throw Error('blocked')}});
  assert.equal(blocked.status,'PROVIDER_UNAVAILABLE');
  assert.deepEqual(blocked.hits,[]);
  const response=await publicSearch('Microsoft',{fetchImpl:async()=>({
    ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify({query:{pages:[{
      pageid:42,title:'Microsoft',fullurl:'https://en.wikipedia.org/wiki/Microsoft',
      extract:'Microsoft is a technology company founded decades ago. This is a test excerpt for provenance verification.'
    }]}}))
  })});
  assert.equal(response.status,'SOURCES_FOUND');
  assert.equal(response.hits[0].url,'https://en.wikipedia.org/wiki/Microsoft');
  assert.equal(response.hits[0].sha256.length,64);
  assert.match(response.hits[0].limitations,/Background only/);
});
test('model cannot change question, use arbitrary tools or override public approval',async()=>{
  const question='Explain company strategy';
  const proposer=await plan(question,{allowPublic:false,model:'dolphin-llama3:8b',
    requester:async(route)=>route==='/api/tags'?
      {models:[{name:'dolphin-llama3:8b'}]}:
      {message:{content:JSON.stringify({capabilities:['knowledge.markdown'],question:'Different invented company'})}}});
  assert.equal(proposer.status,'MODEL_PLAN_VALIDATED');
  assert.equal(proposer.question,question);
  assert.equal(proposer.modelInterpretation,'Different invented company');
  const blocked=await plan(question,{allowPublic:false,requester:async route=>route==='/api/tags'?
    {models:[{name:'dolphin-llama3:8b'}]}:
    {message:{content:JSON.stringify({capabilities:['research.public'],question})}}});
  assert.equal(blocked.status,'MODEL_UNAVAILABLE');
  assert.deepEqual(blocked.capabilities,['knowledge.markdown']);
});
test('source-bound synthesis rejects quote mismatch and injected extra keys',()=>{
  const sources=[{sourceId:'A',excerpt:'The filing states cash balances rose in the observed quarter.'}];
  const correct={hypothesis:'The recorded balances may support liquidity.',nextStep:'Check the filing directly.',
    observations:[{sourceId:'A',quote:'cash balances rose in the observed quarter'}],unknowns:['Audit status']};
  assert.equal(synthesisValidation({message:{content:JSON.stringify(correct)}},sources).observations[0].sourceId,'A');
  assert.throws(()=>synthesisValidation({message:{content:JSON.stringify({
    ...correct,observations:[{sourceId:'A',quote:'Cash balances doubled without proof'}]})}},sources),/SOURCE_QUOTE_NOT_FOUND/);
  assert.throws(()=>synthesisValidation({message:{content:JSON.stringify({...correct,command:'BUY'})}},sources),/MODEL_SCHEMA/);
});
test('entire investigation keeps sources linked to evidence receipt and does no actions',async()=>{
  const fixedTime=Date.parse('2026-11-22T18:00:00.000Z');
  const source={sourceId:'md-1',kind:'local_md',title:'Risk and liquidity',source:'docs/knowledge.md',
    sha256:'f'.repeat(64),excerpt:'Risk depends on concentration and cash conversion, not revenue alone.'};
  const result=await investigate('Explain risk in my investment',{state:emptyInventory(),now:fixedTime,
    planner:async()=>({status:'MODEL_PLAN_VALIDATED',model:'local-verified',capabilities:['knowledge.markdown']}),
    executor:async()=>({capability:'knowledge.markdown',status:'EVIDENCE_FOUND',evidence:[source]}),
    synthesizer:async()=>({state:'MODEL_HYPOTHESIS_SOURCE_MATCHED',hypothesis:'Risk must be checked against liquidity.',
      observations:[{sourceId:'md-1',quote:'Risk depends on concentration'}],unknowns:['Time horizon']})
  });
  assert.equal(result.canWrite,false);
  assert.equal(result.sources[0].sourceId,'md-1');
  assert.match(result.answer,/Hypothesis/);
  assert.equal(result.provenance.evidenceId.length,64);
  assert.equal(result.stages.includes('RETRIEVE'),true);
});
test('Markdown ADR is a local draft, requires explicit persistence, and has source hashes',t=>{
  const root=cleanup(t);
  const result={schema:'azure-flow-investigation/v1',original:'Explain my options',
    answer:'Unverified comparison',sources:[{sourceId:'a',source:'local note',title:'Note',
      sha256:'d'.repeat(64),excerpt:'Some citation text'}],
    provenance:{evidenceId:'a'.repeat(64),retrievedAt:'2026-11-22T17:00:00.000Z',
      sourceRevision:'gitSHA'},note:'Offline',unknowns:['Source reliability']};
  const md=reportMarkdown(result);
  assert.match(md,/DRAFT \/ UNAPPROVED/);
  assert.match(md,/## ADR/);
  assert.match(md,/d{64}/);
  assert.equal(fs.existsSync(path.join(root,'azure-flow-findings')),false);
  const out=persist(result,{directory:path.join(root,'azure-flow-findings')});
  assert.equal(out.saved,true);
  assert.ok(fs.existsSync(path.join(root,'azure-flow-findings',out.filename)));
});
test('explicit owner feedback changes routing memory only, never model weights',t=>{
  const root=cleanup(t);const uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const result={schema:'azure-flow-investigation/v1',original:'How much inventory is low?',
    plan:{status:'MODEL_PLAN_VALIDATED',capabilities:['workspace.inventory'],model:'dolphin-llama3:8b'},
    sources:[],provenance:{evidenceId:'a'.repeat(64),sourceRevision:'old-version'}};
  const saved=learning.append(root,result,{evidenceId:'a'.repeat(64),grade:'useful',note:'Correct inventory route'},
    {userId:uid,now:Date.parse('2026-11-22T20:00:00Z')});
  assert.equal(saved.modelWeightsChanged,false);
  assert.equal(saved.eligibleForRouting,true);
  assert.equal(learning.read(root,{userId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}).length,0);
  const retrieved=learning.similar('inventory stock low?',learning.read(root,{userId:uid}));
  assert.equal(retrieved.length,1);
  assert.deepEqual(retrieved[0].capabilities,['workspace.inventory']);
  assert.throws(()=>learning.append(root,result,{evidenceId:'a'.repeat(64),grade:'useful',note:''},{userId:uid}),
    /already has feedback/);
  const negative={...result,original:'Should I buy stocks?',
    provenance:{evidenceId:'b'.repeat(64),sourceRevision:'old-version'}};
  learning.append(root,negative,{evidenceId:'b'.repeat(64),grade:'incorrect',note:'Wrong source'},
    {userId:uid});
  assert.equal(learning.similar('buy stocks?',learning.read(root,{userId:uid}))
    .some(x=>x.question==='Should I buy stocks?'),false);
});

test('Owner saved research drafts become recallable but never grant reader access by default',t=>{
  const root=cleanup(t),fileDir=path.join(root,'data','azure-flow-findings','test-owner');
  const result={schema:'azure-flow-investigation/v1',original:'What determines sustainable cash runway?',
    answer:'Cash runway depends on burn and liquidity.',sources:[],
    provenance:{evidenceId:'d'.repeat(64),retrievedAt:'2026-11-22T17:00:00.000Z',sourceRevision:'git'},
    note:'No external source',unknowns:['Future burn']};
  const saved=persist(result,{directory:fileDir});
  const {retrieveFindings}=require('../lib/azure-flow-retrieval');
  const hits=retrieveFindings('sustainable cash runway',{directory:fileDir});
  assert.equal(hits.hits.length>0,true);
  assert.equal(hits.hits[0].kind,'draft_research_memory');
  assert.equal(authorized({allowPublic:true,isOwner:false}).some(x=>x.id==='knowledge.findings'),false);
  assert.equal(authorized({allowPublic:false,isOwner:true}).some(x=>x.id==='knowledge.findings'),true);
  assert.match(hits.hits[0].limitations,/not independently verified/);
  assert.equal(fs.existsSync(path.join(fileDir,saved.filename)),true);
});
test('Iterative research retries once only with user-authorized public capabilities',async()=>{
  const ids=[];
  const planner=async(q,args)=>args.excluded?.length?
    {status:'MODEL_PLAN_VALIDATED',model:'test',capabilities:['research.public']}:
    {status:'MODEL_PLAN_VALIDATED',model:'test',capabilities:['knowledge.markdown']};
  const executor=async id=>{
    ids.push(id);
    return {capability:id,status:id==='research.public'?'SOURCES_FOUND':'NO_MATCH',
      evidence:id==='research.public'?[{sourceId:'wiki-ref',kind:'public_reference',source:'Wikipedia',
        title:'Example',sha256:'e'.repeat(64),excerpt:'Verified text retrieved from an allowed mock source.'}]:[]};
  };
  const synth=async()=>({state:'MODEL_SYNTHESIS_UNAVAILABLE',hypothesis:null});
  const a=await investigate('Research company evidence',{
    state:emptyInventory(),allowPublic:true,planner,executor,synthesizer:synth});
  assert.equal(a.retrievalPasses,2);
  assert.deepEqual(ids,['knowledge.markdown','research.public']);
  ids.length=0;
  const b=await investigate('Research company evidence',{
    state:emptyInventory(),allowPublic:false,planner,executor,synthesizer:synth});
  assert.equal(b.retrievalPasses,1);
  assert.deepEqual(ids,['knowledge.markdown']);
});
