import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three/three.module.js';
import {buildModel} from '../dist/model-geometry.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/assets/oc4-geometry.json',import.meta.url)));
const model=buildModel(data);

test('reference geometry preserves platform members and mooring coordinates',()=>{
  assert.equal(data.members.length,25);assert.equal(Object.keys(data.joints).length,44);
  assert.equal(data.blade.length,19);assert.equal(data.turbine.TipRad,63);
  assert.deepEqual(data.diameters,{'1':6.5,'2':12,'3':24,'4':1.6});
  assert.equal(data.mooringLines.length,3);
  for(const p of data.mooringPoints.filter(p=>p.attachment==='Fixed')){
    assert.equal(p.xyz[2],-200);assert.ok(Math.abs(Math.hypot(...p.xyz.slice(0,2))-837.6)<.01);
  }
});
test('all selectable meshes have finite geometry and identify their owning component',()=>{
  assert.equal(Object.keys(model.groups).length,6);
  for(const object of model.pickables){
    for(const number of object.geometry.attributes.position.array)assert.ok(Number.isFinite(number));
    let owner=object;while(owner&&!owner.userData.part)owner=owner.parent;
    assert.ok(model.groups[owner?.userData.part]);
  }
  assert.ok(model.meshCount>300);
});
test('tower and platform remain at reference scale rather than flattened display scale',()=>{
  const tower=new T.Box3().setFromObject(model.groups.tower),platform=new T.Box3().setFromObject(model.groups.platform);
  assert.ok(Math.abs(tower.min.y-10)<.01);assert.ok(Math.abs(tower.max.y-87.6)<.01);
  assert.ok(Math.abs(platform.min.y+20)<.01);assert.ok(platform.max.y>13);
  const mooring=new T.Box3().setFromObject(model.groups.mooring);
  assert.ok(mooring.min.x < -837);assert.ok(mooring.max.z>725);
});
test('surface picking resolves real tower geometry to its component',()=>{
  model.root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(0,50,100),new T.Vector3(0,0,-1));
  const hit=ray.intersectObjects(model.pickables,false)[0];assert.ok(hit);
  let owner=hit.object;while(owner&&!owner.userData.part)owner=owner.parent;
  assert.equal(owner.userData.part,'tower');
});
