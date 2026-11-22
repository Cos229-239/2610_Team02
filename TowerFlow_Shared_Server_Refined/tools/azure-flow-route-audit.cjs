'use strict';
// Real local-model routing evaluation. Uses actual Azure plan() with authorization;
// grades against a predeclared rubric, not against response shape alone.
// No public fetches, state writes, downloads or model promotion.
const {plan}=require('../lib/azure-flow-intelligence');
const {CASES,assess}=require('../lib/azure-flow-route-evaluation');
const {reviewCase,reviewRun}=require('../lib/azure-flow-three-role-audit');
async function run({runner=plan,cases=CASES,clock=Date.now,logger=console.log}={}){
  const rows=[];
  for(const item of cases){
    const t=clock();
    let selected=[],modelStatus='UNAVAILABLE';
    try {
      const proposal=await runner(item.question,{allowPublic:item.allowPublic,isOwner:true});
      selected=proposal.capabilities||[];
      modelStatus=proposal.status;
    }catch(e){modelStatus='ERROR_'+(e?.message||'unknown').slice(0,55)}
    const row={item,selected,modelStatus,ms:clock()-t};
    rows.push(row);
    const {grade}=require('../lib/azure-flow-route-evaluation');
    const result=grade(selected,item);
    const threeRoles=reviewCase(item,selected,modelStatus);
    logger(item.id+' REVIEW='+threeRoles.decision+
      ' DevilAdvocate='+threeRoles.roles[0].gate+
      ' Investigator='+threeRoles.roles[1].symptoms.join(' | ')+
      ' BlindspotEscapes='+threeRoles.roles[2].detectorEscapeCount);
    logger(item.id+' '+(result.pass?'PASS':'FAIL')+' tier='+item.tier+
      ' selected='+selected.join(',')+' reason='+result.reason+
      ' model='+modelStatus+' ms='+row.ms);
  }
  const outcome=assess(rows);
  logger('RESULT '+JSON.stringify({
    passed:outcome.passed,total:outcome.total,accuracy:outcome.routeAccuracy,
    byTier:outcome.byTier,verdict:outcome.verdict
  }));
  const triad=reviewRun(rows);
  logger('THREE_ROLE_REPORT '+JSON.stringify({
    roles:triad.roles,decision:triad.decision,
    falseGreenCandidates:triad.falseGreenCandidates,
    detectorEscapes:triad.detectorEscapes
  }));
  logger('Known-case diagnostic only; insufficient to certify general intelligence.');
  return outcome;
}
if(require.main===module){
  run().then(x=>{process.exitCode=x.verdict==='SMALL_SCREEN_PASS'?0:1})
    .catch(e=>{console.error('ROUTE_BENCHMARK_BLOCKED '+e.message);process.exitCode=2});
}
module.exports={run};
