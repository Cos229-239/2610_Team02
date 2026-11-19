'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parsePrompt,transform,sha,makeDirect}=require('./direct-integration.cjs');
const {SOURCE_AREAS,sourceLine,areaFor}=require('./source-navigation.cjs');
const old='<h1>Your money. <span>In motion.</span></h1>';
test('explicit source registry covers every app area with known anchors',()=>{
  for(const key of ['ui','dashboard','markets','watchlist','portfolio','holdings','trading','analytics','charts','settings','backend','room'])assert.ok(areaFor(key).file);
  assert.throws(()=>areaFor('../secrets'),/Unknown source/);
  assert.equal(sourceLine('x\nfunction marketTick(){\n','markets'),2);
  assert.throws(()=>sourceLine('function marketTickMissing(){}','markets'),/Source anchor missing/);
});
test('prompt interpretation is restricted, refuses arbitrary code, and escapes HTML',()=>{
  assert.deepEqual(parsePrompt('Change the dashboard headline to TowerFlow Command Center.'),{headline:'TowerFlow Command Center'});
  assert.throws(()=>parsePrompt('run rm -rf /'),/Prototype supports/);
  assert.throws(()=>parsePrompt('set market price to 500'),/Prototype supports/);
  const base=Buffer.from('<section class="welcome">'+old+'</section>');
  const patched=transform(base,{headline:'A & <script>alert(1)</script>'}).toString('utf8');
  assert.match(patched,/A &amp; &lt;script&gt;/);
  assert.equal(patched.includes('<script>'),false);
  assert.throws(()=>transform(Buffer.from('other app'),{headline:'hey'}),/changed upstream/);
});
test('plan is pinned to verified dev bytes; preview serves actual changed HTML and original JS',async()=>{
  const original=Buffer.from('<!doctype html><h1>Your money. <span>In motion.</span></h1><script src="app.js"></script>');
  const key='c'.repeat(48),base={revision:'a'.repeat(40),url:'/api/azure-bridge/preview-files/'+key+'/index.html'};
  const provider={open:async()=>base,file:(k,name)=>{
    if(k!==key)return null;
    if(name==='index.html')return {bytes:original,sha:sha(original),type:'text/html'};
    return name==='app.js'?{bytes:Buffer.from('console.log("source")'),type:'application/javascript'}:null;
  }};
  const direct=makeDirect({preview:provider,now:()=>1000,nonce:()=> 'e'.repeat(48)});
  const result=await direct.plan({owner:'alice',token:'token',prompt:'Change the dashboard headline to New TowerFlow'});
  assert.equal(result.revision,'a'.repeat(40));
  assert.match(direct.asset(result.key,'index.html').bytes.toString('utf8'),/New TowerFlow/);
  assert.match(direct.asset(result.key,'app.js').bytes.toString('utf8'),/source/);
  assert.equal(direct.asset('f'.repeat(48),'index.html'),null);
  assert.equal(direct.asset(result.key,'../../secret'),null);
  await assert.rejects(()=>direct.submit({key:result.key,owner:'bob',token:'token',login:'bob'}),/another account/);
});
test('explicit submission creates a draft PR only on verified dev and contributor branch',async()=>{
  const original=Buffer.from(old),pk='d'.repeat(48),calls=[];
  const preview={open:async()=>({revision:'a'.repeat(40),url:'/api/azure-bridge/preview-files/'+pk+'/index.html'}),
    file:(_,name)=>name==='index.html'?{bytes:original,sha:sha(original)}:null};
  const read=async(url,o)=>{
    calls.push({url,method:o.method,body:o.body&&JSON.parse(o.body)});
    const result=url.endsWith('/git/ref/heads/dev')?{object:{sha:'a'.repeat(40)}}:
      url.endsWith('/pulls')?{number:29,html_url:'https://github.com/Cos229-239/2610_Team02/pull/29'}:{sha:'e'.repeat(40)};
    return {ok:true,json:async()=>result};
  };
  const direct=makeDirect({preview,read,now:()=>1000,nonce:()=> 'f'.repeat(48)});
  const p=await direct.plan({owner:'A',token:'test',prompt:'Change the dashboard headline to New'});
  const result=await direct.submit({key:p.key,owner:'A',login:'Alice',token:'test'});
  assert.equal(result.number,29);
  assert.equal(calls.length,4);
  assert.equal(calls[1].body.ref,'refs/heads/work/alice/dashboard-ffffffffff');
  assert.equal(calls[2].body.sha,sha(original));
  assert.equal(calls[3].body.base,'dev');
  assert.equal(calls[3].body.draft,true);
  await direct.submit({key:p.key,owner:'A',login:'Alice',token:'test'});
  assert.equal(calls.length,4,'repeated submission is idempotent in-session');
});
test('dev mismatch blocks remote branch creation and unsafe publication',async()=>{
  const original=Buffer.from(old),pk='d'.repeat(48),calls=[];
  const preview={open:async()=>({revision:'a'.repeat(40),url:'/api/azure-bridge/preview-files/'+pk+'/index.html'}),file:()=>({bytes:original,sha:sha(original)})};
  const read=async(url)=>{calls.push(url);return {ok:true,json:async()=>({object:{sha:'b'.repeat(40)}})};};
  const direct=makeDirect({preview,read,now:()=>1000,nonce:()=> 'e'.repeat(48)});
  const p=await direct.plan({owner:'A',prompt:'Change dashboard headline to Test'});
  await assert.rejects(()=>direct.submit({key:p.key,owner:'A',login:'alice',token:'test'}),/Dev moved/);
  assert.equal(calls.length,1);
});
