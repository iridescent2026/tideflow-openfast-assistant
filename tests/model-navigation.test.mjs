import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {movementVector,clampRoom,deckHeightAt,clampSwim} from '../dist/model-navigation.mjs';
import {buildModel} from '../dist/model-geometry.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/assets/oc4-geometry.json',import.meta.url)));
const model=buildModel(data),columns=[4,6,8].map(id=>({x:data.joints[id][0],z:-data.joints[id][1]}));
const floorAt=(x,z)=>deckHeightAt(x,z,columns,model.platformWalkways,model.platformObstacles);
test('walking follows the look direction and diagonal speed stays constant',()=>{
  const forward=movementVector(0,1,0,2,.05),diagonal=movementVector(0,1,1,2,.05);
  assert.equal(forward.z,-.1);assert.equal(forward.x,0);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-.1)<1e-8);
  assert.ok(movementVector(Math.PI/2,1,0,2,.05).x<-.099);
});
test('room and water movement cannot cross their limits',()=>{
  assert.deepEqual(clampRoom({x:-20,y:30,z:20},{minX:.9,maxX:1.85,minZ:-4.65,maxZ:4.65,eyeHeight:1.65}),{x:.9,y:1.65,z:4.65});
  assert.deepEqual(clampSwim({x:900,y:5,z:-900}),{x:180,y:-1.4,z:-180});
});
test('deck walking stays on actual column decks and radial walkways',()=>{
  const cols=[{x:14.43376,z:-25},{x:-28.86751,z:0},{x:14.43376,z:25}];
  assert.equal(deckHeightAt(cols[0].x,cols[0].z,cols),12.45);
  assert.ok(Math.abs(deckHeightAt(cols[0].x*.5,cols[0].z*.5,cols)-11.45)<1e-8);
  assert.equal(deckHeightAt(12,12,cols),null);
  assert.equal(deckHeightAt(0,0,cols),null);
});

test('walkers cannot pass through service cabinets or ventilation equipment',()=>{
  assert.equal(model.platformObstacles.length,12);
  for(const obstacle of model.platformObstacles){
    const [x,z]=obstacle.center;
    assert.equal(floorAt(x,z),null,obstacle.id);
    if(obstacle.type==='box'){
      const distance=obstacle.halfSize[0]+obstacle.clearance;
      assert.equal(floorAt(x+obstacle.axisX[0]*(distance-.01),z+obstacle.axisX[1]*(distance-.01)),null,`${obstacle.id} body clearance`);
      assert.equal(floorAt(x+obstacle.axisX[0]*(distance+.1),z+obstacle.axisX[1]*(distance+.1)),12.45,`${obstacle.id} clear aisle`);
    }
  }
});

test('bridge navigation follows the real sloped deck and joins both landings smoothly',()=>{
  for(const bridge of model.platformWalkways){
    const {start,end}=bridge,point=t=>({x:start[0]+(end[0]-start[0])*t,z:start[2]+(end[2]-start[2])*t});
    for(const t of [0,.1,.5,.9,1]){
      const p=point(t),expected=start[1]+(end[1]-start[1])*t;
      assert.ok(Math.abs(floorAt(p.x,p.z)-expected)<1e-8);
    }
    const dx=end[0]-start[0],dz=end[2]-start[2],length=Math.hypot(dx,dz);
    // The navigation body has a 0.4 m overlap between the grating and round deck.
    const deckSide={x:start[0]-dx/length*.41,z:start[2]-dz/length*.41};
    assert.ok(Math.abs(floorAt(deckSide.x,deckSide.z)-start[1])<.02);
    const centerSide={x:end[0]+dx/length*.1,z:end[2]+dz/length*.1};
    assert.equal(floorAt(centerSide.x,centerSide.z),10.5);
  }
  assert.equal(floorAt(3.5,0),10.5);
  assert.equal(floorAt(3.1,0),null);
  assert.equal(floorAt(12,12),null);
});
