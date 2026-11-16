"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createMarketHandler}=require("./market-handler.cjs");
function response(){
 const r={code:200,headers:{},data:null};
 r.set=(k,v)=>{r.headers[k]=v;return r;};r.status=n=>{r.code=n;return r;};r.json=o=>{r.data=o;return r;};return r;
}
test("market route is read-only and fails closed without a provider",async()=>{
 const handler=createMarketHandler({quotes:{configured:()=>false}});
 let r=response();await handler({method:"GET",query:{symbol:"AAPL"}},r);
 assert.equal(r.code,503);assert.equal(r.data.status,"NOT_CONNECTED");
 r=response();await handler({method:"POST"},r);assert.equal(r.code,405);
});
test("market handler marks externally sourced quote and rejects invalid tickers",async()=>{
 const handler=createMarketHandler({quotes:{configured:()=>true,quote:async()=>({symbol:"AAPL",price:200.1,source:"fixture"})}});
 let r=response();await handler({method:"GET",query:{symbol:"AAPL"}},r);
 assert.equal(r.code,200);assert.equal(r.data.status,"PROVIDER_DATA");
 r=response();await handler({method:"GET",query:{symbol:"../../secret"}},r);
 assert.equal(r.code,400);
});
