import * as T from './vendor/three/three.module.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.js';
import {buildModel} from './model-geometry.mjs';

export function createViewer(stage,data,{select,clear,components}){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.15,6500);camera.position.set(140,100,340);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','OC4 三维结构。拖动旋转，滚轮缩放，点击部件查看详情。也可用部件按钮选择，方向键旋转，+ / - 缩放，Home 恢复全景。');
  stage.prepend(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=9;controls.maxDistance=4000;controls.maxPolarAngle=Math.PI*.93;controls.zoomSpeed=.8;controls.panSpeed=.7;
  scene.add(new T.HemisphereLight(0xc3ecff,0x274755,1.15));
  for(const [color,intensity,pos] of [[0xffffff,2.3,[80,180,150]],[0x8cd7e7,2,[-100,50,-70]],[0xffe3b4,1.1,[40,20,-90]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);if(color===0xffffff){light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-95,right:95,top:165,bottom:-50,near:.1,far:500});light.shadow.normalBias=.12;light.shadow.bias=-.0001;}scene.add(light);}
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  const model=buildModel(data);scene.add(model.root);model.root.traverse(o=>{if(o.isMesh&&!o.userData.pickOnly){o.castShadow=true;o.receiveShadow=true;}});
  // A restrained translucent reference plane leaves the underwater structure readable.
  const water=new T.Group();scene.add(water);
  const plane=new T.Mesh(new T.CircleGeometry(135,96),new T.MeshBasicMaterial({color:0x2c9db3,transparent:true,opacity:.11,side:T.DoubleSide,depthWrite:false}));plane.rotation.x=-Math.PI/2;water.add(plane);
  const grid=new T.GridHelper(260,26,0x3d8296,0x255365);grid.material.transparent=true;grid.material.opacity=.08;grid.material.depthWrite=false;grid.visible=false;water.add(grid);
  for(const radius of [45,85,130]){const pts=Array.from({length:129},(_,i)=>new T.Vector3(Math.cos(i/128*Math.PI*2)*radius,.1,Math.sin(i/128*Math.PI*2)*radius));const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x397b8b,transparent:true,opacity:.35}));water.add(line);}
  for(const child of water.children)child.visible=false;
  const ground=new T.GridHelper(1900,20,0x345565,0x1b3d4b);ground.position.y=-200;ground.material.transparent=true;ground.material.opacity=.12;ground.visible=false;scene.add(ground);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),labels=[...stage.querySelectorAll('[data-explore]')];
  let frame=0,visible=false,transition=null,autoRotate=false,active=null,lastTime=0,lastPointer=null,renderWidth=1;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const focusLabel=document.getElementById('stage-focus');
  const mats=new Map();for(const g of Object.values(model.groups))g.traverse(o=>{if(o.isMesh&&!o.userData.pickOnly)mats.set(o,Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone());});
  const selectedColumn=model.groups.platform.children[3];
  const outline=new T.Mesh(selectedColumn.geometry,new T.MeshBasicMaterial({color:0x4cdee8,side:T.BackSide}));outline.position.copy(selectedColumn.position);outline.quaternion.copy(selectedColumn.quaternion);outline.scale.setScalar(1.014);outline.visible=false;model.groups.platform.add(outline);
  function highlight(id){
    outline.visible=id==='platform';
    for(const [mesh,original] of mats){let p=mesh;while(p&&!p.userData.part)p=p.parent;const on=p?.userData.part===id;const list=Array.isArray(original)?original:[original];for(const m of list){m.emissive?.set(on?0x16757c:0x000000);if(m.emissive)m.emissiveIntensity=on?.12:0;}mesh.material=original;}
  }
  function schedule(){if(visible&&!frame)frame=requestAnimationFrame(render);}
  function stopMotion(){
    transition=null;autoRotate=false;controls.autoRotate=false;
    stage.querySelector('[data-view=rotate]').setAttribute('aria-pressed','false');
  }
  function fly(target,distance,direction){
    const end=target.clone().add(direction.clone().normalize().multiplyScalar(distance));
    controls.autoRotate=false;autoRotate=false;stage.querySelector('[data-view=rotate]').setAttribute('aria-pressed','false');
    transition={start:performance.now(),from:camera.position.clone(),to:end,fromTarget:controls.target.clone(),target,duration:reduced?0:850};schedule();
  }
  function fitBox(box,direction){
    const center=box.getCenter(new T.Vector3()),forward=direction.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize(),up=new T.Vector3().crossVectors(forward,right).normalize();
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=16;
    // Fit every corner in the projected camera frame, including front-side depth.
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(forward);
      distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*camera.aspect)*1.18,depth+Math.abs(p.dot(up))/tan*1.18);
    }
    distance*=.84;
    fly(center,distance,direction);
  }
  const overviewBox=new T.Box3(new T.Vector3(-59,-37,-39),new T.Vector3(59,154,39));
  function overview(){active=null;clear();highlight('platform');pageState('overview');fitBox(overviewBox,new T.Vector3(.8,.28,2.4));focusLabel.textContent='整体结构 / OVERVIEW';}
  function pageState(view){stage.dataset.view=view;}
  function focus(id){
    active=id;highlight(id);pageState(id);
    if(id==='mooring'){fitBox(new T.Box3(new T.Vector3(-60,-85,-62),new T.Vector3(65,15,62)),new T.Vector3(1,.65,1.5));}
    else fitBox(new T.Box3().setFromObject(model.groups[id]),id==='rotor'?new T.Vector3(.4,.1,2):id==='nacelle'?new T.Vector3(1,.5,1.4):new T.Vector3(1,.55,1.7));
  }
  function action(mode,button){
    if(mode==='overview')overview();
    if(mode==='water'){water.visible=!water.visible;button.setAttribute('aria-pressed',String(water.visible));button.textContent=water.visible?'海面显示':'海面隐藏';schedule();}
    if(mode==='rotate'){transition=null;autoRotate=!autoRotate;controls.autoRotate=autoRotate;controls.autoRotateSpeed=.65;button.setAttribute('aria-pressed',String(autoRotate));schedule();}
    if(mode==='front'||mode==='top'){
      const box=active&&active!=='mooring'?new T.Box3().setFromObject(model.groups[active]):overviewBox;
      fitBox(box,mode==='front'?new T.Vector3(0,.015,1):new T.Vector3(0,1,.001));pageState(mode);focusLabel.textContent=mode==='front'?'正视 / FRONT':'俯视 / TOP';
    }
    if(mode==='mooring'){select('mooring');highlight('mooring');fitBox(new T.Box3().setFromObject(model.groups.mooring),new T.Vector3(.7,1.3,1));pageState('mooring-full');focusLabel.textContent='系泊全貌 / 实际坐标比例 · 弧线为示意';}
  }
  function hit(event){const r=renderer.domElement.getBoundingClientRect();if(event.clientX-r.left>renderWidth)return;pointer.set((event.clientX-r.left)/renderWidth*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(model.pickables,false)[0]?.object;}
  function partOf(object){while(object&&!object.userData.part)object=object.parent;return object?.userData.part;}
  renderer.domElement.addEventListener('pointerdown',e=>{lastPointer={x:e.clientX,y:e.clientY,id:e.pointerId,button:e.button,dragged:false};});
  renderer.domElement.addEventListener('pointerup',e=>{if(lastPointer&&!lastPointer.dragged&&lastPointer.id===e.pointerId&&lastPointer.button===0&&Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)<5){const id=partOf(hit(e));if(id)select(id);}lastPointer=null;});
  renderer.domElement.addEventListener('pointercancel',()=>{lastPointer=null;});
  renderer.domElement.addEventListener('pointermove',e=>{if(lastPointer&&lastPointer.id===e.pointerId&&Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>=5)lastPointer.dragged=true;if(e.buttons)return;const id=partOf(hit(e));renderer.domElement.style.cursor=id?'pointer':'grab';document.getElementById('model-hover-name').textContent=id?'点击聚焦 / '+components[id].name:'';});
  renderer.domElement.addEventListener('pointerleave',()=>{document.getElementById('model-hover-name').textContent='';});
  // Manual rotation, panning, or zooming owns the view until an explicit view command.
  controls.addEventListener('start',stopMotion);controls.addEventListener('change',schedule);
  renderer.domElement.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();stopMotion();
    if(e.key==='Home'){overview();return;}
    const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);
    if(e.key==='ArrowLeft')s.theta-=.1;if(e.key==='ArrowRight')s.theta+=.1;if(e.key==='ArrowUp')s.phi=Math.max(.03,s.phi-.1);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.93,s.phi+.1);
    if(e.key==='+'||e.key==='=')s.radius=Math.max(controls.minDistance,s.radius*.88);if(e.key==='-')s.radius=Math.min(controls.maxDistance,s.radius/ .88);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();schedule();
  });
  function updateLabels(){
    camera.updateMatrixWorld();
    const width=renderWidth,height=stage.clientHeight,placed=[];
    for(const label of labels){const id=label.dataset.explore,p=new T.Vector3(...components[id].anchor).project(camera);const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
      const inBounds=p.z>-1&&p.z<1&&x>55&&x<width-100&&y>90&&y<height-100;
      const collision=placed.some(at=>Math.abs(at.x-x)<125&&Math.abs(at.y-y)<30);
      const show=inBounds&&!collision;label.hidden=!show;if(show){label.style.left=x+'px';label.style.top=y+'px';placed.push({x,y});}
    }
  }
  function render(now){
    frame=0;if(!visible)return;
    const delta=Math.min(.05,(now-(lastTime||now))/1000);lastTime=now;
    if(transition){const t=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1,k=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,k);controls.target.lerpVectors(transition.fromTarget,transition.target,k);if(t===1)transition=null;}
    controls.update(delta);renderer.render(scene,camera);updateLabels();
    // Stop the loop after interaction; inactive pages never keep rendering.
    if(transition||autoRotate)schedule();
  }
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    const reserve=innerWidth>900?parseFloat(getComputedStyle(document.body).getPropertyValue('--model-panel'))||Math.max(310,Math.min(420,innerWidth*.254)):0;
    renderWidth=Math.max(200,w-reserve*.65-(reserve?45:0));
    camera.aspect=renderWidth/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.setViewport(0,0,renderWidth,h);
    // A viewport resize changes projection only; preserve the user's camera pose.
    schedule();
  }
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(frame)cancelAnimationFrame(frame);frame=0;document.getElementById('model-render-status').textContent='显示已暂停';focusLabel.textContent='图形上下文中断，请刷新页面恢复三维展示。';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{document.getElementById('model-render-status').textContent='LIVE 3D';visible=document.body.dataset.page==='model';schedule();});
  stage.dataset.meshes=String(model.meshCount);resize();overview();
  return {focus,action,visibility(show){visible=show&&!document.hidden;if(!visible){if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}else{resize();schedule();}}};
}
