"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createQuotes,parseQuote,symbol}=require("./alpha-vantage.cjs");
const fixture={"Global Quote":{"01. symbol":"AAPL","05. price":"200.10","07. latest trading day":"2026-11-06"}};
test("invalid ticker rejected before external requests",async()=>{
 const svc=createQuotes({apiKey:"testing",fetchFn:()=>{throw Error("should never fetch")}});
 await assert.rejects(svc.quote("../../secrets"),/Invalid ticker/);
 assert.throws(()=>symbol("aapl"),/Invalid ticker/);
});
test("missing provider key fails without inventing quotes",async()=>{
 const svc=createQuotes({apiKey:""});
 assert.equal(svc.configured(),false);
 await assert.rejects(svc.quote("AAPL"),/NOT_CONNECTED/);
});
test("freshness/source is explicit and cache prevents excess traffic",async()=>{
 let calls=0;
 const svc=createQuotes({apiKey:"test-key",fetchFn:async url=>{
  calls++;assert.match(url,/https:\/\/www\.alphavantage\.co\/query/);
  return {ok:true,json:async()=>fixture};
 }});
 const quote=await svc.quote("AAPL");
 assert.equal(quote.price,200.1);
 assert.equal(quote.asOf,"2026-11-06");
 assert.match(quote.freshness,/NOT a guaranteed real-time/);
 assert.equal((await svc.quote("AAPL")).cache,"HIT");
 assert.equal(calls,1);
});
test("reject incomplete or throttled provider responses",()=>{
 assert.throws(()=>parseQuote({"Note":"throttled"},"AAPL"),/verified quote/);
 assert.throws(()=>parseQuote({"Global Quote":{"05. price":"NaN","07. latest trading day":"2026-11-06"}},"AAPL"),/missing timestamp or price/);
});
