"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createIEXQuotes,parseIEX,createSourceAwareQuotes}=require("./alpaca-iex.cjs");
const sample={symbol:"AAPL",trade:{p:201.45,t:"2026-11-12T15:00:00.000Z",s:100,x:"V"}};
test("IEX last-trade parsing includes exact exchange coverage and age",()=>{
 const recent=parseIEX(sample,"AAPL",Date.parse("2026-11-12T15:00:05Z"));
 assert.equal(recent.price,201.45);
 assert.equal(recent.freshness,"RECENT_IEX_SINGLE_VENUE");
 assert.equal(recent.coverage,"SINGLE_VENUE_NOT_CONSOLIDATED");
 const stale=parseIEX(sample,"AAPL",Date.parse("2026-11-12T19:00:00Z"));
 assert.equal(stale.freshness,"STALE_IEX_LAST_TRADE");
 assert.throws(()=>parseIEX({...sample,trade:{p:NaN,t:"invalid"}},"AAPL",Date.now()),/Invalid/);
});
test("Credentials stay server-side and keyed request uses only official IEX URL",async()=>{
 let calls=0;
 const provider=createIEXQuotes({key:"TEST_KEY",secret:"TEST_SECRET",now:()=>Date.parse("2026-11-12T15:00:05Z"),fetchFn:async(url,opts)=>{
  calls++;
  assert.equal(new URL(url).host,"data.alpaca.markets");
  assert.equal(new URL(url).searchParams.get("feed"),"iex");
  assert.equal(opts.headers["APCA-API-KEY-ID"],"TEST_KEY");
  assert.equal(opts.headers["APCA-API-SECRET-KEY"],"TEST_SECRET");
  return {ok:true,json:async()=>sample};
 }});
 const v=await provider.quote("AAPL");
 assert.equal(v.source,"Alpaca Market Data IEX");
 assert.equal(v.cache,"MISS");
 assert.equal((await provider.quote("AAPL")).cache,"HIT");
 assert.equal(calls,1);
 assert.equal(JSON.stringify(v).includes("TEST_SECRET"),false);
});
test("Missing credentials fails and existing Alpha connector remains fallback",async()=>{
 const disconnected=createIEXQuotes({key:"",secret:""});
 await assert.rejects(disconnected.quote("AAPL"),/NOT_CONNECTED/);
 const alpha={configured:()=>true,quote:async()=>({source:"existing Alpha Vantage"})};
 const composite=createSourceAwareQuotes({alpaca:disconnected,alpha});
 assert.equal(composite.provider(),"ALPHA_VANTAGE");
 assert.equal((await composite.quote("AAPL")).source,"existing Alpha Vantage");
});
test("Malformed symbols and upstream failures never invent a quote",async()=>{
 const provider=createIEXQuotes({key:"key",secret:"secret",fetchFn:async()=>({ok:false})});
 await assert.rejects(provider.quote("../../file"),/ticker/);
 await assert.rejects(provider.quote("AAPL"),/unavailable/);
});
