'use strict';
// Metacognitive evidence audit: measures what can actually be verified.
// No fabricated confidence percentage or unsupported contradiction resolution.
const TRUST=Object.freeze({
  official_filing_metadata:'PRIMARY_SOURCE_LOCATOR',
  official_reported_financial_fact:'ISSUER_REPORTED_XBRL',
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
    'SEC_UNAVAILABLE','HARNESS_UNAVAILABLE','OPERATOR_IDENTITY_REQUIRED',
    'ISSUER_NOT_RESOLVED','ISSUER_AMBIGUOUS'].includes(r.status));
  const financialGaps=records.filter(x=>x.capability==='research.sec'&&
    x.financialStatus&&x.financialStatus!=='REPORTED_FACTS_FOUND')
    .map(x=>({id:x.capability,status:x.financialStatus}));
  const financialConflicts=records.filter(x=>x.capability==='research.sec')
    .flatMap(x=>Array.isArray(x.financialConflicts)?x.financialConflicts:[]);
  const primary=counts.PRIMARY_SOURCE_LOCATOR||0;
  const annualFacts=counts.ISSUER_REPORTED_XBRL||0;
  let evidenceStatus;
  if(!sources.length)evidenceStatus='INSUFFICIENT';
  else if(unattributed||citationReuse)evidenceStatus='PROVENANCE_PROBLEM';
  else if(financialConflicts.length)evidenceStatus='ISSUER_FINANCIAL_CONFLICT_REQUIRES_REVIEW';
  else if(annualFacts)evidenceStatus='ISSUER_REPORTED_FACTS_PRESENT';
  else if(!primary)evidenceStatus='BACKGROUND_OR_LOCAL_ONLY';
  else evidenceStatus='PRIMARY_LOCATOR_RETRIEVED_NOT_ANALYZED';
  return {evidenceStatus,sourceCount:sources.length,
    independentOriginsObserved:observedOrigins.size,
    sourceClasses:counts,unattributed,citationReuse,
    failedCapabilities:[...failures.map(x=>({id:x.capability,status:x.status})),...financialGaps],
    financialConflicts,
    issuerReportedFacts:annualFacts,verifiedFinancialFacts:false,contradictionsResolved:false,
    nextEvidenceNeed:evidenceStatus==='INSUFFICIENT'?
      'Retrieve a relevant authoritative source, or ask a narrower question.':
      'Verify the reporting dates, units, accession numbers, and source documents before comparing periods or making an investment judgment.',
    interpretation:'Source class and count describe coverage; they are not calibrated factual accuracy or investment confidence.'
  };
}
module.exports={TRUST,audit};
