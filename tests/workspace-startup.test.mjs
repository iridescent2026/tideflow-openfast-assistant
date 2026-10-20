import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeWorkspace} from '../dist/workspace-startup.mjs';
test('dependent UI composition waits for earlier imports to complete',async()=>{
 const pending=new Set(),done=[];
 await initializeWorkspace(async path=>{assert.equal(pending.size,0);pending.add(path);await new Promise(resolve=>setTimeout(resolve,2));pending.delete(path);done.push(path);},state=>{if(state==='engineering-ready')assert.equal(done.length,3);});
 assert.match(done[0],/pages/);assert.match(done[1],/project-enhance/);assert.match(done[2],/engineering-reading-detail/);
});
test('optional failures do not prevent the remaining workspace from initializing',async()=>{
 const visited=[];const failures=await initializeWorkspace(async path=>{visited.push(path);if(path.includes('model-explorer'))throw Error('asset unavailable');});
 assert.equal(failures.length,1);assert.ok(visited.some(path=>path.includes('configure-lab')));assert.ok(visited.some(path=>path.includes('app.mjs')));
});
test('failed engineering composition stops before dependent configuration mutates the DOM',async()=>{
 const visited=[];await assert.rejects(initializeWorkspace(async path=>{visited.push(path);if(path.includes('engineering-reading-detail'))throw Error('unavailable');}),/unavailable/);
 assert.equal(visited.length,3);
});
