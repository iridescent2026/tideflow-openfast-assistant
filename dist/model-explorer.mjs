const page=document.getElementById('page-model');
const components={
  rotor:{name:'叶轮',en:'ROTOR ASSEMBLY',description:'三片变弦长、变扭角叶片连接轮毂，将风的作用转化为转子转矩。点击叶片或轮毂可聚焦整个叶轮。',specs:[['叶轮直径','126 m'],['叶片数量','3 片'],['几何依据','19 个 AeroDyn 叶片截面站位']],detail:'叶片弦长与扭角按参考文件重建；截面采用平滑翼型近似，叶尖以青蓝色区分。外形不用于叶片制造或气动计算。',watch:'RotSpeed 转子转速 / GenPwr 发电功率',anchor:[-20,115,6],source:'aero'},
  nacelle:{name:'机舱',en:'NACELLE & DRIVETRAIN',description:'机舱位于塔顶，容纳主轴、传动链、发电机及偏航设备。进入内部，以第一视角沿检修通道查看设备布置。',specs:[['参考机组','NREL 5 MW'],['塔顶标高','87.6 m / 静水面以上'],['轮毂连接','上风向三叶片转子']],detail:'外壳、检修盖与散热格栅补充结构细节；内部设备与通道按传动链关系进行展示性建模，用于空间探索。',watch:'GenPwr 发电功率 / RotSpeed 转子转速',anchor:[0,90,0],source:'elasto'},
  tower:{name:'塔筒',en:'TAPERED TOWER',description:'渐缩钢塔筒连接机舱与浮式基础，传递风轮、机舱的载荷，并参与耦合结构振动。',specs:[['塔底标高','10 m'],['塔顶标高','87.6 m'],['显示细节','分段法兰 / 入口 / 检修梯']],detail:'塔筒采用渐缩圆筒，并补充法兰接缝与检修入口。局部连接细节为展示性重建，实际结构参数以 ElastoDyn 输入为准。',watch:'TwrBsMyt 塔底弯矩',anchor:[0,52,0],source:'elasto'},
  platform:{name:'浮式平台',en:'SEMI-SUBMERSIBLE PLATFORM',description:'由中心立柱、三根外围立柱及其下部浮筒组成，基于 OC4-DeepCwind 参考模型，用于提供平台的浮力、刚度与运动特性。',specs:[['中心立柱直径','6.5 m'],['外围立柱直径','12 m'],['底柱直径','24 m']],detail:'立柱位置、直径与端点直接取自 HydroDyn。近景可查看甲板环、立柱分段、栏杆、螺栓与检修盖；这些小型附件是视觉补充。',watch:'PtfmPitch 纵摇 / PtfmSurge 纵荡',anchor:[14,8,-25],source:'hydro'},
  bracing:{name:'支撑',en:'PONTOONS & BRACES',description:'上、下层水平撑杆与斜撑将立柱连接起来，构成平台的空间骨架。放大后可以从不同方向查看构件连接关系。',specs:[['参考管件直径','1.6 m'],['平台构件总数','25 个 HydroDyn 构件'],['检修通行','径向走道与安全扶手（示意）']],detail:'圆管端点与截面按官方节点、构件表重建。检修走道、黄色扶手用于增强空间识别，不构成新增仿真构件。',watch:'平台运动与载荷通过耦合模型共同求解',anchor:[8,-5,12],source:'hydro'},
  mooring:{name:'系泊',en:'CATENARY MOORING',description:'三根系泊线从平台导缆点延伸到海床锚点，为平台提供恢复作用。近景看连接，全貌看整个锚泊范围。',specs:[['参考水深','200 m'],['锚点水平半径','约 837.6 m'],['单线未伸长长度','835.35 m']],detail:'导缆点与锚点位置来自 MoorDyn。当前弧线仅说明连接方向，不是静力平衡形状或求解后的线形；全貌按坐标比例展示，平台会显得较小。',watch:'本项目关注 PtfmSurge / PtfmPitch；此视图不显示线张力',anchor:[20,-24,-35],source:'moor'}
};
const sourceBase='https://github.com/OpenFAST/r-test/blob/dd5feaaaa500ba7283140107806300d551cff0a7/glue-codes/openfast/';
const sourcePaths={aero:'5MW_Baseline/NRELOffshrBsline5MW_AeroDyn_blade.dat',elasto:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_ElastoDyn.dat',hydro:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_HydroDyn.dat',moor:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_MoorDyn.dat'};
const entries=Object.entries(components);
const svg=(path,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const icons={
  enter:svg('<path d="M13 4h6v16h-6M3 12h12m-4-4 4 4-4 4"/>'),
  deck:svg('<path d="m3 10 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 10v5m18-5v5m-9 0v5"/>'),
  water:svg('<path d="M2 9c3-4 5 4 8 0s5 4 8 0 3 0 4 0M2 15c3-4 5 4 8 0s5 4 8 0 3 0 4 0"/>'),
  eye:svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  pause:svg('<path d="M8 5v14M16 5v14"/>'),
  play:svg('<path d="m8 4 12 8-12 8V4Z"/>'),
  back:svg('<path d="M20 12H4m6-6-6 6 6 6"/>'),
  close:svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  arrow:svg('<path d="m7 14 5-5 5 5"/>')
};
const experiences={nacelle:{title:'机舱内部',en:'NACELLE INTERIOR',subtitle:'沿检修通道观察传动系统',icon:icons.enter},deck:{title:'甲板漫游',en:'DECK WALK',subtitle:'近距离探索平台与检修设施',icon:icons.deck},underwater:{title:'水下巡游',en:'UNDERWATER',subtitle:'穿过水面，观察浮筒与支撑',icon:icons.water}};
const actionFor=id=>id==='nacelle'?['nacelle','进入机舱',icons.enter]:['platform','tower'].includes(id)?['deck','踏上甲板',icons.deck]:['bracing','mooring'].includes(id)?['underwater','潜入水下',icons.water]:null;
const pageHeading=page.querySelector('.page-heading');
pageHeading.classList.add('model-page-heading');
pageHeading.querySelector('.kicker').textContent='模型结构';
pageHeading.querySelector('h1').textContent='OC4 / NREL 5 MW';
pageHeading.querySelector('p').textContent='交互式结构探索';
page.querySelector('.model-explorer').outerHTML=`<div class="model-explorer"><div class="model-stage" id="model-stage" data-experience="overview"><div class="stage-top"><span class="live-3d" id="model-render-status">加载中</span></div><div class="model-labels" id="model-labels">${entries.map(([id,c])=>`<button type="button" class="model-point" data-explore="${id}" aria-label="查看${c.name}" aria-controls="part-hotspot-popover" aria-expanded="false"><span aria-hidden="true"></span></button>`).join('')}</div><section id="part-hotspot-popover" class="part-hotspot-popover" role="dialog" aria-label="部件详情" hidden><button type="button" class="hotspot-close" data-popover-close aria-label="关闭部件说明">${icons.close}</button><span class="hotspot-eyebrow" id="hotspot-eyebrow"></span><h3 id="hotspot-title"></h3><p id="hotspot-description"></p><div class="hotspot-actions" id="hotspot-actions"></div></section><span class="model-hover-name" id="model-hover-name"></span><div class="stage-focus" id="stage-focus">整体结构 / OVERVIEW</div><div class="model-point-guide" id="model-point-guide" role="status" hidden><span class="guide-point" aria-hidden="true"></span><div><strong>点击发光圆点，探索结构</strong><span>拖动自由旋转 · 滚轮拉近细节</span></div><button type="button" data-tutorial-dismiss aria-label="关闭操作提示">${icons.close}</button></div><div class="experience-switcher" role="group" aria-label="选择沉浸式探索"><span>沉浸探索</span><button type="button" data-experience="nacelle">${icons.enter}<span>机舱</span></button><button type="button" data-experience="deck">${icons.deck}<span>甲板</span></button><button type="button" data-experience="underwater">${icons.water}<span>水下</span></button></div><div class="stage-tools" role="group" aria-label="三维视图工具"><button type="button" data-view="overview">全景</button><button type="button" data-view="front">正视</button><button type="button" data-view="top">俯视</button><button type="button" data-view="rotor" aria-pressed="true">${icons.pause}<span>暂停叶轮</span></button><button type="button" data-view="mooring">系泊全貌</button><button type="button" data-view="water" aria-pressed="true">海面</button><button type="button" data-view="rotate" aria-pressed="false">环绕</button><button type="button" data-view="fullscreen">全屏</button></div><div class="experience-hud" id="experience-hud" hidden><div class="experience-identity"><span class="experience-live-dot" aria-hidden="true"></span><div><span id="experience-en">NACELLE INTERIOR</span><h2 id="experience-title">机舱内部</h2><p id="experience-subtitle">沿检修通道观察传动系统</p></div></div><button type="button" class="experience-exit" data-experience="exit">${icons.back}<span>返回全景</span><kbd>Esc</kbd></button></div><div class="experience-navigation" id="experience-navigation" hidden><div class="first-person-hint"><span>第一视角</span><p><b>拖动</b> 环顾四周 <i>·</i> <b>W A S D</b> 移动<span id="experience-elevation" hidden> <i>·</i> <b>Q / E</b> 升降</span></p></div><div class="walk-controls" role="group" aria-label="第一视角移动"><button type="button" data-walk="forward" aria-label="向前移动">${icons.arrow}</button><button type="button" data-walk="left" aria-label="向左移动">${icons.arrow}</button><span aria-hidden="true">${svg('<circle cx="12" cy="12" r="3"/>')}</span><button type="button" data-walk="right" aria-label="向右移动">${icons.arrow}</button><button type="button" data-walk="back" aria-label="向后移动">${icons.arrow}</button></div></div><div class="submersion-effect" aria-hidden="true"><i></i><i></i><i></i></div><p class="stage-help">拖动旋转 · 滚轮缩放 · 右键平移</p><div class="stage-loading" id="model-loading" role="status"><span>正在构建三维精细模型…</span><small>正在准备结构、设备与海洋环境</small></div></div><aside class="part-inspector"><span class="kicker">结构部件</span><div class="component-list" role="group" aria-label="选择并放大模型部件">${entries.map(([id,c],i)=>`<button type="button" data-explore="${id}" aria-pressed="false"><span>0${i+1}</span>${c.name}</button>`).join('')}</div><span class="kicker" id="component-index">OC4 / SYSTEM OVERVIEW</span><h2 id="component-title">探索三维结构</h2><p id="component-description">点击发光圆点查看部件，进入机舱、甲板与水下，以第一视角自由探索。</p><div class="inspector-experience-actions" id="inspector-experience-actions"><button type="button" data-experience="nacelle">${icons.enter}<span>进入机舱</span><b>↗</b></button><button type="button" class="is-secondary" data-experience="deck">${icons.deck}<span>甲板漫游</span><b>↗</b></button></div><dl id="component-specs"><div><dt>当前视图</dt><dd>整体结构 · 海面与水下构件</dd></div></dl><div class="component-detail"><b>结构说明</b><p id="component-detail">银白色用于风机与立柱，青蓝色用于水下底柱与叶尖，暖黄色标识检修防护设施。</p><b>关联分析</b><p id="component-watch">先认识模型组成，再配置工况并查看真实运行结果。</p></div><a class="component-source" id="component-source" href="${sourceBase+sourcePaths.hydro}" target="_blank" rel="noopener">查看官方参考输入 ↗</a><button class="text-link" data-page="configure">基于此模型配置工况 →</button><p class="inspector-note">尺寸依据官方参考输入；展示补充与近似见下方。</p></aside></div>`;
const explorer=page.querySelector('.model-explorer');
explorer.querySelector('.model-stage').prepend(pageHeading);
pageHeading.querySelector('.secondary').textContent='工程原理 ↗';
pageHeading.querySelector('.secondary').classList.add('stage-engineering-link');
page.querySelector('.model-summary').insertAdjacentHTML('beforebegin','<div class="model-accuracy"><div><strong>01 / 有依据的主体尺寸</strong>25 个平台构件、19 个叶片截面站位、塔筒标高和系泊端点来自项目固定版本的官方参考输入。</div><div><strong>02 / 细节与近似</strong>机舱外壳、法兰、甲板、扶手与螺栓为展示补充；叶片截面与系泊曲线为近似，不用于工程测量。</div><div><strong>03 / 按需探索</strong>点击部件进入近景，拖动继续观察；“恢复全景”返回整体，“系泊全貌”展示实际锚点范围。</div></div>');
let viewer=null,loading=false,selected=null,openHotspot=null,experience='overview',popoverFrame=0;
const $=id=>document.getElementById(id);
const stage=$('model-stage'),hotspotPopover=$('part-hotspot-popover');
let tutorialDismissed=false;
try{tutorialDismissed=localStorage.getItem('oc4-point-guide-v1')==='dismissed';}catch{}
function dismissTutorial(){tutorialDismissed=true;$('model-point-guide').hidden=true;try{localStorage.setItem('oc4-point-guide-v1','dismissed');}catch{}}
function showTutorial(){if(!tutorialDismissed&&experience==='overview')$('model-point-guide').hidden=false;}
function actionButton(mode,label,icon,secondary=false){return `<button type="button" data-experience="${mode}"${secondary?' class="is-secondary"':''}>${icon}<span>${label}</span><b>↗</b></button>`;}
function updateInspectorActions(id){
  const main=actionFor(id);
  $('inspector-experience-actions').innerHTML=main?actionButton(...main)+`<button type="button" class="is-secondary" data-inspect-focus="${id}">${icons.eye}<span>近景观察</span><b>↗</b></button>`:`<button type="button" data-inspect-focus="${id}">${icons.eye}<span>近景观察</span><b>↗</b></button>`+actionButton('nacelle','进入机舱',icons.enter,true);
}
function closeHotspot(){
  openHotspot=null;hotspotPopover.hidden=true;if(popoverFrame)cancelAnimationFrame(popoverFrame);popoverFrame=0;
  stage.querySelectorAll('.model-point').forEach(b=>b.setAttribute('aria-expanded','false'));
}
function placeHotspot(){
  popoverFrame=0;if(!openHotspot)return;
  const dot=stage.querySelector(`.model-point[data-explore="${openHotspot}"]`);
  if(!dot||dot.hidden||experience!=='overview'){hotspotPopover.hidden=true;popoverFrame=requestAnimationFrame(placeHotspot);return;}
  hotspotPopover.hidden=false;
  const w=stage.clientWidth,h=stage.clientHeight,dotX=parseFloat(dot.style.left)||w*.5,dotY=parseFloat(dot.style.top)||h*.5;
  const inspector=page.querySelector('.part-inspector'),inspectorRect=inspector.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
  const availableRight=innerWidth>900?Math.max(260,inspectorRect.left-stageRect.left-12):w-12;
  const boxW=hotspotPopover.offsetWidth,boxH=hotspotPopover.offsetHeight;
  const headingRect=pageHeading.getBoundingClientRect(),minimumY=Math.max(12,headingRect.bottom-stageRect.top+12);
  const controlsTop=[...stage.querySelectorAll('.experience-switcher,.stage-tools')].map(el=>el.getBoundingClientRect()).filter(rect=>rect.height>0).map(rect=>rect.top-stageRect.top-10);
  const maximumY=Math.max(12,Math.min(h-12,...controlsTop)-boxH);
  let x=dotX+23;if(x+boxW>availableRight)x=dotX-boxW-23;
  x=Math.max(12,Math.min(x,availableRight-boxW));
  const y=Math.max(Math.min(minimumY,maximumY),Math.min(dotY-boxH*.5,maximumY));
  hotspotPopover.style.left=x+'px';hotspotPopover.style.top=Math.max(12,y)+'px';
  popoverFrame=requestAnimationFrame(placeHotspot);
}
function showHotspot(id){
  const c=components[id];if(!c)return;closeHotspot();openHotspot=id;dismissTutorial();
  $('hotspot-eyebrow').textContent=c.en;$('hotspot-title').textContent=c.name;
  $('hotspot-description').textContent={rotor:'三叶片叶轮 · 直径 126 m',nacelle:'进入机舱，近距离探索传动系统',tower:'渐缩钢塔筒 · 分段法兰与检修梯',platform:'OC4 半潜式平台 · 甲板可漫游',bracing:'空间管桁架 · 水下浮筒与撑杆',mooring:'悬链线系泊 · 水深 200 m'}[id];
  const main=actionFor(id);
  $('hotspot-actions').innerHTML=(main?actionButton(...main):'')+`<button type="button" class="is-secondary" data-inspect-focus="${id}">${icons.eye}<span>靠近查看</span><b>↗</b></button>`;
  stage.querySelector(`.model-point[data-explore="${id}"]`)?.setAttribute('aria-expanded','true');placeHotspot();
}
function onModeChange(value){
  const mode=typeof value==='string'?value:value?.mode||'overview';
  experience=experiences[mode]?mode:'overview';stage.dataset.experience=experience;page.dataset.experience=experience;
  $('experience-elevation').hidden=experience!=='underwater';
  const inside=experience!=='overview';$('experience-hud').hidden=!inside;$('experience-navigation').hidden=!inside;
  page.querySelectorAll('[data-experience]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.experience===experience));});
  if(inside){closeHotspot();dismissTutorial();$('experience-en').textContent=experiences[experience].en;$('experience-title').textContent=experiences[experience].title;$('experience-subtitle').textContent=experiences[experience].subtitle;}
  else showTutorial();
}
stage.addEventListener('model-modechange',e=>onModeChange(e.detail));
stage.addEventListener('pointerdown',e=>{if(e.target.tagName==='CANVAS')closeHotspot();});
function resetInspection(){inspect('platform',{focus:false});}
function inspect(id,{focus=true}={}){
  const c=components[id];if(!c)return;selected=id;page.dataset.component=id;
  page.querySelector('.part-inspector').scrollTop=0;
  $('component-index').textContent=c.en;$('component-title').textContent=c.name;$('component-description').textContent=c.description;$('component-detail').textContent=c.detail;$('component-watch').textContent=c.watch;$('component-source').href=sourceBase+sourcePaths[c.source];
  $('component-specs').replaceChildren(...c.specs.map(([term,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;const numeric=value.match(/^([\d.]+)\s*(m|MW)$/);if(numeric){dd.replaceChildren();const n=document.createElement('span'),u=document.createElement('small');n.textContent=numeric[1];u.textContent=' '+numeric[2];dd.append(n,u);}div.append(dt,dd);return div;}));
  page.querySelectorAll('[data-explore]').forEach(b=>{const active=b.dataset.explore===id;b.classList.toggle('active',active);if(b.closest('.component-list'))b.setAttribute('aria-pressed',String(active));});
  updateInspectorActions(id);
  $('stage-focus').textContent=c.name+' / FOCUS';if(focus)viewer?.focus(id);
}
page.addEventListener('click',async e=>{
  if(e.target.closest('[data-tutorial-dismiss]')){dismissTutorial();return;}
  if(e.target.closest('[data-popover-close]')){closeHotspot();return;}
  const sceneControl=e.target.closest('button[data-experience]');
  if(sceneControl){
    if(!viewer)return;closeHotspot();dismissTutorial();const mode=sceneControl.dataset.experience;sceneControl.blur();
    if(mode==='exit'){viewer.exitExperience();onModeChange('overview');}else{viewer.enterExperience(mode);onModeChange(mode);}
    return;
  }
  const closer=e.target.closest('[data-inspect-focus]');if(closer){closeHotspot();dismissTutorial();inspect(closer.dataset.inspectFocus);return;}
  const part=e.target.closest('[data-explore]');if(part){
    const id=part.dataset.explore,point=part.classList.contains('model-point');inspect(id,{focus:!point});
    if(point){if(openHotspot===id)closeHotspot();else showHotspot(id);}else{closeHotspot();dismissTutorial();}return;
  }
  const control=e.target.closest('button[data-view]');if(!control)return;
  const mode=control.dataset.view;if(mode==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await page.querySelector('.model-explorer').requestFullscreen();}catch{$('stage-focus').textContent='当前浏览器不支持全屏，请直接缩放查看。';}return;}
  closeHotspot();if(viewer)viewer.action(mode,control);
  if(mode==='rotor'){const playing=control.getAttribute('aria-pressed')==='true';control.innerHTML=(playing?icons.pause:icons.play)+`<span>${playing?'暂停叶轮':'播放叶轮'}</span>`;control.setAttribute('aria-label',playing?'暂停叶轮':'播放叶轮');}
});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.body.dataset.page!=='model')return;if(openHotspot){closeHotspot();return;}if(experience!=='overview'){viewer?.exitExperience();onModeChange('overview');}});
async function ensureViewer(){
  if(viewer||loading||document.body.dataset.page!=='model')return;loading=true;
  try{
    const [{createViewer},response]=await Promise.all([import('./model-renderer.mjs?v=0.7.1'),fetch('./assets/oc4-geometry.json')]);
    if(!response.ok)throw new Error('geometry');
    const pendingSelection=selected;
    viewer=createViewer(stage,await response.json(),{select:id=>{inspect(id,{focus:false});if(experience==='overview')showHotspot(id);},clear:resetInspection,components,onModeChange});
    $('model-loading').hidden=true;$('model-render-status').textContent='LIVE 3D';page.dataset.viewer='ready';
    if(pendingSelection)inspect(pendingSelection);viewer.visibility(document.body.dataset.page==='model');showTutorial();
  }catch(error){
    console.warn('3D viewer unavailable',error);page.dataset.viewer='unavailable';$('model-render-status').textContent='3D 暂不可用';
    $('model-loading').classList.add('has-error');$('model-loading').replaceChildren();
    const msg=document.createElement('span');msg.textContent='三维显示暂不可用';const note=document.createElement('small');note.textContent='请确认浏览器已启用硬件加速 / WebGL 2。部件说明仍可通过右侧按钮查看。';const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();$('model-loading').append(msg,note,retry);
  }
}
new MutationObserver(()=>{ensureViewer();viewer?.visibility(document.body.dataset.page==='model');if(document.body.dataset.page!=='model')closeHotspot();else if(viewer)showTutorial();}).observe(document.body,{attributes:true,attributeFilter:['data-page']});
document.addEventListener('visibilitychange',()=>viewer?.visibility(!document.hidden&&document.body.dataset.page==='model'));
ensureViewer();
