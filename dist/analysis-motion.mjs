import {renderResponseComparison,renderRecordedResponse} from './response-plot.mjs';
import {speedAnchors,estimateAtSpeed,playbackPosition} from './motion-data.mjs';
const $=id=>document.getElementById(id),num=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const panel=document.createElement('section');panel.className='speed-lab';panel.id='speed-lab';panel.setAttribute('aria-label','转速与响应探索');
panel.innerHTML=`<div class="speed-lab-heading"><div><span class="analysis-eyebrow">EXPLORE / 转速与响应</span><h2>拖动转速，观察联动。</h2></div><span id="speed-model-kind" class="speed-model-kind">工况插值预览</span></div><div class="speed-lab-body"><div class="speed-scene"><svg class="speed-photoreal-model" viewBox="0 0 1024 1717" role="img" aria-label="精细海上风机视觉模型，叶轮按探索转速旋转"><image href="./assets/turbine-body-v3.png" x="0" y="181" width="1024" height="1536"/><g id="speed-rotor"><image href="./assets/turbine-rotor-v3.png" x="91" y="6" width="840" height="840"/></g></svg><div class="speed-scene-footer"><span>叶轮按所选 rpm 示意旋转</span><button id="speed-spin" class="quiet" aria-pressed="true">暂停叶轮</button></div></div><div class="speed-controls"><label for="speed-input">探索转速 <output id="speed-target">—</output><span>rpm</span></label><input id="speed-input" type="range" min="0" max="1" step="any" value="0" disabled><div class="speed-range"><span id="speed-min">—</span><span>拖动或用方向键微调</span><span id="speed-max">—</span></div><p id="speed-unavailable" role="status"></p><svg id="speed-response" viewBox="0 0 420 125" role="img" aria-label="转速与平均功率的算例插值关系"></svg><p class="speed-preview-note">预览沿兼容算例插值，不改写下方真实时序与统计。</p><details class="speed-assumptions"><summary>这个联动模型依据什么？</summary><p>转速是 OpenFAST 的输出。这里仅选取模型、引擎版本、海况、种子、步长及分析窗口相同、风速不同的已完成算例，在它们的平均转速与统计量之间做线性插值。不外推，不代表固定风速下独立调速的因果关系，也不生成新的仿真。</p><div id="speed-anchor-sources"></div></details></div><div class="speed-output"><div class="speed-output-heading"><span>联动预览 / 统计量</span><small id="speed-estimate-status">等待兼容算例</small></div><table><tbody><tr><th>对应风速</th><td><strong id="speed-wind">—</strong><span>m/s</span></td></tr><tr><th>平均发电功率</th><td><strong id="speed-power">—</strong><span>kW</span></td></tr><tr><th>纵摇绝对峰值</th><td><strong id="speed-pitch">—</strong><span>°</span></td></tr><tr><th>纵荡绝对峰值</th><td><strong id="speed-surge">—</strong><span>m</span></td></tr><tr><th>窗口发电量</th><td><strong id="speed-energy">—</strong><span>kWh</span></td></tr></tbody></table><button id="speed-reset" class="quiet">回到当前算例转速 ↶</button></div></div>`;
document.querySelector('#page-analysis .metrics').after(panel);
const replay=document.createElement('div');replay.className='analysis-replay';
replay.innerHTML=`<div class="analysis-replay-row"><span class="replay-tag"><i></i>真实时序回放</span><button id="replay-toggle" aria-pressed="true">暂停</button><button id="replay-restart">从头播放 ↶</button><button id="replay-overview">查看完整曲线</button><label>速度<select id="replay-speed" aria-label="回放速度"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label><label class="replay-loop"><input id="replay-loop" type="checkbox" checked>循环</label></div><div class="analysis-replay-progress"><input id="replay-progress" type="range" min="0" max="1000" step="1" value="0" aria-label="时序回放进度"><output id="replay-clock">等待完整结果</output></div><p>1× 约 20 秒回放当前显示范围；到结尾短暂停留后重播。仅回放已有结果，拖动进度或点击图表可暂停读数。</p>`;
document.querySelector('#page-analysis .chart-tabs').after(replay);

let anchors=[],base=null,estimate=null,plot=null,frame=0,lastFrame=0,lastReadout=0,elapsed=0,play=!reduce.matches,reveal=false,spin=!reduce.matches,modelKey='',plotKey='';
const isVisible=()=>document.body.dataset.page==='analysis'&&!document.hidden;
const rotor=$('speed-rotor');
rotor.style.transformOrigin='512px 498px';rotor.style.transformBox='view-box';
const rotorAnimation=rotor.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:6000,iterations:Infinity,easing:'linear'});
rotorAnimation.pause();
const rotorPeriod=document.createElement('p');rotorPeriod.id='speed-rotation-period';rotorPeriod.setAttribute('aria-live','polite');$('speed-input').after(rotorPeriod);
function syncRotor(){
  const rpm=estimate?.rpm||0;
  if(rpm>0)rotorAnimation.playbackRate=rpm/10;
  if(spin&&rpm>0&&isVisible())rotorAnimation.play();else rotorAnimation.pause();
  rotor.dataset.rpm=String(rpm);
  rotorPeriod.textContent=rpm>0?`叶轮 ${num(rpm,2)} rpm · ${num(60/rpm,2)} 秒 / 圈${spin?'':' · 已暂停'}`:estimate?'叶轮已停止 · 0 rpm':'正在载入已有结果';
}
function requestFrame(){syncRotor();if(!frame&&isVisible()&&play&&plot)frame=requestAnimationFrame(tick);}
function updateButtons(){
  $('replay-toggle').textContent=play?'暂停':'播放';$('replay-toggle').setAttribute('aria-pressed',String(play));
  $('speed-spin').textContent=spin?'暂停叶轮':'播放叶轮';$('speed-spin').setAttribute('aria-pressed',String(spin));
  for(const id of ['replay-toggle','replay-restart','replay-overview','replay-progress','replay-speed','replay-loop'])$(id).disabled=!plot;
}
function paintReplay(read=true){
  if(!plot)return;
  const position=playbackPosition(elapsed,plot.start,plot.end),fraction=(position.time-plot.start)/(plot.end-plot.start);
  const clip=$('analysis-reveal');if(clip)clip.setAttribute('width',reveal?plot.width*fraction:plot.width);
  if(read&&reveal)plot.readAt(position.time);
  $('replay-progress').value=String(Math.round(fraction*1000));
  $('replay-clock').textContent=`${num(position.time,1)} / ${num(plot.end,1)} s${play?' · 第 '+(position.cycle+1)+' 轮':reveal?' · 已暂停':' · 完整曲线'}`;
  $('replay-progress').setAttribute('aria-valuetext',`${num(position.time,1)} 秒`);
}
function tick(now){
  frame=0;if(!isVisible()){lastFrame=0;return;}
  if(now-lastFrame<30){requestFrame();return;}
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.15):0;lastFrame=now;
  if(play&&plot){elapsed+=dt*Number($('replay-speed').value);const pos=playbackPosition(elapsed,plot.start,plot.end);if(!$('replay-loop').checked&&(pos.holding||pos.cycle>0)){elapsed=20;play=false;updateButtons();}paintReplay(now-lastReadout>=100);if(now-lastReadout>=100)lastReadout=now;}
  requestFrame();
}
function showRecordedPanel(){
 if(!base?.result)return;
 const svg=$('speed-response'),mode=$('speed-plot-mode')?.value||'relative',key=base.id+'|'+mode+'|'+base.result.series.length;
 if(svg.dataset.recordKey!==key){renderRecordedResponse(svg,base,mode);svg.dataset.recordKey=key;}
 window.dispatchEvent(new CustomEvent('tideflow:speed-record',{detail:{record:base}}));
}
function updateModel(rpm){
  if(anchors.length<2){
    if(!Number.isFinite(rpm)||rpm<0)return;
    estimate={rpm,kind:'visual'};
    $('speed-target').textContent=num(rpm,3);$('speed-input').value=String(rpm);$('speed-input').setAttribute('aria-valuetext',`${num(rpm,3)} rpm，模型展示转速`);
    $('speed-model-kind').textContent='模型转速演示';
    $('speed-estimate-status').textContent='数表保持原工况真实结果';
    $('speed-unavailable').textContent='可直接调节模型转速；没有同条件对照时，功率和曲线保持原工况真实数据。';
    showRecordedPanel();requestFrame();return;
  }
  estimate=estimateAtSpeed(anchors,rpm);if(!estimate)return;
  $('speed-target').textContent=num(rpm,3);$('speed-input').value=String(rpm);$('speed-input').setAttribute('aria-valuetext',`${num(rpm,3)} rpm`);
  for(const key of ['wind','power','pitch','surge','energy'])$('speed-'+key).textContent=num(estimate[key],key==='power'?1:2);
  $('speed-estimate-status').textContent=estimate.kind==='record'?'端点 · 原算例统计':'中间值 · 线性插值估计';
  $('speed-model-kind').textContent=estimate.kind==='record'?'原算例端点':'插值探索 · 非新仿真';
  const baseline=anchors.find(a=>a.id===base?.id)||anchors[0];
  $('speed-response').dataset.recordKey='';
  renderResponseComparison($('speed-response'),anchors,baseline,estimate,$('speed-plot-mode')?.value||'relative');
  window.dispatchEvent(new CustomEvent('tideflow:speed-preview',{detail:{baseline,estimate,anchors}}));
  requestFrame();
}
function loadModel(detail){
  const r=detail.record,next=speedAnchors(detail.records||[],r),key=[r?.id,r?.status,r?.result?.stats.RotSpeed?.mean,...next.map(a=>a.id)].join('|');base=r;
  if(key===modelKey)return;modelKey=key;anchors=next;estimate=null;
  const ready=anchors.length>=2;$('speed-input').disabled=!ready;$('speed-reset').disabled=!ready;$('speed-spin').disabled=!ready;
  $('speed-unavailable').textContent=ready?'同一海况与模型下的风速变化路径。':'当前记录缺少兼容的转速对照区间。请选择“基准”或“风速对比”工况；不会混用不同海况，也不会超出已知范围。';
  if(!ready){
    window.dispatchEvent(new Event('tideflow:speed-unavailable'));
    const rpm=r?.result?.stats.RotSpeed?.mean,available=Number.isFinite(rpm)&&rpm>0;
    estimate=r?{rpm:available?rpm:0,kind:'visual'}:null;
    $('speed-target').textContent=r?num(estimate.rpm,3):'—';
    $('speed-input').min='0';$('speed-input').max=String(Math.max(20,Math.ceil((available?rpm:0)*1.5)));$('speed-input').value=String(available?rpm:0);
    $('speed-input').disabled=!r;$('speed-reset').disabled=!available;
    $('speed-min').textContent='0 rpm';$('speed-max').textContent=$('speed-input').max+' rpm';
    $('speed-spin').disabled=!r;
    $('speed-unavailable').textContent='可直接调节模型转速；没有同条件对照时，功率和曲线保持原工况真实数据。';
    $('speed-response').innerHTML='';$('speed-anchor-sources').textContent='当前为单个真实算例，无需计算即可查看。';
    $('speed-estimate-status').textContent=available?'已有真实结果':'暂无完成结果';$('speed-model-kind').textContent=available?'当前真实算例':'暂无完成结果';
    const values={wind:r?.params?.wind,power:r?.result?.stats.GenPwr?.mean,pitch:r?.result?.stats.PtfmPitch?.max_abs,surge:r?.result?.stats.PtfmSurge?.max_abs,energy:r?.result?.energy_kwh};
    for(const k of ['wind','power','pitch','surge','energy'])$('speed-'+k).textContent=num(values[k],k==='power'?1:2);
    $('speed-response').dataset.recordKey='';showRecordedPanel();syncRotor();return;
  }
  $('speed-input').min=String(anchors[0].rpm);$('speed-input').max=String(anchors.at(-1).rpm);
  $('speed-min').textContent=num(anchors[0].rpm,3)+' rpm';$('speed-max').textContent=num(anchors.at(-1).rpm,3)+' rpm';
  $('speed-anchor-sources').innerHTML=anchors.map(a=>`<p><strong>${escape(a.name)}</strong><br>${num(a.rpm,3)} rpm · ${num(a.wind,1)} m/s · ${num(a.power,1)} kW</p>`).join('');
  updateModel(Math.max(anchors[0].rpm,Math.min(anchors.at(-1).rpm,r.result.stats.RotSpeed.mean)));
}
$('speed-input').oninput=e=>{spin=true;updateModel(Number(e.target.value));updateButtons();};
window.addEventListener('tideflow:speed-refresh',()=>{if(base)updateModel(Number($('speed-input').value));});
$('speed-reset').onclick=()=>{if(base?.result)updateModel(base.result.stats.RotSpeed.mean);};
$('speed-spin').onclick=()=>{spin=!spin;lastFrame=0;updateButtons();requestFrame();};
$('replay-toggle').onclick=()=>{play=!play;if(play){if(elapsed>=20)elapsed=0;reveal=true;}lastFrame=0;updateButtons();paintReplay();requestFrame();};
$('replay-restart').onclick=()=>{elapsed=0;play=true;reveal=true;lastFrame=0;updateButtons();paintReplay();requestFrame();};
$('replay-overview').onclick=()=>{play=false;reveal=false;elapsed=20;updateButtons();paintReplay(false);const line=$('analysis-crosshair');if(line)line.setAttribute('opacity','0');};
$('replay-progress').oninput=e=>{play=false;reveal=true;elapsed=Number(e.target.value)/1000*20;updateButtons();paintReplay();};
$('replay-speed').onchange=()=>{lastFrame=0;requestFrame();};
$('replay-loop').onchange=()=>{if(!$('replay-loop').checked)elapsed=elapsed%20.7;};
window.addEventListener('tideflow:analysis-plot-reset',()=>{plot=null;updateButtons();});
window.addEventListener('tideflow:replay-pause',()=>{play=false;updateButtons();});
window.addEventListener('tideflow:replay-seek',e=>{if(!plot)return;play=false;reveal=true;elapsed=Math.max(0,Math.min(1,(e.detail.time-plot.start)/(plot.end-plot.start)))*20;updateButtons();paintReplay();});
window.addEventListener('tideflow:analysis-plot',e=>{const next=e.detail,key=[next.record.id,next.start,next.end].join('|');if(key!==plotKey){elapsed=play||reveal?0:20;if(play)reveal=true;plotKey=key;}plot=next;updateButtons();paintReplay();requestFrame();});
window.addEventListener('tideflow:render',e=>{if(!e.detail.records)return;loadModel(e.detail);if(!e.detail.record?.result){plot=null;updateButtons();$('replay-clock').textContent='等待完整结果';}else if(!$('analysis-reveal')){plot=null;updateButtons();}requestFrame();});
const resume=()=>{lastFrame=0;requestFrame();};
document.addEventListener('visibilitychange',resume);
new MutationObserver(resume).observe(document.body,{attributes:true,attributeFilter:['data-page']});
reduce.addEventListener('change',()=>{if(reduce.matches){play=false;spin=false;reveal=false;updateButtons();paintReplay(false);}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
updateButtons();window.dispatchEvent(new Event('tideflow:analysis-request'));
