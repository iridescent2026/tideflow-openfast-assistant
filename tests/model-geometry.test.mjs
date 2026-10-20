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
    for(const number of object.geometry.attributes.normal?.array??[])assert.ok(Number.isFinite(number));
    let owner=object;while(owner&&!owner.userData.part)owner=owner.parent;
    assert.ok(model.groups[owner?.userData.part]);
  }
  // Thousands of bolts/rails are batched rather than one draw call per detail.
  assert.ok(model.meshCount<220);
  assert.ok(model.root.userData.instanceCount>1800);
  assert.ok(model.root.userData.triangles<300000);
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

test('every primary member retains the reference endpoints and diameters',()=>{
  const members=[];model.root.traverse(o=>{if(o.userData.referenceMember)members.push(o);});
  assert.equal(members.length,25);
  for(const member of members){
    const {j1,j2,p1,p2}=member.userData.referenceMember;
    const convert=p=>new T.Vector3(p[0],p[2],-p[1]);
    const a=convert(data.joints[j1]),b=convert(data.joints[j2]),length=a.distanceTo(b);
    assert.ok(Math.abs(member.geometry.parameters.height-length)<1e-8);
    assert.equal(member.geometry.parameters.radiusBottom,data.diameters[p1]/2);
    assert.equal(member.geometry.parameters.radiusTop,data.diameters[p2]/2);
    const actualA=new T.Vector3(0,-length/2,0).applyQuaternion(member.quaternion).add(member.position);
    const actualB=new T.Vector3(0,length/2,0).applyQuaternion(member.quaternion).add(member.position);
    assert.ok(actualA.distanceTo(a)<1e-8);assert.ok(actualB.distanceTo(b)<1e-8);
  }
});

test('smoothed twisted blades pass through all 19 chord stations at the 63 m radius',()=>{
  const blades=[];model.groups.rotor.traverse(o=>{if(o.userData.aerodynamicBlade)blades.push(o);});
  assert.equal(blades.length,3);assert.equal(new Set(blades.map(b=>b.geometry)).size,1);
  const geo=blades[0].geometry,{sectionVertices:n,radialSections}=geo.userData;
  assert.equal(radialSections,145);
  const positions=geo.attributes.position;
  for(let k=0;k<data.blade.length;k++){
    const {span,chord,twist}=data.blade[k],angle=T.MathUtils.degToRad(twist),xs=[];
    for(let j=0;j<n;j++){
      const index=k*8*n+j;
      assert.ok(Math.abs(positions.getY(index)-(span+data.turbine.HubRad))<.00001);
      xs.push(positions.getX(index)*Math.cos(angle)+positions.getZ(index)*Math.sin(angle));
    }
    assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-chord)<.00001);
  }
  assert.ok(Math.abs(model.rotor.position.y-90)<.00001);
  assert.ok(Math.abs(model.rotor.position.z-5)<.00001);
  assert.equal(model.rotor.rotation.x,T.MathUtils.degToRad(data.turbine.ShftTilt));
});

test('service-detail instances and inspection routes are finite and remain at human scale',()=>{
  const matrix=new T.Matrix4();let total=0;
  model.root.traverse(o=>{if(o.isInstancedMesh){total+=o.count;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(Math.abs(matrix.determinant())>0);}}});
  assert.equal(total,model.root.userData.instanceCount);
  assert.equal(model.platformWalkways.length,3);
  for(const walkway of model.platformWalkways){assert.ok(walkway.width>1&&walkway.width<2);assert.ok(new T.Vector3(...walkway.start).distanceTo(new T.Vector3(...walkway.end))<25);}
  for(const anchor of Object.values(model.inspectionAnchors)){assert.equal(anchor.position.length,3);assert.equal(anchor.target.length,3);assert.ok([...anchor.position,...anchor.target].every(Number.isFinite));}
});

test('nacelle enclosure and rooftop instruments keep service-equipment proportions',()=>{
  const find=name=>model.groups.nacelle.getObjectByName(name);
  const shell=find('Composite nacelle enclosure'),shellBox=new T.Box3().setFromObject(shell),size=shellBox.getSize(new T.Vector3());
  assert.ok(Math.abs(size.x-4.2)<.02);assert.ok(Math.abs(size.y-3.94)<.02);assert.ok(Math.abs(size.z-10)<.02);
  const cups=[];model.groups.nacelle.traverse(o=>{if(o.name==='Anemometer cup')cups.push(o);});
  assert.equal(cups.length,3);assert.equal(new Set(cups.map(o=>o.geometry)).size,1);
  const vane=find('Wind direction vane'),beacon=find('Red nacelle obstruction beacon');
  assert.ok(vane);assert.ok(beacon);
  assert.ok(beacon.geometry.parameters.radiusTop<.15);
  const normal=vane.geometry.attributes.normal;for(let i=0;i<normal.count;i++)assert.ok(Math.abs(new T.Vector3().fromBufferAttribute(normal,i).length()-1)<1e-5);
  const towerTop=data.turbine.TowerHt;
  assert.ok(cups.every(c=>c.position.y>towerTop+4&&c.position.y<towerTop+7));
});

test('central service route has a real annular steel landing at the bridge endpoint height',()=>{
  const landing=model.groups.platform.getObjectByName('Central annular service landing');
  assert.ok(landing);
  const bounds=new T.Box3().setFromObject(landing);
  assert.ok(Math.abs(bounds.max.y-10.5)<1e-6);
  assert.ok(Math.abs(bounds.min.y-10.35)<1e-6);
  assert.ok(Math.abs(bounds.max.x-4.1)<1e-6);
  landing.updateMatrixWorld(true);
  const rayAt=r=>new T.Raycaster(new T.Vector3(r,11,0),new T.Vector3(0,-1,0)).intersectObject(landing,false);
  assert.equal(rayAt(3).length,0);
  assert.ok(Math.abs(rayAt(3.5)[0].point.y-10.5)<1e-6);
  assert.equal(rayAt(4.2).length,0);
  for(const {end} of model.platformWalkways){assert.ok(Math.abs(Math.hypot(end[0],end[2])-3.85)<1e-8);assert.equal(end[1],10.5);}
});

test('maintenance bridges use closely spaced open steel grating instead of ladder rungs',()=>{
  model.root.updateMatrixWorld(true);
  for(const {start,end} of model.platformWalkways){
    const a=new T.Vector3(...start),b=new T.Vector3(...end),length=a.distanceTo(b),sections=Math.ceil(length/.09),index=Math.floor(sections/2);
    assert.ok(length/sections>=.075&&length/sections<=.1);
    const hitsAt=t=>{const p=a.clone().lerp(b,t);return new T.Raycaster(p.clone().add(new T.Vector3(0,.2,0)),new T.Vector3(0,-1,0),0,.3).intersectObject(model.groups.bracing,true);};
    const crossbar=hitsAt(index/sections);
    assert.ok(crossbar.length,'the transverse flat bar forms the walking surface');
    assert.ok(Math.abs(crossbar[0].point.y-a.clone().lerp(b,index/sections).y)<.002);
    assert.equal(hitsAt((index+.5)/sections).length,0,'the grating cell stays open without a backing plate');
    const side=new T.Vector3(-(b.z-a.z),0,b.x-a.x).normalize(),bearing=a.clone().lerp(b,(index+.5)/sections).addScaledVector(side,.044);
    const bearingHits=new T.Raycaster(bearing.clone().add(new T.Vector3(0,.2,0)),new T.Vector3(0,-1,0),0,.3).intersectObject(model.groups.bracing,true);
    assert.ok(bearingHits.length,'longitudinal bearing bars cross the transverse bars');
  }
});

test('navigation obstacle envelopes match finite human-scale cabinet and pipe footprints',()=>{
  assert.equal(model.platformObstacles.length,12);
  assert.equal(new Set(model.platformObstacles.map(o=>o.id)).size,12);
  for(const obstacle of model.platformObstacles){
    assert.ok(obstacle.center.every(Number.isFinite));
    assert.ok(obstacle.clearance>=.2&&obstacle.clearance<=.3);
    if(obstacle.type==='box'){
      assert.ok(obstacle.halfSize.every(n=>n>0&&n<1));
      assert.ok(Math.abs(Math.hypot(...obstacle.axisX)-1)<1e-8);
      assert.ok(Math.abs(Math.hypot(...obstacle.axisZ)-1)<1e-8);
      assert.ok(Math.abs(obstacle.axisX[0]*obstacle.axisZ[0]+obstacle.axisX[1]*obstacle.axisZ[1])<1e-8);
    }else assert.ok(obstacle.radius>0&&obstacle.radius<.5);
  }
});
