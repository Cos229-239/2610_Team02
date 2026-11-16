"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createContributionHandler,normalizePR}=require("./pr-reader.cjs");
function res(){const r={code:200,body:null};r.set=()=>r;r.status=n=>{r.code=n;return r};r.json=b=>{r.body=b;return r};return r;}
const valid={number:8,user:{login:"Dulskinator96"},head:{sha:"a".repeat(40)},title:"Contribute from IDE",html_url:"https://github.com/Cos229-239/2610_Team02/pull/8",state:"open"};
test("PRs are pinned to the actual repository path, revision and author",()=>{
 const p=normalizePR(valid);
 assert.equal(p.author,"Dulskinator96");
 assert.equal(p.sha,"a".repeat(40));
 assert.equal(p.url,valid.html_url);
 assert.equal(normalizePR({...valid,html_url:"https://attacker.invalid/pull/8"}),null);
});
test("without auth or token, PR listing fails closed",async()=>{
 const fn=createContributionHandler({token:""});
 let r=res();await fn({method:"GET",session:null,permission:"push"},r);assert.equal(r.code,403);
 r=res();await fn({method:"GET",session:{user:{login:"alice"}},permission:"push"},r);assert.equal(r.code,503);
});
test("member can read sanitized GitHub PR records without mutating",async()=>{
 let calls=0;
 const fn=createContributionHandler({token:"test",fetchFn:async(u,o)=>{
  assert.match(u,/^https:\/\/api\.github\.com\/repos\/Cos229-239\/2610_Team02\/pulls/);
  assert.equal(o.redirect,"error");calls++;
  return {ok:true,json:async()=>[valid,{...valid,user:{login:"not valid!!"}}]};
 }});
 let r=res();await fn({method:"GET",session:{user:{login:"alice"}},permission:"push"},r);
 assert.equal(r.code,200);assert.equal(r.body.records.length,1);assert.equal(calls,1);
 r=res();await fn({method:"DELETE",session:{user:{login:"alice"}},permission:"push"},r);assert.equal(r.code,405);
});
