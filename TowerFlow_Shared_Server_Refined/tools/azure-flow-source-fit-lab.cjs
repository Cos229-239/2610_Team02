'use strict';
// Experimental live diagnostic: each harness is evaluated separately by Ollama.
// Source-fit rubric is independent from the experimental planner's output.
const {adjudicate}=require('../lib/azure-flow-planner-lab');
const {CASES,grade}=require('../lib/azure-flow-route-evaluation');
const IDS=['F01','F04','F08','F12'];
async function run({runner=adjudicate,ids=IDS,clock=Date.now,logger=console.log,registryOrder='normal'}={}){
  const rows=[];
  for(const id of ids){
    const item=CASES.find(x=>x.id===id);
    if(!item)throw Error('UNKNOWN_CASE');
    const start=clock();
    let out;
    try{out=await runner(item.question,{allowPublic:item.allowPublic,isOwner:true,registryOrder})}
    catch(error){out={status:'LAB_RUNTIME_ERROR',capabilities:[],findings:[],error:String(error.message).slice(0,70)}}
    const selected=out.capabilities||[];
    const fitness=grade(selected,item);
    const pass=out.status==='EXPERIMENTAL_FIT_SCREEN'&&fitness.pass;
    rows.push({id,tier:item.tier,status:out.status,selected,pass,
      reason:pass?'PASS':out.status==='EXPERIMENTAL_FIT_SCREEN'?fitness.reason:out.status,
      ms:clock()-start,findings:out.findings});
    logger('CASE '+id+' '+(pass?'PASS':'FAIL')+' status='+out.status+
      ' selected='+selected.join(',')+' reason='+rows.at(-1).reason+
      ' ms='+rows.at(-1).ms);
    for(const f of (out.findings||[]))
      logger('  '+f.id+' '+f.relevance+' reason='+f.reason+
        (f.failure?' FAILURE='+f.failure:''));
  }
  const passed=rows.filter(x=>x.pass).length;
  const result={passed,total:rows.length,rows,
    verdict:passed===rows.length?'EXPERIMENTAL_SCREEN_PASS':'NOT_QUALIFIED',
    note:'Known diagnostic cases. Not blind, not source retrieval, not production deployment.'};
  logger('INDEPENDENT_SOURCE_FIT_RESULT '+JSON.stringify({passed,total:rows.length,
    verdict:result.verdict}));
  return result;
}
if(require.main===module){
  const order=process.argv.includes('--reverse')?'reverse':'normal';
  run({registryOrder:order}).then(r=>{process.exitCode=r.verdict==='EXPERIMENTAL_SCREEN_PASS'?0:1})
    .catch(e=>{console.error('SOURCE_FIT_LAB_BLOCKED '+e.message);process.exitCode=2});
}
module.exports={IDS,run};
