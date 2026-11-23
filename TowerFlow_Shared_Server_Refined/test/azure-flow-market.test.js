'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateTicker,parseDailyCsv,getDailyClose}=require('../lib/azure-flow-market');
test('market inputs are bounded and cannot select arbitrary hosts',()=>{
  assert.equal(validateTicker('aapl'),'AAPL');
  for(const item of ['https://evil.test','../../../etc/passwd','TOO-LONG-SYMBOL','',42]){
    assert.throws(()=>validateTicker(item));
  }
});
test('market source rejects HTML, stale observations and fabricated prices',()=>{
  const now=Date.parse('2026-11-22T19:00:00Z');
  const csv='Date,Open,High,Low,Close,Volume\n2026-11-20,100,101,99,100.5,1000';
  assert.deepEqual(parseDailyCsv(csv,now),{date:'2026-11-20',closeUsd:100.5});
  assert.equal(parseDailyCsv('<html>rate limited</html>',now),null);
  assert.equal(parseDailyCsv('Date,Open,High,Low,Close,Volume\n2025-11-20,100,101,99,100.5,1000',now),null);
});
test('market returns a dated close only with provider-compatible validated CSV',async()=>{
  const now=Date.parse('2026-11-22T19:00:00Z');
  const urls=[];
  const valid=await getDailyClose('AAPL',{nowMs:now,fetchImpl:async url=>{
    urls.push(url);
    return {ok:true,text:async()=> 'Date,Open,High,Low,Close,Volume\n2026-11-20,100,101,99,100.5,1000'};
  }});
  assert.equal(valid.status,'OBSERVED');
  assert.equal(valid.observation.closeUsd,100.5);
  assert.ok(urls[0].startsWith('https://stooq.com/q/d/l/'));
  const unknown=await getDailyClose('MSFT',{nowMs:now,fetchImpl:async()=>({ok:true,text:async()=>'<html>challenge</html>'})});
  assert.equal(unknown.status,'UNAVAILABLE');
  assert.equal(unknown.observation,null);
});
