import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestSample,relativeChange,comparableWindows,parameterChanges,validViewRange} from '../dist/analysis-data.mjs';
test('readouts use nearest real sample and never extrapolate another record',()=>{
  const rows=[[0,5],[.1,8],[.3,12],[1,4]];
  assert.deepEqual(nearestSample(rows,.21),[.3,12]);
  assert.deepEqual(nearestSample(rows,.12),[.1,8]);
  assert.equal(nearestSample(rows,1.1),null);assert.equal(nearestSample([],0),null);
});
test('zero baselines and missing results cannot produce misleading percentages',()=>{
  assert.equal(relativeChange(10,0),null);assert.equal(relativeChange(NaN,5),null);
  assert.equal(relativeChange(15,10),50);assert.equal(relativeChange(-5,-10),50);
  assert.equal(comparableWindows({},{}),false);
  assert.equal(comparableWindows({result:{analysis_start:60,analysis_end:120}},{result:{analysis_start:0,analysis_end:120}}),false);
  assert.equal(comparableWindows({result:{analysis_start:60,analysis_end:120}},{result:{analysis_start:60,analysis_end:120}}),true);
});
test('comparison identifies all changed inputs; view ranges reject invalid and out of extent values',()=>{
  assert.deepEqual(parameterChanges({params:{wind:8,seed:1}},{params:{wind:10,seed:2}}).map(x=>x.key),['wind','seed']);
  assert.equal(validViewRange(60,120,[0,120]),true);
  for(const range of [[120,60],[-1,120],[0,121],[NaN,120],[60,60]])assert.equal(validViewRange(...range,[0,120]),false);
});
