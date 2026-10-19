import test from 'node:test';
import assert from 'node:assert/strict';
import {walkStep,easeCamera,WALK_BOUNDS} from '../dist/lab-state.mjs';

test('walking respects forward direction and camera yaw',()=>{
 const ahead=walkStep({x:0,z:3},{forward:true},0,.04);
 assert.equal(ahead.x,0);assert.ok(ahead.z<3);
 const turned=walkStep({x:0,z:3},{forward:true},Math.PI/2,.04);
 assert.ok(turned.x<0);assert.ok(Math.abs(turned.z-3)<1e-9);
});
test('diagonal movement has the same speed as straight movement',()=>{
 const straight=walkStep({x:0,z:3},{forward:true},0,.04),diagonal=walkStep({x:0,z:3},{forward:true,right:true},0,.04);
 assert.ok(Math.abs(Math.hypot(straight.x,straight.z-3)-Math.hypot(diagonal.x,diagonal.z-3))<1e-9);
});
test('walking cannot cross cabin walls or walk through the console',()=>{
 for(const keys of [{forward:true},{back:true},{left:true},{right:true}]){
  let p={x:0,z:3};for(let i=0;i<5000;i++)p=walkStep(p,keys,0,.05);
  assert.ok(p.x>=WALK_BOUNDS.minX&&p.x<=WALK_BOUNDS.maxX);
  assert.ok(p.z>=WALK_BOUNDS.minZ&&p.z<=WALK_BOUNDS.maxZ);
 }
});
test('resume after a stalled frame cannot teleport the visitor',()=>{
 assert.deepEqual(walkStep({x:0,z:3},{forward:true},0,30),walkStep({x:0,z:3},{forward:true},0,.05));
 assert.deepEqual(walkStep({x:0,z:3},{forward:true},0,-2),{x:0,z:3});
});
test('camera easing stays bounded and has smooth endpoints',()=>{
 assert.equal(easeCamera(-1),0);assert.equal(easeCamera(2),1);assert.equal(easeCamera(.5),.5);
 assert.ok(easeCamera(.001)<.00001);assert.ok(1-easeCamera(.999)<.00001);
});
