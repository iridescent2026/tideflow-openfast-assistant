import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three/three.module.js';
import {buildLabInterior} from '../dist/lab-interior.mjs';
test('interior geometry is finite and seat/monitor phases remain interactive',()=>{
 const originalDocument=globalThis.document;
 let paints=0;
 const context={fillText(){paints++;},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 try{
  const scene=new THREE.Scene();
  const material=(color,metalness=.25,roughness=.35,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
  const add=(geometry,mat,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const box=(w,h,d,mat,x=0,y=0,z=0,parent)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  const cylinder=(top,bottom,h,mat,x=0,y=0,z=0,parent)=>add(new THREE.CylinderGeometry(top,bottom,h,24),mat,x,y,z,parent);
  const tube=(points,radius,mat,parent=scene)=>{const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(new THREE.TubeGeometry(path,32,radius,8,false),mat,0,0,0,parent);};
  const interior=buildLabInterior({...THREE,TextureLoader:class{load(_path,callback){callback(new THREE.Texture());}}},scene,{box,cylinder,tube,material,silver:material('#ddd'),navy:material('#123'),dark:material('#111'),cyan:material('#0ff')});
  let meshes=0;scene.traverse(object=>{if(!object.isMesh)return;meshes++;for(const value of object.geometry.attributes.position.array)assert.ok(Number.isFinite(value));});
  assert.ok(meshes>100);assert.ok(interior.chairPick.length>10);
  interior.setPhase('walking');assert.ok(interior.monitors.every(m=>m.visible));
  interior.setPhase('seated');assert.ok(interior.monitors.every(m=>!m.visible));
  interior.sync({wind:8,wave:1.5,period:10});const before=paints;interior.sync({wind:8,wave:1.5,period:10});assert.equal(paints,before);
  interior.sync({wind:10,wave:1.5,period:10});assert.ok(paints>before);
 }finally{globalThis.document=originalDocument;}
});
