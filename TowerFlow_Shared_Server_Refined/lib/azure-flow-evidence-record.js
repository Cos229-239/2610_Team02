'use strict';
// Explicit owner-approved Markdown evidence+ADR record. No auto-save or repo writes.
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
function line(v){return String(v??'').replace(/[\r\n\0]/g,' ').replace(/</g,'&lt;').slice(0,1700)}
function reportMarkdown(result){
  if(result?.schema!=='azure-flow-investigation/v1'||!Array.isArray(result.sources)||
    !/^[0-9a-f]{64}$/.test(result?.provenance?.evidenceId||''))throw Error('Evidence object is unverified');
  const markdown=[
    '# Azure Flow — Research findings and draft ADR','',
    '- Status: **DRAFT / UNAPPROVED**',
    '- Evidence receipt: `'+result.provenance.evidenceId+'`',
    '- Timestamp: '+line(result.provenance.retrievedAt),
    '- Source revision: '+line(result.provenance.sourceRevision),
    '- Research scope: '+line(result.note),'',
    '## Preserved question','',
    '> '+line(result.original),'',
    '## Observations and attributed sources','',
    line(result.answer),''
  ];
  if(!result.sources.length)markdown.push('No verified source passages were retrieved.','');
  for(let i=0;i<Math.min(9,result.sources.length);i++){
    const s=result.sources[i];
    markdown.push('### Source '+(i+1)+': '+line(s.title||s.source),
      '- Identifier: `'+line(s.sourceId)+'`',
      '- Origin: '+line(s.source),
      '- SHA-256: `'+line(s.sha256)+'`',
      '- URL: '+(typeof s.url==='string'?line(s.url):'Local authenticated workspace record'),
      '- Retrieved: '+line(s.retrievedAt||result.provenance.retrievedAt),'',
      '> '+line(s.excerpt),'');
  }
  markdown.push('## ADR — Decision about this investigation','',
    '- Decision status: **PROPOSED; requires human review**',
    '### Context','',
    'Question: '+line(result.original)+'. The evidence sources above were gathered by authorized read-only capabilities.','',
    '### Decision','',
    'Preserve current business state. Review attributed evidence and determine whether further investigation is required before any operational change.','',
    '### Alternatives considered','',
    '1. Take immediate action on incomplete evidence — rejected (no approval or validated action contract).',
    '2. Gather additional primary or official sources — preferred whenever evidence is absent, contradictory or community-edited.','',
    '### Consequences','',
    '- Positive: reproducible sources, explicit uncertainty, no unapproved write.',
    '- Negative: no automatic business recommendation or execution is guaranteed.','',
    '### Verification and unknowns','',
    ...((result.unknowns||[]).length?result.unknowns.map(x=>'- '+line(x)):
      ['- Factual accuracy and source authority require separate review.']),
    '- The Markdown document records a proposal, not validated financial or legal advice.',''
  );
  return markdown.join('\n');
}
function persist(result,{directory,write=fs.writeFileSync}={}){
  if(typeof directory!=='string')throw Error('An explicit data directory is required');
  const content=reportMarkdown(result);
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const name='azure-'+result.provenance.evidenceId.slice(0,24)+'-'+crypto.randomBytes(4).toString('hex')+'.md';
  const destination=path.join(directory,name);
  write(destination,content,{flag:'wx',encoding:'utf8',mode:0o600});
  return {saved:true,filename:name,sha256:crypto.createHash('sha256').update(content).digest('hex'),
    bytes:Buffer.byteLength(content),note:'Local draft Markdown; never committed, shared or merged automatically.'};
}
module.exports={line,reportMarkdown,persist};
