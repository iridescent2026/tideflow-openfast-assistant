import {speedAnchors} from './motion-data.mjs';
import {baselinePercent} from './response-plot.mjs';
const $=id=>document.getElementById(id),n=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=$('page-analysis'),deck=page.querySelector('.analysis-deck'),trace=page.querySelector('.trace-card'),lab=$('speed-lab'),insight=page.querySelector('.insight-card');
page.classList.add('analysis-focus');
const narrative=document.createElement('details');narrative.className='analysis-reading';narrative.innerHTML='<summary><span>结果解读与文档依据</span><span>展开 ↘</span></summary>';narrative.append(insight);page.insertBefore(narrative,$('comparison'));
deck.after(lab);
trace.querySelector('h2').innerHTML='<span class="analysis-section-no">01</span> 真实响应 · 多工况对照';
lab.querySelector('.speed-lab-heading h2').textContent='转速联动 · 与原工况对照';
lab.querySelector('.analysis-eyebrow').textContent='02 / ROTOR & RESPONSE';
trace.querySelector('.chart-tabs').insertAdjacentHTML('beforebegin','<div id="analysis-quick-compare" class="analysis-quick-compare" aria-label="对照工况快捷选择"></div>');
const focusNav=document.createElement('div');focusNav.className='analysis-focus-nav';focusNav.innerHTML='<button data-focus-section="trace"><span>01</span> 响应对照 <b>↓</b></button><button data-focus-section="speed"><span>02</span> 转速联动 <b>↓</b></button><span>真实时序与插值探索分别展示</span>';
page.querySelector('.analysis-heading').after(focusNav);
focusNav.onclick=e=>{const b=e.target.closest('[data-focus-section]');if(b)(b.dataset.focusSection==='trace'?trace:lab).scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
const plotMode=document.createElement('div');plotMode.className='speed-plot-heading';plotMode.innerHTML='<div><strong>相对原工况，哪些响应变了？</strong><span>同一转速轴，比较变化幅度</span></div><label>视图<select id="speed-plot-mode"><option value="relative">多指标变化 / %</option><option value="power">发电功率 / kW</option></select></label>';
$('speed-response').before(plotMode);
const plotStage=document.createElement('div');plotStage.className='speed-plot-stage';$('speed-response').before(plotStage);plotStage.append($('speed-response'));
$('speed-response').after(Object.assign(document.createElement('div'),{className:'speed-series-legend',id:'speed-series-legend'}));
const deltaStrip=document.createElement('div');deltaStrip.id='speed-delta-strip';deltaStrip.className='speed-delta-strip';plotMode.before(deltaStrip);
const output=$('speed-lab').querySelector('.speed-output'),table=output.querySelector('table');
const detail=document.createElement('details');detail.className='speed-values-detail';detail.innerHTML='<summary>基准与当前预览数表 <span>查看数值 ↘</span></summary>';detail.append(output);lab.querySelector('.speed-controls').append(detail);
table.insertAdjacentHTML('afterbegin','<thead><tr><th>响应量</th><th>原工况</th><th>当前预览</th><th>变化 / %</th></tr></thead>');
for(const [i,key] of ['wind','power','pitch','surge','energy'].entries()){
  const row=table.tBodies[0].rows[i];row.cells[0].insertAdjacentHTML('afterend',`<td id="speed-baseline-${key}">—</td>`);row.insertAdjacentHTML('beforeend',`<td id="speed-change-${key}">—</td>`);
}
lab.querySelector('.speed-scene-footer>span').textContent='图像生成的视觉模型 · 非工程几何';
$('speed-plot-mode').onchange=()=>window.dispatchEvent(new Event('tideflow:speed-refresh'));
let detailState=null,defaultAdded=false;
const compare=(id)=>window.dispatchEvent(new CustomEvent('tideflow:analysis-action',{detail:{type:'compare',id}}));
window.addEventListener('tideflow:render',event=>{
  if(!event.detail.records)return;detailState=event.detail;renderQuickCompare();
  const {record,records,plots=[]}=detailState;
  if(!defaultAdded&&records.length&&record?.result){defaultAdded=true;if(plots.length<=1){const anchors=speedAnchors(records,record),other=anchors.find(a=>a.id!==record.id);if(other)queueMicrotask(()=>compare(other.id));}}
  if(!record?.result){deltaStrip.innerHTML='';$('speed-series-legend').textContent='等待完整结果。';}
});
function renderQuickCompare(){
  const {record,records,plots=[]}=detailState,selected=new Set(plots.map(r=>r.id));
  const candidates=[...plots,...records.filter(r=>r.result&&!selected.has(r.id))].filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i);
  $('analysis-quick-compare').innerHTML=`<span class="quick-label">对照曲线</span>${candidates.slice(0,5).map((r,i)=>`<label title="${esc(r.name)}"><input type="checkbox" data-quick-id="${esc(r.id)}" ${selected.has(r.id)?'checked':''} ${r.id===record?.id?'disabled':''}><span>${r.id===record?.id?'原工况 · ':''}${esc(r.name)}</span></label>`).join('')}<button id="analysis-more-comparison">更多工况 +</button>`;
  $('analysis-more-comparison').onclick=()=>{$('analysis-picker').open=true;$('analysis-picker').scrollIntoView({block:'center',behavior:'smooth'});};
}
$('analysis-quick-compare').onchange=e=>{if(e.target.dataset.quickId)compare(e.target.dataset.quickId);};
window.addEventListener('tideflow:speed-preview',e=>{
  $('speed-plot-mode').options[0].textContent='多指标变化 / %';document.querySelector('.speed-lab-heading h2').textContent='转速联动 · 与原工况对照';
  document.querySelector('.speed-plot-heading strong').textContent='相对原工况，哪些响应变了？';document.querySelector('.speed-plot-heading>div>span').textContent='同一转速轴，比较变化幅度';document.querySelector('.speed-preview-note').textContent='预览沿兼容算例插值，不改写真实时序与统计。';
  const {baseline,estimate}=e.detail;
  for(const key of ['wind','power','pitch','surge','energy']){const diff=baselinePercent(estimate[key],baseline[key]);$('speed-baseline-'+key).textContent=n(baseline[key],key==='power'?1:2);$('speed-change-'+key).textContent=diff===null?'基准接近零':(diff>0?'+':'')+n(diff,1)+'%';}
  deltaStrip.innerHTML=[['power','平均功率','kW','#8aede2'],['pitch','纵摇绝对峰值','°','#edc584'],['surge','纵荡绝对峰值','m','#baacf3']].map(([key,label,unit,color])=>{const value=baselinePercent(estimate[key],baseline[key]);return `<div style="--response-color:${color}"><span>${label}</span><strong>${value===null?'—':(value>0?'+':'')+n(value,1)+'%'}</strong><small>${n(baseline[key],key==='power'?1:2)} → ${n(estimate[key],key==='power'?1:2)} ${unit}</small></div>`;}).join('');
  $('speed-series-legend').innerHTML=$('speed-plot-mode').value==='power'?'<span style="--response-color:#8aede2">功率插值关系</span><span style="--response-color:#d8e6eb">原工况功率参考线</span>':'<span style="--response-color:#8aede2">平均功率变化</span><span style="--response-color:#edc584">纵摇峰值变化</span><span style="--response-color:#baacf3">纵荡峰值变化</span><span style="--response-color:#d8e6eb">原工况 0%</span>';
});
window.addEventListener('tideflow:speed-unavailable',()=>{deltaStrip.innerHTML='';$('speed-series-legend').textContent='暂无兼容算例，不绘制预览曲线。';for(const key of ['wind','power','pitch','surge','energy']){$('speed-baseline-'+key).textContent='—';$('speed-change-'+key).textContent='—';}});
window.addEventListener('tideflow:speed-record',e=>{
 $('speed-plot-mode').options[0].textContent='真实响应 / 峰值 %';document.querySelector('.speed-lab-heading h2').textContent='转速展示 · 当前真实响应';
 const r=e.detail.record,x=r.result,values={wind:r.params.wind,power:x.stats.GenPwr?.mean,pitch:x.stats.PtfmPitch?.max_abs,surge:x.stats.PtfmSurge?.max_abs,energy:x.energy_kwh};
 document.querySelector('.speed-plot-heading strong').textContent='当前工况 · 已保存的真实响应';document.querySelector('.speed-plot-heading>div>span').textContent='缺少兼容对照时，直接展示原始响应，不留空白。';
 document.querySelector('.speed-preview-note').textContent='模型滑块仅调整叶轮展示速度；以下数值和曲线来自当前工况，不随演示转速改变。';
 for(const key of ['wind','power','pitch','surge','energy']){$('speed-baseline-'+key).textContent=n(values[key],key==='power'?1:2);$('speed-change-'+key).textContent='原始结果';}
 deltaStrip.innerHTML=[['power','平均功率','kW','#8aede2'],['pitch','纵摇绝对峰值','°','#edc584'],['surge','纵荡绝对峰值','m','#baacf3']].map(([key,label,unit,color])=>`<div style="--response-color:${color}"><span>${label}</span><strong>${n(values[key],key==='power'?1:2)} <small>${unit}</small></strong><small>当前工况真实统计</small></div>`).join('');
 $('speed-series-legend').innerHTML=($('speed-plot-mode').value==='power'?[['发电功率 / kW','#8aede2']]:[['发电功率 / 峰值 %','#8aede2'],['平台纵摇 / 峰值 %','#edc584'],['平台纵荡 / 峰值 %','#baacf3']]).map(([label,color])=>`<span style="--response-color:${color}">${label}</span>`).join('');
});
window.dispatchEvent(new Event('tideflow:analysis-request'));
window.dispatchEvent(new Event('tideflow:speed-refresh'));
