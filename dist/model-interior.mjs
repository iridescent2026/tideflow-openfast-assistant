import * as T from './vendor/three/three.module.js';

// An explorable engineering illustration, not an OEM interior or an as-built CAD survey.
// Coordinates are metres: the equipment stays left of the unobstructed starboard aisle.
export function buildNacelleInterior(){
  const root=new T.Group();root.name='nacelle-interior';root.visible=false;
  const lights=[],moving=[],machineParts={},boltMatrices=[],gratingMatrices=[];
  const material=(color,metalness=.2,roughness=.4,extra={})=>new T.MeshStandardMaterial({color,metalness,roughness,...extra});
  const mat={
    lining:material('#d5dfdf',.12,.55,{side:T.DoubleSide}),steel:material('#64838d',.72,.33),
    dark:material('#233d49',.65,.38),teal:material('#257d87',.45,.3),blue:material('#18576e',.4,.4),
    bright:material('#c5d3d4',.82,.27),rubber:material('#17262c',.05,.7),yellow:material('#e6ac38',.3,.38),
    black:material('#172126',.2,.58),floor:material('#495e66',.65,.54),white:material('#edf2ee',.2,.5),
    green:material('#8ee8a0',.1,.3,{emissive:'#3bb97b',emissiveIntensity:.8}),
    amber:material('#ffd079',.1,.3,{emissive:'#e5a031',emissiveIntensity:.6}),
    screen:material('#102d39',.1,.3,{emissive:'#1c6473',emissiveIntensity:.4}),
    lamp:material('#e5ffff',.1,.25,{emissive:'#c8f5ff',emissiveIntensity:2.5}),
  };
  function group(name,parent=root){const g=new T.Group();g.name=name;parent.add(g);return g;}
  const structure=group('insulated-shell'),floor=group('grating-and-walkway'),equipment=group('drive-train'),services=group('services-and-safety');
  function mesh(geo,m,parent=root,name){const o=new T.Mesh(geo,m);if(name)o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(size,pos,m,parent=root,name){const o=mesh(new T.BoxGeometry(...size),m,parent,name);o.position.set(...pos);return o;}
  function cyl(r,len,pos,m,parent=root,r2=r,segments=40){const o=mesh(new T.CylinderGeometry(r2,r,len,segments),m,parent);o.rotation.x=Math.PI/2;o.position.set(...pos);return o;}
  function ring(r,t,pos,m,parent=root){const o=mesh(new T.TorusGeometry(r,t,8,48),m,parent);o.position.set(...pos);return o;}
  function tube(points,r,m,parent=root){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,Math.max(8,points.length*6),r,8,false),m,parent);}
  function pipe(a,b,r,m,parent=root){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const o=mesh(new T.CylinderGeometry(r,r,d.length(),10),m,parent);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  function roundedBox(size,pos,r,m,parent=root,name){
    const [w,h,d]=size,s=new T.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const geo=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r,bevelThickness:r,curveSegments:8});geo.translate(0,0,-d/2+r);
    const o=mesh(geo,m,parent,name);o.position.set(...pos);return o;
  }
  const boltQ=new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2,0,0));
  function bolt(pos,scale=.028,q=boltQ){boltMatrices.push(new T.Matrix4().compose(new T.Vector3(...pos),q,new T.Vector3(scale,.025,scale)));}
  function flange(x,y,z,r,parent){cyl(r,.09,[x,y,z],mat.dark,parent);ring(r*.82,.016,[x,y,z+.055],mat.bright,parent);for(let k=0;k<12;k++){const a=k*Math.PI/6;bolt([x+Math.sin(a)*r*.84,y+Math.cos(a)*r*.84,z+.063]);}}
  function nameplate(text,pos,width=.75,parent=root,orientation='front',sub=''){
    const plaque=box([width,.22,.018],pos,mat.dark,parent);
    if(orientation==='side')plaque.rotation.y=Math.PI/2;
    if(orientation==='side-back')plaque.rotation.y=-Math.PI/2;
    let canvas=null;
    if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#152a34';ctx.fillRect(0,0,768,192);ctx.fillStyle='#c5dce1';ctx.font='600 48px sans-serif';ctx.fillText(text,25,73);ctx.fillStyle='#80aeb9';ctx.font='26px monospace';ctx.fillText(sub||'SERVICE ACCESS  /  05',25,134);ctx.fillStyle='#e4b859';ctx.fillRect(25,158,140,5);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const plane=mesh(new T.PlaneGeometry(width*.96,.205),new T.MeshBasicMaterial({map:texture}),plaque);plane.position.z=.0105;}}
    return plaque;
  }
  function part(id,title){const g=group(id,equipment);g.userData={part:id,title,illustrative:true};machineParts[id]=g;return g;}

  // Interior sandwich panels, service seams, structural ribs and visible fasteners.
  box([4.6,.16,11.2],[0,-.12,0],mat.dark,floor,'structural-floor');
  for(const side of [-1,1]){
    for(let j=0;j<7;j++){
      box([.11,3.94,1.52],[side*2.3,2.08,-4.8+j*1.6],mat.lining,structure);
      box([.17,.11,1.48],[side*2.24,.34,-4.8+j*1.6],mat.steel,structure);
      box([.17,.075,1.48],[side*2.24,3.87,-4.8+j*1.6],mat.steel,structure);
    }
    for(let z=-5.6;z<=5.6;z+=1.6){
      box([.2,4.08,.075],[side*2.2,2.04,z],mat.white,structure);
      for(const y of [.22,1.1,2.1,3.1,3.85])bolt([side*2.09,y,z],.022,new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)));
    }
    box([.14,.16,11.2],[side*2.12,4.04,0],mat.dark,structure);
  }
  box([4.6,.1,11.2],[0,4.2,0],mat.lining,structure);
  for(const z of [-5.6,5.6]){box([4.6,4.2,.12],[0,2.1,z],mat.lining,structure);for(const x of [-1.1,1.1])box([.075,4.15,.1],[x,2.08,z+Math.sign(z)*-.09],mat.white,structure);}
  // The grating is instanced; dark recesses under every thin bar provide depth at eye level.
  for(let z=-5.45;z<5.5;z+=.055)for(const x of [-1.49,-.5,.5,1.49])gratingMatrices.push(new T.Matrix4().makeTranslation(x,.005,z));
  const bars=new T.InstancedMesh(new T.BoxGeometry(.94,.025,.017),mat.steel,gratingMatrices.length);gratingMatrices.forEach((m,i)=>bars.setMatrixAt(i,m));bars.name='instanced-floor-grating';bars.receiveShadow=true;floor.add(bars);
  for(let z=-5.5;z<5.6;z+=.65)box([4.2,.045,.045],[0,.025,z],mat.dark,floor);
  for(const x of [-2.02,-1.01,0,1.01,2.02])box([.035,.05,11],[x,.025,0],mat.dark,floor);
  for(const x of [.77,2.03])box([.045,.012,10.8],[x,.059,0],mat.yellow,floor);
  for(const z of [-4.9,4.9])for(let x=.85;x<1.98;x+=.16){const o=box([.08,.012,.35],[x,.06,z],mat.yellow,floor);o.rotation.y=-.5;}
  nameplate('KEEP WALKWAY CLEAR',[1.4,.073,-3.1],.95,floor,'front','PERSONNEL ACCESS');
  floor.children.at(-1).rotation.x=-Math.PI/2;

  // Two rolling crane rails, cross-bracing and an overhead motorized hoist trolley.
  for(const x of [-1.6,.46]){
    box([.15,.15,10.5],[x,3.88,0],mat.dark,services);
    box([.33,.045,10.5],[x,3.96,0],mat.yellow,services);
    box([.33,.045,10.5],[x,3.8,0],mat.steel,services);
  }
  for(let z=-4.8;z<5;z+=1.6){box([4.35,.13,.1],[0,3.98,z],mat.white,structure);pipe([-2.05,3.55,z],[-1.55,3.94,z],.04,mat.steel,structure);pipe([2.05,3.55,z],[1.55,3.94,z],.04,mat.steel,structure);}
  const hoist=group('maintenance-hoist',services);
  roundedBox([2.25,.22,.47],[-.57,3.64,1.3],.045,mat.yellow,hoist);
  roundedBox([.62,.42,.55],[-.57,3.35,1.3],.04,mat.dark,hoist);
  cyl(.18,.65,[-.57,3.4,1.3],mat.steel,hoist);
  for(const x of [-.61,-.53])pipe([x,3.15,1.3],[x,2.68,1.3],.012,mat.dark,hoist);
  const hook=mesh(new T.TorusGeometry(.12,.025,8,28,Math.PI*1.6),mat.yellow,hoist);hook.position.set(-.57,2.57,1.3);hook.rotation.z=.35;
  nameplate('SWL 1.0 t',[-.57,3.62,1.55],.6,hoist,'front','MAINTENANCE HOIST');

  // Main shaft: polished stepped steel, bearing pedestal, split housings and coupling flanges.
  const shaft=part('main-shaft','主轴与轴承');
  box([1.85,.24,2.75],[-.65,.25,3.65],mat.dark,shaft);
  for(const z of [2.7,4.4]){
    roundedBox([1.58,.58,.61],[-.65,.63,z],.06,mat.teal,shaft);
    cyl(.59,.63,[-.65,1.28,z],mat.teal,shaft);cyl(.43,.66,[-.65,1.28,z],mat.dark,shaft);cyl(.315,.69,[-.65,1.28,z],mat.bright,shaft);
    box([1.48,.065,.63],[-.65,1.24,z],mat.steel,shaft);
    for(const x of [-1.22,-.08])for(const zz of [z-.22,z+.22])bolt([x,.965,zz],.044,new T.Quaternion());
    flange(-.65,1.28,z+.36,.48,shaft);
  }
  cyl(.3,3.0,[-.65,1.28,3.78],mat.bright,shaft);cyl(.34,.13,[-.65,1.28,4.91],mat.steel,shaft);
  for(const z of [2.4,3.05,4.05,4.76])ring(.307,.018,[-.65,1.28,z],mat.dark,shaft);
  nameplate('MAIN SHAFT',[-.65,.65,4.76],1.05,shaft,'front','DOUBLE BEARING  /  LUBRICATED');

  // Gearbox cast casing: multiple gearbox stages, cast ribs, sump, oil level sight and service covers.
  const gearbox=part('gearbox','增速齿轮箱');
  box([1.92,.24,2.15],[-.65,.25,1.37],mat.dark,gearbox);
  roundedBox([1.7,1.45,1.82],[-.65,1.07,1.37],.12,mat.teal,gearbox,'cast-gearbox-housing');
  cyl(.66,.2,[-.65,1.28,2.37],mat.blue,gearbox);flange(-.65,1.28,2.49,.58,gearbox);
  for(const z of [.64,.88,1.12,1.36,1.6,1.84,2.08]){
    box([1.8,.075,.07],[-.65,.62,z],mat.blue,gearbox);box([1.8,.075,.07],[-.65,1.43,z],mat.blue,gearbox);
    for(const x of [-1.5,.2])box([.07,.81,.075],[x,1.02,z],mat.blue,gearbox);
  }
  box([1.7,.05,1.87],[-.65,1.82,1.37],mat.steel,gearbox);
  for(const x of [-1.34,.04])for(const z of [.62,1,1.75,2.12])bolt([x,1.86,z],.035,new T.Quaternion());
  roundedBox([.03,.45,.5],[.253,1.1,1.3],.025,mat.bright,gearbox);
  for(const z of [1.09,1.51])for(const y of [.91,1.29])bolt([.3,y,z],.022,new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)));
  const gauge=cyl(.105,.025,[.305,1.35,.79],mat.dark,gearbox);gauge.rotation.z=Math.PI/2;gauge.rotation.y=Math.PI/2;
  pipe([.27,.68,1.78],[.27,1.32,1.78],.035,mat.bright,gearbox);pipe([.31,.81,1.78],[.31,1.2,1.78],.018,mat.green,gearbox);
  nameplate('GEARBOX',[.28,1.5,1.38],.56,gearbox,'side','OIL SYSTEM  /  SERVICE 02');

  // High-speed elastic coupling and disc brake; exposed details have a perforated safety cage.
  const coupling=part('high-speed-coupling','高速联轴器与制动器');
  cyl(.13,1.04,[-.65,1.2,-.05],mat.bright,coupling);
  for(const z of [-.39,.25]){flange(-.65,1.2,z,.31,coupling);cyl(.265,.11,[-.65,1.2,z-.07],mat.rubber,coupling);}
  const brake=cyl(.43,.045,[-.65,1.2,-.25],mat.bright,coupling);moving.push(brake);
  roundedBox([.2,.25,.2],[-.28,1.43,-.25],.025,mat.yellow,coupling);
  for(const x of [-1.12,-.18])box([.045,.83,1.1],[x,.88,-.05],mat.yellow,coupling);
  for(let z=-.55;z<=.48;z+=.07){pipe([-1.12,.5,z],[-1.12,1.45,z],.009,mat.steel,coupling);pipe([-.18,.5,z],[-.18,1.45,z],.009,mat.steel,coupling);pipe([-1.12,1.45,z],[-.18,1.45,z],.009,mat.steel,coupling);}

  // Generator: stator jacket, 48 longitudinal cooling fins, bolted end bells and rear fan grille.
  const generator=part('generator','发电机');
  box([1.78,.22,2.45],[-.65,.24,-1.9],mat.dark,generator);
  for(const x of [-1.23,-.07])for(const z of [-2.68,-1.13])roundedBox([.34,.45,.42],[x,.55,z],.035,mat.blue,generator);
  cyl(.72,2.04,[-.65,1.2,-1.85],mat.blue,generator);
  for(let i=0;i<48;i++){const a=i*Math.PI/24,r=.755;const o=box([.065,.09,1.89],[-.65+Math.sin(a)*r,1.2+Math.cos(a)*r,-1.85],mat.steel,generator);o.rotation.z=-a;}
  for(const z of [-.8,-2.89]){cyl(.76,.13,[-.65,1.2,z],mat.teal,generator);flange(-.65,1.2,z+Math.sign(z+1.8)*.075,.69,generator);}
  cyl(.66,.17,[-.65,1.2,-3.05],mat.dark,generator);
  for(let i=0;i<7;i++)ring(.11+i*.075,.009,[-.65,1.2,-3.15],mat.steel,generator);
  for(let k=0;k<8;k++){const a=k*Math.PI/4;pipe([-.65,1.2,-3.16],[-.65+Math.sin(a)*.63,1.2+Math.cos(a)*.63,-3.16],.009,mat.steel,generator);}
  roundedBox([.51,.36,.58],[-.65,2.02,-1.6],.045,mat.teal,generator);
  tube([[-.4,2.12,-1.6],[.14,2.15,-1.6],[.27,1.8,-1.9],[.27,.4,-2.15]],.045,mat.black,generator);
  nameplate('GENERATOR',[.14,1.32,-1.9],.83,generator,'side','ELECTROMAGNETIC CONVERSION');

  // Auxiliary lubrication skid, pressure accumulator and silver hard lines.
  const auxiliaries=part('lubrication-skid','冷却与润滑系统');
  roundedBox([.71,.65,1.0],[-1.66,.47,-4.05],.045,mat.steel,auxiliaries);
  cyl(.19,.65,[-1.66,1.04,-4.05],mat.teal,auxiliaries);cyl(.19,.17,[-1.66,1.04,-3.61],mat.dark,auxiliaries);
  const accumulator=mesh(new T.CapsuleGeometry(.12,.58,6,16),mat.blue,auxiliaries);accumulator.position.set(-1.42,1.17,-4.45);
  tube([[-1.68,.87,-3.62],[-1.92,.95,-3.4],[-1.92,2.45,-3.4],[-1.92,2.45,1.37],[-1.55,1.7,1.37]],.025,mat.bright,auxiliaries);
  tube([[-1.85,.75,-4.2],[-2.03,.95,-4.2],[-2.03,2.6,-4.2],[-2.03,2.6,2.5],[-1.3,1.65,2.7]],.025,mat.bright,auxiliaries);
  for(const z of [-3.1,-1.7,-.3,1.1,2.5]){box([.16,.12,.09],[-1.98,2.53,z],mat.dark,auxiliaries);bolt([-1.88,2.56,z],.02,new T.Quaternion().setFromEuler(new T.Euler(0,0,Math.PI/2)));}
  nameplate('LUBRICATION',[-1.66,.56,-3.53],.58,auxiliaries,'front','PRESSURE  /  RETURN');

  // Electrical cabinet and door-mounted HMI stay on the far wall, preserving the aisle.
  const cabinet=part('electrical-cabinet','电控柜');
  roundedBox([1.12,2.15,.48],[-.52,1.16,-5.19],.035,mat.white,cabinet);
  for(const x of [-.8,-.24]){
    box([.53,1.97,.04],[x,1.2,-4.923],mat.lining,cabinet);
    box([.025,.29,.05],[x+.17,1.28,-4.88],mat.dark,cabinet);
    for(let j=0;j<9;j++)box([.35,.012,.014],[x,.44+j*.035,-4.89],mat.dark,cabinet);
  }
  box([.48,.39,.045],[-.77,1.72,-4.873],mat.dark,cabinet);
  box([.42,.31,.018],[-.77,1.73,-4.842],mat.screen,cabinet);
  // The readout is a miniature line diagram, deliberately without fabricated operating values.
  for(let j=0;j<4;j++)box([.27-.045*j,.008,.004],[-.79,1.82-j*.047,-4.829],mat.green,cabinet);
  for(const [x,m] of [[-.39,mat.green],[-.22,mat.amber]]){cyl(.035,.03,[x,1.7,-4.863],mat.dark,cabinet);cyl(.023,.037,[x,1.7,-4.85],m,cabinet);}
  cyl(.06,.04,[-.34,1.42,-4.855],mat.yellow,cabinet);cyl(.038,.063,[-.34,1.42,-4.83],material('#b94a3c'),cabinet);
  nameplate('CONTROL / 01',[-.52,2.18,-4.92],.74,cabinet,'front','ISOLATE BEFORE SERVICE');
  for(let k=0;k<6;k++)tube([[-.9+k*.14,2.25,-5.1],[-.9+k*.14,2.63,-5.1],[-1.4+k*.08,2.85,-4.8],[-1.8+k*.04,3.0,-4.4]],.016,mat.black,services);

  // Cable ladder tray, bundled cables, air ducting and ribbed flexible hoses.
  for(const x of [-1.98,-1.43])box([.035,.12,9.5],[x,3.13,0],mat.steel,services);
  for(let z=-4.7;z<4.9;z+=.25)box([.55,.024,.028],[-1.7,3.08,z],mat.bright,services);
  for(let k=0;k<5;k++)tube([[-1.92+k*.083,3.12,-4.75],[-1.92+k*.083,3.12,3.9],[-1.65,2.8,4.7]],.024,k===4?mat.yellow:mat.black,services);
  tube([[1.87,3.45,-5.12],[1.87,3.45,-2.2],[1.87,3.45,2.4],[1.87,3.0,4.7]],.15,mat.bright,services);
  for(let z=-4.6;z<4.4;z+=.55){const band=ring(.156,.012,[1.87,3.45,z],mat.dark,services);band.rotation.set(0,0,0);}
  for(const z of [-3,0,3]){box([.49,.2,.48],[1.87,3.24,z],mat.white,services);for(let j=0;j<7;j++)box([.035,.02,.43],[1.67+j*.063,3.127,z],mat.dark,services);}

  // Maintenance door, porthole and local safety equipment. Nothing extends into the walk bounds.
  roundedBox([.055,2.35,1.08],[2.207,1.33,-3.9],.025,mat.dark,services);
  roundedBox([.075,2.18,.94],[2.163,1.33,-3.9],.024,mat.white,services);
  box([.07,.27,.04],[2.1,1.2,-3.56],mat.steel,services);
  for(const z of [-4.3,-3.5])box([.08,.19,.065],[2.09,.58,z],mat.dark,services);
  const porthole=cyl(.23,.06,[2.095,1.86,-3.9],mat.dark,services);porthole.rotation.set(0,0,Math.PI/2);
  const glass=cyl(.195,.068,[2.085,1.86,-3.9],material('#2e7084',.4,.2),services);glass.rotation.set(0,0,Math.PI/2);
  nameplate('SERVICE DOOR',[2.1,2.24,-3.9],.62,services,'side-back','KEEP CLOSED');
  const extinguisher=group('fire-extinguisher',services);
  const red=material('#ad4735',.3,.35),tank=mesh(new T.CapsuleGeometry(.09,.34,6,16),red,extinguisher);tank.position.set(2.08,.9,-2.75);
  box([.17,.04,.09],[2.08,1.2,-2.75],mat.black,extinguisher);tube([[2.1,1.18,-2.75],[1.99,1.22,-2.75],[1.98,.85,-2.73]],.016,mat.black,extinguisher);
  box([.12,.17,.015],[2.08,.9,-2.65],mat.white,extinguisher);
  for(const x of [-1.8,1.8]){
    box([.48,.48,.045],[x,2.76,5.48],mat.dark,services);
    const fan=cyl(.2,.05,[x,2.76,5.43],mat.black,services);
    for(let k=0;k<6;k++){const a=k*Math.PI/3;const blade=box([.07,.18,.018],[x+Math.sin(a)*.09,2.76+Math.cos(a)*.09,5.393],mat.steel,services);blade.rotation.z=-a-.5;}
    for(let k=-5;k<=5;k++)box([.39,.008,.015],[x,2.76+k*.033,5.375],mat.dark,services);
  }
  // Linear sealed work lights illuminate actual interior geometry, including the walkway.
  for(const z of [-3.6,0,3.6]){
    box([.35,.09,1.25],[1.23,3.9,z],mat.dark,services);
    box([.22,.028,1.12],[1.23,3.845,z],mat.lamp,services);
    const light=new T.PointLight(0xd7efff,17,7,2);light.position.set(.65,3.5,z);root.add(light);lights.push(light);
  }
  const ambient=new T.HemisphereLight(0xd4eaf2,0x33434b,1.5);root.add(ambient);lights.push(ambient);
  const task=new T.PointLight(0xffe6bc,9,4.5,2);task.position.set(-.7,2.65,1.8);root.add(task);lights.push(task);

  // All threaded fasteners share one draw call. Instances remain individually finite and inspectable.
  const bolts=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,6),mat.bright,boltMatrices.length);
  boltMatrices.forEach((matrix,i)=>bolts.setMatrixAt(i,matrix));bolts.name='instanced-interior-fasteners';bolts.castShadow=true;bolts.receiveShadow=true;root.add(bolts);
  root.updateMatrixWorld(true);
  // Static details share material batches without flattening the semantic equipment groups.
  // This keeps the eye-level nuts, pipework and grating inexpensive to draw on laptops.
  function batchStatic(parent){
    const batches=new Map(),inverse=parent.matrixWorld.clone().invert(),remove=[];
    parent.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||moving.includes(o)||Array.isArray(o.material))return;
      const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
      geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
      if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geometry);remove.push(o);
    });
    for(const o of remove)o.parent?.remove(o);
    for(const [m,geometries] of batches){
      const total=geometries.reduce((n,g)=>n+g.getAttribute('position').count,0),combined=new T.BufferGeometry();
      for(const [name,size] of [['position',3],['normal',3],['uv',2]]){
        const values=new Float32Array(total*size);let offset=0;
        for(const g of geometries){const a=g.getAttribute(name);if(a)values.set(a.array,offset);offset+=g.getAttribute('position').count*size;}
        combined.setAttribute(name,new T.BufferAttribute(values,size));
      }
      const o=mesh(combined,m,parent,`material-batch-${parent.name}`);o.userData.batchedDetailCount=geometries.length;
      for(const g of geometries)g.dispose();
    }
  }
  for(const g of [structure,floor,services,...Object.values(machineParts)])batchStatic(g);
  root.updateMatrixWorld(true);
  const walkBounds={minX:.9,maxX:1.85,minZ:-4.65,maxZ:4.65,eyeHeight:1.65};
  const spawn={position:new T.Vector3(1.35,1.65,-4.3),target:new T.Vector3(.2,1.5,2)};
  const metadata={title:'机舱内部 · 交互式工程示意',disclaimer:'可漫游展示性设计；内部设备、布置与尺寸并非 NREL 实机 CAD。',units:'m',room:{width:4.6,height:4.2,length:11.2},machineParts:Object.keys(machineParts),boltCount:boltMatrices.length,gratingCount:gratingMatrices.length,walkway:'右侧独立检修通道',designType:'illustrative-interior'};
  root.userData={part:'nacelle-interior',illustrative:true,metadata};
  function animate(time=0,delta=0){if(!Number.isFinite(time)||!Number.isFinite(delta))return;for(const o of moving)o.rotateY(Math.min(.1,Math.max(0,delta))*.3);}
  return {root,lights,spawn,walkBounds,metadata,machineParts,animate};
}
