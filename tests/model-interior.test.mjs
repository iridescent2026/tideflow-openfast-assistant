import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three/three.module.js';
import {buildNacelleInterior} from '../dist/model-interior.mjs';

test('interior has finite detailed geometry without requiring browser canvas',()=>{
  const model=buildNacelleInterior();
  assert.equal(model.root.visible,false);
  let vertices=0,instances=0;
  model.root.traverse(o=>{
    if(!o.isMesh)return;
    const p=o.geometry.getAttribute('position');vertices+=p.count;
    for(const n of p.array)assert.ok(Number.isFinite(n),`${o.name}: invalid vertex`);
    for(const n of o.matrixWorld.elements)assert.ok(Number.isFinite(n),`${o.name}: invalid transform`);
    if(o.isInstancedMesh){instances+=o.count;for(const n of o.instanceMatrix.array)assert.ok(Number.isFinite(n));}
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats){if(m.roughness!==undefined)assert.ok(m.roughness>=0&&m.roughness<=1);}
  });
  assert.ok(vertices>25000,'inspection view should contain physical detail');
  assert.ok(instances>800,'repeated floor bars and fasteners should be instanced');
  assert.ok(model.lights.every(light=>light.parent===model.root),'interior lights follow translated root');
});

test('entry and a full-length personnel aisle stay clear of equipment',()=>{
  const model=buildNacelleInterior(),b=model.walkBounds,p=model.spawn.position;
  assert.ok(p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ);
  assert.equal(p.y,b.eyeHeight);assert.ok(b.maxZ-b.minZ>=9);
  const aisle=new T.Box3(new T.Vector3(b.minX,.15,b.minZ),new T.Vector3(b.maxX,2.2,b.maxZ));
  for(const [id,g] of Object.entries(model.machineParts))assert.equal(new T.Box3().setFromObject(g).intersectsBox(aisle),false,`${id} blocks personnel aisle`);
  assert.ok(model.spawn.target.distanceTo(p)>2);
});

test('interior identifies drivetrain and clearly describes the illustrative reconstruction',()=>{
  const model=buildNacelleInterior();
  for(const id of ['main-shaft','gearbox','high-speed-coupling','generator','lubrication-skid','electrical-cabinet']){
    assert.ok(model.machineParts[id]);assert.equal(model.machineParts[id].userData.illustrative,true);
    assert.ok(model.metadata.machineParts.includes(id));
  }
  assert.equal(model.metadata.units,'m');assert.equal(model.metadata.designType,'illustrative-interior');
  assert.match(model.metadata.disclaimer,/并非 NREL 实机 CAD/);
  model.animate(1,.016);model.animate(Number.NaN,Number.NaN);
  model.root.traverse(o=>{assert.ok(o.quaternion.toArray().every(Number.isFinite));});
});
