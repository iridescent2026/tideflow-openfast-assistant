import * as T from './vendor/three/three.module.js';

// Entirely procedural water and suspended sediment, with no backdrop image in immersive views.
export function createOceanEnvironment(){
  const root=new T.Group();root.name='ocean-environment';root.visible=false;
  const noiseGLSL=`
    float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*noise21(p);p=mat2(1.6,-1.2,1.2,1.6)*p+3.1;a*=.48;}return v;}`;
  // A real procedural sky around the scene, rather than a flat background colour.
  // Shader colours are linear; Three's output chunks apply the viewer's ACES and colour space once.
  const skyMaterial=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,uniforms:{time:{value:0}},
    vertexShader:`varying vec3 skyDirection;void main(){skyDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float time;varying vec3 skyDirection;${noiseGLSL}
      void main(){
        vec3 dir=normalize(skyDirection);float elevation=max(dir.y,0.);
        vec3 horizon=vec3(.36,.61,.79),zenith=vec3(.045,.25,.52);
        vec3 col=mix(horizon,zenith,pow(elevation,.48));
        float haze=exp(-elevation*19.);col=mix(col,vec3(.51,.72,.83),haze*.45);
        vec3 sunDirection=normalize(vec3(-.35,.68,.4));float sunDot=max(dot(dir,sunDirection),0.);
        float halo=pow(sunDot,28.)*.095+pow(sunDot,180.)*.12;
        float disc=smoothstep(.99958,.9999,sunDot);
        col+=vec3(1.,.89,.71)*(halo+disc*.9);
        vec2 cloudUV=dir.xz/(elevation+.25)*2.8+vec2(time*.002,time*.0008);
        float cloudNoise=fbm(cloudUV),detail=fbm(cloudUV*2.1-8.);
        float clouds=smoothstep(.58,.77,cloudNoise*.85+detail*.15)*smoothstep(.03,.19,elevation)*(1.-smoothstep(.5,.91,elevation));
        col=mix(col,vec3(.72,.84,.89),clouds*.5);
        col=mix(vec3(.085,.24,.34),col,smoothstep(-.075,.005,dir.y));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky=new T.Mesh(new T.SphereGeometry(2400,48,24),skyMaterial);sky.name='procedural-maritime-sky';sky.frustumCulled=false;sky.renderOrder=-10;root.add(sky);
  const waterMaterial=new T.ShaderMaterial({
    uniforms:{time:{value:0},underwater:{value:0}},side:T.DoubleSide,transparent:true,depthWrite:true,
    vertexShader:`uniform float time;varying vec3 world;
      void main(){vec3 p=position;float a=p.x*.025+time*.44,b=p.y*.035-time*.32,c=(p.x+p.y)*.019+time*.24;
      p.z=sin(a)*.43+sin(b)*.29+sin(c)*.35;
      vec4 w=modelMatrix*vec4(p,1.);world=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float time;uniform float underwater;varying vec3 world;${noiseGLSL}
      void main(){
        vec2 p=world.xz;vec3 view=normalize(cameraPosition-world);
        float a=p.x*.025+time*.44,b=-p.y*.035-time*.32,c=(p.x-p.y)*.019+time*.24;
        float warp=noise21(p*.12+vec2(time*.018,-time*.013));
        float ripple1=dot(p,vec2(1.51,.87))+time*1.43+warp*3.8,ripple2=dot(p,vec2(-.79,2.06))-time*1.21+warp*5.3;
        float detailFade=1.-smoothstep(100.,620.,distance(cameraPosition,world));
        float waveAA=1.-smoothstep(.5,2.5,max(fwidth(ripple1),fwidth(ripple2)));
        detailFade*=waveAA;
        vec2 slope=vec2(cos(a)*.01075+cos(c)*.00665,-cos(b)*.01015-cos(c)*.00665);
        slope+=vec2(cos(ripple1)*.11+cos(ripple2)*-.058,cos(ripple1)*.068+cos(ripple2)*.13)*detailFade;
        float chop=sin(p.x*2.12+sin(p.y*1.7)+time*.7)*sin(p.y*1.94-time*.8);
        slope+=vec2(chop,cos(p.x*1.87+time)*cos(p.y*1.79-time*.54))*.035*detailFade;
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        float facing=clamp(abs(dot(n,view)),0.,1.),fresnel=.035+.72*pow(1.-facing,3.4);
        float surfacePattern=fbm(p*.037+time*.011);
        // Saturated ocean radiance survives ACES at grazing deck viewpoints; the water
        // absorbs warm skylight rather than turning into an overexposed grey mirror.
        vec3 waterDeep=mix(vec3(.002,.047,.135),vec3(.004,.123,.195),surfacePattern);
        vec3 reflection=mix(vec3(.008,.12,.26),vec3(.023,.205,.415),pow(1.-facing,2.));
        vec3 col=mix(waterDeep,reflection,fresnel*.69);
        float facet=clamp((n.x*.36+n.z*.48)*2.1,-.3,.3)*detailFade;
        col*=1.+facet;
        vec3 sunDirection=normalize(vec3(-.35,.68,.4)),halfVector=normalize(sunDirection+view);
        float glitter=pow(max(dot(n,halfVector),0.),160.);
        col+=glitter*vec3(.48,.65,.68)*.42;
        float crest=sin(a)*.5+sin(b)*.32+sin(c)*.18;
        float breakNoise=fbm(p*.26+vec2(time*.12,-time*.09));
        float fine=sin(p.x*.84+sin(p.y*.43)+time*.7)*sin(p.y*.67-time*.53);
        float edge=max(fwidth(fine),.025);
        float flecks=smoothstep(.72-edge,.83+edge,fine);
        float foam=smoothstep(.58,.92,crest)*smoothstep(.47,.72,breakNoise)*flecks*detailFade;
        col=mix(col,vec3(.42,.67,.72),foam*.55);
        // Distant wavelets blend into the blue horizon instead of forming an aliasing grid.
        float distanceHaze=smoothstep(420.,1900.,distance(cameraPosition,world));
        col=mix(col,vec3(.018,.13,.28),distanceHaze*.3);
        float caustic=pow(1.-abs(sin(p.x*.33+sin(p.y*.25+time*.4))*sin(p.y*.29-time*.25)),9.);
        vec3 underColour=vec3(.025,.25,.32)+caustic*vec3(.04,.13,.14)+fresnel*vec3(.11,.23,.25);
        col=mix(col,underColour,underwater);
        gl_FragColor=vec4(col,mix(.985,.72,underwater));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const surface=new T.Mesh(new T.PlaneGeometry(4000,4000,160,160),waterMaterial);surface.rotation.x=-Math.PI/2;surface.renderOrder=1;surface.name='animated-ocean-surface';root.add(surface);
  const bottomMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform float time;varying vec3 world;void main(){float a=sin(world.x*.28+sin(world.z*.24+time*.22)*1.5);float b=sin(world.z*.31-sin(world.x*.22-time*.18)*1.4);float light=pow(1.-abs(a*b),10.);float grain=fract(sin(dot(world.xz,vec2(12.9898,78.233)))*43758.5453);gl_FragColor=vec4(vec3(.009,.033,.046)+light*vec3(.018,.1,.11)+grain*.01,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`});
  const seabed=new T.Mesh(new T.PlaneGeometry(2100,2100,1,1),bottomMaterial);seabed.rotation.x=-Math.PI/2;seabed.position.y=-200.4;root.add(seabed);
  const count=1000,positions=new Float32Array(count*3),sizes=new Float32Array(count);
  let seed=821;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){positions[i*3]=(random()-.5)*230;positions[i*3+1]=-random()*90;positions[i*3+2]=(random()-.5)*230;sizes[i]=1+random()*2;}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(positions,3));pg.setAttribute('size',new T.BufferAttribute(sizes,1));
  const particlesMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`uniform float time;attribute float size;varying float fade;void main(){vec3 p=position;p.y=-mod(-p.y-time*.18,90.);p.x+=sin(time*.12+p.z)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);fade=clamp(1.-length(mv.xyz)/110.,0.,1.);gl_PointSize=min(5.,size*40./max(2.,-mv.z));gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float fade;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.25,.56,.63,(1.-d*2.)*fade*.3);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const particles=new T.Points(pg,particlesMaterial);root.add(particles);
  const shafts=new T.Group();
  const shaftMaterial=new T.MeshBasicMaterial({color:0x74dce2,transparent:true,opacity:.018,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  for(let i=0;i<8;i++){const shaft=new T.Mesh(new T.ConeGeometry(5+i*.3,100,8,1,true),shaftMaterial);shaft.position.set(-70+i*22,-41,-35+(i%3)*30);shaft.rotation.z=-.22;shafts.add(shaft);}root.add(shafts);
  function update(time,isUnder){const elapsed=Number.isFinite(time)?time:0;waterMaterial.uniforms.time.value=elapsed;waterMaterial.uniforms.underwater.value=isUnder?1:0;skyMaterial.uniforms.time.value=elapsed;particlesMaterial.uniforms.time.value=elapsed;bottomMaterial.uniforms.time.value=elapsed;sky.visible=!isUnder;particles.visible=isUnder;shafts.visible=isUnder;}
  return {root,surface,update};
}
