import test from 'node:test';import assert from 'node:assert/strict';import {baselinePercent,responseSeries} from '../dist/response-plot.mjs';
const a={rpm:9,power:1000,pitch:2,surge:5},b={rpm:12,power:2000,pitch:3,surge:6};
test('three response curves compare different units only as dimensionless percentages',()=>{const curves=responseSeries([a,b],a);assert.equal(curves.length,3);assert.deepEqual(curves.map(c=>c.values[0].value),[0,0,0]);assert.deepEqual(curves.map(c=>c.values[1].value),[100,50,20]);assert.equal(responseSeries([a,b],a,'power')[0].values[1].value,2000);});
test('zero or invalid baselines cannot produce false percentage curves',()=>{assert.equal(baselinePercent(5,0),null);assert.equal(baselinePercent(NaN,2),null);assert.equal(responseSeries([a,b],{...a,pitch:0}).length,2);});



import {renderRecordedResponse} from '../dist/response-plot.mjs';
const record={result:{channels:['Time','GenPwr','PtfmPitch','PtfmSurge'],series:[[0,10,1,-2],[1,20,2,4],[2,15,-1,3]]}};
test('a single saved case renders three normalized real curves without changing samples',()=>{
 const svg={innerHTML:'',setAttribute(){}},before=structuredClone(record);renderRecordedResponse(svg,record);
 assert.equal((svg.innerHTML.match(/data-recorded-series=/g)||[]).length,3);assert.doesNotMatch(svg.innerHTML,/NaN|Infinity/);assert.match(svg.innerHTML,/时间/);assert.deepEqual(record,before);
});
test('absolute power view preserves values and omits unrelated channel curves',()=>{
 const svg={innerHTML:'',setAttribute(){}};renderRecordedResponse(svg,record,'power');
 assert.equal((svg.innerHTML.match(/data-recorded-series=/g)||[]).length,1);assert.match(svg.innerHTML,/kW/);assert.match(svg.innerHTML,/GenPwr/);assert.doesNotMatch(svg.innerHTML,/data-recorded-series="PtfmPitch"/);
});
