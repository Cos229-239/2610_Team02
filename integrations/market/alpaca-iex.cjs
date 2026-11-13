"use strict";
// Alpaca IEX live-capable provider. Server-side credentials; source-stamped trades.
// IEX is one venue, never claim consolidated last price. No simulated quotes.
const {symbol}=require("./alpha-vantage.cjs");
function parseIEX(data,ticker,receivedAt){
 const t=data?.trade;
 const price=t?.p,stamp=t?.t;
 if(data?.symbol!==ticker||typeof price!=="number"||!Number.isFinite(price)||price<=0||
   typeof stamp!=="string"||!Number.isFinite(Date.parse(stamp)))
   throw Error("Invalid Alpaca IEX trade or timestamp");
 const age=Math.max(0,receivedAt-Date.parse(stamp));
 const freshness=age<=60_000?"RECENT_IEX_SINGLE_VENUE":"STALE_IEX_LAST_TRADE";
 return Object.freeze({symbol:ticker,price,currency:"USD",asOf:stamp,
  observedAt:new Date(receivedAt).toISOString(),source:"Alpaca Market Data IEX",
  feed:"iex",coverage:"SINGLE_VENUE_NOT_CONSOLIDATED",freshness,
  ageSeconds:Math.floor(age/1000),dataType:"external-provider",liveRequest:true});
}
function createIEXQuotes({key=process.env.TOWERFLOW_ALPACA_KEY_ID,
 secret=process.env.TOWERFLOW_ALPACA_SECRET_KEY,fetchFn=globalThis.fetch,
 now=()=>Date.now(),ttlMs=5000}={}){
 const cache=new Map();
 return Object.freeze({
  configured:()=>Boolean(key&&secret)&&typeof fetchFn==="function",
  quote:async function(input){
   const ticker=symbol(input);
   if(!key||!secret)throw Error("NOT_CONNECTED: Alpaca IEX server credential missing");
   const prev=cache.get(ticker),ms=now();
   if(prev&&prev.until>ms)return {...prev.value,cache:"HIT"};
   const uri=new URL("https://data.alpaca.markets/v2/stocks/"+encodeURIComponent(ticker)+"/trades/latest");
   uri.searchParams.set("feed","iex");
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),7000);
   let response;
   try{
    response=await fetchFn(uri.toString(),{signal:controller.signal,redirect:"error",
     headers:{"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret,"accept":"application/json"}});
   }finally{clearTimeout(timeout);}
   if(!response?.ok)throw Error("Alpaca IEX quote provider unavailable");
   const value=parseIEX(await response.json(),ticker,now());
   cache.set(ticker,{value,until:now()+Math.max(0,Math.min(30000,ttlMs))});
   if(cache.size>100)cache.delete(cache.keys().next().value);
   return {...value,cache:"MISS"};
  }
 });
}
// Preserve existing Alpha Vantage fallback if Alpaca is not configured.
function createSourceAwareQuotes({alpaca,alpha}={}){
 const a=alpaca||createIEXQuotes();
 const b=alpha||require("./alpha-vantage.cjs").createQuotes();
 return Object.freeze({
  configured:()=>a.configured()||b.configured(),
  provider:()=>a.configured()?"ALPACA_IEX":b.configured()?"ALPHA_VANTAGE":"NOT_CONNECTED",
  quote:(ticker)=>a.configured()?a.quote(ticker):b.quote(ticker)
 });
}
module.exports={parseIEX,createIEXQuotes,createSourceAwareQuotes};
