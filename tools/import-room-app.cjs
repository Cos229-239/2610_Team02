'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const teamRemote = 'https://github.com/Cos229-239/2610_Team02.git';
const browserAsset = name => typeof name === 'string' && !name.startsWith('TowerFlow.Native/') &&
    !name.split('/').some(p => !p || p === '.' || p === '..' || /[\\:]/.test(p)) &&
    !/(^|\/)server\.js$/i.test(name) && /\.(?:html|css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?|mp3|ogg|wav|mp4|webm)$/i.test(name);
function prepare(room, {checkout=root, remote=teamRemote}={}) {
    if (!fs.existsSync(path.join(room,'server.js'))) throw Error('Choose the running collaboration room directory.');
    const git = args => execFileSync('git', args, {cwd:checkout,encoding:'utf8'}).trim();
    const revision = git(['ls-remote','--exit-code',remote,'refs/heads/dev']).split(/\s/)[0];
    if (!/^[a-f0-9]{40}$/.test(revision)) throw Error('Could not resolve the shared dev branch.');
    git(['fetch','--quiet','--no-tags','--no-write-fetch-head',remote,revision]);
    const entries = execFileSync('git',['ls-tree','-rz',revision,'--','TowerFlow/'],{cwd:checkout,encoding:'utf8'}).split('\0').filter(Boolean);
    const files = [];
    for (const entry of entries) {
        const tab=entry.indexOf('\t'), file=entry.slice(tab+1+'TowerFlow/'.length);
        if (!browserAsset(file)) continue;
        const [mode,type,id]=entry.slice(0,tab).split(' ');
        if (!['100644','100755'].includes(mode) || type!=='blob') throw Error('Expected a regular asset: '+file);
        const bytes=execFileSync('git',['cat-file','blob',id],{cwd:checkout,maxBuffer:128*1024*1024});
        files.push({file,bytes,sha256:hash(bytes)});
    }
    if (!files.some(item=>item.file==='index.html')) throw Error('TowerFlow/index.html is missing.');
    const destination=path.join(room,'public','towerflow');
    const changes=files.filter(item=>!fs.existsSync(path.join(destination,item.file)) || hash(fs.readFileSync(path.join(destination,item.file)))!==item.sha256).map(item=>item.file);
    const receipt=path.join(destination,'towerflow-build.json');
    const removals=[];
    if (fs.existsSync(receipt)) {
        const previous=JSON.parse(fs.readFileSync(receipt,'utf8'));
        const names=new Set(files.map(item=>item.file));
        for (const {file,sha256} of previous.files) {
            if (!browserAsset(file) || names.has(file)) continue;
            const target=path.join(destination,file);
            if (!fs.existsSync(target)) continue;
            if (hash(fs.readFileSync(target))!==sha256) throw Error('Previously published file has host edits: '+file);
            removals.push(file);
        }
    }
    return {revision,files,destination,changes,removals};

}
function install(room,apply=false,options={}) {
    const plan=prepare(room,options);
    if (options.expected && options.expected !== plan.revision) throw Error('Team dev advanced after preview. Preview the new revision before publishing.');
    console.log('Source commit: '+plan.revision);
    console.log('Destination: '+plan.destination);
    console.log('Changed or added files: '+(plan.changes.join(', ')||'none'));
    if (plan.removals.length) console.log('Previously published files removed from dev: '+plan.removals.join(', '));
    if (!apply) { console.log('Preview only. Publish this revision with --apply --revision='+plan.revision+'.'); return; }
    const checkout=options.checkout || root;
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'towerflow-publish-'));
    const clean=path.join(temp,'dev');
    try {
        execFileSync('git',['worktree','add','--quiet','--detach',clean,plan.revision],{cwd:checkout});
        try {
            execFileSync(process.execPath,[path.join(clean,'tools','check-contributions.cjs')],{cwd:clean,stdio:'inherit'});
        } finally { execFileSync('git',['worktree','remove','--force',clean],{cwd:checkout}); }
    } finally { fs.rmSync(temp,{recursive:true,force:true}); }
    const stage=plan.destination+'.stage-'+crypto.randomUUID();
    const rollback=plan.destination+'.previous';
    fs.mkdirSync(stage,{recursive:true});
    try {
        if(fs.existsSync(plan.destination)) fs.cpSync(plan.destination,stage,{recursive:true});
        for(const file of plan.removals) fs.unlinkSync(path.join(stage,file));
        for(const item of plan.files){
            const target=path.join(stage,item.file);
            fs.mkdirSync(path.dirname(target),{recursive:true});
            fs.writeFileSync(target,item.bytes);
        }
        fs.writeFileSync(path.join(stage,'towerflow-build.json'),JSON.stringify({revision:plan.revision,importedAt:new Date().toISOString(),files:plan.files.map(({file,sha256})=>({file,sha256}))},null,2)+'\n');
        if(fs.existsSync(rollback))throw Error('Review the previous import directory before another import: '+rollback);
        const hadPrevious=fs.existsSync(plan.destination);
        if(hadPrevious)fs.renameSync(plan.destination,rollback);
        try{fs.renameSync(stage,plan.destination);}
        catch(error){if(hadPrevious)fs.renameSync(rollback,plan.destination);throw error;}
        console.log('Imported. Inspect /towerflow/towerflow-build.json on the host, then reopen the business panel.');
    } finally { fs.rmSync(stage,{recursive:true,force:true}); }
}
if(require.main===module){
    try{
        const args=process.argv.slice(2), room=args.find(arg=>!arg.startsWith('--'));
        if(!room)throw Error('Usage: node tools/import-room-app.cjs <room-directory> [--apply]');
        const expected=args.find(arg=>/^--revision=[0-9a-f]{40}$/.test(arg));
        if(args.some(arg=>arg.startsWith('--')&&arg!=='--apply'&&arg!==expected))throw Error('Unknown option.');
        install(path.resolve(room),args.includes('--apply'),{expected:expected?.slice('--revision='.length)});
    }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={prepare,install};
