'use strict';
// Three independent review functions; evaluators are not authority to approve an AI.
// Keeps claims anchored to the actual route and independent target rubric.
const {grade,assess}=require('./azure-flow-route-evaluation');

function devilsAdvocate(item,selected,verdict){
  const challenges=[];
  if(verdict.requiredFound)challenges.push('Presence of a relevant harness does not prove source access, factual accuracy, or a useful answer.');
  if(verdict.irrelevantFound?.length)challenges.push('Additional apparently plausible harnesses may contaminate retrieval: '+verdict.irrelevantFound.join(', '));
  if(item.requiredAny.length===0&&selected.length)challenges.push('The model failed to abstain when no legitimate evidence route exists.');
  if(item.allowPublic)challenges.push('Permission in the test case is not proof of actual consent, provider availability, or official source validity.');
  if(!selected.length&&item.requiredAny.length)challenges.push('Abstention might be safe but misses the investigation objective.');
  return {role:'DEVILS_ADVOCATE',stance:'CHALLENGE_CLAIMS',
    challenges,verifiedClaim:'Only the selected capability IDs were observed. No source retrieval or factual answer was evaluated.',
    gate:verdict.pass?'NOT_YET_PROVEN':'REJECT'};
}

function diagnosticInvestigator(item,selected,verdict,modelStatus){
  const symptoms=[];
  if(!verdict.requiredFound)symptoms.push('Missing a required source class or failure to abstain');
  if(verdict.irrelevantFound?.length)symptoms.push('Unrelated or excessive capability selection: '+verdict.irrelevantFound.join(', '));
  if(modelStatus!=='MODEL_PLAN_VALIDATED')symptoms.push('Planner returned '+String(modelStatus||'UNKNOWN'));
  return {role:'DIAGNOSTIC_INVESTIGATOR',
    expectedAny:item.requiredAny,permitted:item.allowed,actual:selected,
    symptoms,confirmedFailure:!verdict.pass,
    rootCause:'UNKNOWN_PENDING_TRACE',
    hypotheses:!verdict.pass?[
      'The language model may be anchoring on superficially similar descriptions or list order.',
      'Insufficient intent-to-source discrimination may allow over-selection.',
      'The evaluator may be too permissive; check independent source fitness.'
    ]:[],
    nextEvidence:'Inspect structured plan, original question, registry order and model version. Vary inputs and re-run; do not assert an untested root cause.'};
}

function adversarialBlindspot(item,selected,verdict){
  const variants=[];
  const extra=item.allowed.length?['workspace.inventory','workspace.sales','research.sec',
    'research.public','knowledge.markdown','knowledge.findings'].find(x=>!item.allowed.includes(x)):null;
  // Mutation 1: add a permission-valid but irrelevant capability, if capacity permits.
  if(extra&&selected.length<3){
    const mutated=[...selected,extra];
    variants.push({kind:'PLAUSIBLE_EXTRA_HARNESS',selected:mutated,
      caught:grade(mutated,item).pass===false});
  }
  // Mutation 2: a required source dropped should never pass.
  if(item.requiredAny.length){
    const stripped=selected.filter(x=>!item.requiredAny.includes(x));
    variants.push({kind:'REQUIRED_SOURCE_OMISSION',selected:stripped,
      caught:grade(stripped,item).pass===false});
  }
  // Mutation 3: deceptive nonempty route for an abstention target.
  if(item.requiredAny.length===0){
    const mutated=['workspace.inventory'];
    variants.push({kind:'FALSE_ABSTENTION',selected:mutated,
      caught:grade(mutated,item).pass===false});
  }
  // Mutation 4: a model attempts to choose a capability not in the registry.
  const unregistered=['shell.exec'];
  variants.push({kind:'UNREGISTERED_CAPABILITY',selected:unregistered,
    caught:grade(unregistered,item).pass===false});
  return {role:'ADVERSARIAL_COLLABORATION_AND_BLIND_SPOT_ANALYSIS',
    proposedAttacks:variants,
    detectorEscapeCount:variants.filter(x=>!x.caught).length,
    blindSpots:[
      'No actual RAG document download, citation truth, cross-source contradiction, or browser state was tested.',
      'No protected hidden set or unseen prompt distribution was measured.',
      'Potential model answer sensitivity to harness order, similar source names, and missing sources remains unmeasured.'
    ],
    handoff:'Send undetected mutations to the diagnostic investigator; retain failures as new regression seeds without training on the hidden set.'};
}
function reviewCase(item,selected,modelStatus){
  const verdict=grade(selected,item);
  const roles=[
    devilsAdvocate(item,selected,verdict),
    diagnosticInvestigator(item,selected,verdict,modelStatus),
    adversarialBlindspot(item,selected,verdict)
  ];
  const escapes=roles[2].detectorEscapeCount;
  return {itemId:item.id,selected,verdict,roles,
    decision:!verdict.pass||escapes||modelStatus!=='MODEL_PLAN_VALIDATED'?'BLOCK':'REVIEW_REQUIRED',
    hiddenQualityCertified:false};
}
function reviewRun(rows){
  const baseline=assess(rows);
  const reviews=rows.map(x=>reviewCase(x.item,x.selected,x.modelStatus));
  const detectorEscapes=reviews.reduce((n,r)=>n+r.roles[2].detectorEscapeCount,0);
  return {baseline,roles:['DEVILS_ADVOCATE','DIAGNOSTIC_INVESTIGATOR',
    'ADVERSARIAL_COLLABORATION_AND_BLIND_SPOT_ANALYSIS'],
    reviewed:reviews.length,
    falseGreenCandidates:baseline.falseGreenCandidates,
    detectorEscapes,
    decision:baseline.verdict==='SMALL_SCREEN_PASS'&&detectorEscapes===0?'REVIEW_REQUIRED':'BLOCK',
    claim:'Static and live route checks are separate from evidence retrieval and outcome proof. This is not production qualification.'};
}
module.exports={devilsAdvocate,diagnosticInvestigator,adversarialBlindspot,reviewCase,reviewRun};
