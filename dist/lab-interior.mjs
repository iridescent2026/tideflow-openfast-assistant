// Reference-inspired interior furniture, glazing and circulation deck.
export function buildLabInterior(THREE,scene,{box,cylinder,tube,material,silver,navy,dark,cyan}){
 const pearl=new THREE.MeshPhysicalMaterial({color:'#d2e0e9',metalness:.7,roughness:.19,clearcoat:1,clearcoatRoughness:.1});
 const chrome=new THREE.MeshPhysicalMaterial({color:'#c8dfed',metalness:1,roughness:.13});
 const leather=material('#142b3e',.05,.67),seam=material('#3e5a70',.15,.6),black=material('#07131f',.25,.42);
 const glow=material('#76f4ff',.3,.2,{emissive:'#33d8ed',emissiveIntensity:1.15});
 function rounded(w,h,d,r,mat,x,y,z,parent=scene){const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:4,curveSegments:16}),mat);mesh.position.set(x,y,z-d/2);parent.add(mesh);return mesh;}
 function ring(radius,thickness,y,mat,parent=scene){const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,thickness,12,100),mat);mesh.rotation.x=Math.PI/2;mesh.position.y=y;parent.add(mesh);return mesh;}
 function band(inner,outer,y,mat,start=0,length=Math.PI*2){const shape=new THREE.Shape();shape.absarc(0,0,outer,start,start+length,false);shape.absarc(0,0,inner,start+length,start,true);shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.09,steps:1,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:2,curveSegments:70}),mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;scene.add(mesh);return mesh;}
 // Clear floor panels, a circular walking lane, and a metal landing for the seat.
 const floorGlass=new THREE.MeshPhysicalMaterial({color:'#a1e4ee',metalness:.14,roughness:.055,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false,clearcoat:1});
 const floor=new THREE.Mesh(new THREE.CircleGeometry(7.3,100),floorGlass);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;scene.add(floor);
 for(const radius of [2.1,4.65,6.9])ring(radius,.055,-.025,chrome);
 band(3.75,4.65,.015,pearl);band(6.9,7.25,-.015,pearl);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a),z=Math.sin(a);tube([[x*2.1,-.045,z*2.1],[x*6.9,-.045,z*6.9]],.045,chrome);}
 for(const x of [-.65,.65]){box(.055,.1,4.8,chrome,x,-.02,4.05);box(.015,.012,4.7,glow,x*.95,.04,4.05);}
 box(1.3,.08,4.7,pearl,0,-.03,4.05);
 const seatLanding=rounded(2.12,.08,2.2,.2,pearl,0,.015,1.7);ring(1,.015,.075,glow).position.z=1.7;
 // A lit reef below the transparent floor gives the glass actual visual depth.
 const reefMaterial=new THREE.MeshStandardMaterial({color:'#a6edee',roughness:.85,emissive:'#075875',emissiveIntensity:.4});
 const reef=new THREE.Mesh(new THREE.PlaneGeometry(22,16),reefMaterial);reef.rotation.x=-Math.PI/2;reef.position.set(0,-3.9,0);scene.add(reef);
 new THREE.TextureLoader().load('./assets/tidal-reading-ocean-hd.png',texture=>{texture.colorSpace=THREE.SRGBColorSpace;reefMaterial.map=texture;reefMaterial.needsUpdate=true;});
 const underLight=new THREE.PointLight('#55e7ff',18,15,2);underLight.position.set(0,-2,0);scene.add(underLight);
 // Circular ceiling soffit, recessed center glazing, panel joints and warm LEDs.
 band(1.3,4.65,4.42,pearl);ring(4.62,.07,4.45,chrome);ring(1.32,.055,4.44,chrome);
 const ceilingGlass=new THREE.Mesh(new THREE.CircleGeometry(1.29,50),floorGlass);ceilingGlass.rotation.x=Math.PI/2;ceilingGlass.position.y=4.47;scene.add(ceilingGlass);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const c=Math.cos(a),s=Math.sin(a);tube([[c*1.37,4.405,s*1.37],[c*4.53,4.405,s*4.53]],.014,seam);}
 const softLED=material('#f1fbff',.4,.2,{emissive:'#ddf6ff',emissiveIntensity:1.5});
 for(let i=0;i<6;i++){const a=i*Math.PI/3+.18;const pts=[];for(let j=0;j<14;j++){const t=a+j/13*.52;pts.push([Math.cos(t)*3.55,4.385,Math.sin(t)*3.55]);}tube(pts,.018,softLED);}
 box(1.05,.055,.66,black,0,4.35,1.9);for(let i=0;i<14;i++)box(.025,.018,.58,chrome,-.47+i*.072,4.314,1.9);
 // Window sill and waist-high safety rail, with the entrance sector left open.
 for(const y of [.32,1.05]){const rail=new THREE.Mesh(new THREE.TorusGeometry(7.33,.035,10,100,Math.PI*2-.62),chrome);rail.rotation.set(Math.PI/2,0,Math.PI/2+.31);rail.position.y=y;scene.add(rail);}
 for(let i=0;i<14;i++){const a=.5+i*(Math.PI*2-1)/13,x=Math.sin(a)*7.32,z=Math.cos(a)*7.32;cylinder(.027,.035,1.05,chrome,x,.52,z);}
 // Ergonomic operator chair: separate rear shell, cushions and upholstered arms.
 const chair=new THREE.Group();chair.position.set(0,0,1.7);scene.add(chair);
 cylinder(.77,.83,.075,chrome,0,.105,0,chair);cylinder(.66,.72,.075,black,0,.16,0,chair);
 const chairHalo=ring(.73,.018,.205,glow,chair);cylinder(.2,.29,.12,pearl,0,.25,0,chair);cylinder(.105,.14,.42,chrome,0,.52,0,chair);
 for(let i=0;i<5;i++)cylinder(.145,.145,.028,black,0,.38+i*.041,0,chair);
 ring(.35,.025,.38,chrome,chair);rounded(1.16,.22,1.07,.1,pearl,0,.8,0,chair);rounded(1.01,.18,.89,.08,leather,0,.95,-.06,chair);
 tube([[-.47,1.045,-.42],[-.51,1.045,.27],[0,1.045,.35],[.51,1.045,.27],[.47,1.045,-.42]],.008,seam,chair);
 const recline=new THREE.Group();recline.position.set(0,1.55,.43);recline.rotation.x=.17;chair.add(recline);
 rounded(1.08,1.36,.18,.19,pearl,0,0,0,recline);
 rounded(.88,1.14,.105,.16,leather,0,0,-.13,recline);
 rounded(.82,.32,.15,.1,leather,0,-.36,-.19,recline);rounded(.78,.29,.13,.1,leather,0,.39,-.18,recline);
 rounded(.76,.88,.035,.13,navy,0,.005,.12,recline);
 for(const x of [-.3,.3])tube([[x,-.33,.147],[x,-.08,.152],[x,.25,.147]],.008,seam,recline);
 for(const x of [-.2,.2])cylinder(.027,.027,.21,chrome,x,.74,.02,recline);
 rounded(.79,.29,.25,.11,leather,0,.78,.01,recline);rounded(.64,.12,.022,.045,navy,0,.8,.149,recline);
 const outline=[[-.38,-.66,.1],[-.54,-.51,.1],[-.54,.39,.1],[-.44,.64,.1],[0,.7,.1],[.44,.64,.1],[.54,.39,.1],[.54,-.51,.1],[.38,-.66,.1]];tube(outline,.012,glow,recline);
 for(const sign of [-1,1]){
  tube([[sign*.43,.83,.33],[sign*.66,.93,.3],[sign*.66,1.18,.18],[sign*.66,1.22,-.34]],.052,pearl,chair);
  rounded(.18,.105,.75,.045,leather,sign*.66,1.26,-.04,chair);
  tube([[sign*.74,1.235,-.4],[sign*.74,1.235,.25],[sign*.65,1.18,.35]],.012,glow,chair);
  const pivot=cylinder(.09,.09,.07,black,sign*.54,.84,.25,chair);pivot.rotation.z=Math.PI/2;
 }
 const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=64;const bc=badgeCanvas.getContext('2d');bc.textAlign='center';bc.fillStyle='#94c6d5';bc.font='15px sans-serif';bc.fillText('T I D E F L O W',128,31);bc.font='9px sans-serif';bc.fillText('O P E R A T O R   /   0 1',128,50);const badgeTexture=new THREE.CanvasTexture(badgeCanvas);const badge=new THREE.Mesh(new THREE.PlaneGeometry(.48,.12),new THREE.MeshBasicMaterial({map:badgeTexture,transparent:true,depthWrite:false}));badge.position.set(0,.28,.15);recline.add(badge);
 const chairPick=[];chair.traverse(object=>{if(object.isMesh)chairPick.push(object);});
 // Crescent console, glossy silver enclosure and a separately inset dark desk.
 const points=[[-4.15,1.0],[-4.5,2.23],[-3.65,3.45],[0,3.83],[3.65,3.45],[4.5,2.23],[4.15,1.0],[3.05,1.67],[0,2.13],[-3.05,1.67]];
 const shellShape=new THREE.Shape();points.forEach(([x,y],i)=>i?shellShape.lineTo(x,y):shellShape.moveTo(x,y));shellShape.closePath();
 const deskShell=new THREE.Mesh(new THREE.ExtrudeGeometry(shellShape,{depth:.24,bevelEnabled:true,bevelSize:.13,bevelThickness:.1,bevelSegments:5,curveSegments:24}),pearl);deskShell.rotation.x=-Math.PI/2;deskShell.position.y=.89;scene.add(deskShell);
 const deskTop=new THREE.Mesh(new THREE.ShapeGeometry(shellShape),navy);deskTop.rotation.x=-Math.PI/2;deskTop.position.y=1.145;deskTop.scale.set(.977,.98,1);scene.add(deskTop);
 const deskEdge=[[-4.15,1.13,-1],[-3.05,1.13,-1.67],[0,1.13,-2.13],[3.05,1.13,-1.67],[4.15,1.13,-1]];tube(deskEdge,.032,chrome);tube(deskEdge.map(([x,y,z])=>[x,y-.08,z]),.012,glow);
 for(const x of [-3.2,3.2]){const support=rounded(.46,.8,.9,.12,pearl,x,.48,-2.6);support.rotation.z=x>0?-.17:.17;cylinder(.52,.65,.07,chrome,x,.08,-2.6);}
 // The preview monitors have real textures; seated mode replaces them with native controls.
 const monitors=[],screens=[];
 for(let i=-2;i<=2;i++){
  const group=new THREE.Group();group.position.set(i*1.45,1.71,-3.03+Math.abs(i)*.17);group.rotation.y=-i*.15;group.rotation.x=-.12;
  rounded(1.47,.93,.11,.045,black,0,0,0,group);rounded(1.39,.85,.013,.025,navy,0,0,.069,group);box(1.33,.012,.025,glow,0,-.451,.07,group);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=300;const context=canvas.getContext('2d');const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.37,.79),new THREE.MeshBasicMaterial({map:texture}));panel.position.z=.082;group.add(panel);scene.add(group);monitors.push(group);screens.push({context,texture,index:i+2});
 }
 const knobs=[];for(let i=0;i<6;i++){const knob=new THREE.Group();knob.position.set(-2.6+i*1.04,1.24,-1.9-Math.cos(i)*.15);cylinder(.18,.22,.055,chrome,0,0,0,knob);cylinder(.125,.14,.09,black,0,.065,0,knob);box(.018,.008,.08,glow,0,.113,-.045,knob);scene.add(knob);knobs.push(knob);}
 const throttleBase=rounded(.65,.07,.8,.06,black,-3.25,1.21,-1.66);for(const x of [-3.4,-3.1]){const lever=box(.055,.35,.075,chrome,x,1.42,-1.65);lever.rotation.x=-.25;}rounded(.53,.12,.17,.045,leather,-3.25,1.58,-1.69);
 for(let i=0;i<5;i++){box(.13,.035,.19,black,1.65+i*.25,1.2,-2.4);cylinder(.028,.028,.014,i===0?glow:chrome,1.65+i*.25,1.224,-2.39);}
 // Small habitation details: planted corners, a tablet dock and a cup recess.
 function plant(x,z,scale=1){const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);scene.add(group);cylinder(.25,.21,.48,pearl,0,.25,0,group);cylinder(.23,.23,.025,material('#253735',.05,.9),0,.5,0,group);const green=material('#277d58',.05,.62,{side:THREE.DoubleSide});const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(-.18,.33,0,.69);leafShape.quadraticCurveTo(.2,.35,0,0);for(let i=0;i<13;i++){const a=i*2.4,h=.74+(i%5)*.18;const ex=Math.sin(a)*(.32+(i%3)*.1),ez=Math.cos(a)*.4;tube([[0,.5,0],[ex*.5,h*.8,ez*.5],[ex,h,ez]],.009,green,group);const leaf=new THREE.Mesh(new THREE.ShapeGeometry(leafShape),green);leaf.position.set(ex,h-.1,ez);leaf.rotation.set(.4+Math.sin(i)*.4,a,-.7+Math.cos(i)*.4);group.add(leaf);}}
 plant(-5.65,-1.1,1.15);plant(5.4,-3.5,.8);
 const tablet=rounded(.55,.035,.35,.035,black,-3.8,1.21,-2.4);tablet.rotation.y=.15;cylinder(.095,.095,.015,chrome,3.7,1.19,-2.1);cylinder(.075,.06,.14,pearl,3.7,1.26,-2.1);
 let last='';
 function sync(params){const key=[params.wind,params.wave,params.period].join('|');if(key===last)return;last=key;
  for(const {context:c,texture,index} of screens){
   c.fillStyle='#061d32';c.fillRect(0,0,512,300);c.fillStyle='#56d9ef';c.font='14px sans-serif';c.fillText(['ENVIRONMENT','WIND INPUT','OC4 / INPUT PREVIEW','WAVE INPUT','SOLVER SETUP'][index],22,30);c.strokeStyle='#24617b';c.beginPath();c.moveTo(20,44);c.lineTo(490,44);c.stroke();
   c.fillStyle='#e1f8ff';c.font='36px sans-serif';c.fillText(index===1?params.wind.toFixed(1)+' m/s':index===3?params.wave+' m':index===2?'OC4':index===4?'OpenFAST':'SeaState',24,99);c.fillStyle='#89bdcf';c.font='13px sans-serif';c.fillText('INPUT PREVIEW / NOT A RESULT',24,124);
   c.strokeStyle='#17465c';c.lineWidth=1;for(let y=160;y<280;y+=25){c.beginPath();c.moveTo(24,y);c.lineTo(490,y);c.stroke();}
   c.strokeStyle='#5adce9';c.lineWidth=2;c.beginPath();for(let x=24;x<=488;x++){const y=216+Math.sin((x-24)/params.period*.26)*Math.min(params.wave,4)*12;x===24?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();texture.needsUpdate=true;
  }
 }
 function setPhase(phase){monitors.forEach(m=>m.visible=phase!=='seated');glow.emissiveIntensity=phase==='walking'?1.45:.75;}
 return {chairPick,knobs,monitors,sync,setPhase};
}
