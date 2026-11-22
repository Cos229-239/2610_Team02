'use strict';
// Metamorphic stress test: controlled capability-order perturbation of the actual local
// Ollama planner. It tests the evaluator's blind spots as well as the model itself.
// No network source search, document writes, paid calls, or model promotion.
const {plan}=require('../lib/azure-flow-intelligence');
const {CASES,grade}=require('../lib/azure-flow-route-evaluation');
const IDS=Object.freeze(['F01','F04','F08','F12']);
function sameSet(a,b){
  if(a.length!==b.length)return false;
  return [...a].sort().join('\0')===[...b].sort().join('\0');
}
async function audit({runner=plan,ids=IDS,clock=Date.now,logger=console.log}={}){
  const cases=ids.map(id=>CASES.find(x=>x.id===id));
  if(cases.some(x=>!x))throw Error('Unknown test case');
  const rows=[];
  for(const item of cases){
    const variants=[];
    for(const registryOrder of ['normal','reverse']){
      const at=clock();
      let selected=[],status='UNAVAILABLE';
      try{
        const result=await runner(item.question,{allowPublic:item.allowPublic,isOwner:true,registryOrder});
        selected=result.capabilities||[];
        status=result.status||'UNKNOWN';
      }catch(e){status='ERROR_'+String(e.message||'UNKNOWN').slice(0,40)}
      const graded=grade(selected,item);
      const pass=graded.pass&&status==='MODEL_PLAN_VALIDATED';
      const record={order:registryOrder,selected,status,
        pass,reason:pass?'PASS':status==='MODEL_PLAN_VALIDATED'?graded.reason:'MODEL_UNAVAILABLE',
        ms:clock()-at};
      variants.push(record);
      logger(item.id+' '+registryOrder+' '+(pass?'PASS':'FAIL')+
        ' selected='+selected.join(',')+' reason='+record.reason+' ms='+record.ms);
    }
    const stable=sameSet(variants[0].selected,variants[1].selected);
    rows.push({id:item.id,variants,stable,
      pass:stable&&variants.every(x=>x.pass)});
    logger(item.id+' REGISTRY_ORDER_INVARIANCE='+(stable?'PASS':'FAIL'));
  }
  const passed=rows.filter(x=>x.pass).length;
  const result={passed,total:rows.length,failures:rows.filter(x=>!x.pass).map(x=>x.id),
    verdict:passed===rows.length?'DISCLOSED_METAMORPHIC_SCREEN_PASS':'NOT_QUALIFIED',
    rows,note:'Disclosed prompt variants, not a blind holdout or end-to-end source verification.'};
  logger('METAMORPHIC_RESULT '+JSON.stringify({passed:result.passed,total:result.total,
    failures:result.failures,verdict:result.verdict}));
  return result;
}
if(require.main===module){
  audit().then(x=>{process.exitCode=x.verdict==='DISCLOSED_METAMORPHIC_SCREEN_PASS'?0:1})
    .catch(e=>{console.error('METAMORPHIC_AUDIT_BLOCKED '+e.message);process.exitCode=2});
}
module.exports={IDS,sameSet,audit};
