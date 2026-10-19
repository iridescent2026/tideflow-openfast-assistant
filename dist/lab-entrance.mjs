// Layered entrance assembly; every door leaf remains independently animated.
export function buildLabEntrance(THREE,scene,{box,tube,material,silver,cyan}){
 const pearl=new THREE.MeshPhysicalMaterial({color:'#cbd9e9',metalness:.78,roughness:.16,clearcoat:1,clearcoatRoughness:.09});
 const chrome=new THREE.MeshPhysicalMaterial({color:'#e9e1cc',metalness:1,roughness:.12,clearcoat:1});
 const gasket=material('#142633',.3,.5),ink=material('#102d46',.35,.28);
 const tinted=new THREE.MeshPhysicalMaterial({color:'#164360',metalness:.36,roughness:.08,transparent:true,opacity:.44,clearcoat:1,side:THREE.DoubleSide});
 const warm=new THREE.MeshStandardMaterial({color:'#ecf9ff',emissive:'#cfecff',emissiveIntensity:2,metalness:.4,roughness:.18});
 const bridge=new THREE.MeshPhysicalMaterial({color:'#89a6c1',metalness:.88,roughness:.105,clearcoat:1,clearcoatRoughness:.08});
 box(3.5,.22,8.4,pearl,0,-.13,10.2);box(3.2,.035,8.4,bridge,0,.006,10.2);
 for(let row=0;row<12;row++)box(3.13,.009,.012,gasket,0,.028,6.15+row*.7);
 for(const x of [-.52,.52])box(.009,.009,8.3,gasket,x,.028,10.2);
 for(const sign of [-1,1]){
  box(.14,.09,8.35,chrome,sign*1.63,.035,10.2);box(.025,.011,8.15,warm,sign*1.48,.064,10.2);
  tube([[sign*1.76,.2,6.55],[sign*1.76,.86,6.75],[sign*1.76,.86,14.3]],.035,silver);
  tube([[sign*1.76,.86,6.75],[sign*1.76,.86,14.3]],.009,warm);
 }
 // Broad, sculpted silver crescents flank a recessed oval glass aperture.
 const wing=new THREE.Shape();wing.moveTo(.94,.06);wing.bezierCurveTo(1.65,.58,2.04,1.17,2.02,2.02);wing.bezierCurveTo(2,2.87,1.65,3.56,.95,4.04);wing.lineTo(2.35,3.7);wing.bezierCurveTo(3.2,3.16,3.55,2.12,3.36,1.3);wing.bezierCurveTo(3.19,.65,2.81,.18,2.4,.03);wing.closePath();
 for(const sign of [-1,1]){
  const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(wing,{depth:.3,steps:1,bevelEnabled:true,bevelSize:.055,bevelThickness:.06,bevelSegments:4,curveSegments:36}),pearl);shell.scale.x=sign;shell.position.z=6.27;scene.add(shell);
  for(const depth of [6.53,6.62])tube([[sign*.94,.08,depth],[sign*1.62,.66,depth],[sign*1.94,1.6,depth],[sign*1.87,2.62,depth],[sign*1.47,3.49,depth],[sign*.93,4.01,depth]],depth===6.53?.067:.025,depth===6.53?gasket:chrome);
  tube([[sign*2.4,.1,6.62],[sign*3.16,.82,6.59],[sign*3.43,1.75,6.52],[sign*3.04,2.91,6.44],[sign*2.35,3.69,6.36]],.024,silver);
  const glassShape=new THREE.Shape();glassShape.moveTo(sign*1.1,.18);glassShape.lineTo(sign*1.1,3.88);glassShape.bezierCurveTo(sign*1.82,3.31,sign*2.1,2.41,sign*1.96,1.46);glassShape.bezierCurveTo(sign*1.88,.83,sign*1.54,.36,sign*1.1,.18);
  const pane=new THREE.Mesh(new THREE.ShapeGeometry(glassShape,40),tinted);pane.position.z=6.37;scene.add(pane);
  for(let i=0;i<6;i++){const a=(i/5)*2.4-.3,x=sign*(1.12+Math.sin(a)*.7),y=.31+i*.68;const fastener=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.018,12),chrome);fastener.rotation.x=Math.PI/2;fastener.position.set(x,y,6.65);scene.add(fastener);}
 }
 tube([[-6.4,3.05,4.95],[-3.6,3.7,6.02],[0,4.27,6.25],[3.6,3.7,6.02],[6.4,3.05,4.95]],.21,pearl);
 tube([[-6.4,2.85,5.06],[-3.6,3.5,6.16],[0,4.07,6.4],[3.6,3.5,6.16],[6.4,2.85,5.06]],.036,chrome);
 box(2.22,.14,.42,ink,0,3.89,6.44);box(2.05,.018,.26,warm,0,3.806,6.43);
 box(2.18,.095,.57,silver,0,.065,6.36);box(1.99,.018,.34,bridge,0,.123,6.36);
 for(const sign of [-1,1]){box(.09,3.75,.17,chrome,sign*1.1,1.94,6.53);box(.023,3.66,.04,warm,sign*1.055,1.94,6.635);}
 // Sliding rectangular central leaves retract into the opaque side fairings.
 const leaves=[];for(const sign of [-1,1]){
  const leaf=new THREE.Group();leaf.position.set(sign*.548,1.94,6.48);
  box(1.09,3.68,.075,tinted,0,0,0,leaf);
  box(.027,3.72,.105,chrome,-sign*.535,0,.03,leaf);box(.027,3.72,.105,chrome,sign*.535,0,.03,leaf);
  box(1.1,.035,.1,silver,0,1.825,.02,leaf);box(1.1,.035,.1,silver,0,-1.825,.02,leaf);
  const handleX=-sign*.37;tube([[handleX,-.53,.1],[handleX,-.47,.21],[handleX,.23,.21],[handleX,.29,.1]],.022,chrome,leaf);
  box(.014,3.59,.014,material('#9edff1',.35,.2),-sign*.5,0,.075,leaf);
  scene.add(leaf);leaves.push({leaf,sign,closedX:.548,travel:1.19});
 }
 // Capacitive entry panel with a separate bezel and small cyan status dots.
 box(.16,.65,.05,ink,-2.69,2.02,6.66);box(.09,.5,.015,material('#125779',.5,.16),-2.69,2.02,6.695);
 for(let i=0;i<5;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.013,8,6),cyan);dot.position.set(-2.69,1.84+i*.085,6.71);scene.add(dot);}
 // Native vector paths and text share a single decal, avoiding SVG decode differences.
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,512);
 ctx.save();ctx.translate(94,24);ctx.scale(2.7,2.7);const gradient=ctx.createLinearGradient(0,0,120,76);gradient.addColorStop(0,'#0877d0');gradient.addColorStop(1,'#06c5d8');ctx.fillStyle=gradient;
 ctx.fill(new Path2D('M5 45C31 13 47 0 66 9C84 17 99 36 117 22C102 47 89 48 69 36C47 22 33 24 5 45Z'));ctx.fillStyle='#079dbe';ctx.fill(new Path2D('M0 62C23 40 39 29 54 32V72C36 69 27 44 0 62ZM63 37C82 53 99 53 113 42C98 65 82 77 63 75Z'));ctx.restore();
 ctx.textAlign='center';ctx.fillStyle='#102e49';ctx.font='700 96px "Microsoft YaHei",sans-serif';ctx.fillText('潮汐',256,348);ctx.font='600 32px "Segoe UI",sans-serif';ctx.fillText('T I D E F L O W',256,409);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const text=new THREE.Mesh(new THREE.PlaneGeometry(.97,.97),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));text.position.set(2.6,2.69,6.75);scene.add(text);
 return leaves;
}
