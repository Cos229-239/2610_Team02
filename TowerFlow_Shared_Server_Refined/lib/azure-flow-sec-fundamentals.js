'use strict';
// Official SEC XBRL companyfacts: narrowly typed reported observations, not ratios,
// forward forecasts, share-price estimates, or a representation of audited truth.
const crypto=require('node:crypto');
const {userAgent,requestJson}=require('./azure-flow-sec-filings');
const SCHEMA=Object.freeze([
  {label:'Revenue (reported, annual)',tags:['RevenueFromContractWithCustomerExcludingAssessedTax',
    'Revenues','SalesRevenueNet'],instant:false},
  {label:'Net income (reported, annual)',tags:['NetIncomeLoss'],instant:false},
  {label:'Total assets (reported, fiscal year end)',tags:['Assets'],instant:true},
  {label:'Operating cash flow (reported, annual)',tags:['NetCashProvidedByUsedInOperatingActivities'],
    instant:false}
]);
const SEC_ORIGIN='https://data.sec.gov';
function factsUrl(cik){
  if(!Number.isSafeInteger(cik)||cik<1||cik>9999999999)throw Error('INVALID_CIK');
  return SEC_ORIGIN+'/api/xbrl/companyfacts/CIK'+String(cik).padStart(10,'0')+'.json';
}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))}
function chooseAnnual(fact,{instant=false,now=Date.now()}={}){
  if(!fact||typeof fact!=='object'||!Array.isArray(fact.units?.USD))return null;
  const accepted=fact.units.USD.filter(row=>{
    if(!row||row.form!=='10-K'||row.fp!=='FY'||
      !Number.isSafeInteger(row.val)||Math.abs(row.val)>9e15||
      !validDate(row.end)||!validDate(row.filed)||
      row.filed<row.end||Date.parse(row.filed+'T00:00:00Z')>now||
      !/^[0-9]{10}-[0-9]{2}-[0-9]{6}$/.test(row.accn||''))return false;
    if(instant)return row.start===undefined;
    if(!validDate(row.start))return false;
    const days=(Date.parse(row.end+'T00:00:00Z')-Date.parse(row.start+'T00:00:00Z'))/86400000;
    return days>=330&&days<=380;
  });
  // Latest period is primary; most recent filing for same period resolves a restatement.
  accepted.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed)||
    b.accn.localeCompare(a.accn));
  return accepted[0]||null;
}
function extract(payload,{cik,now=Date.now()}={}){
  if(!payload||!Number.isSafeInteger(payload.cik)||payload.cik!==cik||
    !payload.facts||typeof payload.facts!=='object'||!payload.facts['us-gaap'])
    return {status:'INVALID_OFFICIAL_PAYLOAD',hits:[],note:'CIK or us-gaap data mismatch.'};
  const data=payload.facts['us-gaap'],hits=[];
  for(const metric of SCHEMA){
    let selected=null,tag=null;
    for(const candidate of metric.tags){
      const fact=chooseAnnual(data[candidate],{instant:metric.instant,now});
      if(fact){selected=fact;tag=candidate;break}
    }
    if(!selected)continue;
    const value=selected.val.toLocaleString('en-US');
    const excerpt=metric.label+': '+value+' USD; fiscal period ending '+selected.end+
      '; filed '+selected.filed+' in Form '+selected.form+
      '; accession '+selected.accn+'; us-gaap:'+tag+
      '; '+(metric.instant?'instantaneous balance':'full fiscal-year duration')+
      '. This is an issuer-reported XBRL fact, not an investment recommendation.';
    const hash=crypto.createHash('sha256').update(excerpt).digest('hex');
    hits.push({sourceId:'sec-xbrl-'+cik+'-'+tag+'-'+hash.slice(0,12),
      kind:'official_reported_financial_fact',source:'SEC EDGAR XBRL (issuer-reported)',
      title:metric.label,excerpt,sha256:hash,
      url:factsUrl(cik),retrievedAt:new Date(now).toISOString(),
      tag,unit:'USD',value:selected.val,periodEnd:selected.end,
      filed:selected.filed,accession:selected.accn,form:selected.form,
      limitations:'Reported XBRL observation only. No independent audit, stock price, valuation, risk assessment or cash-flow derivation. Financial-year metrics can have different periods.'});
  }
  return {status:hits.length?'REPORTED_FACTS_FOUND':'NO_US_GAAP_ANNUAL_FACTS',
    hits,note:hits.length?
      'Only reported, timestamped US-GAAP metrics. Check period and filing accession before comparisons.':
      'No validated full-year US-GAAP facts found; do not fabricate metrics.'};
}
async function researchFacts(cik,{fetchImpl=fetch,agent=process.env.TOWERFLOW_SEC_USER_AGENT||'',
  now=Date.now(),requester=requestJson}={}){
  if(!userAgent(agent))return {status:'OPERATOR_IDENTITY_REQUIRED',hits:[]};
  let url;
  try{url=factsUrl(cik)}catch{return {status:'INVALID_CIK',hits:[]}}
  try{
    const json=await requester(url,{fetchImpl,agent,timeoutMs:9000,limit:20000000});
    return extract(json,{cik,now});
  }catch{
    return {status:'XBRL_UNAVAILABLE',hits:[],
      note:'XBRL provider unavailable or payload exceeded limits; no numerical claims returned.'};
  }
}
module.exports={SCHEMA,factsUrl,validDate,chooseAnnual,extract,researchFacts};
