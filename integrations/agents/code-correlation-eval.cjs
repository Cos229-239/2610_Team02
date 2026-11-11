"use strict";
// Towerflow Code Correlation Eval v1: scored intent interpretation, not a claim of physical fidelity.
// Pure grading; no model calls, side effects, data storage, or production integrations.
const GATES=Object.freeze(["code","pattern","preservation"]);
const ALLOWED=new Set(["visual","sound-studio","transduction","embodied","interaction",
 "situational","logic","deduction","induction","abduction"]);
function isPlain(x){return !!x&&typeof x==="object"&&!Array.isArray(x);}
function tokens(x){
 if(!Array.isArray(x)||x.length>32||x.some(v=>typeof v!=="string"||v.length>100))throw Error("Invalid label list");
 if(new Set(x).size!==x.length)throw Error("Repeated labels");
 return x;
}
function validateCase(row){
 if(!isPlain(row)||typeof row.id!=="string"||!/^[-a-z0-9]{3,80}$/.test(row.id)||
 typeof row.input!=="string"||row.input.length<12||row.input.length>2000)
  throw Error("Invalid experiment case");
 if(!isPlain(row.expected)||!Array.isArray(row.expected.codes)||!Array.isArray(row.expected.patterns)||
 !Array.isArray(row.expected.preserve))throw Error("Missing reference criteria");
 tokens(row.expected.codes);tokens(row.expected.patterns);tokens(row.expected.preserve);
 if(row.expected.codes.length===0||row.expected.patterns.length===0||row.expected.preserve.length===0)
  throw Error("Empty reference criteria");
 if(row.expected.codes.some(c=>!ALLOWED.has(c)))throw Error("Unrecognized domain");
 if(typeof row.expected.needsClarification!=="boolean")throw Error("Clarification reference required");
 return row;
}
function parseCandidate(value){
 let c=value;
 if(typeof c==="string"){
  if(c.length>10000)throw Error("Model output too large");
  try{c=JSON.parse(c);}catch{throw Error("Model did not produce strict JSON");}
 }
 if(!isPlain(c)||!Array.isArray(c.codes)||!Array.isArray(c.patterns)||!Array.isArray(c.preserve)||
 typeof c.needsClarification!=="boolean")throw Error("Invalid candidate structure");
 tokens(c.codes);tokens(c.patterns);tokens(c.preserve);
 if(c.codes.some(x=>!ALLOWED.has(x)))throw Error("Unsupported domain");
 return c;
}
function sameSet(a,b){return a.length===b.length&&a.every(x=>b.includes(x));}
function grade(row,candidate){
 validateCase(row);
 const c=parseCandidate(candidate);
 const exactCode=sameSet(row.expected.codes,c.codes)&&
   c.needsClarification===row.expected.needsClarification;
 const patternPresent=sameSet(row.expected.patterns,c.patterns);
 const preservationIntact=sameSet(row.expected.preserve,c.preserve);
 const scores={code:exactCode?10:0,pattern:patternPresent?10:0,preservation:preservationIntact?10:0};
 return Object.freeze({id:row.id,passed:GATES.every(x=>scores[x]===10),scores,
   misses:{
    codes:row.expected.codes.filter(x=>!c.codes.includes(x)),
    patterns:row.expected.patterns.filter(x=>!c.patterns.includes(x)),
    preservation:row.expected.preserve.filter(x=>!c.preserve.includes(x))
   },extra:{
    codes:c.codes.filter(x=>!row.expected.codes.includes(x)),
    patterns:c.patterns.filter(x=>!row.expected.patterns.includes(x)),
    preservation:c.preserve.filter(x=>!row.expected.preserve.includes(x))
   },clarificationMatched:c.needsClarification===row.expected.needsClarification});
}
function aggregate(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error("Empty results");
 const valid=rows.filter(x=>x&&isPlain(x.scores)&&typeof x.passed==="boolean");
 if(valid.length!==rows.length)throw Error("Invalid result");
 const n=rows.length;
 return Object.freeze({n,passed:rows.filter(x=>x.passed).length,
  passRate:rows.filter(x=>x.passed).length/n,
  gates:Object.fromEntries(GATES.map(k=>[k,{passed:rows.filter(x=>x.scores[k]===10).length,
  passRate:rows.filter(x=>x.scores[k]===10).length/n}])),
  designation:"SOURCE-CONSTRAINED INTERPRETATION EVAL ONLY",
  limitation:"No evidence of rendered fidelity, successful action, learning, or physical predictability."});
}
module.exports={grade,aggregate,validateCase,parseCandidate,GATES};
