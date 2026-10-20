import * as T from './vendor/three/three.module.js';

// The 25 primary HydroDyn members, AeroDyn blade stations and mooring endpoints
// retain the reference dimensions. Service equipment is a visual reconstruction.
export function buildModel(data){
  const root=new T.Group(),groups={},pickables=[],batches=new Map(),geometryCache=new Map();
  const material=(color,metalness=.25,roughness=.42)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const silver=material('#b6c7cd',.65,.3),white=material('#eaf0ee',.16,.32),panel=material('#d7e2e3',.24,.38),teal=material('#327484',.42,.36),dark=material('#263d47',.65,.38),gold=material('#f4c543',.2,.38),chain=material('#6d8791',.75,.4),rubber=material('#18282c',.08,.78),steel=material('#748e98',.8,.31);
  gold.emissive.set('#9a6a05');gold.emissiveIntensity=.08;
  const navigationLenses=['#eb5e51','#55cf9f','#eeb95c'].map(color=>{const m=material(color,.12,.23);m.emissive.set(color);m.emissiveIntensity=.75;return m;});
  const yAxis=new T.Vector3(0,1,0),zAxis=new T.Vector3(0,0,1),unitBox=new T.BoxGeometry(1,1,1),unitPipe=new T.CylinderGeometry(1,1,1,10),unitBolt=new T.CylinderGeometry(1,1,1,6);
  const materials={silver,white,panel,teal,dark,gold,chain,rubber,steel};
  for(const id of ['rotor','nacelle','tower','platform','bracing','mooring']){groups[id]=new T.Group();groups[id].userData.part=id;root.add(groups[id]);}
  const v=p=>new T.Vector3(p[0],p[2],-p[1]),vec=p=>p.isVector3?p.clone():new T.Vector3(...p);
  function mesh(geometry,mat,group){const m=new T.Mesh(geometry,mat);group.add(m);pickables.push(m);return m;}
  function pipe(a,b,r,mat,g,top=r,segments=32){a=vec(a);b=vec(b);const d=b.clone().sub(a),m=mesh(new T.CylinderGeometry(top,r,d.length(),segments),mat,g);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(yAxis,d.normalize());return m;}
  function box(w,h,d,pos,mat,g){const m=mesh(new T.BoxGeometry(w,h,d),mat,g);m.position.set(...pos);return m;}
  function ring(x,y,z,r,t,mat,g){const key=`${r}:${t}`;if(!geometryCache.has(key))geometryCache.set(key,new T.TorusGeometry(r,t,8,96));const m=mesh(geometryCache.get(key),mat,g);m.rotation.x=Math.PI/2;m.position.set(x,y,z);return m;}
  function instance(geo,mat,group,position,scale,quaternion=new T.Quaternion()){
    const key=`${geo.uuid}:${mat.uuid}:${group.uuid}`;
    if(!batches.has(key))batches.set(key,{geo,mat,group,matrices:[]});
    batches.get(key).matrices.push(new T.Matrix4().compose(vec(position),quaternion,new T.Vector3(...scale)));
  }
  function rod(a,b,r,mat,g){a=vec(a);b=vec(b);const d=b.clone().sub(a);instance(unitPipe,mat,g,a.add(b).multiplyScalar(.5),[r,d.length(),r],new T.Quaternion().setFromUnitVectors(yAxis,d.normalize()));}
  function detailBox(w,h,d,pos,mat,g,quaternion){instance(unitBox,mat,g,pos,[w,h,d],quaternion);}
  function bolt(pos,r,h,mat,g,quaternion){instance(unitBolt,mat,g,pos,[r,h,r],quaternion);}
  const inspectionAnchors={},platformWalkways=[],platformObstacles=[];

  // Keep these first, individually identifiable and at their exact reference size.
  for(const [id,j1,j2,p1,p2] of data.members){
    const g=id>=8&&id<=22?groups.bracing:groups.platform;
    const m=pipe(v(data.joints[j1]),v(data.joints[j2]),data.diameters[p1]/2,id<=4?silver:id<=7||id>=23?teal:silver,g,data.diameters[p2]/2,96);
    m.name=`HydroDyn member ${id}`;m.userData.referenceMember={id,j1,j2,p1,p2};
  }
  const cols=[4,6,8].map(id=>v(data.joints[id]));
  for(const [columnIndex,p] of cols.entries()){
    const outward=new T.Vector3(p.x,0,p.z).normalize(),inward=outward.clone().negate(),tangent=new T.Vector3(-outward.z,0,outward.x);
    const local=(x,y,z)=>new T.Vector3(p.x,y,p.z).addScaledVector(tangent,x).addScaledVector(outward,z);
    // Steel deck plate, true open-pattern grating and a three-level safety rail.
    pipe([p.x,12,p.z],[p.x,12.38,p.z],6.38,dark,groups.platform,6.38,96);
    pipe([p.x,12.38,p.z],[p.x,12.405,p.z],6.18,teal,groups.platform,6.18,96);
    for(let offset=-5.75;offset<=5.8;offset+=.3){
      const length=2*Math.sqrt(5.95**2-offset**2);
      detailBox(.035,.055,length,[p.x+offset,12.45,p.z],steel,groups.platform);
      detailBox(length,.035,.025,[p.x,12.45,p.z+offset],dark,groups.platform);
    }
    // Fabrication welds stay on the outside of the 12 m columns.
    for(const y of [-13.7,-10,-5,0,5,9.5,11.8])ring(p.x,y,p.z,6.013,.026,dark,groups.platform);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+.15;rod([p.x+6.017*Math.cos(a),-13.5,p.z+6.017*Math.sin(a)],[p.x+6.017*Math.cos(a),11.7,p.z+6.017*Math.sin(a)],.018,steel,groups.platform);}
    const gateAngle=Math.atan2(inward.z,inward.x),gateHalfAngle=.125;
    for(const y of [12.6,13.0,13.55]){
      const rail=mesh(new T.TorusGeometry(6.2,y===12.6?.035:.04,8,96,Math.PI*2-gateHalfAngle*2),gold,groups.platform);
      rail.rotation.set(Math.PI/2,0,gateAngle+gateHalfAngle);rail.position.set(p.x,y,p.z);
    }
    const railPost=a=>{const x=p.x+6.2*Math.cos(a),z=p.z+6.2*Math.sin(a);rod([x,12.4,z],[x,13.58,z],.042,gold,groups.platform);bolt([x,12.43,z],.105,.07,dark,groups.platform);};
    for(let i=0;i<36;i++){const a=i*Math.PI/18;if(Math.abs(Math.atan2(Math.sin(a-gateAngle),Math.cos(a-gateAngle)))>gateHalfAngle)railPost(a);}
    for(const sign of [-1,1])railPost(gateAngle+sign*gateHalfAngle);
    for(let i=0;i<72;i++){const a=i*Math.PI/36;bolt([p.x+5.9*Math.cos(a),12.46,p.z+5.9*Math.sin(a)],.047,.07,silver,groups.platform);}
    // Recessed access hatch, hinges, lifting handles, and service pipework.
    detailBox(1.55,.12,1.95,local(1.6,12.53,.2),dark,groups.platform);
    detailBox(1.42,.09,1.82,local(1.6,12.63,.2),silver,groups.platform);
    for(const x of [1.05,2.15]){rod(local(x,12.74,-.1),local(x,12.74,.25),.035,dark,groups.platform);for(const z of [-.65,.92])detailBox(.15,.1,.2,local(x,12.7,z),gold,groups.platform);}
    for(const x of [-1.7,-.9]){
      rod(local(x,12.5,1.2),local(x,13.05,1.2),.12,dark,groups.platform);
      rod(local(x-.2,13.0,1.2),local(x+.2,13.0,1.2),.09,silver,groups.platform);
    }
    const ladderQ=new T.Quaternion().setFromUnitVectors(zAxis,outward);
    // Weatherproof electrical / hydraulic service cabinet, anchored to the deck.
    const cabinet=local(-2.3,13.32,-1.55);
    platformObstacles.push({id:`cabinet-${columnIndex}`,type:'box',center:[cabinet.x,cabinet.z],halfSize:[.7,.51],axisX:[tangent.x,tangent.z],axisZ:[outward.x,outward.z],clearance:.23});
    detailBox(1.4,.14,1.02,local(-2.3,12.6,-1.55),dark,groups.platform,ladderQ);
    detailBox(1.22,1.48,.82,cabinet,panel,groups.platform,ladderQ);
    for(const x of [-2.575,-2.025])detailBox(.525,1.29,.035,local(x,13.32,-1.12),silver,groups.platform,ladderQ);
    detailBox(1.34,.08,.96,local(-2.3,14.1,-1.55),teal,groups.platform,ladderQ);
    for(const x of [-2.4,-2.2])rod(local(x,13.25,-1.075),local(x,13.52,-1.075),.022,dark,groups.platform);
    detailBox(.82,.33,.03,local(-2.3,12.98,-1.09),dark,groups.platform,ladderQ);
    for(let i=0;i<5;i++)detailBox(.75,.018,.045,local(-2.3,12.85+i*.061,-1.06),steel,groups.platform,ladderQ);
    for(const x of [-2.74,-1.86])for(const z of [-1.85,-1.25]){detailBox(.13,.18,.14,local(x,12.55,z),steel,groups.platform,ladderQ);bolt(local(x,12.7,z),.06,.09,gold,groups.platform);}
    // Cabinet hinges, warning stripe, cable glands and the protected deck conduit.
    for(const x of [-2.8,-1.8])for(const y of [12.85,13.8])detailBox(.07,.15,.08,local(x,y,-1.1),dark,groups.platform,ladderQ);
    for(const sign of [-1,1]){
      detailBox(.03,.47,.5,local(-2.3+sign*.63,13.32,-1.55),dark,groups.platform,ladderQ);
      for(let i=0;i<7;i++)detailBox(.045,.028,.45,local(-2.3+sign*.65,13.13+i*.062,-1.55),steel,groups.platform,ladderQ);
      const eye=ring(0,0,0,.073,.018,silver,groups.platform);eye.position.copy(local(-2.3+sign*.43,14.23,-1.55));eye.quaternion.copy(ladderQ);
    }
    detailBox(.24,.18,.02,local(-2.58,13.7,-1.075),gold,groups.platform,ladderQ);
    for(const x of [-2.6,-2.3,-2])rod(local(x,12.65,-1.55),local(x,12.47,-1.55),.055,rubber,groups.platform);
    rod(local(-2.6,12.48,-1.55),local(-2.6,12.48,-4.6),.045,dark,groups.platform);
    rod(local(-2.6,12.48,-4.6),local(-.9,12.48,-5.1),.045,dark,groups.platform);
    const hose=new T.CatmullRomCurve3([local(-1.95,12.72,-1.6),local(-1.72,12.54,-1.8),local(-1.7,12.5,-2.15),local(-2.0,12.49,-2.4)]);
    mesh(new T.TubeGeometry(hose,20,.043,8,false),rubber,groups.platform);
    // Ventilation risers stand clear of the hatch and circulation route.
    pipe(local(3.1,12.48,-1.2),local(3.1,13.25,-1.2),.2,teal,groups.platform,.2,32);
    pipe(local(3.1,13.23,-1.2),local(3.1,13.32,-1.2),.29,panel,groups.platform,.29,32);
    for(let i=-2;i<=2;i++)rod(local(3.1+i*.08,13.34,-1.4),local(3.1+i*.08,13.34,-1.0),.014,steel,groups.platform);
    rod(local(3.8,12.48,-.6),local(3.8,14.12,-.6),.085,silver,groups.platform);
    pipe(local(3.8,14.09,-.6),local(3.8,14.15,-.6),.14,dark,groups.platform,.14,20);
    for(const [x,z,radius,id] of [[3.1,-1.2,.3,'vent-short'],[3.8,-.6,.15,'vent-tall'],[1.1,5.35,.16,'beacon']]){const point=local(x,12.45,z);platformObstacles.push({id:`${id}-${columnIndex}`,type:'circle',center:[point.x,point.z],radius,clearance:.23});}
    // Compact steady navigation beacon: colored lens, shade, guard, and pedestal.
    const lamp=local(1.1,14.05,5.35);
    rod(local(1.1,12.5,5.35),lamp,.047,silver,groups.platform);
    bolt(local(1.1,12.56,5.35),.19,.11,gold,groups.platform);
    pipe(lamp.clone().add(new T.Vector3(0,-.11,0)),lamp.clone().add(new T.Vector3(0,.12,0)),.105,navigationLenses[columnIndex],groups.platform,.105,24);
    pipe(lamp.clone().add(new T.Vector3(0,.13,0)),lamp.clone().add(new T.Vector3(0,.17,0)),.16,dark,groups.platform,.16,24);
    ring(lamp.x,lamp.y-.13,lamp.z,.145,.025,dark,groups.platform);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(lamp.clone().add(new T.Vector3(.135*Math.cos(a),-.13,.135*Math.sin(a))),lamp.clone().add(new T.Vector3(.135*Math.cos(a),.15,.135*Math.sin(a))),.012,steel,groups.platform);}
    // Short external ladder and boat landing; sacrificial anodes below water.
    for(const x of [-.32,.32])rod(local(x,-1.5,6.27),local(x,13.48,6.27),.046,gold,groups.platform);
    for(let y=-1.35;y<13.45;y+=.3)rod(local(-.32,y,6.3),local(.32,y,6.3),.031,silver,groups.platform);
    for(const x of [-.32,.32])for(const y of [-1,2.2,5.5,8.8,11.9]){rod(local(x,y,5.98),local(x,y,6.29),.035,steel,groups.platform);detailBox(.13,.14,.055,local(x,y,6.02),dark,groups.platform,ladderQ);}
    // The ladder gate has its own hinges and a conspicuous horizontal latch.
    for(const y of [12.84,13.4])rod(local(-.34,y,6.27),local(.34,y,6.27),.032,gold,groups.platform);
    rod(local(.34,12.84,6.27),local(.34,13.4,6.27),.032,gold,groups.platform);
    for(const y of [12.85,13.38])bolt(local(-.34,y,6.27),.06,.08,dark,groups.platform);
    for(const x of [-.85,.85]){rod(local(x,-1.2,6.17),local(x,3.2,6.17),.15,rubber,groups.platform);for(const y of [-.9,1.0,2.9])rod(local(x,y,6.0),local(x,y,6.4),.07,silver,groups.platform);}
    for(let i=0;i<6;i++){const a=i*Math.PI/3;detailBox(.18,.9,.38,[p.x+6.04*Math.cos(a),-9.4,p.z+6.04*Math.sin(a)],silver,groups.platform,new T.Quaternion().setFromAxisAngle(yAxis,-a));}
    const landing=mesh(new T.BoxGeometry(1.5,.14,1.2),dark,groups.platform);landing.position.copy(local(0,.8,6.7));landing.quaternion.copy(ladderQ);
    // Radial, grating-floored maintenance bridge, clear of the column bodies.
    const start=p.clone().addScaledVector(inward,6.05).setY(12.46),end=outward.clone().multiplyScalar(3.85).setY(10.5),dir=end.clone().sub(start),length=dir.length(),side=new T.Vector3(-dir.z,0,dir.x).normalize(),forward=dir.clone().normalize(),across=side.clone().negate(),deckNormal=forward.clone().cross(across).normalize(),q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,deckNormal,forward)),middle=start.clone().add(end).multiplyScalar(.5);
    // Open galvanized grating: narrow longitudinal bearing bars and closely
    // spaced flat crossbars, supported by side stringers without a solid plate.
    for(const sign of [-1,1])detailBox(.065,.15,length,middle.clone().addScaledVector(side,sign*.705).addScaledVector(deckNormal,-.09),dark,groups.bracing,q);
    for(let i=0;i<=15;i++)detailBox(.014,.05,length,middle.clone().addScaledVector(side,-.66+i*1.32/15).addScaledVector(deckNormal,-.025),steel,groups.bracing,q);
    const crossbarCount=Math.ceil(length/.09);
    for(let i=0;i<=crossbarCount;i++)detailBox(1.36,.026,.012,start.clone().lerp(end,i/crossbarCount).addScaledVector(deckNormal,-.013),silver,groups.bracing,q);
    for(const sign of [-1,1]){
      const a=start.clone().addScaledVector(side,sign*.68),b=end.clone().addScaledVector(side,sign*.68);
      for(const height of [.55,1.1])rod(a.clone().add(new T.Vector3(0,height,0)),b.clone().add(new T.Vector3(0,height,0)),.038,gold,groups.bracing);
      for(let i=0;i<=12;i++){const at=a.clone().lerp(b,i/12);rod(at,at.clone().add(new T.Vector3(0,1.1,0)),.037,gold,groups.bracing);}
      rod(a.clone().add(new T.Vector3(0,.16,0)),b.clone().add(new T.Vector3(0,.16,0)),.04,teal,groups.bracing);
    }
    // Bridge-end splice plates, with two rows of substantial structural bolts.
    for(const at of [start,end]){
      detailBox(1.62,.075,.48,at.clone().add(new T.Vector3(0,.125,0)),silver,groups.bracing,q);
      for(const x of [-.58,-.29,0,.29,.58])for(const dz of [-.16,.16])bolt(at.clone().addScaledVector(side,x).addScaledVector(dir.clone().normalize(),dz).add(new T.Vector3(0,.19,0)),.056,.085,dark,groups.bracing);
    }
    // Raised cable tray follows the bridge, with evenly spaced support saddles.
    const cableStart=start.clone().addScaledVector(side,.53).add(new T.Vector3(0,.18,0)),cableEnd=end.clone().addScaledVector(side,.53).add(new T.Vector3(0,.18,0));
    for(const sign of [-1,1])rod(cableStart.clone().addScaledVector(side,sign*.09),cableEnd.clone().addScaledVector(side,sign*.09),.025,steel,groups.bracing);
    rod(cableStart,cableEnd,.04,rubber,groups.bracing);
    for(let i=0;i<=18;i++){const at=cableStart.clone().lerp(cableEnd,i/18);rod(at.clone().addScaledVector(side,-.12),at.clone().addScaledVector(side,.12),.018,gold,groups.bracing);}
    platformWalkways.push({start:start.toArray(),end:end.toArray(),width:1.36});
    if(columnIndex===2){const at=p.clone().addScaledVector(inward,1.5);inspectionAnchors.platform={position:[at.x,14.1,at.z],target:[0,13,0]};}
    // Base caisson welds, drain fittings and diagonal-brace socket plates.
    for(const y of [-19.88,-17,-14.1])ring(p.x,y,p.z,12.01,.045,steel,groups.platform);
    for(let i=0;i<24;i++){const a=i*Math.PI/12;bolt([p.x+11.7*Math.cos(a),-13.96,p.z+11.7*Math.sin(a)],.12,.14,silver,groups.platform);}
  }

  // A real annular landing joins the three bridges without walking through the
  // tower. Its top matches the common 10.5 m bridge endpoint used by navigation.
  const landingShape=new T.Shape();landingShape.absarc(0,0,4.1,0,Math.PI*2,false);
  const landingHole=new T.Path();landingHole.absarc(0,0,3.05,0,Math.PI*2,true);landingShape.holes.push(landingHole);
  const centralLanding=mesh(new T.ExtrudeGeometry(landingShape,{depth:.15,steps:1,bevelEnabled:false,curveSegments:64}),dark,groups.platform);centralLanding.rotation.x=-Math.PI/2;centralLanding.position.y=10.35;centralLanding.name='Central annular service landing';
  const bridgeAngles=cols.map(p=>Math.atan2(p.z,p.x)).sort((a,b)=>a-b),railRadius=4.03,gateHalf=.21;
  for(let i=0;i<bridgeAngles.length;i++){
    const from=bridgeAngles[i]+gateHalf,to=bridgeAngles[(i+1)%bridgeAngles.length]+(i===bridgeAngles.length-1?Math.PI*2:0)-gateHalf,arc=to-from;
    for(const y of [10.68,11.06,11.61]){const rail=mesh(new T.TorusGeometry(railRadius,.032,8,40,arc),gold,groups.platform);rail.rotation.set(Math.PI/2,0,from);rail.position.y=y;}
    const steps=Math.ceil(arc/.32);for(let j=0;j<=steps;j++){const angle=from+arc*j/steps,x=railRadius*Math.cos(angle),z=railRadius*Math.sin(angle);rod([x,10.5,z],[x,11.64,z],.032,gold,groups.platform);detailBox(.12,.05,.12,[x,10.52,z],steel,groups.platform);}
  }

  // Taper and foundation elevation match the ElastoDyn tower definition.
  const baseHeight=data.turbine.TowerBsHt??10,towerHeight=data.turbine.TowerHt;
  pipe([0,baseHeight,0],[0,towerHeight,0],3,white,groups.tower,1.935,128);
  const towerRadius=y=>3-(y-baseHeight)/(towerHeight-baseHeight)*1.065;
  for(const y of [10.3,28,47,66,87.3]){
    const r=towerRadius(y);pipe([0,y-.07,0],[0,y+.07,0],r+.12,silver,groups.tower,r+.12,96);
    for(let i=0;i<96;i++){const a=i*Math.PI/48;bolt([(r+.064)*Math.cos(a),y+.1,(r+.064)*Math.sin(a)],.04,.055,dark,groups.tower);}
  }
  for(let y=18;y<86;y+=9.4)ring(0,y,0,towerRadius(y)+.009,.015,panel,groups.tower);
  box(1.14,2.26,.13,[0,11.72,3],dark,groups.tower);box(.99,2.12,.16,[0,11.72,3.08],panel,groups.tower);
  rod([.35,11.6,3.18],[.35,11.9,3.18],.028,dark,groups.tower);
  for(const x of [-.47,.47])for(const y of [10.76,12.68])bolt([x,y,3.175],.037,.04,silver,groups.tower,new T.Quaternion().setFromUnitVectors(yAxis,zAxis));

  const hubHeight=towerHeight+data.turbine.Twr2Shft,shaftTilt=T.MathUtils.degToRad(data.turbine.ShftTilt),rotorHeight=hubHeight+Math.sin(shaftTilt)*data.turbine.OverHang,hang=Math.abs(data.turbine.OverHang)*Math.cos(shaftTilt);
  // A beveled rectangular composite enclosure replaces the capsule silhouette.
  function roundedRect(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
  const shell=mesh(new T.ExtrudeGeometry(roundedRect(3.76,3.5,.34),{depth:9.3,steps:1,bevelEnabled:true,bevelThickness:.35,bevelSize:.22,bevelSegments:5,curveSegments:12}),white,groups.nacelle);
  shell.position.set(0,hubHeight+.05,-6.15);shell.name='Composite nacelle enclosure';
  shell.userData.visualReconstruction=true;
  pipe([0,towerHeight+.02,0],[0,towerHeight+.28,0],1.99,steel,groups.nacelle,1.99,96);
  for(let i=0;i<72;i++){const a=i*Math.PI/36;bolt([1.88*Math.cos(a),towerHeight+.32,1.88*Math.sin(a)],.055,.07,dark,groups.nacelle);}
  const sideBoltQ=new T.Quaternion().setFromUnitVectors(yAxis,new T.Vector3(1,0,0));
  for(const sign of [-1,1]){
    detailBox(.035,.22,7.8,[sign*2.08,hubHeight-1.35,-1.3],teal,groups.nacelle);
    for(const z of [-3.75,-1.1,1.55]){
      detailBox(.025,2.36,2.45,[sign*2.106,hubHeight+.12,z],panel,groups.nacelle);
      for(const side of [-1,1])for(const dy of [-.99,.99])bolt([sign*2.135,hubHeight+.12+dy,z+side*1.04],.028,.035,steel,groups.nacelle,sideBoltQ);
      for(const dz of [-1.25,1.25])rod([sign*2.126,hubHeight-1.08,z+dz],[sign*2.126,hubHeight+1.3,z+dz],.012,dark,groups.nacelle);
    }
    // Dark recessed cooling grills with individual angled aluminum louvers.
    detailBox(.06,1.2,1.6,[sign*2.15,hubHeight+.05,-4.95],dark,groups.nacelle);
    for(let i=0;i<10;i++)detailBox(.075,.046,1.47,[sign*2.2,hubHeight-.47+i*.115,-4.95],steel,groups.nacelle);
  }
  const shaftY=z=>hubHeight-z*Math.tan(shaftTilt);
  const shaft=pipe([0,shaftY(3.22),3.22],[0,shaftY(hang-.45),hang-.45],.76,steel,groups.nacelle,.76,64);shaft.name='Low speed shaft exterior';
  const shaftRing=ring(0,shaftY(3.55),3.55,.79,.08,dark,groups.nacelle);shaftRing.rotation.x=shaftTilt;
  // Walkable roof surface, maintenance hatch, handrails and instrument mast.
  detailBox(2.75,.08,4.5,[0,hubHeight+2.06,-1.7],dark,groups.nacelle);
  for(let i=0;i<20;i++)detailBox(2.65,.035,.035,[0,hubHeight+2.12,-3.8+i*.22],steel,groups.nacelle);
  for(let i=0;i<12;i++)detailBox(.025,.025,4.35,[-1.2+i*.22,hubHeight+2.13,-1.7],steel,groups.nacelle);
  detailBox(1.12,.08,2.15,[0,hubHeight+2.18,-2.1],rubber,groups.nacelle);
  detailBox(1.05,.12,2.08,[0,hubHeight+2.23,-2.1],panel,groups.nacelle);
  for(const z of [-2.85,-1.35]){
    detailBox(.18,.075,.24,[-.55,hubHeight+2.29,z],steel,groups.nacelle);
    rod([-.61,hubHeight+2.29,z-.1],[-.61,hubHeight+2.29,z+.1],.029,dark,groups.nacelle);
    for(const x of [.28,.48])rod([x,hubHeight+2.3,z],[x,hubHeight+2.39,z],.021,dark,groups.nacelle);
    rod([.28,hubHeight+2.39,z],[.48,hubHeight+2.39,z],.021,dark,groups.nacelle);
  }
  for(const x of [-.46,.46])for(const z of [-3.03,-1.17])bolt([x,hubHeight+2.31,z],.024,.025,steel,groups.nacelle);
  for(const x of [-1.38,1.38]){
    for(const z of [-3.95,-1.7,.55])rod([x,hubHeight+2.08,z],[x,hubHeight+3.1,z],.034,gold,groups.nacelle);
    for(const z of [-3.95,-1.7,.55]){detailBox(.17,.045,.17,[x,hubHeight+2.13,z],steel,groups.nacelle);for(const dx of [-.055,.055])bolt([x+dx,hubHeight+2.17,z],.019,.026,dark,groups.nacelle);}
    for(const y of [2.4,2.74,3.1])rod([x,hubHeight+y,-3.95],[x,hubHeight+y,.55],.034,gold,groups.nacelle);
    detailBox(.036,.15,4.5,[x,hubHeight+2.21,-1.7],gold,groups.nacelle);
  }
  for(const y of [2.4,2.74,3.1])rod([-1.38,hubHeight+y,-3.95],[1.38,hubHeight+y,-3.95],.034,gold,groups.nacelle);
  detailBox(2.76,.15,.036,[0,hubHeight+2.21,-3.95],gold,groups.nacelle);
  // Rear service junction box, sealed glands and roof cable tray.
  detailBox(.46,.36,.26,[1.05,hubHeight+2.33,-3.45],dark,groups.nacelle);
  detailBox(.42,.32,.035,[1.05,hubHeight+2.33,-3.3],panel,groups.nacelle);
  for(const x of [.89,1.21])for(const y of [2.22,2.44])bolt([x,hubHeight+y,-3.275],.018,.025,steel,groups.nacelle,new T.Quaternion().setFromUnitVectors(yAxis,zAxis));
  for(const x of [.9,1.05,1.2])rod([x,hubHeight+2.17,-3.45],[x,hubHeight+2.09,-3.45],.028,rubber,groups.nacelle);
  for(const x of [.94,1.16])rod([x,hubHeight+2.17,-3.6],[x,hubHeight+2.17,-5.08],.018,silver,groups.nacelle);
  rod([1.05,hubHeight+2.16,-3.45],[1.05,hubHeight+2.16,-5.08],.028,rubber,groups.nacelle);
  rod([1.05,hubHeight+2.16,-5.08],[0,hubHeight+2.16,-5.08],.028,rubber,groups.nacelle);
  rod([0,hubHeight+1.98,-5.1],[0,hubHeight+3.5,-5.1],.045,steel,groups.nacelle);
  rod([-.7,hubHeight+3.47,-5.1],[.7,hubHeight+3.47,-5.1],.025,steel,groups.nacelle);
  rod([-.62,hubHeight+3.47,-5.1],[-.62,hubHeight+3.77,-5.1],.025,steel,groups.nacelle);
  const cups=new T.SphereGeometry(.095,16,10,0,Math.PI*2,0,Math.PI/2);
  const cupMaterial=dark.clone();cupMaterial.side=T.DoubleSide;
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3,at=new T.Vector3(-.62+.27*Math.cos(a),hubHeight+3.77,-5.1+.27*Math.sin(a));rod([-.62,hubHeight+3.77,-5.1],at,.014,dark,groups.nacelle);
    const cup=mesh(cups,cupMaterial,groups.nacelle);cup.position.copy(at);cup.quaternion.setFromUnitVectors(yAxis,new T.Vector3(-Math.sin(a),0,Math.cos(a)));cup.name='Anemometer cup';
  }
  // Separate weather vane: balanced arrow, thin tail fin, and rotating spindle.
  rod([.62,hubHeight+3.47,-5.1],[.62,hubHeight+3.79,-5.1],.022,steel,groups.nacelle);
  rod([.62,hubHeight+3.78,-5.47],[.62,hubHeight+3.78,-4.62],.014,dark,groups.nacelle);
  const vaneGeo=new T.BufferGeometry();vaneGeo.setAttribute('position',new T.Float32BufferAttribute([.62,hubHeight+3.78,-5.45,.62,hubHeight+3.98,-5.18,.62,hubHeight+3.6,-5.18],3));vaneGeo.setIndex([0,1,2]);vaneGeo.computeVertexNormals();
  const vaneMaterial=gold.clone();vaneMaterial.side=T.DoubleSide;
  const vane=mesh(vaneGeo,vaneMaterial,groups.nacelle);vane.name='Wind direction vane';
  rod([.62,hubHeight+3.78,-4.62],[.55,hubHeight+3.78,-4.77],.014,dark,groups.nacelle);
  rod([.62,hubHeight+3.78,-4.62],[.69,hubHeight+3.78,-4.77],.014,dark,groups.nacelle);
  // Compact red aircraft warning beacon on the aft corner, with armored wiring.
  pipe([-1.12,hubHeight+1.92,-4.85],[-1.12,hubHeight+2.34,-4.85],.06,steel,groups.nacelle,.06,20);
  const beacon=pipe([-1.12,hubHeight+2.34,-4.85],[-1.12,hubHeight+2.55,-4.85],.09,navigationLenses[0],groups.nacelle,.09,24);beacon.name='Red nacelle obstruction beacon';
  pipe([-1.12,hubHeight+2.55,-4.85],[-1.12,hubHeight+2.58,-4.85],.12,dark,groups.nacelle,.12,20);
  rod([-1.12,hubHeight+2.06,-4.85],[-1.12,hubHeight+2.06,-5.08],.022,rubber,groups.nacelle);
  rod([-1.12,hubHeight+2.06,-5.08],[1.05,hubHeight+2.06,-5.08],.022,rubber,groups.nacelle);
  rod([-1.6,hubHeight+1.8,-5.7],[-1.6,hubHeight+3.7,-5.7],.02,silver,groups.nacelle);
  inspectionAnchors.nacelle={position:[1.15,hubHeight-.55,-4.65],target:[0,hubHeight-.3,1.5]};
  inspectionAnchors.nacelleExterior={position:[10,hubHeight+5,15],target:[0,hubHeight,-1]};

  // Rotor axis faces +Z; shaft tilt and 63 m tip radius use the source values.
  const rotor=new T.Group();rotor.position.set(0,rotorHeight,hang);rotor.rotation.x=shaftTilt;groups.rotor.add(rotor);
  const spinnerControlPoints=[[0,-1.0],[1.12,-.93],[1.5,-.45],[1.59,.25],[1.47,1.0],[1.14,1.7],[.6,2.2],[0,2.42]].map(([x,y])=>new T.Vector2(x,y));
  const spinnerProfile=new T.SplineCurve(spinnerControlPoints).getPoints(48).map(p=>new T.Vector2(Math.max(0,p.x),p.y));
  const hub=mesh(new T.LatheGeometry(spinnerProfile,96),white,rotor);hub.rotation.x=Math.PI/2;hub.name='Rotor spinner';
  // Monotone cubic interpolation preserves every measured chord/twist station.
  function interpolate(xs,ys,x){
    let i=0;while(i<xs.length-2&&x>xs[i+1])i++;
    const slope=k=>(ys[k+1]-ys[k])/(xs[k+1]-xs[k]);
    const tangent=k=>{if(k===0)return slope(0);if(k===xs.length-1)return slope(k-1);const a=slope(k-1),b=slope(k);return a*b<=0?0:2*a*b/(a+b);};
    const h=xs[i+1]-xs[i],t=T.MathUtils.clamp((x-xs[i])/h,0,1),t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*tangent(i)+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*tangent(i+1);
  }
  function bladeGeometry(){
    const stations=data.blade,spans=stations.map(s=>s.span),chords=stations.map(s=>s.chord),twists=stations.map(s=>s.twist),positions=[],indices=[],sections=[],n=64;
    for(let i=0;i<stations.length-1;i++)for(let j=0;j<8;j++)sections.push(T.MathUtils.lerp(spans[i],spans[i+1],j/8));sections.push(spans.at(-1));
    let tipStart=0;
    for(let i=0;i<sections.length;i++){
      const span=sections[i],chord=interpolate(spans,chords,span),tw=T.MathUtils.degToRad(interpolate(spans,twists,span)),blend=T.MathUtils.smoothstep(span,1.4,9.0),ratio=interpolate([0,1.3667,4.1,6.8333,10.25,14.35,22.55,61.4999],[1,1,.78,.5,.4,.35,.25,.18],span);
      if(span<59.4)tipStart=(i+1)*n*6;
      for(let j=0;j<n;j++){
        const a=Math.PI*2*j/n,u=(1-Math.cos(a))/2;
        const yt=5*ratio*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)*Math.sign(Math.sin(a));
        const camber=.025*Math.sin(Math.PI*u),x=T.MathUtils.lerp((u-.5)*chord,(u-.25)*chord,blend),z=T.MathUtils.lerp(Math.sin(a)*chord/2,(yt+camber)*chord,blend);
        positions.push(x*Math.cos(tw)-z*Math.sin(tw),span+data.turbine.HubRad,x*Math.sin(tw)+z*Math.cos(tw));
        if(i<sections.length-1){const a0=i*n+j,b0=i*n+(j+1)%n,c0=(i+1)*n+j,d0=(i+1)*n+(j+1)%n;indices.push(a0,b0,c0,b0,d0,c0);}
      }
    }
    const sideCount=indices.length;
    for(const [base,flip] of [[0,true],[(sections.length-1)*n,false]])for(let j=1;j<n-1;j++)indices.push(base,base+(flip?j+1:j),base+(flip?j:j+1));
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.addGroup(0,Math.min(tipStart,sideCount),0);g.addGroup(Math.min(tipStart,sideCount),sideCount-Math.min(tipStart,sideCount),1);g.addGroup(sideCount,indices.length-sideCount,0);
    g.userData={referenceStations:stations.map(s=>({...s})),radialSections:sections.length,sectionVertices:n,tipRadius:data.turbine.TipRad};return g;
  }
  const bladeGeo=bladeGeometry();
  for(let i=0;i<3;i++){
    const assembly=new T.Group();assembly.rotation.z=i*Math.PI*2/3+.12;rotor.add(assembly);
    const b=mesh(bladeGeo,[white,teal],assembly);b.name=`AeroDyn blade ${i+1}`;b.userData.aerodynamicBlade=true;
    pipe([0,1.46,0],[0,1.68,0],1.81,silver,assembly,1.81,96);
    for(let j=0;j<60;j++){const a=j*Math.PI/30;bolt([1.68*Math.cos(a),1.72,1.68*Math.sin(a)],.047,.065,dark,assembly);}
  }

  // Full-scale anchor endpoints, with an illustrative smooth catenary profile.
  const points=Object.fromEntries(data.mooringPoints.map(p=>[p.id,v(p.xyz)]));
  for(const line of data.mooringLines){
    const a=points[line.a],b=points[line.b],samples=[];
    for(let i=0;i<=100;i++){const t=i/100,p=b.clone().lerp(a,t);p.y=-200+186*(Math.exp(-5*t)-Math.exp(-5))/(1-Math.exp(-5));samples.push(p);}
    const curve=new T.CatmullRomCurve3(samples);mesh(new T.TubeGeometry(curve,160,.14,8,false),chain,groups.mooring);
    const pick=mesh(new T.TubeGeometry(curve,100,1.1,5,false),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),groups.mooring);pick.userData.pickOnly=true;
    box(7,2.3,7,[a.x,-199,a.z],dark,groups.mooring);
    const fair=mesh(new T.SphereGeometry(.65,20,12),gold,groups.mooring);fair.position.copy(b);
    const shackle=ring(b.x,b.y,b.z,.68,.12,steel,groups.mooring);shackle.rotation.x=0;
  }
  inspectionAnchors.submerged={position:[27,-9,39],target:[0,-12,0]};
  let instanceCount=0;
  for(const {geo,mat,group,matrices} of batches.values()){
    const m=new T.InstancedMesh(geo,mat,matrices.length);matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();m.name='Instanced service details';group.add(m);pickables.push(m);instanceCount+=matrices.length;
  }
  let meshCount=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
  root.userData={referenceMemberCount:25,referenceBladeStations:data.blade.length,instanceCount,meshCount,triangles:Math.round(triangles),dimensionsInMetres:true,detailLevel:'reference-scale service reconstruction',materials:Object.keys(materials)};
  return {root,groups,pickables,rotor,meshCount,inspectionAnchors,platformWalkways,platformObstacles};
}
