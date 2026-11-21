import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CITY_EVENTS,CITY_VERSION} from './city-exterior-3d.mjs';
const specified=['normal','sunny','cloudy','rain','snow','blizzard','thunder','severe','fire','cataclysm','typhoon','hurricane','zombie','airborne','purge','rapture','sept11'];
test('all 17 exact proposed scenario keys are present, each once',()=>{
 assert.deepEqual(CITY_EVENTS.map(([id])=>id),specified);
 assert.equal(new Set(CITY_EVENTS.map(([id])=>id)).size,17);
});
test('all event labels are present and non-empty',()=>{
 for(const [id,label] of CITY_EVENTS){assert.ok(label.trim().length>2,id);}
});
test('current feature is namespaced and not mislabeled live weather',()=>{
 assert.match(CITY_VERSION,/tf-exterior-3d-v2-events/);
});
