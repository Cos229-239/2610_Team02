"use strict";
// Optional authenticated financial market connector. This module has NO
// server route until separately reviewed/wired. Never sends the key to browser.
function symbol(value){
 if(typeof value!=="string"||!/^[A-Z][A-Z0-9.-]{0,13}$/.test(value))throw Error("Invalid ticker");
 return value;
}
function parseQuote(data,ticker){
 const q=data&&data["Global Quote"];
 if(!q||typeof q!=="object")throw Error("Provider has no verified quote for ticker");
 const price=Number(q["05. price"]);
 const day=q["07. latest trading day"];
 if(!Number.isFinite(price)||price<=0||typeof day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(day))
  throw Error("Provider quote missing timestamp or price");
 return {symbol:ticker,price,currency:"USD",asOf:day,source:"Alpha Vantage GLOBAL_QUOTE",
  freshness:"Provider-reported latest trading day; NOT a guaranteed real-time quote",
  dataType:"external-provider",liveRequest:true};
}
function createQuotes({apiKey=process.env.TOWERFLOW_ALPHA_VANTAGE_KEY,fetchFn=globalThis.fetch,now=()=>Date.now(),ttlMs=900000}={}){
 const cache=new Map();
 return Object.freeze({
  configured:()=>Boolean(apiKey)&&typeof fetchFn==="function",
  quote:async function(ticker){
   ticker=symbol(ticker);
   if(!apiKey)throw Error("NOT_CONNECTED: Missing server-side provider configuration");
   const cached=cache.get(ticker);
   if(cached&&cached.expires>now())return {...cached.value,cache:"HIT"};
   const endpoint=new URL("https://www.alphavantage.co/query");
   endpoint.searchParams.set("function","GLOBAL_QUOTE");
   endpoint.searchParams.set("symbol",ticker);
   endpoint.searchParams.set("apikey",apiKey);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
   let response;
   try{response=await fetchFn(endpoint.toString(),{signal:controller.signal,redirect:"error"});}
   finally{clearTimeout(timer);}
   if(!response.ok)throw Error("Quote provider unavailable");
   const json=await response.json();
   const quote=parseQuote(json,ticker);
   cache.set(ticker,{value:quote,expires:now()+ttlMs});
   if(cache.size>100)cache.delete(cache.keys().next().value);
   return {...quote,cache:"MISS"};
  }
 });
}
module.exports={createQuotes,parseQuote,symbol};
