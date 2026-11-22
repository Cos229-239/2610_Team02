'use strict';
// Optional free public end-of-day observations. Source is not guaranteed to respond.
// No paid API, credentials, real-time claims or securities execution.
const CACHE_MS=30*60*1000;
const CACHE=new Map();
function validateTicker(s) {
  if(typeof s!=='string') throw Error('Ticker is required.');
  const code=s.trim().toUpperCase();
  if(!/^[A-Z]{1,5}(?:\.[A-Z])?$/.test(code)) throw Error('Use a U.S. equity symbol with 1–5 letters.');
  return code;
}
function parseDailyCsv(csv,nowMs=Date.now()) {
  if(typeof csv!=='string'||csv.length>40000)return null;
  const lines=csv.trim().split(/\r?\n/);
  if(lines[0]?.trim()!=='Date,Open,High,Low,Close,Volume'||lines.length<2)return null;
  const records=lines.slice(1).map(line=>line.split(',')).filter(cols=>
    cols.length===6 && /^\d{4}-\d{2}-\d{2}$/.test(cols[0]) &&
    Number.isFinite(Number(cols[4])) && Number(cols[4])>0);
  records.sort((a,b)=>a[0].localeCompare(b[0]));
  const latest=records.at(-1);
  if(!latest)return null;
  const ts=Date.parse(latest[0]+'T00:00:00Z');
  if(!Number.isFinite(ts)||ts>nowMs||nowMs-ts>7*86400000)return null;
  return {date:latest[0],closeUsd:Number(latest[4])};
}
async function getDailyClose(symbol,{fetchImpl=fetch,nowMs=Date.now()}={}) {
  const ticker=validateTicker(symbol);
  const cached=CACHE.get(ticker);
  if(cached&&nowMs-cached.fetchedAt<CACHE_MS)return {...cached.result,cached:true};
  const result={symbol:ticker,status:'UNAVAILABLE',source:'Stooq daily CSV',observation:null,
    note:'No verified recent closing price available. This is not a live quote.'};
  try {
    const d=new Date(nowMs);
    const start=new Date(nowMs-10*86400000);
    const compact=x=>x.toISOString().slice(0,10).replaceAll('-','');
    const url='https://stooq.com/q/d/l/?s='+encodeURIComponent(ticker.toLowerCase()+'.us')+
      '&i=d&d1='+compact(start)+'&d2='+compact(d);
    const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(4000),
      headers:{Accept:'text/csv'}});
    if(response.ok){
      const raw=await response.text();
      const value=parseDailyCsv(raw,nowMs);
      if(value){
        result.status='OBSERVED';
        result.observation=value;
        result.note='Free end-of-day closing price, potentially delayed, not real-time.';
      }
    }
  }catch{ /* fail closed: request limits, HTML challenges and outages are not prices */ }
  CACHE.set(ticker,{fetchedAt:nowMs,result});
  return {...result,cached:false};
}
module.exports={validateTicker,parseDailyCsv,getDailyClose};
