import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rowAt,windowRows,windowStats,commonBounds,clampWindow,panWindow,revealFrame,logLevel,csvCell,initialWindow} from '../dist/ocean-data.mjs';
test('window endpoints interpolate without including samples outside the selection',()=>{
 const series=[[0,0,10],[1,1,12],[3,3,16]];
 assert.deepEqual(rowAt(series,2),[2,2,14]);assert.deepEqual(windowRows(series,.5,2.5),[[.5,.5,11],[1,1,12],[2.5,2.5,15]]);assert.deepEqual(windowRows(series,4,5),[]);
});
test('window statistics use elapsed time rather than an unweighted sample mean',()=>{
 const value=windowStats({channels:['Time','GenPwr','PtfmPitch'],series:[[0,0,2],[1,1,-4],[3,3,8]]},.5,2.5);
 assert.equal(value.stats.GenPwr.mean,1.5);assert.equal(value.span,2);assert.ok(Math.abs(value.energy_kwh-3/3600)<1e-12);assert.equal(value.stats.PtfmPitch.max_abs,5);
});
test('original analysis-window statistics match the existing verified real sample',()=>{
 const sample=JSON.parse(readFileSync(new URL('../dist/samples.json',import.meta.url),'utf8')).runs[0].result;
 const value=windowStats(sample,sample.analysis_start,sample.analysis_end);
 for(const [key,stats] of Object.entries(sample.stats)){assert.ok(Math.abs(value.stats[key].mean-stats.mean)<1e-8,key);assert.ok(Math.abs(value.stats[key].max_abs-stats.max_abs)<1e-8,key);}
 assert.ok(Math.abs(value.energy_kwh-sample.energy_kwh)<1e-8);
});
test('comparison uses overlapping time and panning preserves selection width at either boundary',()=>{
 const bounds=commonBounds([{result:{series:[[0,1],[120,2]]}},{result:{series:[[20,2],[90,4]]}}]);assert.deepEqual(bounds,{min:20,max:90});
 assert.deepEqual(panWindow(bounds,40,60,-99),[20,40]);assert.deepEqual(panWindow(bounds,40,60,99),[70,90]);assert.deepEqual(clampWindow(bounds,100,101),[89.9,90]);assert.equal(commonBounds([{result:{series:[[0,1],[10,2]]}},{result:{series:[[20,2],[30,3]]}}]),null);
});
test('reveal draws left to right, holds for exactly three seconds, then restarts',()=>{
 assert.equal(revealFrame(0).progress,0);assert.equal(revealFrame(3000).progress,.5);assert.deepEqual(revealFrame(6000),{progress:1,holding:true});assert.equal(revealFrame(8999).progress,1);assert.equal(revealFrame(9000).progress,0);assert.equal(revealFrame(10000,{staticMode:true}).progress,1);
});
test('log classification preserves ordinary no-error messages and identifies actual failures',()=>{
 assert.equal(logLevel('0 errors, simulation completed'),'info');assert.equal(logLevel('WARNING: large rotation'),'warning');assert.equal(logLevel('FATAL ERROR: aborting OpenFAST'),'error');assert.equal(logLevel('Time: 60 of 120'),'info');
});
test('CSV escaping preserves quotes, newlines and commas in user run names',()=>{assert.equal(csvCell('wind, "one"\nrun'),'"wind, ""one""\nrun"');});

test('a formal analysis window outside comparison overlap falls back to the full shared interval',()=>{assert.deepEqual(initialWindow({min:0,max:120},300,600),[0,120]);assert.deepEqual(initialWindow({min:0,max:120},60,120),[60,120]);});
