"use strict";
// SEC EDGAR public corporate filing facts (not intraday sales or live quotes).
// Runs on trusted server: SEC does not permit browser CORS. No embedded API key.
const ALLOWED=Object.freeze({
 Revenues:"US GAAP Revenues",
 RevenueFromContractWithCustomerExcludingAssessedTax:"Reported revenue excluding assessed tax",
 NetIncomeLoss:"Net income",
 Assets:"Total assets",
 StockholdersEquity:"Stockholders equity",
 OperatingIncomeLoss:"Operating income"
});
function cik(value){
 const s=String(value??"");
 if(!/^\d{1,10}$/.test(s))throw Error("Invalid SEC CIK");
 return s.padStart(10,"0");
}
function extractFacts(data,identifier,{asOf=Date.now(),limit=6}={}){
 if(!data||typeof data!=="object"||String(data.cik??"").padStart(10,"0")!==identifier||
   typeof data.entityName!=="string"||!data.entityName.trim())
   throw Error("SEC filing response entity mismatch");
 if(!Number.isFinite(asOf)||!Number.isInteger(limit)||limit<1||limit>20)
   throw Error("Invalid company facts query");
 const rows=[];
 for(const [tag,title] of Object.entries(ALLOWED)){
  const metric=data.facts?.["us-gaap"]?.[tag]?.units?.USD;
  if(!Array.isArray(metric))continue;
  const filtered=metric.filter(x=>x&&Number.isFinite(x.val)&&Number.isFinite(Date.parse(x.filed))&&
    /^\d{4}-\d{2}-\d{2}$/.test(x.end||"")&&["10-K","10-Q"].includes(x.form)&&Date.parse(x.filed)<=asOf);
  filtered.sort((a,b)=>Date.parse(b.filed)-Date.parse(a.filed)||
    Date.parse(b.end)-Date.parse(a.end));
  const v=filtered[0];
  if(!v)continue;
  rows.push({tag,metric:title,unit:"USD",value:v.val,periodEnd:v.end,
   periodStart:typeof v.start==="string"?v.start:null,
   filed:v.filed,form:v.form,accession:v.accn||null,calendarPeriod:v.fp||null});
 }
 return Object.freeze({cik:identifier,name:data.entityName.trim(),source:"SEC EDGAR Company Facts XBRL",
  status:"OFFICIAL_FILING_FACTS",filingUpdateModel:"On new filings; periodic accounting, not live company sales",
  retrievedAt:new Date(asOf).toISOString(),facts:rows.slice(0,limit)});
}
function createCompanyFacts({userAgent=process.env.TOWERFLOW_SEC_USER_AGENT,
 fetchFn=globalThis.fetch,now=()=>Date.now(),ttlMs=3600000}={}){
 const ua=typeof userAgent==="string"?userAgent.trim():"";
 // SEC requires a declared non-anonymous software identity and point of contact.
 const configured=()=>ua.length>=16&&ua.length<=200&&ua.includes("@")&&typeof fetchFn==="function";
 const cache=new Map();
 let lastRequest=0;
 return Object.freeze({
  configured,
  company:async function(value){
   const id=cik(value);
   if(!configured())throw Error("NOT_CONNECTED: Set TOWERFLOW_SEC_USER_AGENT with application and contact");
   const prev=cache.get(id);
   if(prev&&prev.until>now())return {...prev.value,cache:"HIT"};
   if(now()-lastRequest<1000)throw Error("SEC fair-access throttle: retry after one second");
   lastRequest=now();
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8500);
   let res;
   try{
    res=await fetchFn("https://data.sec.gov/api/xbrl/companyfacts/CIK"+id+".json",{
     signal:abort.signal,redirect:"error",
     headers:{"User-Agent":ua,"Accept":"application/json","Accept-Encoding":"gzip, deflate"}});
   }finally{clearTimeout(timer);}
   if(!res?.ok)throw Error("SEC EDGAR unavailable or issuer CIK not found");
   const json=await res.json();
   const result=extractFacts(json,id,{asOf:now()});
   cache.set(id,{until:now()+Math.max(60000,Math.min(24*3600000,ttlMs)),value:result});
   if(cache.size>100)cache.delete(cache.keys().next().value);
   return {...result,cache:"MISS"};
  }
 });
}
module.exports={ALLOWED,cik,extractFacts,createCompanyFacts};
