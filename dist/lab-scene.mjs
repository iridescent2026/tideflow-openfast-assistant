import * as THREE from './vendor/three/three.module.js';
import {walkStep,easeCamera} from './lab-state.mjs';
import {buildLabEntrance} from './lab-entrance.mjs';
import {buildLabInterior} from './lab-interior.mjs?v=1.1.1';

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
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800,180,180),new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,opacity:.92,vertexShader:`uniform float time;uniform float height;uniform float period;varying vec3 wp;varying float crest;void main(){vec3 p=position;float t=time*10./max(period,5.);float w=sin(p.x*.23+t*1.4)*cos(p.y*.19+t*.8)+sin(p.x*.51-p.y*.32+t*1.7)*.32;p.z=w*min(height,4.)*.07;crest=w;wp=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float time;uniform sampler2D environment;uniform float hasEnvironment;uniform vec3 eye;varying vec3 wp;varying float crest;void main(){float t=time*.65;vec2 q=wp.xy;float nx=sin(q.x*.62+q.y*.31+t)*.11+sin(q.x*1.7-q.y*.8+t*1.8)*.045;float nz=cos(q.y*.74-q.x*.24+t)*.12+cos(q.y*2.3+q.x*.7-t*1.5)*.04;vec3 n=normalize(vec3(nx,1.,nz));vec3 world=vec3(wp.x,-1.1+crest*.07,-wp.y);vec3 v=normalize(eye-world);vec3 r=reflect(-v,n);vec2 uv=vec2(atan(r.z,r.x)/6.2831853+.5,asin(clamp(r.y,-1.,1.))/3.14159265+.5);vec3 reflection=texture2D(environment,uv).rgb;float near=exp(-length(q)*.015);float f=pow(1.-max(dot(n,v),0.),3.);vec3 base=mix(vec3(.012,.13,.26),vec3(.01,.35,.44),near);vec3 c=mix(base,reflection,hasEnvironment*(.3+f*.55));float light=pow(max(dot(reflect(normalize(vec3(.3,-.75,-.22)),n),v),0.),100.);c+=light*.55;float cabin=smoothstep(5.,10.,length(q));gl_FragColor=vec4(c,mix(.25,.82,cabin)+f*.15);}`}));water.rotation.x=-Math.PI/2;water.position.y=-1.1;scene.add(water);
 const seabed=material('#277d91',.15,.9);const bed=new THREE.Mesh(new THREE.PlaneGeometry(200,200),seabed);bed.rotation.x=-Math.PI/2;bed.position.y=-5.5;scene.add(bed);
 for(let i=0;i<80;i++){const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.3+(i%5)*.17,1),material(i%2?'#32667c':'#214558',.1,.9));rock.position.set(Math.sin(i*12.3)*30,-5+Math.sin(i)*.4,Math.cos(i*8.4)*30);rock.scale.set(1.8,.7,1.3);scene.add(rock);}
 const room=new THREE.Group();scene.add(room);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(8,64,24,0,Math.PI*2,0,Math.PI/2),glass);dome.scale.y=.7;room.add(dome);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(7.6,.1,10,100,Math.PI*2-.55),silver);rim.rotation.set(Math.PI/2,0,Math.PI/2+.275);rim.position.y=.015;room.add(rim);
 const rimLight=new THREE.Mesh(new THREE.TorusGeometry(7.4,.026,8,100,Math.PI*2-.55),cyan);rimLight.rotation.set(Math.PI/2,0,Math.PI/2+.275);rimLight.position.y=.08;room.add(rimLight);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const points=[];for(let j=0;j<=30;j++){const p=j/30*Math.PI/2;points.push([Math.cos(a)*Math.sin(p)*8,Math.cos(p)*5.6,Math.sin(a)*Math.sin(p)*8]);}tube(points,.085,silver,room);}
 const doorLeaves=buildLabEntrance(THREE,scene,{box,tube,material,silver,cyan});
 const interior=buildLabInterior(THREE,scene,{box,cylinder,tube,material,silver,navy,dark,cyan});
 const {chairPick,knobs}=interior;
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
 function setPhase(value){phase=value;interior.setPhase(value);Object.keys(keys).forEach(k=>keys[k]=false);drag=null;}
 function travel(position,seconds=1.3,targetYaw=0,targetPitch=-.09){transition={from:camera.position.clone(),to:new THREE.Vector3(...position),t:0,duration:reduced.matches?.01:seconds,fromYaw:yaw,toYaw:targetYaw,fromPitch:pitch,toPitch:targetPitch};}
 function resize(){const {width,height}=host.getBoundingClientRect();if(width&&height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function tick(now){frame=requestAnimationFrame(tick);if(!active){last=now;return;}const dt=Math.min((now-(last||now))/1000,.05);last=now;time+=dt;
  const params=getParameters();interior.sync(params);if(!reduced.matches)waterUniforms.time.value=time;waterUniforms.height.value=params.wave;waterUniforms.period.value=params.period;
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
