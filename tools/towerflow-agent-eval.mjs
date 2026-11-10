/**
 * Towerflow AURA local prompt tuning/evaluation.
 * Requires a separately running local Ollama instance. No fine-tuning of model
 * weights: measures selected prompts at several sampling temperatures.
 * No repository writes, no credentials, no unrestricted model tools.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cases = [
 {id:'controls',q:'Which movement mode is live in Towerflow?',must:[/camera.relative|first.person/i,/W|forward/i],forbid:[/live\s+(?:controls\s+are\s+)?world.fixed/i]},
 {id:'ide-reality',q:'Can Cursor and Visual Studio Community run as full graphical desktop IDEs in the browser room?',must:[/not|no|pending|unconfigured/i],forbid:[/fully integrated|yes,?\s+all/i]},
 {id:'server-restart',q:'Does restarting the Node server preserve every WebSocket connection?',must:[/disconnect|interrupt|drop/i],forbid:[/no interruption|guaranteed/i]},
 {id:'deployment',q:'Does merging a GitHub PR automatically update the live Towerflow installation?',must:[/not|no|separate|manual/i],forbid:[/automatically deployed|instant live/i]},
 {id:'unknown',q:'Is the Towerflow agent already a production always-on in-room service?',must:[/not|no|pending|future/i],forbid:[/already fully operational|yes it is/i]}
];
export function grade(answer,test) {
 const evidence=test.must.filter(re=>re.test(answer)).length;
 const violations=test.forbid.filter(re=>re.test(answer)).length;
 return {id:test.id,passed:evidence===test.must.length&&violations===0,evidence,expected:test.must.length,violations};
}
export { cases };
const header='You are AURA, a precise Towerflow world assistant. Use only the knowledge below. Say unverified when unsupported. Answer in 2–4 sentences.';
async function run() {
 const model=process.env.TOWERFLOW_AI_MODEL || 'qwen3:8b';
 const file=await readFile(resolve(repoRoot,'towerflow-knowledge','WORLD.md'),'utf8');
 const temperatures=[0,0.2,0.4];
 console.log('TOWERFLOW AURA LOCAL PROMPT EVALUATION | Model: '+model);
 console.log('This evaluates prompts, not model-weight fine-tuning or production correctness.');
 const results=[];
 for(const temperature of temperatures){
  let passed=0;
  for(const test of cases) {
   const controller=new AbortController();
   const t=setTimeout(()=>controller.abort(),120000);
   try {
    const response=await fetch('http://127.0.0.1:11434/api/chat', {
     method:'POST', headers:{'content-type':'application/json'},
     body:JSON.stringify({
       model,stream:false,
       messages:[{role:'system',content:header+'\n\n'+file},{role:'user',content:test.q}],
       options:{temperature,num_predict:300}
     }),signal:controller.signal
    });
    if(!response.ok)throw new Error('Ollama HTTP '+response.status);
    const data=await response.json();
    const score=grade(data.message?.content||'',test);
    if(score.passed)passed++;
    console.log('temperature='+temperature+' case='+test.id+' '+(score.passed?'PASS':'REVIEW')+' | '+JSON.stringify(score));
   } finally {clearTimeout(t);}
  }
  results.push({temperature,passed,total:cases.length});
 }
 console.log('Summary: '+JSON.stringify(results));
 console.log('Heuristic checks only: review all responses and citations before selecting a configuration.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error('EVAL ERROR: '+e.message);process.exitCode=1;});
}
