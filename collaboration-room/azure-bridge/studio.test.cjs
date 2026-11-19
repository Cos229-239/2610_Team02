'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {mergedPreview}=require('./merged-preview.cjs');
const {mountDemo}=require('./debug-demo.cjs');

test('each preview pins the whole app to dev and a failed new revision does not relabel prior files',async ()=>{
    const id=c=>c.repeat(40),sha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    let head=id('a'),now=0,broken=false,calls=0;const content=new Map();
    const preview=mergedPreview(async url=>{
        let value;calls++;
        if (url.endsWith('/commits/dev')) value={sha:head,commit:{tree:{sha:id('c')}}};
        else if (url.includes('/git/trees/')) {
            const bytes=Buffer.from(head),key=sha(bytes);content.set(key,bytes);
            value={tree:[{type:'blob',mode:'100644',path:'TowerFlow/index.html',size:bytes.length,sha:key},
                {type:'blob',mode:'100644',path:'TowerFlow/server.js',size:100,sha:id('x')}]};
        } else value={content:Buffer.from(broken?'wrong':content.get(url.split('/').pop())).toString('base64')};
        return {ok:true,json:async()=>value};
    },()=>now);
    const first=await preview.open('member'),key=first.url.split('/').at(-2);
    assert.equal(first.revision,head);assert.equal(preview.file(key,'server.js'),undefined);
    await Promise.all([preview.open('two'),preview.open('three')]);assert.equal(calls,3);
    now+=31000;head=id('b');broken=true;await assert.rejects(preview.open('member'));
    assert.equal(preview.file(key,'index.html').bytes.toString(),id('a'));
    broken=false;const next=await preview.open('member');assert.equal(next.revision,head);
    assert.equal(preview.file(key,'index.html').bytes.toString(),id('a'));now+=31*60000;assert.equal(preview.file(key,'index.html'),undefined);
});
test('demo frames are held for one presenter and disappear on stop or expiry',async()=>{
    const routes=new Map(),root='/api/azure-bridge/demo',gate=(q,r,n)=>n();let now=0;
    const app={get:(url,...stack)=>routes.set(url,stack),post:(url,...stack)=>routes.set(url,stack)};
    mountDemo(app,{auth:gate,ensureMember:gate,sameOrigin:gate,now:()=>now});
    function call(path,login,body={},query={}) {
        const req={sessionID:login,session:{user:{login}},body,query};
        const res={code:200,json(value){this.value=value;},status(c){this.code=c;return this;},sendStatus(c){this.code=c;}};
        const stack=routes.get(root+path);let i=0;function next(){stack[i++]?.(req,res,next);}next();return res;
    }
    const id=call('/start','first').value.id;
    assert.equal(call('/start','second').code,409);
    const image='data:image/jpeg;base64,/9j/2Q==';
    assert.equal(call('/frame','first',{id,image}).code,204);
    const view=call('','second').value;assert.equal(view.image,image);
    assert.equal(call('','second',{}, {after:view.version}).value.image,null);
    assert.equal(call('/stop','first',{id}).code,204);assert.equal(call('','second').value,null);
    call('/start','second');now=21000;assert.equal(call('','first').value,null);
});
