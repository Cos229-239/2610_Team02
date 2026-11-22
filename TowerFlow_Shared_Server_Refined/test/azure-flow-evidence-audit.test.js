'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {audit}=require('../lib/azure-flow-evidence-audit');
test('metacognition records attribution and never fabricates investment confidence',()=>{
  const x=audit([{capability:'research.sec',status:'OPERATOR_IDENTITY_REQUIRED',evidence:[]}],[]);
  assert.equal(x.evidenceStatus,'INSUFFICIENT');
  assert.equal(x.verifiedFinancialFacts,false);
  assert.equal(x.contradictionsResolved,false);
  assert.equal(x.failedCapabilities[0].id,'research.sec');
  const source={sourceId:'SEC-1',kind:'official_filing_metadata',source:'SEC EDGAR',
    sha256:'f'.repeat(64),excerpt:'Form 10-K filing metadata'};
  const y=audit([{capability:'research.sec',status:'SOURCES_FOUND'}],[source]);
  assert.equal(y.evidenceStatus,'PRIMARY_LOCATOR_RETRIEVED_NOT_ANALYZED');
  assert.equal(y.verifiedFinancialFacts,false);
  assert.equal(y.sourceCount,1);
});
test('invalid source receipts and duplicates are flagged rather than counted as strong evidence',()=>{
  const x=audit([],[{sourceId:'duplicate',kind:'local_md',source:'docs',sha256:'a'.repeat(64)},
    {sourceId:'duplicate',kind:'local_md',source:'docs',sha256:'b'.repeat(64)}]);
  assert.equal(x.citationReuse,1);
  assert.equal(x.evidenceStatus,'PROVENANCE_PROBLEM');
});
