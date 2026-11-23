'use strict';
// Source-scoped, dependency-free Markdown retrieval. Never reads arbitrary user paths.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX_FILES=70, MAX_BYTES=250000, MAX_CHUNKS=150, MAX_CHARS=750;
const TOKEN=/[a-z0-9]{3,}/g;
function terms(s){return String(s).toLowerCase().match(TOKEN)||[]}
function normalizePath(p){return p.replaceAll(path.sep,'/')}
function sources(root){
  const directories=['docs/azure-flow/knowledge','docs/azure-flow'];
  let paths=[];
  for(const dir of directories){
    const abs=path.resolve(root,dir);
    if(!fs.existsSync(abs))continue;
    for(const name of fs.readdirSync(abs,{withFileTypes:true})){
      if(!name.isFile()||!name.name.endsWith('.md'))continue;
      const file=path.resolve(abs,name.name);
      if(!file.startsWith(abs+path.sep))continue;
      const stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()||stat.size>MAX_BYTES)continue;
      paths.push({file,id:normalizePath(path.relative(root,file))});
    }
  }
  return paths.slice(0,MAX_FILES);
}
function chunkMarkdown(raw,id){
  const headings=raw.split(/(?=^#{1,4} )/m);
  let chunks=[],heading='Document';
  for(const segment of headings){
    const first=segment.split('\n')[0].trim();
    if(/^#{1,4} /.test(first))heading=first.replace(/^#{1,4} /,'');
    for(let i=0;i<segment.length;i+=MAX_CHARS){
      const text=segment.slice(i,i+MAX_CHARS).trim();
      if(text.length<35)continue;
      const hash=crypto.createHash('sha256').update(text).digest('hex');
      chunks.push({sourceId:id+'#'+hash.slice(0,12),kind:'local_md',title:heading,
        url:null,source:id,excerpt:text,sha256:hash});
      if(chunks.length>=MAX_CHUNKS)return chunks;
    }
  }
  return chunks;
}
function rank(query,items,limit=4){
  const q=[...new Set(terms(query))],N=items.length;
  if(!q.length)return [];
  const docs=items.map(x=>({...x,tokens:terms(x.title+' '+x.excerpt)}));
  const mean=docs.reduce((a,d)=>a+d.tokens.length,0)/(N||1);
  const df=new Map(q.map(w=>[w,docs.filter(d=>d.tokens.includes(w)).length]));
  return docs.map(d=>{
    const freq=new Map();for(const w of d.tokens)freq.set(w,(freq.get(w)||0)+1);
    let score=0;
    for(const w of q){
      const tf=freq.get(w)||0;if(!tf)continue;
      const idf=Math.log(1+(N-(df.get(w)||0)+.5)/((df.get(w)||0)+.5));
      score+=idf*(tf*2.2)/(tf+1.2*(.25+.75*d.tokens.length/(mean||1)));
    }
    return {...d,score};
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.sourceId.localeCompare(b.sourceId))
    .slice(0,limit).map(({tokens,...d})=>d);
}
function retrieve(query,{root=path.resolve(__dirname,'..'),limit=4}={}){
  const all=sources(root).flatMap(({file,id})=>{
    try{return chunkMarkdown(fs.readFileSync(file,'utf8'),id)}
    catch{return []}
  }).slice(0,MAX_CHUNKS);
  return {kind:'markdown-bm25',indexItems:all.length,hits:rank(query,all,limit),
    note:'Local Markdown passages; relevance is estimated, not evidence of factual truth.'};
}
// User-scoped draft archive retrieval. These documents are prior hypotheses, NOT facts.
function retrieveFindings(query,{directory,limit=3}={}){
  if(typeof directory!=='string'||!path.isAbsolute(directory))throw Error('Trusted absolute archive root required');
  if(!fs.existsSync(directory))return {kind:'review-draft-memory',hits:[],indexItems:0};
  const stat=fs.lstatSync(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('Unsafe archive directory');
  const names=fs.readdirSync(directory,{withFileTypes:true})
    .filter(x=>x.isFile()&&/^azure-[a-f0-9]{24}-[a-f0-9]{8}\.md$/.test(x.name))
    .slice(-25);
  const chunks=[];
  for(const entry of names){
    const full=path.resolve(directory,entry.name);
    if(!full.startsWith(path.resolve(directory)+path.sep))continue;
    const info=fs.lstatSync(full);
    if(info.isSymbolicLink()||!info.isFile()||info.size>MAX_BYTES)continue;
    const id='owner-draft/'+entry.name;
    for(const c of chunkMarkdown(fs.readFileSync(full,'utf8'),id)){
      chunks.push({...c,kind:'draft_research_memory',source:id,
        limitations:'Historical owner-saved unapproved draft, not independently verified evidence.'});
      if(chunks.length>=MAX_CHUNKS)break;
    }
    if(chunks.length>=MAX_CHUNKS)break;
  }
  return {kind:'review-draft-memory',hits:rank(query,chunks,Math.min(4,limit)),indexItems:chunks.length,
    note:'Research drafts recall prior hypotheses; source claims require fresh verification.'};
}
module.exports={terms,sources,chunkMarkdown,rank,retrieve,retrieveFindings};
