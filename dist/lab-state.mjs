export const WALK_BOUNDS={minX:-4.8,maxX:4.8,minZ:-.3,maxZ:5.65};
export function walkStep(position,keys,yaw,dt){
 const side=(keys.right?1:0)-(keys.left?1:0),forward=(keys.forward?1:0)-(keys.back?1:0);
 const length=Math.hypot(side,forward)||1,speed=2.6*Math.min(Math.max(dt,0),.05);
 const x=position.x+(Math.cos(yaw)*side-Math.sin(yaw)*forward)/length*speed;
 const z=position.z+(-Math.sin(yaw)*side-Math.cos(yaw)*forward)/length*speed;
 return {x:Math.max(WALK_BOUNDS.minX,Math.min(WALK_BOUNDS.maxX,x)),z:Math.max(WALK_BOUNDS.minZ,Math.min(WALK_BOUNDS.maxZ,z))};
}
export function easeCamera(t){const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);}
