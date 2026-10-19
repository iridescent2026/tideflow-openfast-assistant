import * as THREE from './vendor/three/three.module.js';
import {walkStep,easeCamera} from './lab-state.mjs';
import {buildLabEntrance} from './lab-entrance.mjs';

export function createLabScene(host,{onChair,onFrame,getParameters}){
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#70b8df',.0025);
 const camera=new THREE.PerspectiveCamera(64,1,.08,1400);camera.position.set(0,2.02,12);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','可走动的全景玻璃海洋实验舱');
 const sun=new THREE.DirectionalLight('#fff6df',2.4);sun.position.set(-35,60,20);scene.add(sun,new THREE.HemisphereLight('#d8f2ff','#527782',2.8));
 const material=(color,metalness=.25,roughness=.35,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
 const silver=material('#d9e5eb',.8,.23),navy=material('#09253d',.5,.27),dark=material('#142533',.2,.6),cyan=material('#37dff0',.3,.25,{emissive:'#14ddec',emissiveIntensity:1.5});
 const glass=new THREE.MeshPhysicalMaterial({color:'#b6ecff',metalness:.15,roughness:.09,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false});
 const box=(w,h,d,mat,x=0,y=0,z=0,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const cylinder=(r1,r2,h,mat,x=0,y=0,z=0,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,40),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 function tube(points,r,mat,parent=scene){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*3),r,8,false),mat);parent.add(mesh);return mesh;}
 const sky=new THREE.Mesh(new THREE.SphereGeometry(800,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(vec3(.65,.85,.98),vec3(.025,.33,.72),pow(max(h,0.),.55));float sun=pow(max(dot(normalize(vP),normalize(vec3(-.3,.75,.22))),0.),180.);gl_FragColor=vec4(c+sun*.8,1.);}'}));scene.add(sky);
 // Procedural cloud sprites are scene geometry, with no external image dependency.
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=256;cloudCanvas.height=128;const ctx=cloudCanvas.getContext('2d');
 for(let i=0;i<8;i++){const x=25+i*29,y=65+Math.sin(i*2)*12,r=25+Math.sin(i)*9,g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 const cloudTexture=new THREE.CanvasTexture(cloudCanvas);for(let i=0;i<20;i++){const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTexture,transparent:true,opacity:.55,depthWrite:false}));const a=i*2.4;cloud.position.set(Math.sin(a)*250,55+(i%4)*13,Math.cos(a)*250);cloud.scale.set(100,32,1);scene.add(cloud);}
 const waterUniforms={time:{value:0},height:{value:1.5},period:{value:10},environment:{value:null},hasEnvironment:{value:0},eye:{value:camera.position}};
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800,180,180),new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,opacity:.92,vertexShader:`uniform float time;uniform float height;uniform float period;varying vec3 wp;varying float crest;void main(){vec3 p=position;float t=time*10./max(period,5.);float w=sin(p.x*.23+t*1.4)*cos(p.y*.19+t*.8)+sin(p.x*.51-p.y*.32+t*1.7)*.32;p.z=w*min(height,4.)*.07;crest=w;wp=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;uniform sampler2D environment;uniform float hasEnvironment;uniform vec3 eye;varying vec3 wp;varying float crest;void main(){float t=time*.65;vec2 q=wp.xy;float nx=sin(q.x*.62+q.y*.31+t)*.11+sin(q.x*1.7-q.y*.8+t*1.8)*.045;float nz=cos(q.y*.74-q.x*.24+t)*.12+cos(q.y*2.3+q.x*.7-t*1.5)*.04;vec3 n=normalize(vec3(nx,1.,nz));vec3 world=vec3(wp.x,-1.1+crest*.07,-wp.y);vec3 v=normalize(eye-world);vec3 r=reflect(-v,n);vec2 uv=vec2(atan(r.z,r.x)/6.2831853+.5,asin(clamp(r.y,-1.,1.))/3.14159265+.5);vec3 reflection=texture2D(environment,uv).rgb;float near=exp(-length(q)*.015);float f=pow(1.-max(dot(n,v),0.),3.);vec3 base=mix(vec3(.012,.13,.26),vec3(.01,.35,.44),near);vec3 c=mix(base,reflection,hasEnvironment*(.3+f*.55));float light=pow(max(dot(reflect(normalize(vec3(.3,-.75,-.22)),n),v),0.),100.);c+=light*.55;gl_FragColor=vec4(c,.82+f*.15);}`}));water.rotation.x=-Math.PI/2;water.position.y=-1.1;scene.add(water);
 const seabed=material('#277d91',.15,.9);const bed=new THREE.Mesh(new THREE.PlaneGeometry(200,200),seabed);bed.rotation.x=-Math.PI/2;bed.position.y=-5.5;scene.add(bed);
 for(let i=0;i<80;i++){const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.3+(i%5)*.17,1),material(i%2?'#32667c':'#214558',.1,.9));rock.position.set(Math.sin(i*12.3)*30,-5+Math.sin(i)*.4,Math.cos(i*8.4)*30);rock.scale.set(1.8,.7,1.3);scene.add(rock);}
 const room=new THREE.Group();scene.add(room);
 const floor=cylinder(7.5,7.5,.18,new THREE.MeshPhysicalMaterial({color:'#91ccde',metalness:.25,roughness:.12,transparent:true,opacity:.35,side:THREE.DoubleSide}),0,-.12,0,room);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(8,64,24,0,Math.PI*2,0,Math.PI/2),glass);dome.scale.y=.7;room.add(dome);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(7.6,.1,10,100,Math.PI*2-.55),silver);rim.rotation.set(Math.PI/2,0,Math.PI/2+.275);rim.position.y=.015;room.add(rim);
 const rimLight=new THREE.Mesh(new THREE.TorusGeometry(7.4,.026,8,100,Math.PI*2-.55),cyan);rimLight.rotation.set(Math.PI/2,0,Math.PI/2+.275);rimLight.position.y=.08;room.add(rimLight);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const points=[];for(let j=0;j<=30;j++){const p=j/30*Math.PI/2;points.push([Math.cos(a)*Math.sin(p)*8,Math.cos(p)*5.6,Math.sin(a)*Math.sin(p)*8]);}tube(points,.085,silver,room);}
 for(let i=-3;i<=3;i++){const extent=Math.sqrt(7.3**2-(i*2)**2);box(extent*2,.09,.075,silver,0,-.01,i*2,room);box(.075,.09,extent*2,silver,i*2,-.01,0,room);}
 const doorLeaves=buildLabEntrance(THREE,scene,{box,tube,material,silver,cyan});
 function rounded(w,h,d,r,mat,x,y,z,parent){const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const obj=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,curveSegments:10}),mat);obj.position.set(x,y,z-d/2);parent.add(obj);return obj;}
 const chair=new THREE.Group();chair.position.set(0,0,1.7);scene.add(chair);cylinder(.67,.78,.12,silver,0,.08,0,chair);cylinder(.14,.19,.6,silver,0,.4,0,chair);rounded(1.12,.2,1,.1,dark,0,.79,0,chair);const back=rounded(1.05,1.25,.2,.18,navy,0,1.4,.44,chair);back.rotation.x=-.12;rounded(.8,.3,.25,.1,dark,0,2.03,.52,chair);
 for(const x of [-.64,.64]){box(.13,.12,.92,silver,x,1.03,0,chair);box(.15,.07,.73,dark,x,1.12,-.06,chair);tube([[x,.95,.45],[x,1.9,.47],[x*.7,2.04,.5]],.022,cyan,chair);}
 const chairPick=[];chair.traverse(obj=>{if(obj.isMesh)chairPick.push(obj);});
 // Sculpted crescent desk with pearlescent rim, supports and tactile controls.
 const deskShape=new THREE.Shape();[[-4,1.05],[-4.35,2.3],[-3.5,3.35],[0,3.7],[3.5,3.35],[4.35,2.3],[4,1.05],[3,1.7],[0,2.1],[-3,1.7]].forEach(([x,y],i)=>i?deskShape.lineTo(x,y):deskShape.moveTo(x,y));deskShape.closePath();
 const desk=new THREE.Mesh(new THREE.ExtrudeGeometry(deskShape,{depth:.17,bevelEnabled:true,bevelSize:.08,bevelThickness:.04,bevelSegments:3,steps:1}),navy);desk.rotation.x=-Math.PI/2;desk.position.y=.96;scene.add(desk);
 tube([[-4,1.03,-1.05],[-3,1.03,-1.7],[0,1.03,-2.1],[3,1.03,-1.7],[4,1.03,-1.05]],.045,silver);tube([[-4,.94,-1.05],[-3,.94,-1.7],[0,.94,-2.1],[3,.94,-1.7],[4,.94,-1.05]],.018,cyan);
 for(const x of [-3.3,3.3]){const leg=box(.25,.9,.5,silver,x,.45,-2.5);leg.rotation.z=x>0?-.2:.2;}
 const screenMat=material('#073251',.1,.32,{emissive:'#0b446b',emissiveIntensity:.7});
 const monitors=[];for(let i=-1;i<=1;i++){const monitor=new THREE.Group();monitor.position.set(i*2.25,1.69,-2.88+Math.abs(i)*.32);monitor.rotation.y=-i*.18;monitor.rotation.x=-.12;box(2.18,1.22,.11,navy,0,0,0,monitor);box(2.05,1.08,.025,screenMat,0,0,.07,monitor);box(2.1,.018,.025,cyan,0,-.58,.08,monitor);scene.add(monitor);monitors.push(monitor);}
 const knobs=[];for(let i=0;i<6;i++){const knob=new THREE.Group();knob.position.set(-2.6+i*1.04,1.18,-1.9-Math.cos(i)*.15);cylinder(.2,.23,.08,silver,0,0,0,knob);cylinder(.13,.13,.1,dark,0,.08,0,knob);box(.018,.01,.11,cyan,0,.139,-.03,knob);scene.add(knob);knobs.push(knob);}
 const throttle=box(.12,.45,.1,silver,-2.9,1.38,-1.35);throttle.rotation.x=-.3;box(.38,.12,.16,dark,-2.9,1.61,-1.42);
 const startButton=cylinder(.22,.25,.09,cyan,2.8,1.18,-1.5);box(.63,.045,.6,silver,2.8,1.08,-1.5);
 const rotors=[];
 function turbine(x,z,scale=1){const g=new THREE.Group();g.position.set(x,-1.1,z);g.scale.setScalar(scale);scene.add(g);const white=material('#f0f7f8',.45,.28),yellow=material('#e9ba42',.4,.4);cylinder(.25,.49,18,white,0,9,0,g);cylinder(.55,.65,1.5,yellow,0,.7,0,g);box(1.3,.85,2.4,white,0,18,0,g);const rotor=new THREE.Group();rotor.position.set(0,18,1.3);g.add(rotor);const hub=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),white);rotor.add(hub);for(let i=0;i<3;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI*2/3;const shape=new THREE.Shape();shape.moveTo(-.18,.25);shape.lineTo(-.42,2);shape.lineTo(-.15,8);shape.lineTo(.06,8.6);shape.lineTo(.24,2);shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1}),white);blade.add(mesh);rotor.add(blade);}rotors.push(rotor);for(let i=0;i<3;i++){const a=i*Math.PI*2/3,cx=Math.cos(a)*2.6,cz=Math.sin(a)*2.6;cylinder(.65,.8,1.8,white,cx,.2,cz,g);tube([[0,.7,0],[cx,.7,cz]],.12,silver,g);}}
 turbine(14,-85,1.3);for(let i=0;i<10;i++)turbine(-140+i*31,-160-(i%3)*45,.65);
 const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 new THREE.TextureLoader().load('./assets/lab-ocean-panorama.png',texture=>{texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;scene.background=texture;scene.backgroundIntensity=1;scene.environment=pmrem.fromEquirectangular(texture).texture;scene.environmentIntensity=.95;sky.visible=false;scene.children.filter(obj=>obj.isSprite).forEach(obj=>obj.visible=false);waterUniforms.environment.value=texture;waterUniforms.hasEnvironment.value=1;pmrem.dispose();});
 const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
 let phase='outside',yaw=0,pitch=0,transition=null,door=0,time=0,last=0,frame=0,active=false,drag=null;
 const keys={forward:false,back:false,left:false,right:false},reduced={matches:matchMedia('(prefers-reduced-motion:reduce)').matches};
 camera.rotation.order='YXZ';
 function aim(){camera.rotation.set(pitch,yaw,0);}
 function setPhase(value){phase=value;monitors.forEach(m=>m.visible=value!=='seated');Object.keys(keys).forEach(k=>keys[k]=false);drag=null;}
 function travel(position,seconds=1.3,targetYaw=0,targetPitch=-.09){transition={from:camera.position.clone(),to:new THREE.Vector3(...position),t:0,duration:reduced.matches?.01:seconds,fromYaw:yaw,toYaw:targetYaw,fromPitch:pitch,toPitch:targetPitch};}
 function resize(){const {width,height}=host.getBoundingClientRect();if(width&&height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function tick(now){frame=requestAnimationFrame(tick);if(!active){last=now;return;}const dt=Math.min((now-(last||now))/1000,.05);last=now;time+=dt;
  const params=getParameters();if(!reduced.matches)waterUniforms.time.value=time;waterUniforms.height.value=params.wave;waterUniforms.period.value=params.period;
  for(const rotor of rotors)if(!reduced.matches)rotor.rotation.z-=dt*(.1+params.wind*.022);
  knobs[0].rotation.y=-params.wind*.25;knobs[2].rotation.y=-params.wave*.8;knobs[3].rotation.y=-params.period*.18;
  const targetDoor=phase==='outside'?0:1;door=reduced.matches?targetDoor:door+Math.min(1,dt*3)*(targetDoor-door);doorLeaves.forEach(({leaf,sign,closedX,travel})=>leaf.position.x=sign*(closedX+door*travel));
  if(transition){transition.t+=dt;const p=easeCamera(transition.t/transition.duration);camera.position.lerpVectors(transition.from,transition.to,p);yaw=THREE.MathUtils.lerp(transition.fromYaw,transition.toYaw,p);pitch=THREE.MathUtils.lerp(transition.fromPitch,transition.toPitch,p);if(p>=1)transition=null;}
  else if(phase==='walking'){const next=walkStep(camera.position,keys,yaw,dt);camera.position.x=next.x;camera.position.z=next.z;camera.position.y=1.75+(!reduced.matches&&Object.values(keys).some(Boolean)?Math.sin(time*11)*.025:0);}
  aim();renderer.render(scene,camera);
  const label=new THREE.Vector3(0,1.7,1.7).project(camera);onFrame({chairX:(label.x*.5+.5)*100,chairY:(-.5*label.y+.5)*100,chairVisible:label.z<1&&Math.abs(label.x)<.9&&Math.abs(label.y)<.9,transitioning:!!transition,door});
 }
 const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 function onKey(e){if(!active||phase!=='walking'||e.target.closest('input,select,textarea,dialog'))return;const key=keyMap[e.code];if(key){e.preventDefault();keys[key]=e.type==='keydown';}}
 window.addEventListener('keydown',onKey);window.addEventListener('keyup',onKey);window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
 renderer.domElement.addEventListener('pointerdown',e=>{if(phase!=='walking')return;drag={x:e.clientX,y:e.clientY,moved:0};renderer.domElement.setPointerCapture(e.pointerId);});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.003;pitch=Math.max(-.65,Math.min(.65,pitch-dy*.0025));drag.x=e.clientX;drag.y=e.clientY;});
 renderer.domElement.addEventListener('pointerup',e=>{if(phase==='walking'&&drag?.moved<8){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);if(raycaster.intersectObjects(chairPick).length)onChair();}drag=null;});
 resize();frame=requestAnimationFrame(tick);
 return {setPhase,travel,setReducedMotion(value){reduced.matches=value;},setActive(value){active=value;if(!value)Object.keys(keys).forEach(k=>keys[k]=false);},move(key,down){keys[key]=down;},get transitioning(){return !!transition;},get position(){return camera.position.clone();},dispose(){cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onKey);renderer.dispose();}};
}
