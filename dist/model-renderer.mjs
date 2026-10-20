import * as T from './vendor/three/three.module.js';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {RoomEnvironment} from './vendor/three/RoomEnvironment.js';
import {buildModel} from './model-geometry.mjs?v=0.7.1';
import {buildNacelleInterior} from './model-interior.mjs?v=0.7.1';
import {createOceanEnvironment} from './model-environment.mjs?v=0.7.1';
import {movementVector,clampRoom,deckHeightAt,clampSwim} from './model-navigation.mjs?v=0.7.1';

export function createViewer(stage,data,{select,clear,components,onModeChange}){
  const scene=new T.Scene(),insideScene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.08,6500);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.tabIndex=0;
  canvas.setAttribute('aria-label','精细三维风机。拖动旋转，滚轮缩放，点击光点查看部件。进入机舱、平台或水下后拖动环顾，用 W A S D 或方向键移动，Esc 返回。');stage.prepend(canvas);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.minDistance=.8;controls.maxDistance=4000;controls.maxPolarAngle=Math.PI*.96;controls.zoomSpeed=.8;
  scene.add(new T.HemisphereLight(0xc7efff,0x354c59,1.45));
  for(const [color,intensity,pos] of [[0xfff5e8,3.1,[65,180,95]],[0x8ccfef,2,[-100,60,-65]],[0xd0f6ff,1.5,[35,30,-90]]]){
    const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);
    if(color===0xfff5e8){light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-85,right:85,top:160,bottom:-45,near:.1,far:430});light.shadow.normalBias=.04;light.shadow.bias=-.00008;}scene.add(light);
  }
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room,.04).texture;
  scene.environment=env;scene.environmentIntensity=.65;insideScene.environment=env;insideScene.environmentIntensity=.32;insideScene.background=new T.Color('#111e28');room.dispose();pmrem.dispose();
  const model=buildModel(data);scene.add(model.root);
  model.root.traverse(o=>{if(o.isMesh&&!o.userData.pickOnly){o.castShadow=true;o.receiveShadow=true;}});
  const interior=buildNacelleInterior();interior.root.visible=true;insideScene.add(interior.root);
  const ocean=createOceanEnvironment();scene.add(ocean.root);
  // Refraction is applied to the rendered world, leaving text and controls crisp.
  const waterTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
  const waterPass=new T.Scene(),waterCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const waterPost=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:waterTarget.texture},time:{value:0},entry:{value:0}},
    vertexShader:`varying vec2 uvWater;void main(){uvWater=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`uniform sampler2D image;uniform float time;uniform float entry;varying vec2 uvWater;
      void main(){vec2 p=uvWater;float edge=smoothstep(0.,.12,p.x)*smoothstep(0.,.12,p.y)*smoothstep(0.,.12,1.-p.x)*smoothstep(0.,.12,1.-p.y);
      vec2 wave=vec2(sin(p.y*22.+time*.75)+sin(p.y*43.-time*.9)*.35,cos(p.x*19.-time*.6));
      vec2 ring=p-vec2(.5,.55);float radius=length(ring);wave+=normalize(ring+vec2(.001))*sin(radius*48.-time*3.)*entry*2.;
      p=clamp(p+wave*(.0018+entry*.003)*edge,vec2(.001),vec2(.999));
      vec3 col=texture2D(image,p).rgb;float vignette=1.-smoothstep(.18,.7,length((uvWater-.5)*vec2(.85,1.)));
      col*=mix(vec3(.72,.87,.94),vec3(1.),vignette);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  });waterPass.add(new T.Mesh(new T.PlaneGeometry(2,2),waterPost));
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),labels=[...stage.querySelectorAll('.model-labels [data-explore]')];
  const columns=[4,6,8].map(id=>({x:data.joints[id][0],z:-data.joints[id][1]}));
  const floorAt=(x,z)=>deckHeightAt(x,z,columns,model.platformWalkways,model.platformObstacles);
  const overviewBox=new T.Box3(new T.Vector3(-64,-30,-45),new T.Vector3(64,155,45));
  const focusLabel=document.getElementById('stage-focus'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let frame=0,visible=false,transition=null,active=null,lastTime=0,lastPointer=null,renderWidth=1,mode='overview',savedView=null,autoRotate=false,rotorPlaying=true,yaw=0,pitch=0,lastStats=0,diveStart=0;
  const keys=new Set(),touchKeys=new Set();
  function highlight(id){stage.dataset.selected=id||'';}
  function schedule(){if(visible&&!frame)frame=requestAnimationFrame(render);}
  function stopMotion(){transition=null;autoRotate=false;controls.autoRotate=false;stage.querySelector('[data-view=rotate]')?.setAttribute('aria-pressed','false');}
  function setMode(next){mode=next;stage.dataset.experience=next;stage.dispatchEvent(new CustomEvent('model-modechange',{detail:{mode:next}}));onModeChange?.(next);}
  function setLook(position,target){camera.position.copy(position);camera.lookAt(target);const rotation=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=rotation.y;pitch=rotation.x;}
  function updateLook(){camera.quaternion.setFromEuler(new T.Euler(pitch,yaw,0,'YXZ'));}
  function fly(target,distance,direction){
    stopMotion();transition={start:performance.now(),from:camera.position.clone(),to:target.clone().add(direction.clone().normalize().multiplyScalar(distance)),fromTarget:controls.target.clone(),target:target.clone(),duration:reduced?0:1000};schedule();
  }
  function fitBox(box,direction){
    const center=box.getCenter(new T.Vector3()),forward=direction.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize(),up=new T.Vector3().crossVectors(forward,right).normalize();
    const tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=12;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new T.Vector3(x,y,z).sub(center),depth=p.dot(forward);
      distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*camera.aspect)*1.17,depth+Math.abs(p.dot(up))/tan*1.15);
    }fly(center,distance,direction);
  }
  function overview(){if(mode!=='overview')exitExperience();active=null;clear();highlight(null);stage.dataset.view='overview';fitBox(overviewBox,new T.Vector3(.65,.22,2.4));focusLabel.textContent='整体结构 / OVERVIEW';}
  function focus(id){
    if(mode!=='overview')exitExperience();active=id;highlight(id);stage.dataset.view=id;
    const box=id==='mooring'?new T.Box3(new T.Vector3(-60,-85,-62),new T.Vector3(65,15,62)):new T.Box3().setFromObject(model.groups[id]);
    fitBox(box,id==='rotor'?new T.Vector3(.35,.08,2):id==='nacelle'?new T.Vector3(1,.4,1.4):new T.Vector3(1,.6,1.7));
  }
  function enterExperience(next){
    if(!['nacelle','deck','underwater'].includes(next))return;
    if(mode==='overview')savedView={position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,active};
    stopMotion();keys.clear();touchKeys.clear();controls.enabled=false;camera.fov=next==='nacelle'?72:65;camera.near=.035;camera.updateProjectionMatrix();
    setMode(next);ocean.root.visible=next!=='nacelle';
    if(next==='nacelle'){setLook(interior.spawn.position,interior.spawn.target);scene.background=null;scene.fog=null;}
    if(next==='deck'){
      const p=columns[2];setLook(new T.Vector3(p.x-1,14.1,p.z-2.8),new T.Vector3(0,19,0));
      scene.background=new T.Color('#8dafc0');scene.fog=new T.FogExp2('#8dafc0',.00065);
    }
    if(next==='underwater'){
      diveStart=performance.now();
      const target=new T.Vector3(0,-13,0),end=new T.Vector3(30,-10,44),start=new T.Vector3(39,7,55);
      setLook(reduced?end:start,target);scene.background=new T.Color('#06394d');scene.fog=new T.FogExp2('#06394d',.0105);
      if(!reduced)transition={start:performance.now(),from:start,to:end,fromTarget:target.clone(),target,duration:1900,firstPerson:true};
      stage.classList.remove('is-diving');void stage.offsetWidth;stage.classList.add('is-diving');
    }else stage.classList.remove('is-diving');
    canvas.style.cursor='grab';resize();canvas.focus({preventScroll:true});schedule();
  }
  function exitExperience(){
    if(mode==='overview')return;stopMotion();keys.clear();touchKeys.clear();lastPointer=null;
    setMode('overview');controls.enabled=true;camera.fov=savedView?.fov||35;camera.near=.08;camera.updateProjectionMatrix();
    if(savedView){camera.position.copy(savedView.position);controls.target.copy(savedView.target);active=savedView.active;}
    scene.background=null;scene.fog=null;ocean.root.visible=false;stage.classList.remove('is-diving');controls.update();resize();schedule();
  }
  function action(view,button){
    if(view==='overview'){overview();return;}
    if(view==='rotor'){rotorPlaying=!rotorPlaying;button?.setAttribute('aria-pressed',String(rotorPlaying));schedule();return;}
    if(mode!=='overview')exitExperience();
    if(view==='front'||view==='top'){const box=active&&active!=='mooring'?new T.Box3().setFromObject(model.groups[active]):overviewBox;fitBox(box,view==='front'?new T.Vector3(0,.015,1):new T.Vector3(0,1,.001));stage.dataset.view=view;}
    if(view==='rotate'){transition=null;autoRotate=!autoRotate;controls.autoRotate=autoRotate;controls.autoRotateSpeed=.65;button?.setAttribute('aria-pressed',String(autoRotate));schedule();}
    if(view==='mooring'){select('mooring');fitBox(new T.Box3().setFromObject(model.groups.mooring),new T.Vector3(.7,1.3,1));}
    if(view==='water'){ocean.root.visible=!ocean.root.visible;button?.setAttribute('aria-pressed',String(ocean.root.visible));schedule();}
  }
  function hit(event){const r=canvas.getBoundingClientRect();if(event.clientX-r.left>renderWidth)return;pointer.set((event.clientX-r.left)/renderWidth*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(model.pickables,false)[0]?.object;}
  function partOf(object){while(object&&!object.userData.part)object=object.parent;return object?.userData.part;}
  canvas.addEventListener('pointerdown',e=>{
    lastPointer={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,id:e.pointerId,button:e.button,dragged:false};
    if(mode!=='overview'){transition=null;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});canvas.style.cursor='grabbing';e.preventDefault();}
  });
  canvas.addEventListener('pointermove',e=>{
    if(lastPointer&&lastPointer.id===e.pointerId){
      if(Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>=5)lastPointer.dragged=true;
      if(mode!=='overview'){yaw-=(e.clientX-lastPointer.lastX)*.0035;pitch=T.MathUtils.clamp(pitch-(e.clientY-lastPointer.lastY)*.0035,-1.47,1.47);updateLook();schedule();}
      lastPointer.lastX=e.clientX;lastPointer.lastY=e.clientY;
    }
    if(mode!=='overview'||e.buttons)return;
    const id=partOf(hit(e));canvas.style.cursor=id?'pointer':'grab';document.getElementById('model-hover-name').textContent=id?'点击查看 / '+components[id].name:'';
  });
  canvas.addEventListener('pointerup',e=>{
    if(mode==='overview'&&lastPointer&&!lastPointer.dragged&&lastPointer.id===e.pointerId&&lastPointer.button===0){const id=partOf(hit(e));if(id)select(id);}
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);lastPointer=null;canvas.style.cursor='grab';
  });
  canvas.addEventListener('pointercancel',()=>{lastPointer=null;});
  controls.addEventListener('start',stopMotion);controls.addEventListener('change',schedule);
  const movementKeys=['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown','q','e'];
  document.addEventListener('keydown',e=>{
    if(document.body.dataset.page!=='model'||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(e.key==='Escape'&&mode!=='overview'){e.preventDefault();exitExperience();return;}
    const key=e.key.toLowerCase();
    if(mode!=='overview'&&movementKeys.includes(key)){e.preventDefault();keys.add(key);transition=null;schedule();return;}
    if(e.target!==canvas||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
    e.preventDefault();stopMotion();if(e.key==='Home'){overview();return;}
    const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if(e.key==='ArrowLeft')spherical.theta-=.1;if(e.key==='ArrowRight')spherical.theta+=.1;if(e.key==='ArrowUp')spherical.phi=Math.max(.03,spherical.phi-.1);if(e.key==='ArrowDown')spherical.phi=Math.min(Math.PI*.96,spherical.phi+.1);
    if(e.key==='+'||e.key==='=')spherical.radius=Math.max(.8,spherical.radius*.88);if(e.key==='-')spherical.radius=Math.min(4000,spherical.radius/.88);
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));controls.update();schedule();
  });
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();touchKeys.clear();lastPointer=null;});
  stage.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-walk]');if(!button)return;e.preventDefault();button.setPointerCapture(e.pointerId);touchKeys.add(button.dataset.walk);transition=null;schedule();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,e=>{const button=e.target.closest('[data-walk]');if(button)touchKeys.delete(button.dataset.walk);});
  function move(delta){
    const forward=Number(keys.has('w')||keys.has('arrowup')||touchKeys.has('forward'))-Number(keys.has('s')||keys.has('arrowdown')||touchKeys.has('back'));
    const right=Number(keys.has('d')||keys.has('arrowright')||touchKeys.has('right'))-Number(keys.has('a')||keys.has('arrowleft')||touchKeys.has('left'));
    if(!forward&&!right&&!keys.has('q')&&!keys.has('e'))return;
    const step=movementVector(yaw,forward,right,mode==='underwater'?9:mode==='deck'?2.4:1.8,delta);
    const next={x:camera.position.x+step.x,y:camera.position.y,z:camera.position.z+step.z};
    if(mode==='nacelle'){const p=clampRoom(next,interior.walkBounds);camera.position.set(p.x,p.y,p.z);}
    if(mode==='deck'){
      let height=floorAt(next.x,next.z);
      if(height===null){next.x=camera.position.x;height=floorAt(next.x,next.z);}
      if(height===null){next.x=camera.position.x+step.x;next.z=camera.position.z;height=floorAt(next.x,next.z);}
      if(height!==null)camera.position.set(next.x,height+1.65,next.z);
    }
    if(mode==='underwater'){
      next.y+=Math.sin(pitch)*forward*9*delta+(Number(keys.has('e'))-Number(keys.has('q')))*6*delta;
      const p=clampSwim(next);if(Math.hypot(p.x,p.z)>4&&columns.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>12.8||p.y< -22||p.y>14))camera.position.set(p.x,p.y,p.z);
    }
  }
  function updateLabels(){
    if(mode!=='overview'){for(const label of labels)label.hidden=true;return;}
    camera.updateMatrixWorld();const height=stage.clientHeight,placed=[];
    const heading=stage.querySelector('.page-heading')?.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    for(const label of labels){
      const id=label.dataset.explore,anchor=components[id].anchor;
      const point=new T.Vector3(...anchor).project(camera),x=(point.x+1)*renderWidth/2,y=(1-point.y)*height/2;
      const behindHeading=heading&&x<heading.right-stageRect.left+10&&y<heading.bottom-stageRect.top+10;
      const show=point.z>-1&&point.z<1&&x>24&&x<renderWidth-24&&y>65&&y<height-108&&!behindHeading&&!placed.some(p=>Math.hypot(p.x-x,p.y-y)<37);
      label.hidden=!show;if(show){label.style.left=x+'px';label.style.top=y+'px';placed.push({x,y});}
    }
    stage.dispatchEvent(new CustomEvent('model-labelsupdate'));
  }
  function render(now){
    frame=0;if(!visible)return;const delta=Math.min(.05,(now-(lastTime||now))/1000);lastTime=now;
    if(transition){const t=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1,k=t*t*(3-2*t);
      camera.position.lerpVectors(transition.from,transition.to,k);
      if(transition.firstPerson){camera.lookAt(transition.target);const e=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;}
      else controls.target.lerpVectors(transition.fromTarget,transition.target,k);
      if(t===1)transition=null;
    }
    if(mode==='overview')controls.update(delta);else if(!transition)move(delta);
    if(rotorPlaying)model.rotor.rotation.z+=delta*.12;
    if(mode!=='overview'&&mode!=='nacelle')ocean.update(now/1000,mode==='underwater');
    if(mode==='nacelle')interior.animate?.(now/1000,delta);
    if(mode==='underwater'){
      waterPost.uniforms.time.value=now/1000;waterPost.uniforms.entry.value=reduced?0:Math.max(0,1-(now-diveStart)/3000);
      renderer.setRenderTarget(waterTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(waterPass,waterCamera);
    }else renderer.render(mode==='nacelle'?insideScene:scene,camera);
    updateLabels();
    if(now-lastStats>300){stage.dataset.cameraPosition=camera.position.toArray().map(n=>n.toFixed(3)).join(',');stage.dataset.cameraRotation=[pitch,yaw].map(n=>n.toFixed(3)).join(',');stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.triangles=String(renderer.info.render.triangles);lastStats=now;}
    if(transition||autoRotate||rotorPlaying||mode!=='overview'||keys.size||touchKeys.size)schedule();
  }
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    const inspector=document.querySelector('#page-model .part-inspector'),reserve=mode==='overview'&&innerWidth>900?(inspector?.getBoundingClientRect().width||330)+45:0;
    renderWidth=Math.max(200,w-reserve);camera.aspect=renderWidth/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);renderer.setViewport(0,0,renderWidth,h);
    waterTarget.setSize(Math.round(w*renderer.getPixelRatio()),Math.round(h*renderer.getPixelRatio()));schedule();
  }
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(frame)cancelAnimationFrame(frame);frame=0;document.getElementById('model-render-status').textContent='显示已暂停';});
  canvas.addEventListener('webglcontextrestored',()=>{document.getElementById('model-render-status').textContent='LIVE 3D';visible=document.body.dataset.page==='model';schedule();});
  stage.dataset.meshes=String(model.meshCount);stage.dataset.experience='overview';resize();overview();
  return {focus,action,enterExperience,exitExperience,visibility(show){visible=show&&!document.hidden;if(!visible){keys.clear();touchKeys.clear();if(frame)cancelAnimationFrame(frame);frame=0;lastTime=0;}else{resize();schedule();}}};
}
