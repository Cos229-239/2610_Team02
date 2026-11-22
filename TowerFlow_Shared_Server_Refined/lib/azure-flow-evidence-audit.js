'use strict';
// Metacognitive evidence audit: measures what can actually be verified.
// No fabricated confidence percentage or unsupported contradiction resolution.
const TRUST=Object.freeze({
  inventory_snapshot:'AUTHENTICATED_LOCAL_RECORD',
  sales_snapshot:'AUTHENTICATED_LOCAL_RECORD',
  local_md:'LOCAL_DESIGN_KNOWLEDGE',
  public_reference:'COMMUNITY_BACKGROUND',
  human_approved_episode:'APPROVED_ROUTING_PRECEDENT'
});
function audit(records,sources){
  const counts={};
  const observedOrigins=new Set();
  let unattributed=0;
  let citationReuse=0;
  const ids=new Set();
  for(const s of sources){
    const kind=TRUST[s.kind]||'UNCLASSIFIED';
    counts[kind]=(counts[kind]||0)+1;
    if(typeof s.source==='string')observedOrigins.add(s.source);
    if(!s.sourceId||!s.sha256||!/^[0-9a-f]{64}$/.test(s.sha256))unattributed++;
    if(ids.has(s.sourceId))citationReuse++;
    ids.add(s.sourceId);
  }
  const failures=records.filter(r=>['NO_RECORDS','NO_MATCH','PROVIDER_UNAVAILABLE',
    'HARNESS_UNAVAILABLE'].includes(r.status));
  let evidenceStatus;
  if(!sources.length)evidenceStatus='INSUFFICIENT';
  else if(unattributed||citationReuse)evidenceStatus='PROVENANCE_PROBLEM';
  else evidenceStatus='BACKGROUND_OR_LOCAL_ONLY';
  return {evidenceStatus,sourceCount:sources.length,
    independentOriginsObserved:observedOrigins.size,
    sourceClasses:counts,unattributed,citationReuse,
    failedCapabilities:failures.map(x=>({id:x.capability,status:x.status})),
    verifiedFinancialFacts:false,contradictionsResolved:false,
    nextEvidenceNeed:evidenceStatus==='INSUFFICIENT'?
      'Retrieve a relevant authoritative source, or ask a narrower question.':
      'Verify source authorship, date, scope, and evidence before drawing conclusions.',
    interpretation:'Source class and count describe coverage; they are not calibrated factual accuracy or investment confidence.'
  };
}
module.exports={TRUST,audit};
