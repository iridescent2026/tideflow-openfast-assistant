import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeWorkspace} from '../dist/workspace-startup.mjs';
test('deep-sea layers initialize after shared state and before records/report composition',async()=>{
 const visited=[];await initializeWorkspace(async path=>{visited.push(path.split('?')[0]);});
 const chain=['./app.mjs','./analysis.mjs','./analysis-motion.mjs','./analysis-focus.mjs','./analysis-hero.mjs','./analysis-deepsea.mjs','./ocean-workspace.mjs'];
 for(let i=1;i<chain.length;i++)assert.ok(visited.indexOf(chain[i])>visited.indexOf(chain[i-1]),chain[i]);
 assert.equal(visited.filter(path=>path==='./app.mjs').length,1);
});
test('shared records/report composition cannot replace the approved analysis DOM',async()=>{
 const source=await readFile(new URL('../dist/ocean-workspace.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/initializeAnalysis\s*\(/);
 assert.match(source,/initializeRecords\(\)/);assert.match(source,/initializeReports\(\)/);
});
