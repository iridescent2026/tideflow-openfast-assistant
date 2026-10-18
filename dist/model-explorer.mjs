const page=document.getElementById('page-model');
const components={
  rotor:{name:'叶轮',en:'ROTOR ASSEMBLY',description:'三片变弦长、变扭角叶片连接轮毂，将风的作用转化为转子转矩。点击叶片或轮毂可聚焦整个叶轮。',specs:[['叶轮直径','126 m'],['叶片数量','3 片'],['几何依据','19 个 AeroDyn 叶片截面站位']],detail:'叶片弦长与扭角按参考文件重建；截面采用平滑翼型近似，叶尖以青蓝色区分。外形不用于叶片制造或气动计算。',watch:'RotSpeed 转子转速 / GenPwr 发电功率',anchor:[-20,115,6],source:'aero'},
  nacelle:{name:'机舱',en:'NACELLE & DRIVETRAIN',description:'机舱位于塔顶，连接转子与传动、发电及偏航系统。近景可以查看机舱外壳、散热格栅与顶部附件。',specs:[['参考机组','NREL 5 MW'],['塔顶标高','87.6 m / 静水面以上'],['轮毂连接','上风向三叶片转子']],detail:'外壳分段、顶部检修盖和散热格栅为结构识别补充。当前展示机舱外观，不展示内部齿轮箱结构。',watch:'GenPwr 发电功率 / RotSpeed 转子转速',anchor:[0,90,0],source:'elasto'},
  tower:{name:'塔筒',en:'TAPERED TOWER',description:'渐缩钢塔筒连接机舱与浮式基础，传递风轮、机舱的载荷，并参与耦合结构振动。',specs:[['塔底标高','10 m'],['塔顶标高','87.6 m'],['显示细节','分段法兰 / 入口 / 检修梯']],detail:'塔筒采用渐缩圆筒，并补充法兰接缝与检修入口。局部连接细节为展示性重建，实际结构参数以 ElastoDyn 输入为准。',watch:'TwrBsMyt 塔底弯矩',anchor:[0,52,0],source:'elasto'},
  platform:{name:'浮式平台',en:'SEMI-SUBMERSIBLE PLATFORM',description:'由中心立柱、三根外围立柱及其下部浮筒组成，基于 OC4-DeepCwind 参考模型，用于提供平台的浮力、刚度与运动特性。',specs:[['中心立柱直径','6.5 m'],['外围立柱直径','12 m'],['底柱直径','24 m']],detail:'立柱位置、直径与端点直接取自 HydroDyn。近景可查看甲板环、立柱分段、栏杆、螺栓与检修盖；这些小型附件是视觉补充。',watch:'PtfmPitch 纵摇 / PtfmSurge 纵荡',anchor:[14,8,-25],source:'hydro'},
  bracing:{name:'支撑',en:'PONTOONS & BRACES',description:'上、下层水平撑杆与斜撑将立柱连接起来，构成平台的空间骨架。放大后可以从不同方向查看构件连接关系。',specs:[['参考管件直径','1.6 m'],['平台构件总数','25 个 HydroDyn 构件'],['检修通行','径向走道与安全扶手（示意）']],detail:'圆管端点与截面按官方节点、构件表重建。检修走道、黄色扶手用于增强空间识别，不构成新增仿真构件。',watch:'平台运动与载荷通过耦合模型共同求解',anchor:[8,-5,12],source:'hydro'},
  mooring:{name:'系泊',en:'CATENARY MOORING',description:'三根系泊线从平台导缆点延伸到海床锚点，为平台提供恢复作用。近景看连接，全貌看整个锚泊范围。',specs:[['参考水深','200 m'],['锚点水平半径','约 837.6 m'],['单线未伸长长度','835.35 m']],detail:'导缆点与锚点位置来自 MoorDyn。当前弧线仅说明连接方向，不是静力平衡形状或求解后的线形；全貌按坐标比例展示，平台会显得较小。',watch:'本项目关注 PtfmSurge / PtfmPitch；此视图不显示线张力',anchor:[20,-24,-35],source:'moor'}
};
const sourceBase='https://github.com/OpenFAST/r-test/blob/dd5feaaaa500ba7283140107806300d551cff0a7/glue-codes/openfast/';
const sourcePaths={aero:'5MW_Baseline/NRELOffshrBsline5MW_AeroDyn_blade.dat',elasto:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_ElastoDyn.dat',hydro:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_HydroDyn.dat',moor:'5MW_OC4Semi_WSt_WavesWN/NRELOffshrBsline5MW_OC4DeepCwindSemi_MoorDyn.dat'};
const entries=Object.entries(components);
const pageHeading=page.querySelector('.page-heading');
pageHeading.classList.add('model-page-heading');
pageHeading.querySelector('.kicker').textContent='模型结构';
pageHeading.querySelector('h1').textContent='OC4 / NREL 5 MW';
pageHeading.querySelector('p').textContent='三维结构探索 · 参考模型尺寸与部件说明';
page.querySelector('.model-explorer').outerHTML=`<div class="model-explorer"><div class="model-stage" id="model-stage"><div class="stage-top"><span class="live-3d" id="model-render-status">加载中</span></div><div class="model-labels" id="model-labels">${entries.map(([id,c],i)=>`<button data-explore="${id}" aria-label="放大查看${c.name}"><small>0${i+1}</small>${c.name}</button>`).join('')}</div><span class="model-hover-name" id="model-hover-name"></span><div class="stage-focus" id="stage-focus">整体结构 / OVERVIEW</div><div class="stage-tools" role="group" aria-label="三维视图工具"><button data-view="overview">全景</button><button data-view="front">正视</button><button data-view="top">俯视</button><button data-view="mooring">系泊全貌</button><button data-view="water" aria-pressed="true">海面</button><button data-view="rotate" aria-pressed="false">环绕</button><button data-view="fullscreen">全屏</button></div><p class="stage-help">拖动旋转 · 滚轮缩放 · 右键平移 · 点击部件聚焦</p><div class="stage-loading" id="model-loading" role="status"><span>正在构建三维参考模型…</span><small>几何与渲染库均从本机加载</small></div></div><aside class="part-inspector"><span class="kicker">结构部件</span><div class="component-list" role="group" aria-label="选择并放大模型部件">${entries.map(([id,c],i)=>`<button data-explore="${id}" aria-pressed="false"><span>0${i+1}</span>${c.name}</button>`).join('')}</div><span class="kicker" id="component-index">OC4 / SYSTEM OVERVIEW</span><h2 id="component-title">探索三维结构</h2><p id="component-description">点击模型上的部件或标记，镜头将平滑靠近，查看构件细节与参考参数。</p><dl id="component-specs"><div><dt>当前视图</dt><dd>整体结构 · 海面与水下构件</dd></div></dl><div class="component-detail"><b>结构说明</b><p id="component-detail">银白色用于风机与立柱，青蓝色用于水下底柱与叶尖，暖黄色标识检修防护设施。</p><b>关联分析</b><p id="component-watch">先认识模型组成，再配置工况并查看真实运行结果。</p></div><a class="component-source" id="component-source" href="${sourceBase+sourcePaths.hydro}" target="_blank" rel="noopener">查看官方参考输入 ↗</a><button class="text-link" data-page="configure">基于此模型配置工况 →</button><p class="inspector-note">尺寸依据官方参考输入；展示补充与近似见下方。</p></aside></div>`;
const explorer=page.querySelector('.model-explorer');
explorer.querySelector('.model-stage').prepend(pageHeading);
pageHeading.querySelector('.secondary').textContent='工程原理 ↗';
pageHeading.querySelector('.secondary').classList.add('stage-engineering-link');
page.querySelector('.model-summary').insertAdjacentHTML('beforebegin','<div class="model-accuracy"><div><strong>01 / 有依据的主体尺寸</strong>25 个平台构件、19 个叶片截面站位、塔筒标高和系泊端点来自项目固定版本的官方参考输入。</div><div><strong>02 / 细节与近似</strong>机舱外壳、法兰、甲板、扶手与螺栓为展示补充；叶片截面与系泊曲线为近似，不用于工程测量。</div><div><strong>03 / 按需探索</strong>点击部件进入近景，拖动继续观察；“恢复全景”返回整体，“系泊全貌”展示实际锚点范围。</div></div>');
let viewer=null,loading=false,selected=null;
const $=id=>document.getElementById(id);
function resetInspection(){inspect('platform',{focus:false});}
function inspect(id,{focus=true}={}){
  const c=components[id];if(!c)return;selected=id;page.dataset.component=id;
  page.querySelector('.part-inspector').scrollTop=0;
  $('component-index').textContent=c.en;$('component-title').textContent=c.name;$('component-description').textContent=c.description;$('component-detail').textContent=c.detail;$('component-watch').textContent=c.watch;$('component-source').href=sourceBase+sourcePaths[c.source];
  $('component-specs').replaceChildren(...c.specs.map(([term,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;const numeric=value.match(/^([\d.]+)\s*(m|MW)$/);if(numeric){dd.replaceChildren();const n=document.createElement('span'),u=document.createElement('small');n.textContent=numeric[1];u.textContent=' '+numeric[2];dd.append(n,u);}div.append(dt,dd);return div;}));
  page.querySelectorAll('[data-explore]').forEach(b=>{const active=b.dataset.explore===id;b.classList.toggle('active',active);if(b.closest('.component-list'))b.setAttribute('aria-pressed',String(active));});
  $('stage-focus').textContent=c.name+' / FOCUS';if(focus)viewer?.focus(id);
}
page.addEventListener('click',async e=>{const part=e.target.closest('[data-explore]');if(part){inspect(part.dataset.explore);return;}const control=e.target.closest('[data-view]');if(!control)return;
  const mode=control.dataset.view;if(mode==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await page.querySelector('.model-explorer').requestFullscreen();}catch{$('stage-focus').textContent='当前浏览器不支持全屏，请直接缩放查看。';}return;}
  if(viewer)viewer.action(mode,control);
});
async function ensureViewer(){
  if(viewer||loading||document.body.dataset.page!=='model')return;loading=true;
  try{
    const [{createViewer},response]=await Promise.all([import('./model-renderer.mjs?v=0.6.2'),fetch('./assets/oc4-geometry.json')]);
    if(!response.ok)throw new Error('geometry');
    const pendingSelection=selected;
    viewer=createViewer($('model-stage'),await response.json(),{select:inspect,clear:resetInspection,components});
    $('model-loading').hidden=true;$('model-render-status').textContent='LIVE 3D';page.dataset.viewer='ready';
    if(pendingSelection)inspect(pendingSelection);viewer.visibility(document.body.dataset.page==='model');
  }catch(error){
    console.warn('3D viewer unavailable',error);page.dataset.viewer='unavailable';$('model-render-status').textContent='3D 暂不可用';
    $('model-loading').classList.add('has-error');$('model-loading').replaceChildren();
    const msg=document.createElement('span');msg.textContent='三维显示暂不可用';const note=document.createElement('small');note.textContent='请确认浏览器已启用硬件加速 / WebGL 2。部件说明仍可通过右侧按钮查看。';const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();$('model-loading').append(msg,note,retry);
  }
}
new MutationObserver(()=>{ensureViewer();viewer?.visibility(document.body.dataset.page==='model');}).observe(document.body,{attributes:true,attributeFilter:['data-page']});
document.addEventListener('visibilitychange',()=>viewer?.visibility(!document.hidden&&document.body.dataset.page==='model'));
ensureViewer();
