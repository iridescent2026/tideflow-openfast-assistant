// Shared, frame-rate independent movement and walkable deck constraints.
export function movementVector(yaw,forward,right,speed,delta){
  const length=Math.hypot(forward,right)||1,step=speed*Math.min(Math.max(delta,0),.05);
  return {x:(-Math.sin(yaw)*forward+Math.cos(yaw)*right)/length*step,z:(-Math.cos(yaw)*forward-Math.sin(yaw)*right)/length*step};
}
export function clampRoom(position,bounds){
  return {x:Math.max(bounds.minX,Math.min(bounds.maxX,position.x)),y:bounds.eyeHeight,z:Math.max(bounds.minZ,Math.min(bounds.maxZ,position.z))};
}
export function deckHeightAt(x,z,columns,walkways,obstacles=[]){
  for(const obstacle of obstacles){
    const dx=x-obstacle.center[0],dz=z-obstacle.center[1],clearance=obstacle.clearance??.23;
    if(obstacle.type==='circle'&&Math.hypot(dx,dz)<obstacle.radius+clearance)return null;
    if(obstacle.type==='box'){
      const localX=dx*obstacle.axisX[0]+dz*obstacle.axisX[1],localZ=dx*obstacle.axisZ[0]+dz*obstacle.axisZ[1];
      if(Math.abs(localX)<obstacle.halfSize[0]+clearance&&Math.abs(localZ)<obstacle.halfSize[1]+clearance)return null;
    }
  }
  const radius=Math.hypot(x,z);
  if(radius<=3.28)return null;
  if(radius<3.85)return 10.5;
  for(const p of columns){
    const dx=x-p.x,dz=z-p.z;
    if(dx*dx+dz*dz<5.65*5.65)return 12.45;
  }
  if(Array.isArray(walkways)){
    for(const {start,end,width} of walkways){
      const dx=end[0]-start[0],dz=end[2]-start[2],lengthSq=dx*dx+dz*dz;
      if(!lengthSq)continue;
      const t=Math.max(0,Math.min(1,((x-start[0])*dx+(z-start[2])*dz)/lengthSq));
      const distance=Math.hypot(x-start[0]-dx*t,z-start[2]-dz*t);
      // The round end clearance connects the bridge onto the safe deck area.
      if(distance<Math.max(.18,width/2-.15))return start[1]+(end[1]-start[1])*t;
    }
    return null;
  }
  // Preserve the original three-argument API for existing consumers.
  for(const p of columns){
    const len=p.x*p.x+p.z*p.z,t=Math.max(0,Math.min(1,(x*p.x+z*p.z)/len));
    if(t>.105&&t<1&&Math.hypot(x-p.x*t,z-p.z*t)<.53)return 10.45+2*t;
  }
  return null;
}
export function clampSwim(position){
  return {x:Math.max(-180,Math.min(180,position.x)),y:Math.max(-180,Math.min(-1.4,position.y)),z:Math.max(-180,Math.min(180,position.z))};
}
