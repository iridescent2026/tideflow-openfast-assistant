import * as T from './vendor/three/three.module.js';

// Visual reconstruction; only the exported reference dimensions are authoritative.
export function buildModel(data){
  const root=new T.Group(),groups={},pickables=[];
  const material=(color,metalness=.25,roughness=.42)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const silver=material('#d8e5e9'),white=material('#f5fafb',.12),teal=material('#286e80',.35),dark=material('#294550',.45),gold=material('#e2ad4e',.35),chain=material('#8196a4',.65);
  for(const id of ['rotor','nacelle','tower','platform','bracing','mooring']){groups[id]=new T.Group();groups[id].userData.part=id;root.add(groups[id]);}
  function mesh(geometry,mat,group){const m=new T.Mesh(geometry,mat);group.add(m);pickables.push(m);return m;}
  const v=p=>new T.Vector3(p[0],p[2],-p[1]);
  function pipe(a,b,r,mat,g,top=r,segments=18){a=a.isVector3?a:new T.Vector3(...a);b=b.isVector3?b:new T.Vector3(...b);const d=b.clone().sub(a),m=mesh(new T.CylinderGeometry(top,r,d.length(),segments),mat,g);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
  function box(w,h,d,pos,mat,g){const m=mesh(new T.BoxGeometry(w,h,d),mat,g);m.position.set(...pos);return m;}
  function ring(x,y,z,r,t,mat,g){const m=mesh(new T.TorusGeometry(r,t,8,64),mat,g);m.rotation.x=Math.PI/2;m.position.set(x,y,z);return m;}
  // 25 hydrodynamic members, including all three base plates and diagonal braces.
  for(const [id,j1,j2,p1,p2] of data.members){
    const g=id>=8&&id<=22?groups.bracing:groups.platform;
    pipe(v(data.joints[j1]),v(data.joints[j2]),data.diameters[p1]/2,id<=4?silver:id<=7||id>=23?teal:silver,g,data.diameters[p2]/2,48);
  }
  const cols=[4,6,8].map(id=>v(data.joints[id]));
  for(const p of cols){
    // Deck, rim, fenders, railings, access hatch and seam bands are illustrative.
    pipe([p.x,12,p.z],[p.x,12.4,p.z],6.5,dark,groups.platform,6.5,64);
    for(const y of [-13.7,-7,0,6,11.8])ring(p.x,y,p.z,6.015,.045,dark,groups.platform);
    for(const y of [12.75,13.5])ring(p.x,y,p.z,6.15,.055,gold,groups.platform);
    for(let i=0;i<32;i++){const a=i*Math.PI/16,x=p.x+6.15*Math.cos(a),z=p.z+6.15*Math.sin(a);pipe([x,12.4,z],[x,13.55,z],.045,gold,groups.platform,.045,6);}
    const bolts=new T.InstancedMesh(new T.CylinderGeometry(.075,.075,.09,6),dark,48),matrix=new T.Matrix4();
    for(let i=0;i<48;i++){const a=i*Math.PI/24;matrix.makeTranslation(p.x+5.7*Math.cos(a),12.46,p.z+5.7*Math.sin(a));bolts.setMatrixAt(i,matrix);}groups.platform.add(bolts);pickables.push(bolts);
    box(1.3,.25,1.8,[p.x+2,12.65,p.z],silver,groups.platform);
    for(let i=0;i<8;i++)box(.6,.06,8,[p.x-2+i*.55,12.45,p.z],teal,groups.platform);
    // Radial maintenance walkway with handrails to the central column.
    const start=p.clone().setY(12.45),end=new T.Vector3(0,10.4,0),dir=end.clone().sub(start).normalize(),side=new T.Vector3(-dir.z,0,dir.x).multiplyScalar(.72);
    pipe(start,end,.44,dark,groups.bracing,.44,4);
    for(const sign of [-1,1]){
      const a=start.clone().addScaledVector(side,sign),b=end.clone().addScaledVector(side,sign);
      for(const height of [.6,1.15])pipe(a.clone().add(new T.Vector3(0,height,0)),b.clone().add(new T.Vector3(0,height,0)),.045,gold,groups.bracing,.045,6);
      for(let t=0;t<=1;t+=.1){const at=a.clone().lerp(b,t);pipe(at,at.clone().add(new T.Vector3(0,1.15,0)),.045,gold,groups.bracing,.045,6);}
    }
  }
  // Tapered tower and flange seams, ladder, and base access door.
  pipe([0,10,0],[0,data.turbine.TowerHt,0],3,white,groups.tower,1.935,64);
  for(const y of [10.3,28,47,66,86.8]){const r=3-(y-10)/77.6*1.065;ring(0,y,0,r+.03,.07,silver,groups.tower);}
  box(1.05,2.1,.18,[0,11.5,3],dark,groups.tower);
  for(const x of [-.24,.24])pipe([x,13,3.05],[x,28,2.82],.035,dark,groups.tower,.035,8);
  for(let y=13;y<28;y+=.4)pipe([-.24,y,3.06],[.24,y,3.06],.025,silver,groups.tower,.025,6);
  const hubHeight=data.turbine.TowerHt+data.turbine.Twr2Shft,hang=Math.abs(data.turbine.OverHang);
  // Rounded nacelle shell with segmented housing, roof access and cooling louvers.
  const nacelle=mesh(new T.CapsuleGeometry(1.7,6,8,24),white,groups.nacelle);nacelle.rotation.x=Math.PI/2;nacelle.position.set(0,hubHeight,-1.3);
  box(2.5,.12,2.3,[0,hubHeight+1.72,-1.7],teal,groups.nacelle);
  for(let i=0;i<9;i++)box(.07,.85,.15,[-1.61,hubHeight+.1,-3.3+i*.3],dark,groups.nacelle);
  pipe([0,hubHeight+1.9,-2.5],[0,hubHeight+3,-2.5],.05,silver,groups.nacelle,.05,8);
  pipe([-.55,hubHeight+2.8,-2.5],[.55,hubHeight+2.8,-2.5],.04,gold,groups.nacelle,.04,8);
  // Rotor axis faces +Z in the display coordinate system; shaft tilt is visualized.
  const rotor=new T.Group();rotor.position.set(0,hubHeight,hang);rotor.rotation.x=T.MathUtils.degToRad(-5);groups.rotor.add(rotor);
  const hub=mesh(new T.SphereGeometry(1.65,32,20),white,rotor);hub.scale.set(1,1,1.6);
  function bladeGeometry(){
    const stations=data.blade,positions=[],indices=[],n=32;
    for(let i=0;i<stations.length;i++){
      const s=stations[i],t=s.span/61.5,thick=t<.07?.5:t<.2?.35:.23-.15*t,tw=T.MathUtils.degToRad(s.twist);
      for(let j=0;j<n;j++){
        // Smooth symmetric airfoil approximation; chord and twist use AeroDyn stations.
        const a=2*Math.PI*j/n,u=(1-Math.cos(a))/2,yt=5*thick*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)*Math.sign(Math.sin(a));
        const x=(u-.3)*s.chord,z=yt*s.chord;
        positions.push(x*Math.cos(tw)-z*Math.sin(tw),s.span+data.turbine.HubRad,x*Math.sin(tw)+z*Math.cos(tw));
        if(i<stations.length-1){const a0=i*n+j,b0=i*n+(j+1)%n,c0=(i+1)*n+j,d0=(i+1)*n+(j+1)%n;indices.push(a0,c0,b0,b0,c0,d0);}
      }
    }
    // Close both ends to prevent open cross-sections at close range.
    for(const [base,flip] of [[0,true],[(stations.length-1)*n,false]])for(let j=1;j<n-1;j++)indices.push(base,base+(flip?j+1:j),base+(flip?j:j+1));
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.addGroup(0,(stations.length-3)*n*6,0);g.addGroup((stations.length-3)*n*6,indices.length-(stations.length-3)*n*6,1);return g;
  }
  const bladeGeo=bladeGeometry();
  for(let i=0;i<3;i++){const b=mesh(bladeGeo,[white,teal],rotor);b.rotation.z=i*2*Math.PI/3+.12;}
  // Anchor coordinates are full-scale. The curved line is illustrative, not a MoorDyn solution.
  const points=Object.fromEntries(data.mooringPoints.map(p=>[p.id,v(p.xyz)]));
  for(const line of data.mooringLines){
    const a=points[line.a],b=points[line.b],samples=[];
    for(let i=0;i<=100;i++){const t=i/100;const p=b.clone().lerp(a,t);p.y=-200+186*(Math.exp(-5*t)-Math.exp(-5))/(1-Math.exp(-5));samples.push(p);}
    const curve=new T.CatmullRomCurve3(samples);mesh(new T.TubeGeometry(curve,120,.14,7,false),chain,groups.mooring);
    // A slightly larger transparent pick tube improves pointer access at overview scale.
    const pick=mesh(new T.TubeGeometry(curve,100,1.1,5,false),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),groups.mooring);pick.userData.pickOnly=true;
    box(7,2.3,7,[a.x,-199,a.z],dark,groups.mooring);
    const fair=mesh(new T.SphereGeometry(.65,12,8),gold,groups.mooring);fair.position.copy(b);
  }
  const total=Object.values(groups).reduce((n,g)=>{g.traverse(o=>{if(o.isMesh)n++;});return n;},0);
  return {root,groups,pickables,rotor,meshCount:total};
}
