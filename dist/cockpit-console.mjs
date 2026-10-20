// The seated console uses a reference-matched scenic plate with real form controls.
export function installCockpit(lab){
 const $=id=>document.getElementById(id),bench=lab.querySelector('.lab-workbench'),form=$('case-form');
 const wind=lab.querySelector('.console-wind'),waves=lab.querySelector('.console-wave-mode'),pair=lab.querySelector('.console-pair'),seed=lab.querySelector('.console-seed'),solver=lab.querySelector('.console-solver');
 const toolbar=lab.querySelector('.lab-bench-toolbar'),hardware=lab.querySelector('.lab-hardware'),dock=lab.querySelector('.console-dock'),draft=$('draft-note'),rise=lab.querySelector('.lab-rise');
 const run=$('run-button'),reset=$('reset-config'),duration=$('duration'),validation=$('config-validation');
 const controls=Object.fromEntries(['wave-height','wave-period','duration'].map(id=>[id,$(id)]));
 const stage=document.createElement('div');stage.className='cockpit-stage';
 stage.innerHTML=`<img class="cockpit-plate" src="./assets/lab-cockpit-reference-v3.png" alt="全景海洋驾驶舱，银白色舱窗、弧形控制台和透明玻璃地板" fetchpriority="high"><div class="cockpit-daylight" aria-hidden="true"></div><div class="cockpit-phase"><span>第一人称操控</span></div><a class="cockpit-brand" href="#home"><img src="./assets/brand-lockup.svg?v=color-2" alt="潮汐 TIDEFLOW"></a><nav class="cockpit-utilities"><button type="button" class="cockpit-settings">参数与设置</button><button type="button" data-page="engineering">返回工作空间 ↗</button></nav><div class="cockpit-preview"><img src="./assets/configure-ocean-daylight.png" alt="浮式风机与水下系泊系统场景预览"></div><div class="cockpit-ocean-label">场景预览</div><div class="cockpit-hologram" aria-label="OC4 模型输入预览，非仿真结果"><svg viewBox="0 0 160 170" aria-hidden="true"><defs><linearGradient id="cockpit-tower"><stop stop-color="#5b8baf"/><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#829cb1"/></linearGradient></defs><path d="m76 66-3 85h15l-5-85" fill="url(#cockpit-tower)"/><path d="M69 145h21v9H69Z" fill="#dfbc57"/><g class="cockpit-rotor" fill="#eaf9ff" stroke="#81b5d3" stroke-width=".5"><path d="M80 64 74 52 78 4q2-5 3 0l3 48z"/><path d="M80 64 74 52 78 4q2-5 3 0l3 48z" transform="rotate(120 80 64)"/><path d="M80 64 74 52 78 4q2-5 3 0l3 48z" transform="rotate(240 80 64)"/><circle cx="80" cy="64" r="5"/></g></svg><span>OC4 海上风机模型（输入预览）</span></div><div class="cockpit-status" role="status"></div>`;
 const icon=kind=>`<svg viewBox="0 0 28 28" aria-hidden="true"><path d="${kind==='wind'?'M2 8h18m-4-4c5-5 10 5 2 5M2 14h23m-7 4c5 5 10-5 2-5M3 21h10':kind==='wave'?'M2 8q5-6 11 0t11 0M2 15q5-6 11 0t11 0M2 22q5-6 11 0t11 0':'M14 3v4m0 14v4M3 14h4m14 0h4M7 7l3 3m8 8 3 3m0-14-3 3M7 21l3-3M21 14a7 7 0 1 1-14 0 7 7 0 1 1 14 0'}"/></svg>`;
 const panel=(cls,title,kind)=>{const node=document.createElement('section');node.className='cockpit-screen '+cls;node.innerHTML=`<h2>${icon(kind)}${title}</h2>`;return node;};
 const left=panel('cockpit-wind','风速','wind'),middle=panel('cockpit-waves','波浪','wave'),right=panel('cockpit-solver','求解设置','solver');
 wind.querySelector('#wind').setAttribute('aria-label','风速 / m/s');left.append(wind);middle.append(pair);const durationField=duration.closest('.console-field');right.append(durationField);
 const rangeLinks=[];
 function slider(id,label,options){const target=controls[id],wrap=document.createElement('div');wrap.className='cockpit-range';const range=document.createElement('input');range.type='range';range.setAttribute('aria-label',label);range.min=options?0:target.min;range.max=options?options.length-1:target.max;range.step=options?1:target.step;range.addEventListener('input',()=>{target.value=options?options[Number(range.value)]:range.value;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));});const marks=document.createElement('div');marks.className='cockpit-ticks';const numbers=options?[options[0],options[Math.floor(options.length/2)],options.at(-1)]:[target.min,String((Number(target.min)+Number(target.max))/2),target.max];marks.innerHTML=numbers.map(n=>`<span>${n}</span>`).join('');wrap.append(range,marks);target.parentElement.append(wrap);rangeLinks.push({range,target,options});}
 slider('wave-height','调整波高');slider('wave-period','调整波浪周期');slider('duration','调整仿真时长',Array.from(duration.options,o=>o.value));
 form.replaceChildren(left,middle,right);stage.append(form);
 run.textContent='启动仿真  ▶';run.classList.add('cockpit-start');stage.append(run);rise.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="m11 7-2 6h7l2 6M10 9l5 2M6 7v10h9M8 17v4M14 17v4"/></svg>起身';rise.classList.add('cockpit-rise');stage.append(rise);
 hardware.className='cockpit-hardware';stage.append(hardware);hardware.querySelector('.lab-hardware-caption').remove();hardware.append(waves);waves.querySelector('#wave-mode').setAttribute('form','case-form');hardware.addEventListener('input',()=>form.dispatchEvent(new Event('input',{bubbles:true})));hardware.addEventListener('change',()=>form.dispatchEvent(new Event('change',{bubbles:true})));
 const advanced=document.createElement('dialog');advanced.className='cockpit-advanced';advanced.innerHTML='<div class="cockpit-dialog-head"><div><small>EXPERIMENT SETUP</small><h2>实验参数与求解设置</h2></div><button type="button" aria-label="关闭参数设置">×</button></div><div class="cockpit-advanced-fields"></div>';
 advanced.querySelector('.cockpit-advanced-fields').append(toolbar,seed,solver,reset,draft,dock.querySelector('.console-runtime'));
 advanced.querySelectorAll('input,select,button[type=reset]').forEach(input=>input.setAttribute('form','case-form'));
 document.body.append(advanced);
 advanced.addEventListener('input',()=>form.dispatchEvent(new Event('input',{bubbles:true})));advanced.addEventListener('change',()=>form.dispatchEvent(new Event('change',{bubbles:true})));
 form.addEventListener('invalid',e=>{if(advanced.contains(e.target)){advanced.showModal();e.target.focus();}},true);document.addEventListener('invalid',e=>{if(advanced.contains(e.target)){advanced.showModal();e.target.focus();}},true);stage.querySelector('.cockpit-settings').onclick=()=>advanced.showModal();advanced.querySelector('.cockpit-dialog-head button').onclick=()=>advanced.close();
 stage.querySelector('.cockpit-status').append(validation);
 toolbar.querySelector('.console-help').addEventListener('click',()=>advanced.close(),true);
 form.addEventListener('submit',()=>advanced.close());
 hardware.querySelectorAll('[data-knob]').forEach(button=>{
  const target=document.getElementById(button.dataset.knob)||({wind:wind.querySelector('#wind'),'wave-height':controls['wave-height'],'wave-period':controls['wave-period']})[button.dataset.knob];
  const apply=value=>{target.value=String(Math.min(Number(target.max),Math.max(Number(target.min),value)));target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));};
  let drag=null,suppressClick=false;
  button.onpointerdown=e=>{drag={y:e.clientY,value:Number(target.value),steps:0};suppressClick=false;button.setPointerCapture(e.pointerId);};
  button.onpointermove=e=>{if(!drag)return;const steps=Math.trunc((drag.y-e.clientY)/8);if(steps!==drag.steps){drag.steps=steps;suppressClick=true;apply(drag.value+steps*(Number(target.step)||.5));}};
  button.onpointerup=button.onpointercancel=()=>{drag=null;};
  button.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
  button.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const increment=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;apply(e.key==='Home'?Number(target.min):e.key==='End'?Number(target.max):Number(target.value)+increment*(Number(target.step)||.5));});
  button.title='上下拖动调节，或使用方向键；点击增加一档';
 });
 function sync(){for(const {range,target,options} of rangeLinks){range.value=options?Math.max(0,options.indexOf(target.value)):target.value;range.style.setProperty('--fill',(Number(range.value)-Number(range.min))/(Number(range.max)-Number(range.min))*100+'%');}stage.style.setProperty('--rotor-seconds',Math.max(2,20/Number($('wind').value))+'s');}
 form.addEventListener('input',sync);form.addEventListener('change',sync);window.addEventListener('tideflow:render',sync);reset.addEventListener('click',()=>queueMicrotask(sync));
 bench.replaceChildren(stage);lab.classList.add('lab-reference-cockpit');sync();
}
