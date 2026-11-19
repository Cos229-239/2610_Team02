'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {compareWebFiles,makeTeamUpdates} = require('./team-updates.cjs');
const {memberEntry} = require('./quiet-entry.cjs');
const bytes = Buffer.from('hello\n');
const sha = crypto.createHash('sha1').update('blob 6\0').update(bytes).digest('hex');
const web = (name, props={}) => ({filename:'TowerFlow/'+name, sha, status:'modified', ...props});

test('published evidence uses actual web bytes, including removed and renamed paths', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(),'tf-web-proof-'));
    t.after(()=>fs.rm(dir,{recursive:true,force:true}));
    await fs.mkdir(path.join(dir,'towerflow'));
    await fs.writeFile(path.join(dir,'towerflow','new.js'),bytes);
    const compare = files => compareWebFiles(files,dir,new Map());
    assert.equal(await compare([web('new.js')]),'match');
    assert.equal(await compare([web('new.js',{previous_filename:'TowerFlow/old.js',status:'renamed'})]),'match');
    assert.equal(await compare([web('new.js',{status:'removed'})]),'different');
    assert.equal(await compare([web('missing.js')]),'different');
    assert.equal(await compare([web('TowerFlow.Native/a.json'),web('server.js')]),null);
    assert.equal(await compare([web('new.js',{sha:'missing'})]),'unknown');
    await fs.writeFile(path.join(dir,'towerflow','new.js'),'a later edit');
    assert.equal(await compare([web('new.js')]),'different');
});

test('direct dev merge appears to both teammates, with native instructions and no web claim', async () => {
    const revision='a'.repeat(40);
    const requests=[];
    const read = async (url,opts) => {
        requests.push(opts.headers.Authorization);
        const u = new URL(url);
        if (u.searchParams.get('sha')==='dev') return {ok:true,json:async()=>[{sha:revision,author:{login:'TeamMember'},commit:{message:'Merge display header',committer:{date:'2026-11-18'}}}]};
        assert.ok(u.pathname.endsWith('/commits/'+revision));
        return {ok:true,json:async()=>({files:[{filename:'DisplayHelper.h',status:'added'}]})};
    };
    const updates = makeTeamUpdates('',read);
    const one = await updates('session-one'), two = await updates('session-two');
    assert.deepEqual(one,two); assert.equal(one[0].native,true); assert.equal(one[0].web,null);
    assert.equal(one[0].complete,true); assert.equal(requests.length,2);
    let attempts=0;
    const recover = makeTeamUpdates('',async (url,options)=>++attempts===1 ? {ok:false} : read(url,options));
    await assert.rejects(recover('session-one')); assert.deepEqual(await recover('session-two'),one);
});
test('normal IDE entry points open the account desk first and preserve their legacy fallback', async () => {
    const vm=require('node:vm');
    const code = memberEntry(`let host=0;async function idePanel(){host++}function openFrontierIDE(){host++}function station(id){if (id.startsWith('dev-ide-')) {host++}};`);
    for (const available of [true,false]) {
        const c=vm.createContext({window:{tfOpenMemberDesk:()=>available}});
        vm.runInContext(code,c);
        assert.equal(await vm.runInContext('idePanel().then(()=>{openFrontierIDE();station("dev-ide-1");return host;})',c),available?0:3);
    }
});
