'use strict';
// Feedback is explicit episodic learning, NOT model-weight training.
// User-approved cases influence capability planning only, not factual claims.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {rank}=require('./azure-flow-retrieval');
const GRADES=Object.freeze(['useful','incorrect','needs-more-evidence']);
const LIMIT_BYTES=512*1024, MAX_EVENTS=160, MAX_MATCHES=3;
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex')}
function validateFeedback(value) {
  if(!value||Array.isArray(value)||typeof value!=='object'||
    Object.keys(value).sort().join(',')!=='evidenceId,grade,note')throw Error('Invalid feedback schema');
  if(!/^[a-f0-9]{64}$/.test(value.evidenceId)||!GRADES.includes(value.grade)||
    typeof value.note!=='string'||value.note.length>500||
    /[\x00-\x08\x0b-\x1f\x7f]/.test(value.note))throw Error('Invalid feedback values');
  return value;
}
function filename(directory){return path.join(directory,'azure-flow-learning.jsonl')}
function read(directory,{userId,limit=MAX_EVENTS}={}){
  const file=filename(directory);
  if(!fs.existsSync(file))return [];
  const stats=fs.lstatSync(file);
  if(!stats.isFile()||stats.isSymbolicLink()||stats.size>LIMIT_BYTES)throw Error('Learning ledger must be inspected; size or type exceeded.');
  const lines=fs.readFileSync(file,'utf8').split('\n').filter(Boolean);
  const entries=[];
  for(const line of lines.slice(-Math.max(1,Math.min(limit,MAX_EVENTS)))){
    let v;try{v=JSON.parse(line)}catch{throw Error('Learning ledger corrupted; no silent recovery')}
    if(v?.version!==1||typeof v.userId!=='string'||!GRADES.includes(v.grade)||
      typeof v.question!=='string'||!Array.isArray(v.capabilities)||!Array.isArray(v.sourceHashes)||
      typeof v.id!=='string')throw Error('Invalid learning entry');
    if(userId && v.userId!==userId)continue;
    entries.push(v);
  }
  return entries;
}
function append(directory,result,feedback,{userId,now=Date.now()}={}){
  validateFeedback(feedback);
  if(typeof userId!=='string'||userId.length<8)throw Error('Authenticated owner required');
  if(result?.schema!=='azure-flow-investigation/v1'||
    result?.provenance?.evidenceId!==feedback.evidenceId)throw Error('Evidence receipt mismatch');
  const existing=read(directory,{userId});
  if(existing.some(e=>e.evidenceId===feedback.evidenceId))throw Error('This research receipt already has feedback');
  const event={version:1,id:crypto.randomUUID(),userId,at:new Date(now).toISOString(),
    evidenceId:result.provenance.evidenceId,question:result.original,
    planStatus:result.plan?.status||'unknown',
    capabilities:(result.plan?.capabilities||[]).filter(x=>typeof x==='string').slice(0,3),
    sourceHashes:(result.sources||[]).map(x=>x.sha256).filter(x=>/^[a-f0-9]{64}$/.test(x)).slice(0,9),
    grade:feedback.grade,note:feedback.note,originalModel:result.plan?.model||null,
    sourceRevision:result.provenance.sourceRevision,
    learningClass:'episodic_feedback_only',
    isGroundTruth:false,modelWeightsChanged:false,approvedForRouting:feedback.grade==='useful'};
  const record=JSON.stringify(event)+'\n';
  if(fs.existsSync(filename(directory)) && fs.statSync(filename(directory)).size+Buffer.byteLength(record)>LIMIT_BYTES)
    throw Error('Learning ledger limit reached; no automatic compaction or deletion');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const fd=fs.openSync(filename(directory),'a',0o600);
  try{fs.writeSync(fd,record);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  return {saved:true,eventId:event.id,receiptHash:hash(event),
    eligibleForRouting:event.approvedForRouting,modelWeightsChanged:false};
}
function similar(question,events,{limit=MAX_MATCHES}={}){
  const approved=events.filter(e=>e.approvedForRouting&&e.grade==='useful'&&
    e.capabilities.length&&typeof e.question==='string');
  const eligible=approved.map(e=>({sourceId:e.id,title:e.question,excerpt:e.question,
    entry:e}));
  const hits=rank(question,eligible,Math.min(MAX_MATCHES,limit)).filter(x=>x.score>0);
  return hits.map(x=>({caseId:x.entry.id,question:x.entry.question,capabilities:x.entry.capabilities,
    relevance:x.score,reviewedAt:x.entry.at,
    guidance:'Human-approved routing precedent only; must pass current capability/authorization gates. Not a factual source.'}));
}
module.exports={GRADES,validateFeedback,read,append,similar};
