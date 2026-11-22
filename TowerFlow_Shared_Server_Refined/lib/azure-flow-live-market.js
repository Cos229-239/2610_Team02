'use strict';
// Read-only public exchange snapshots. Not equities, brokerage quotes or trades.
// Finite approved pairs, fixed provider origin, bounded response, explicit time freshness.
const ORIGIN='https://api.exchange.coinbase.com';
const PAIRS=Object.freeze(['BTC-USD','ETH-USD','SOL-USD']);
function finitePrice(value){
  if(typeof value!=='string'&&!Number.isFinite(value))return null;
  const text=String(value);
  if(!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,12})?$/.test(text))return null;
  const number=Number(text);
  return Number.isFinite(number)&&number>0?number:null;
}
function validateTicker(payload,pair,now){
  if(!payload||Array.isArray(payload)||typeof payload!=='object')throw Error('INVALID_TICKER');
  const price=finitePrice(payload.price),bid=finitePrice(payload.bid),ask=finitePrice(payload.ask);
  const time=typeof payload.time==='string'?Date.parse(payload.time):NaN;
  if(!price||!bid||!ask||bid>ask*1.02||price<bid*.95||price>ask*1.05||
    !Number.isFinite(time)||time>now+30000||now-time>120000)
    throw Error('UNVERIFIED_OR_STALE_TICK');
  return {pair,price,bid,ask,exchangeTime:new Date(time).toISOString(),
    ageMs:Math.max(0,now-time),source:ORIGIN+'/products/'+pair+'/ticker'};
}
async function liveSnapshot({fetchImpl=fetch,now=Date.now(),pairs=PAIRS}={}){
  if(!Array.isArray(pairs)||pairs.length>3||
    pairs.some(pair=>!PAIRS.includes(pair))||new Set(pairs).size!==pairs.length)
    throw Error('INVALID_PAIRS');
  const results=await Promise.all(pairs.map(async pair=>{
    try{
      const response=await fetchImpl(ORIGIN+'/products/'+pair+'/ticker',{
        method:'GET',redirect:'error',
        headers:{Accept:'application/json'},
        signal:AbortSignal.timeout(5000)
      });
      if(!response.ok)throw Error('EXCHANGE_HTTP_'+response.status);
      const body=await response.arrayBuffer();
      if(body.byteLength>16000)throw Error('EXCHANGE_RESPONSE_TOO_LARGE');
      return {status:'OBSERVED',...validateTicker(JSON.parse(Buffer.from(body).toString('utf8')),pair,now)};
    }catch(error){
      return {pair,status:'UNAVAILABLE',reason:error.message==='UNVERIFIED_OR_STALE_TICK'?
        'STALE_OR_INVALID':'SOURCE_UNAVAILABLE'};
    }
  }));
  return {schema:'azure-flow.live-market/v1',provider:'Coinbase Exchange public ticker',
    market:'CRYPTO_SPOT_ONLY',retrievedAt:new Date(now).toISOString(),
    results,verifiedCount:results.filter(x=>x.status==='OBSERVED').length,
    disclaimer:'Actual exchange snapshots, not continuous stream or live equities. Prices change; no trading or investment recommendation.'};
}
module.exports={ORIGIN,PAIRS,finitePrice,validateTicker,liveSnapshot};
