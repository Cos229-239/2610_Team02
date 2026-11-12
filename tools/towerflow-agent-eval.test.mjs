import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, cases } from './towerflow-agent-eval.mjs';
test('accepts guarded accurate statements',()=>{
 const g=grade('The live room uses camera-relative first-person W forward movement.',cases[0]);
 assert.equal(g.passed,true);
});
test('flags inaccurate deployment claims',()=>{
 const g=grade('Yes, changes are automatically deployed.',cases[3]);
 assert.equal(g.passed,false);
});
test('flags unverified operational claim',()=>{
 const g=grade('Yes it is already fully operational.',cases[4]);
 assert.equal(g.passed,false);
});
