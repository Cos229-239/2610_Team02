'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {makeLoadouts, workFromFiles, teamRepo} = require('./loadouts.cjs');
const {installRoom} = require('./install.cjs');
const {quietEntry} = require('./quiet-entry.cjs');

const sha = 'b'.repeat(40), junk = 'a'.repeat(40);
const commit = (id, date) => ({sha:id, parents:[{}], commit:{message:'Parts view',committer:{date}}});
function fixture(reply) {
    return makeLoadouts(async (url, options) => {
        assert.equal(options.headers.Authorization, 'Bearer test-session');
        const route = new URL(url);
        assert.equal(route.origin, 'https://api.github.com');
        const value = reply(route.pathname.replace('/repos/'+teamRepo,''), route.searchParams);
        return {ok:true,json:async()=>value};
    });
}

test('Omarion resumes the latest source on dev, skipping a newer build-output commit', async () => {
    const load = fixture((route,q) => {
        if (route === '/search/issues') return {items:[]};
        if (route === '/pulls') return [];
        if (route === '/commits') return q.get('sha') === 'dev' ? [commit(junk,'2026-11-12'),commit(sha,'2026-11-11')] : [];
        assert.ok(route === '/commits/'+sha || route === '/commits/'+junk);
        return {files:[{filename:route.endsWith(junk) ? 'Towerflow_OW/TowerFlow/x64/Debug/generated.cpp' : 'Towerflow_OW/TowerFlow/Report.cpp'}]};
    });
    const data = await load('HyperRealmEnd','test-session');
    assert.equal(data.available,true);
    assert.deepEqual([data.name,data.work.project,data.work.ref,data.work.revision], ['Omarion','reporting','dev',sha]);
});
test('William gets his open dev PR and its actual project ahead of commit history', async () => {
    const load = fixture(route => {
        if (route === '/search/issues') return {items:[{number:7}]};
        if (route === '/pulls') return [];
        if (route === '/pulls/7/files') return [{filename:'TowerFlowWindow/TowerFlowWinForm/Form1.cs'}];
        assert.equal(route,'/pulls/7');
        return {state:'open',user:{login:'Lopobunnie'},base:{ref:'dev'},head:{ref:'feature/parts',repo:{full_name:teamRepo},sha},
            title:'Edit part quantities',draft:true};
    });
    const {name,work} = await load('LOPOBUNNIE','test-session');
    assert.deepEqual([name,work.project,work.ref,work.number,work.draft],['William','forms','feature/parts',7,true]);
});
test('unavailable GitHub data returns the correct starter for each login and does not cross accounts', async () => {
    const load = makeLoadouts(async()=>{throw Error('offline');});
    for (const [login,id] of [['Lopobunnie','forms'],['HyperRealmEnd','reporting'],['DaynaPerezColon','interface'],['SVN-760','operations'],['Dulskinator96','integration'],['NewTeammate','shared']]) {
        const data = await load(login,'test-session');
        assert.deepEqual([data.available,data.work,data.defaultProject],[false,null,id]);
    }
    assert.equal(workFromFiles([{filename:'a/obj/Debug/Form.cs'},{filename:'src/old.cpp',status:'removed'}],'forms'),null);
});
test('quiet entry removes both automatic calls and preserves explicit help and audio controls', () => {
    const entry = "connect();say('Welcome to Towerflow. Can I assist you? Pun intended.',true);window.tfRockyGreeting?.onEnter();updateMetrics();";
    const help = "button.onclick=()=>say('Help',true);rain.onclick=()=>audio.play();";
    assert.equal(quietEntry(entry+help),'connect();updateMetrics();'+help);
    const room = fs.readFileSync(path.join(__dirname,'../live-room/public/room.js'),'utf8');
    assert.equal(quietEntry(room),room);
    assert.match(room,/\$\('greet'\)\.onclick=\(\)=>say\(/);
});
test('upgrading an existing host installs the complete desk and keeps its graphics module byte-identical', t => {
    const room = fs.mkdtempSync(path.join(os.tmpdir(),'tf-az-room-'));
    t.after(()=>fs.rmSync(room,{recursive:true,force:true}));
    fs.copyFileSync(path.join(__dirname,'../live-room/server.js'),path.join(room,'server.js'));
    fs.mkdirSync(path.join(room,'public'));
    fs.writeFileSync(path.join(room,'public/room.js'),'// installed graphics');
    assert.equal(installRoom(room),true);
    assert.equal(installRoom(room),false);
    for (const f of ['quiet-entry.cjs','team-updates.cjs','loadouts.cjs','loadout.js','loadout.css','desk.js','server.cjs']) {
        assert.deepEqual(fs.readFileSync(path.join(room,'azure-bridge',f)),fs.readFileSync(path.join(__dirname,f)));
    }
    assert.equal(fs.readFileSync(path.join(room,'public/room.js'),'utf8'),'// installed graphics');
});
test('branch suggestions contain the signed-in member’s published work ahead of dev', async () => {
    const {publishedBranches} = require('./loadouts.cjs');
    const ref = (name,login)=>({name,target:{author:{user:{login}}}});
    const read = async (url, options) => {
        assert.equal(options.headers.Authorization,'Bearer fixture');
        if (url.endsWith('/graphql')) return {ok:true,json:async()=>({data:{repository:{refs:{nodes:[
            ref('dev','Lopobunnie'),ref('feature/parts','Lopobunnie'),ref('other-work','HyperRealmEnd'),
            ref('WilliamPersonal','other'),ref('work/Lopobunnie/old','other'),ref('DaynaPersonal','Lopobunnie'),ref('work/peer/edits','Lopobunnie')
        ]}}}})};
        assert.doesNotMatch(url,/other-work|DaynaPersonal|work%2Fpeer/i);
        return {ok:true,json:async()=>({ahead_by:url.includes('old')?0:1})};
    };
    assert.deepEqual(await publishedBranches('Lopobunnie','fixture',read),['feature/parts','WilliamPersonal']);
});
