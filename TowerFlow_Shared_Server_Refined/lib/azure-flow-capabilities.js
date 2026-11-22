'use strict';
// Extensible capability registry, not a list of company aliases or user intents.
// An LLM may propose IDs; the policy gate checks installed, authorized adapters.
const {overview}=require('./azure-flow-harness');
const {retrieve}=require('./azure-flow-retrieval');
const {publicSearch}=require('./azure-flow-public-research');
const {searchFilings}=require('./azure-flow-sec-filings');
const MANIFEST=Object.freeze([
  {id:'workspace.inventory',description:'Inspect recorded TowerFlow products, stock levels, low-stock risk, replenishment and pending purchase orders',scope:'local',permission:'signed_in',kind:'structured'},
  {id:'workspace.sales',description:'Inspect recorded sale movements, gross sales history and monthly sales totals from TowerFlow ledger',scope:'local',permission:'signed_in',kind:'structured'},
  {id:'knowledge.markdown',description:'Retrieve passages from maintained Markdown design, research, knowledge and architecture files with hashes and citations',scope:'local',permission:'signed_in',kind:'retrieval'},
  {id:'research.sec',description:'Identify a U.S. public company from official SEC issuer records and locate its recent 10-K/10-Q/20-F/40-F filing metadata. Requires operator-identifying user agent and user opt-in.',scope:'external',permission:'explicit_public_opt_in',kind:'primary_source'},
  {id:'research.public',description:'Search a public encyclopedia for background about a named subject, company, person, place, or concept. Not a financial quote service.',scope:'external',permission:'explicit_public_opt_in',kind:'retrieval'}
]);
function authorized({allowPublic=false}={}){
  return MANIFEST.filter(h=>h.scope==='local'||(allowPublic&&h.scope==='external'));
}
function validatePlan(value,allowed=authorized()){
  if(!value||Array.isArray(value)||typeof value!=='object' ||
    Object.keys(value).sort().join(',')!=='capabilities,question')throw Error('Invalid model plan schema');
  if(!Array.isArray(value.capabilities)||value.capabilities.length>3||
    value.capabilities.some(id=>typeof id!=='string'||!allowed.some(h=>h.id===id))||
    new Set(value.capabilities).size!==value.capabilities.length)throw Error('Unauthorized capabilities in plan');
  if(typeof value.question!=='string'||value.question.length<2||value.question.length>300)
    throw Error('Plan question invalid');
  return value;
}
async function execute(id,{question,state,revision,now,allowPublic,retrieveImpl=retrieve,publicImpl=publicSearch,secImpl=searchFilings}={}){
  if(!authorized({allowPublic}).some(h=>h.id===id))throw Error('Capability not authorized: '+id);
  if(id==='knowledge.markdown') {
    const found=retrieveImpl(question);
    return {capability:id,status:found.hits.length?'EVIDENCE_FOUND':'NO_MATCH',
      evidence:found.hits,claims:[],indexItems:found.indexItems};
  }
  if(id==='research.sec') {
    const result=await secImpl(question,{now});
    return {capability:id,status:result.status,evidence:result.hits||[],claims:[],
      issuer:result.issuer||null,candidates:result.candidates||[],note:result.note};
  }
  if(id==='research.public') {
    const found=await publicImpl(question,{now});
    return {capability:id,status:found.status,evidence:found.hits,claims:[]};
  }
  const report=overview(state,{revision,now:Math.floor(now()/1000)});
  if(id==='workspace.inventory')return {capability:id,status:report.inventory.products?'EVIDENCE_FOUND':'NO_RECORDS',
    evidence:[{sourceId:'inventory-'+report.evidenceHash.slice(0,12),kind:'inventory_snapshot',
      source:'TowerFlow signed-in workspace',sha256:report.evidenceHash,
      title:'Recorded inventory evidence',
      excerpt:JSON.stringify({inventory:report.inventory,reviewActions:report.reviewActions}).slice(0,2500),
      revision:report.revision}],claims:[],facts:report.inventory};
  if(id==='workspace.sales')return {capability:id,status:report.operations.recordedSales?'EVIDENCE_FOUND':'NO_RECORDS',
    evidence:[{sourceId:'sales-'+report.evidenceHash.slice(0,12),kind:'sales_snapshot',
      source:'TowerFlow signed-in workspace',sha256:report.evidenceHash,title:'Recorded gross sales',
      excerpt:JSON.stringify(report.operations).slice(0,2500),revision:report.revision}],
    claims:[],facts:report.operations};
  throw Error('Unregistered capability');
}
module.exports={MANIFEST,authorized,validatePlan,execute};
