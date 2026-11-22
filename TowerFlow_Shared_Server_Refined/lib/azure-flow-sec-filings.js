'use strict';
// Official SEC filings locator. Read-only, public consent, identifiable operator UA.
// No provider key. Only issuer identity and filing metadata, no invented financial ratios.
const crypto=require('node:crypto');
const UA=process.env.TOWERFLOW_SEC_USER_AGENT||'';
const URLS=Object.freeze({
  index:'https://www.sec.gov/files/company_tickers_exchange.json',
  submissions:'https://data.sec.gov/submissions/'
});
const cache=new Map();
function userAgent(value=UA) {
  if(typeof value!=='string'||value.length<12||value.length>180||
    !/\S+@\S+\.\S+/.test(value)||/[\r\n]/.test(value))return null;
  return value;
}
function words(value){return String(value).toLowerCase().match(/[a-z0-9]{3,}/g)||[]}
function locate(topic,body) {
  if(!body||!Array.isArray(body.fields)||!Array.isArray(body.data))return [];
  const columns=['cik','name','ticker','exchange'].map(x=>body.fields.indexOf(x));
  if(columns.some(i=>i<0))return [];
  const query=words(topic);
  if(!query.length)return [];
  const rows=[];
  for(const row of body.data.slice(0,30000)){
    if(!Array.isArray(row))continue;
    const [cik,name,ticker,exchange]=columns.map(i=>row[i]);
    if(!Number.isInteger(cik)||cik<=0||typeof name!=='string'||typeof ticker!=='string')continue;
    const company=words(name),symbol=ticker.toLowerCase();
    // Exact ticker or significant contained issuer token; no static company aliases.
    const exact=query.includes(symbol);
    const unique=query.filter(w=>w.length>=4&&company.includes(w));
    if(!exact&&!unique.length)continue;
    const score=(exact?20:0)+unique.length*5;
    rows.push({cik,name,ticker,exchange:typeof exchange==='string'?exchange:'',score});
  }
  return rows.sort((a,b)=>b.score-a.score||a.cik-b.cik).slice(0,4);
}
async function requestJson(url,{fetchImpl=fetch,agent,timeoutMs=6500,limit=4500000}={}){
  const response=await fetchImpl(url,{
    method:'GET',redirect:'error',
    headers:{'User-Agent':agent,Accept:'application/json'},
    signal:AbortSignal.timeout(timeoutMs)
  });
  if(!response.ok)throw Error('SEC_HTTP_'+response.status);
  const raw=await response.arrayBuffer();
  if(raw.byteLength>limit)throw Error('SEC_PAYLOAD_LIMIT');
  return JSON.parse(Buffer.from(raw).toString('utf8'));
}
function recentFilings(record,cik){
  const source=record?.filings?.recent;
  if(!source||!Array.isArray(source.form)||!Array.isArray(source.accessionNumber)||
    !Array.isArray(source.primaryDocument)||!Array.isArray(source.filingDate))return [];
  const files=[];
  for(let i=0;i<Math.min(200,source.form.length);i++){
    const form=source.form[i];
    if(!['10-K','10-Q','20-F','40-F'].includes(form))continue;
    const acc=source.accessionNumber[i],doc=source.primaryDocument[i],date=source.filingDate[i];
    if(typeof acc!=='string'||!/^[0-9]{10}-[0-9]{2}-[0-9]{6}$/.test(acc)||
       typeof doc!=='string'||!/^[A-Za-z0-9_.-]{1,180}$/.test(doc)||
       typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
    files.push({form,date,url:'https://www.sec.gov/Archives/edgar/data/'+cik+'/'+
      acc.replaceAll('-','')+'/'+encodeURIComponent(doc),accession:acc});
    if(files.length>=4)break;
  }
  return files;
}
async function searchFilings(topic,{fetchImpl=fetch,now=Date.now(),agent=UA}={}){
  const ua=userAgent(agent);
  if(!ua)return {status:'OPERATOR_IDENTITY_REQUIRED',hits:[],note:
    'Official SEC access requires TOWERFLOW_SEC_USER_AGENT with a real descriptive name and contact email. Do not invent identity.'};
  try {
    const t=typeof topic==='string'?topic.trim():'';
    if(t.length<2||t.length>280)throw Error('Invalid topic');
    const indexKey='issuers';
    let index=cache.get(indexKey);
    if(!index||now-index.at>24*3600000){
      index={at:now,value:await requestJson(URLS.index,{fetchImpl,agent:ua})};
      cache.set(indexKey,index);
    }
    const matches=locate(t,index.value);
    if(!matches.length)return {status:'ISSUER_NOT_RESOLVED',hits:[],candidates:[],
      note:'No SEC issuer matched the supplied subject; avoid guessing the issuer.'};
    if(matches.length>1&&matches[0].score===matches[1].score)
      return {status:'ISSUER_AMBIGUOUS',hits:[],candidates:matches,
        note:'Multiple SEC issuer candidates; request explicit ticker or CIK.'};
    const issuer=matches[0];
    const url=URLS.submissions+'CIK'+String(issuer.cik).padStart(10,'0')+'.json';
    const filings=await requestJson(url,{fetchImpl,agent:ua,limit:2500000});
    const records=recentFilings(filings,issuer.cik);
    const body=JSON.stringify({issuer,records});
    const hash=crypto.createHash('sha256').update(body).digest('hex');
    return {status:records.length?'SOURCES_FOUND':'NO_RECENT_SUPPORTED_FORMS',
      issuer:{cik:issuer.cik,name:issuer.name,ticker:issuer.ticker,exchange:issuer.exchange},
      hits:records.map((r,i)=>({
        sourceId:'sec-'+issuer.cik+'-'+i+'-'+hash.slice(0,10),
        kind:'official_filing_metadata',source:'U.S. Securities and Exchange Commission EDGAR',
        title:issuer.name+' · '+r.form+' · '+r.date,url:r.url,
        excerpt:'Official EDGAR filing metadata: '+issuer.name+' ('+issuer.ticker+'), '+r.form+
          ', filed '+r.date+', accession '+r.accession+'. This is a filing locator, not an audited financial conclusion.',
        sha256:hash,retrievedAt:new Date(now).toISOString(),
        limitations:'The filing itself must be read and analyzed before making financial claims.'
      })),note:'Official filing metadata only, not valuation, verified revenue or advice.'};
  } catch {
    return {status:'SEC_UNAVAILABLE',hits:[],note:'SEC access failed or was blocked. No issuer data or filing facts were invented.'};
  }
}
module.exports={URLS,userAgent,words,locate,requestJson,recentFilings,searchFilings};
