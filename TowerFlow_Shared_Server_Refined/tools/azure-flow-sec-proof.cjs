'use strict';
// Operator-triggered proof of real official SEC data. No generated fixtures, downloads,
// file writes, private workspace transmission, model inference or paid providers.
const {searchFilings,userAgent}=require('../lib/azure-flow-sec-filings');
const {researchFacts}=require('../lib/azure-flow-sec-fundamentals');
async function run(topic,{locator=searchFilings,facts=researchFacts,agent=process.env.TOWERFLOW_SEC_USER_AGENT,
  logger=console.log}={}){
  if(!userAgent(agent))return {verdict:'BLOCKED',
    reason:'TOWERFLOW_SEC_USER_AGENT with an actual operator identity and contact is required.'};
  if(typeof topic!=='string'||topic.trim().length<2||topic.length>140)
    return {verdict:'BLOCKED',reason:'Specify a public issuer name or ticker.'};
  const lookup=await locator(topic.trim(),{agent});
  logger('OFFICIAL_LOCATOR '+JSON.stringify({status:lookup.status,issuer:lookup.issuer||null,
    candidates:lookup.candidates||[],filingCount:(lookup.hits||[]).length}));
  if(!lookup.issuer?.cik||!lookup.hits?.length)
    return {verdict:'NOT_VERIFIED',reason:'No issuer and filed document could be verified.',
      status:lookup.status};
  const result=await facts(lookup.issuer.cik,{agent});
  logger('OFFICIAL_REPORTED_FACTS '+JSON.stringify({status:result.status,
    factCount:(result.hits||[]).length,
    facts:(result.hits||[]).map(x=>({title:x.title,value:x.value,
      unit:x.unit,tag:x.tag,periodEnd:x.periodEnd,filed:x.filed,
      accession:x.accession,url:x.url,sha256:x.sha256}))}));
  if(result.status!=='REPORTED_FACTS_FOUND'||!result.hits?.length)
    return {verdict:'NOT_VERIFIED',reason:'Official issuer located, but no supported XBRL numeric fact.',
      status:result.status};
  return {verdict:'PRIMARY_SOURCE_SCREEN_PASS',issuer:lookup.issuer,
    observations:result.hits.length,
    note:'Direct official issuer-reported values retrieved, not verified valuation, suitability or end-to-end browser acceptance.'};
}
if(require.main===module){
  const topic=process.argv.slice(2).join(' ');
  run(topic).then(r=>{
    console.log('PROOF_RESULT '+JSON.stringify(r));
    process.exitCode=r.verdict==='PRIMARY_SOURCE_SCREEN_PASS'?0:1;
  }).catch(e=>{console.error('PROOF_ERROR '+String(e.message).slice(0,160));process.exitCode=2});
}
module.exports={run};
