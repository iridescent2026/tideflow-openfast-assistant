import {CHANNELS,STATUS} from './core.mjs';
import {comparisonNotes,windowReview} from './evidence.mjs';
import {parameterChanges,comparableWindows,relativeChange,nearestSample,validViewRange} from './analysis-data.mjs';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const palette=['#80e3e0','#e9c47b','#b7a5ed','#e89eb0'];
const dashes=['','7 4','2 4','9 3 2 3'];
const source=r=>r?.source_kind==='bundled-openfast'?'内置真实算例':r?.source_kind==='imported-unverified'?'用户导入 · 待核验':'本机 OpenFAST';
const wave=p=>p.wave_mode==='regular'?`规则波 H ${p.wave_height} m / T ${p.wave_period} s`:`JONSWAP Hs ${p.wave_height} m / Tp ${p.wave_period} s`;
const page=$('page-analysis');
const oldHeading=page.querySelector('.page-heading');
oldHeading.classList.add('analysis-heading');
oldHeading.innerHTML=`<div><span class="analysis-eyebrow">05 / RESPONSE ANALYSIS</span><h1>结果分析<span>从响应，到依据。</span></h1><p>先核对工况与窗口，再比较功率和平台运动。</p></div><div class="analysis-heading-actions"><button class="secondary" id="analysis-source">数据与来源 ↗</button><button class="quiet" data-page="records">运行与日志 ↗</button></div>`;
const toolbar=page.querySelector('.result-toolbar');
toolbar.querySelector('.section-index').textContent='当前分析对象';
toolbar.insertAdjacentHTML('afterend',`<section class="analysis-selection" aria-label="分析工况选择"><label>切换工况<select id="analysis-run" aria-label="选择分析工况"></select></label><dl id="analysis-meta"></dl><details class="analysis-picker" id="analysis-picker"><summary>添加对比 <span id="analysis-compare-count"></span></summary><div class="analysis-picker-sheet"><div class="analysis-picker-head"><strong>选择对照工况</strong><button class="quiet" id="analysis-clear">清除对比</button></div><p>当前工况为基准，最多叠加 4 个已完成工况。</p><div id="analysis-candidates"></div></div></details></section><p class="analysis-state" id="analysis-state" role="status"></p>`);
const metrics=page.querySelector('.metrics');
metrics.insertAdjacentHTML('beforeend','<article><span>窗口发电量</span><div><strong id="analysis-energy">—</strong><small>kWh</small></div><p>功率积分 · 非全年估计</p></article>');
metrics.querySelector('article:nth-child(2) p').textContent='分析窗口的时间加权均值';
const trace=page.querySelector('.trace-card');
trace.querySelector('h2').innerHTML='<span class="analysis-section-no">01</span> 响应时序';
$('export-current').textContent='当前记录 JSON ↓';
$('export-csv').textContent='当前完整时序 CSV ↓';
trace.querySelector('.chart-label span:last-child').textContent='悬停 / 触摸读数 · 图例可隐藏曲线';
trace.querySelector('.chart-label').insertAdjacentHTML('beforebegin',`<div class="analysis-chart-tools"><div class="analysis-range-buttons" role="group" aria-label="曲线显示范围"><button id="analysis-full" aria-pressed="true">完整时序</button><button id="analysis-window" aria-pressed="false">分析窗口</button><details><summary>自定义范围</summary><div class="analysis-range-inputs"><label>起点 / s<input id="analysis-start" type="number" step="any"></label><label>终点 / s<input id="analysis-end" type="number" step="any"></label><button id="analysis-apply" class="secondary">应用</button></div></details></div><span>缩放仅改变曲线显示，不重算统计</span></div><p id="analysis-range-error" role="status"></p>`);
const plotHint=document.createElement('p');plotHint.id='analysis-chart-note';plotHint.className='analysis-chart-note';
$('time-chart').after(plotHint);
const readout=document.createElement('div');readout.id='analysis-readout';readout.className='analysis-readout';
$('time-chart').after(readout);
const insight=page.querySelector('.insight-card');
insight.querySelector('h2').textContent='读懂这次响应';
insight.querySelector('.insight-icon').textContent='02';
insight.insertAdjacentHTML('afterbegin','<div class="analysis-insight-lead">INTERPRETATION / 依据与解释</div>');
const deck=document.createElement('div');deck.className='analysis-deck';trace.before(deck);deck.append(trace,insight);
const comparison=$('comparison');comparison.querySelector('h2').textContent='工况对照';comparison.querySelector('.section-index').textContent='03 / COMPARISON';
comparison.querySelector('.card-head').insertAdjacentHTML('afterend','<div id="analysis-differences" class="analysis-differences"></div>');
const quality=$('quality');page.append(comparison,quality);
quality.querySelector('h2').innerHTML='<span class="analysis-section-no">04</span> 窗口与数据复核';
const provenance=document.createElement('details');provenance.className='analysis-provenance';
provenance.innerHTML='<summary>查看当前记录与计算依据 <span>来源 / 样本 / 原始文件 ↗</span></summary><div id="analysis-provenance-body"></div>';
page.append(provenance);
page.insertAdjacentHTML('beforeend','<p class="analysis-boundary">短时响应用于工况分析；窗口复核不等于稳态认证，也不能单独支持全年发电量、疲劳寿命或结构安全结论。背景为视觉示意。</p>');

let state=null,chart=null,range=null,rangeMode='full',hidden=new Set(),lastId=null,lastChannel=null,geometry=null;
const action=(type,id)=>window.dispatchEvent(new CustomEvent('tideflow:analysis-action',{detail:{type,id}}));
$('analysis-source').onclick=()=>$('source-dialog').showModal();
$('analysis-run').onchange=e=>action('select',e.target.value);
$('analysis-clear').onclick=()=>action('clear');
$('analysis-candidates').onchange=e=>{if(e.target.dataset.compareId)action('compare',e.target.dataset.compareId);};
window.addEventListener('tideflow:render',event=>{if(!event.detail.records)return;state=event.detail;renderPage();});
window.addEventListener('tideflow:chart',event=>{chart=event.detail;if(lastId!==chart.record?.id){range=null;rangeMode='full';hidden.clear();lastId=chart.record?.id;}if(lastChannel!==chart.channel){lastChannel=chart.channel;}drawChart();});

function renderPage(){
  const {record:r,records,plots=[]}=state,result=r?.result;
  const select=$('analysis-run'),signature=records.map(x=>x.id+':'+x.name+':'+x.status).join('|');
  if(select.dataset.signature!==signature){select.innerHTML=records.map(x=>`<option value="${esc(x.id)}">${esc(x.name)} · ${STATUS[x.status]}</option>`).join('');select.dataset.signature=signature;}
  select.value=r?.id||'';select.disabled=!records.length;
  $('analysis-meta').innerHTML=r?`<div><dt>分析窗口</dt><dd>${result?`${num(result.analysis_start,1)}—${num(result.analysis_end,1)} s`:'尚无有效结果'}</dd></div><div><dt>数据来源</dt><dd>${source(r)}</dd></div><div><dt>样本数 / 窗口</dt><dd>${result?num(result.analysis_samples,0)+' 点':'—'}</dd></div>`:'';
  $('analysis-state').textContent=!r?'尚无运行记录，请先选择内置算例或导入结果。':!result?`${STATUS[r.status]}：尚无完整有效结果。${r.error||'可前往运行与日志检查进度或原因。'}`:r.source_kind==='imported-unverified'?'导入数据的参数和来源由用户声明，尚未独立核验。':'';
  $('analysis-state').hidden=!$('analysis-state').textContent;
  $('metric-power').textContent=num(result?.stats.GenPwr.mean,1);
  $('analysis-energy').textContent=num(result?.energy_kwh,2);
  $('analysis-compare-count').textContent=plots.length>1?`${plots.length-1} 个对照`:'最多 3 个';
  const chosen=new Set(plots.map(x=>x.id));
  $('analysis-candidates').innerHTML=records.filter(x=>x.status==='completed').map(x=>`<label><input type="checkbox" data-compare-id="${esc(x.id)}" ${chosen.has(x.id)?'checked':''} ${x.id===r?.id?'disabled':''}><span><strong>${esc(x.name)}${x.id===r?.id?' · 基准':''}</strong><small>${x.params.wind} m/s · ${wave(x.params)} · ${x.result.analysis_start}—${x.result.analysis_end} s</small></span></label>`).join('')||'<p>暂无已完成工况。</p>';
  for(const id of ['export-current','export-csv','report-open','analysis-window','analysis-full','analysis-apply'])$(id).disabled=id==='export-current'?!r:!result;
  renderComparison(plots);
  if(result){
    const review=windowReview(r);
    const idText=`${esc(r.id)} · ${esc(r.created?new Date(r.created).toLocaleString('zh-CN'):'时间未提供')}`;
    $('analysis-provenance-body').innerHTML=`<dl><div><dt>运行记录</dt><dd>${idText}</dd></div><div><dt>工况输入</dt><dd>${r.params.wind} m/s · ${wave(r.params)} · 随机种子 ${r.params.seed} · DT ${r.params.solver_dt} s</dd></div><div><dt>样本与统计</dt><dd>全序列 ${num(result.full_samples,0)} 点；窗口 ${num(result.analysis_samples,0)} 点；采样间隔 ${num(review.min_dt,4)}—${num(review.max_dt,4)} s。时间加权均值、RMS、标准差与发电量使用全部窗口样本。</dd></div><div><dt>曲线与导出</dt><dd>曲线可能抽点，悬停读数取最近的实际采样点；CSV 导出当前工况完整时序，JSON 包含记录与参数。</dd></div><div><dt>输出 SHA-256</dt><dd><code>${esc(result.output_sha256||'未提供，请核查原始文件')}</code></dd></div></dl><div class="analysis-evidence-actions"><button class="secondary" id="analysis-all-sources">模型版本与原始文件 ↗</button><button class="quiet" data-page="records">查看当前运行日志 ↗</button></div>`;
    $('analysis-all-sources').onclick=()=>$('source-dialog').showModal();
  }else $('analysis-provenance-body').textContent='完整结果生成后可查看来源与样本信息。';
}
function delta(value,baseline,okay){const change=relativeChange(value,baseline);return !okay?'窗口不同，不计算变化率':change===null?'基准接近零，不计算变化率':`${change>0?'+':''}${num(change,1)}% 相对基准`;}
function renderComparison(records){
  if(!records.length){$('comparison-table').innerHTML='<div class="empty">当前没有完整结果可供比较。</div>';$('analysis-differences').innerHTML='';return;}
  const base=records[0];
  $('comparison-note').textContent=records.length===1?'当前工况为基准。通过上方“添加对比”选择对照记录。':comparisonNotes(records).join(' ');
  $('analysis-differences').innerHTML=records.slice(1).map(r=>{const changes=parameterChanges(base,r);return `<p><strong>${esc(r.name)}</strong><span>${changes.length?changes.map(x=>`${x.label}：${esc(x.before)} → ${esc(x.after)}`).join('；'):'所有开放输入参数相同'}</span>${changes.length>1?'<em>多个输入变化，不能单独归因。</em>':''}</p>`;}).join('');
  $('comparison-table').innerHTML=`<table><thead><tr><th>工况与条件</th><th>分析窗口 / s</th><th>平均功率 / kW</th><th>纵摇绝对峰值 / °</th><th>纵荡绝对峰值 / m</th><th>窗口发电 / kWh</th></tr></thead><tbody>${records.map((r,i)=>{const s=r.result.stats,b=base.result.stats,okay=comparableWindows(base,r);return `<tr><td><strong><span class="analysis-series-dot" style="--series:${palette[i]}"></span>${esc(r.name)}${i===0?' <span class="analysis-base">基准</span>':''}</strong><small>${r.params.wind} m/s · ${wave(r.params)}<br>种子 ${r.params.seed} · DT ${r.params.solver_dt} s · ${source(r)}</small></td><td>${r.result.analysis_start}—${r.result.analysis_end}</td><td>${num(s.GenPwr.mean)}${i?`<small>${delta(s.GenPwr.mean,b.GenPwr.mean,okay)}</small>`:''}</td><td>${num(s.PtfmPitch.max_abs,2)}${i?`<small>${delta(s.PtfmPitch.max_abs,b.PtfmPitch.max_abs,okay)}</small>`:''}</td><td>${num(s.PtfmSurge.max_abs,2)}</td><td>${num(r.result.energy_kwh,2)}</td></tr>`;}).join('')}</tbody></table>`;
}

function getExtent(){const rows=chart?.record?.result?.series;return rows?.length?[rows[0][0],rows.at(-1)[0]]:[0,1];}
function setRange(mode){if(!chart?.record?.result)return;rangeMode=mode;range=mode==='window'?[chart.record.result.analysis_start,chart.record.result.analysis_end]:null;$('analysis-range-error').textContent='';drawChart();}
$('analysis-full').onclick=()=>setRange('full');$('analysis-window').onclick=()=>setRange('window');
$('analysis-apply').onclick=()=>{const a=$('analysis-start').value,b=$('analysis-end').value,start=Number(a),end=Number(b);if(!a||!b||!validViewRange(start,end,getExtent())){$('analysis-range-error').textContent=`范围须位于 ${getExtent().join('—')} s 内，终点大于起点。`;return;}range=[start,end];rangeMode='custom';$('analysis-range-error').textContent='';drawChart();};
function drawChart(){
  if(!chart)return;
  window.dispatchEvent(new Event('tideflow:analysis-plot-reset'));
  const {record,channel}=chart,all=chart.records.filter(r=>r.result?.channels.includes(channel)),extent=getExtent();
  const visible=all.filter(r=>!hidden.has(r.id));
  $('analysis-full').setAttribute('aria-pressed',String(rangeMode==='full'));
  $('analysis-window').setAttribute('aria-pressed',String(rangeMode==='window'));
  const [xmin,xmax]=range||extent;
  if(document.activeElement!==$('analysis-start'))$('analysis-start').value=xmin;
  if(document.activeElement!==$('analysis-end'))$('analysis-end').value=xmax;
  $('chart-legend').innerHTML=all.map(r=>{const i=chart.records.indexOf(r);return `<button class="analysis-legend-item" data-series="${esc(r.id)}" aria-pressed="${!hidden.has(r.id)}"><svg width="24" height="10" aria-hidden="true"><path d="M0 5H24" stroke="${palette[i]}" stroke-width="2" stroke-dasharray="${dashes[i]}"/></svg><span>${esc(r.name)}${r.id===record?.id?' · 基准':''}</span></button>`;}).join('');
  $('chart-legend').onclick=e=>{const button=e.target.closest('[data-series]');if(!button)return;const id=button.dataset.series;hidden.has(id)?hidden.delete(id):hidden.add(id);drawChart();};
  geometry=null;$('analysis-readout').textContent='移动到曲线上读取实际采样值；也可聚焦图表后按 ← / →，Shift 加速，Home / End 跳到端点。';
  if(!visible.length){$('time-chart').innerHTML=`<div class="empty">${all.length?'曲线已隐藏。点击图例重新显示。':'该记录尚无完整的通道数据，请前往运行与日志检查。'}</div>`;$('analysis-chart-note').textContent='';return;}
  const series=visible.map(r=>({record:r,index:r.result.channels.indexOf(channel),rows:r.result.series.filter(row=>row[0]>=xmin&&row[0]<=xmax)}));
  let ymin=Infinity,ymax=-Infinity;
  for(const item of series)for(const row of item.rows){ymin=Math.min(ymin,row[item.index]);ymax=Math.max(ymax,row[item.index]);}
  if(!Number.isFinite(ymin)){$('time-chart').innerHTML='<div class="empty">此范围内没有实际采样点，请扩大显示范围。</div>';$('analysis-chart-note').textContent='未对不存在的采样点进行插值。';return;}
  const pad=Math.max((ymax-ymin)*.12,Math.abs(ymax)*.015,.01);ymin-=pad;ymax+=pad;if(channel==='GenPwr'&&ymin>0)ymin=0;
  const W=1000,H=350,L=76,R=20,T=30,B=305,w=W-L-R,h=B-T;
  const x=t=>L+(t-xmin)/(xmax-xmin)*w,y=v=>B-(v-ymin)/(ymax-ymin)*h;
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(CHANNELS[channel].label)}真实时序，显示 ${xmin} 至 ${xmax} 秒"><defs><clipPath id="analysis-plot-clip"><rect x="${L}" y="${T}" width="${w}" height="${h}"/></clipPath><clipPath id="analysis-replay-clip"><rect id="analysis-reveal" x="${L}" y="${T}" width="${w}" height="${h}"/></clipPath></defs>`;
  const a=Math.max(xmin,record.result.analysis_start),b=Math.min(xmax,record.result.analysis_end);
  if(b>a)svg+=`<rect x="${x(a)}" y="${T}" width="${x(b)-x(a)}" height="${h}" fill="#81e6e0" opacity=".065"/><path d="M${x(a)} ${T}V${B} M${x(b)} ${T}V${B}" stroke="#81e6e0" stroke-opacity=".5" stroke-dasharray="4 5"/><text x="${x(a)+8}" y="19" fill="#9ededa" font-size="12">基准统计窗口 ${record.result.analysis_start}—${record.result.analysis_end} s</text>`;
  for(let i=0;i<=4;i++){const yy=T+h*i/4,v=ymax-(ymax-ymin)*i/4;svg+=`<path d="M${L} ${yy}H${W-R}" stroke="#d2e9f0" stroke-opacity=".10"/><text x="${L-12}" y="${yy+4}" text-anchor="end" fill="#b1c9d6" font-size="13">${num(v,Math.abs(v)<10?2:0)}</text>`;}
  for(let i=0;i<=6;i++){const t=xmin+(xmax-xmin)*i/6;svg+=`<path d="M${x(t)} ${T}V${B}" stroke="#d2e9f0" stroke-opacity=".05"/><text x="${x(t)}" y="${B+23}" text-anchor="middle" fill="#b1c9d6" font-size="13">${num(t,Number.isInteger(t)?0:1)}</text>`;}
  svg+='<g clip-path="url(#analysis-plot-clip)"><g clip-path="url(#analysis-replay-clip)">';let downsampled=false;
  series.forEach(item=>{const i=chart.records.indexOf(item.record),stride=Math.max(1,Math.ceil(item.rows.length/2200));downsampled||=stride>1;const points=item.rows.filter((_,j)=>j%stride===0);if(item.rows.length&&points.at(-1)!==item.rows.at(-1))points.push(item.rows.at(-1));if(points.length===1)svg+=`<circle cx="${x(points[0][0])}" cy="${y(points[0][item.index])}" r="3" fill="${palette[i]}"/>`;else svg+=`<path d="${points.map((row,j)=>`${j?'L':'M'}${x(row[0]).toFixed(2)},${y(row[item.index]).toFixed(2)}`).join(' ')}" stroke="${palette[i]}" stroke-width="1.65" stroke-dasharray="${dashes[i]}" fill="none" stroke-linejoin="round"/>`;});
  svg+=`</g></g><line id="analysis-crosshair" x1="${L}" x2="${L}" y1="${T}" y2="${B}" stroke="#ecf8fa" opacity="0" stroke-dasharray="3 4"/><text x="${W-R}" y="${H-4}" text-anchor="end" fill="#b1c9d6" font-size="12">时间 / s</text></svg>`;
  const target=$('time-chart');target.innerHTML=svg;target.tabIndex=0;target.setAttribute('role','group');target.setAttribute('aria-label',`${CHANNELS[channel].label}曲线，左右方向键读取采样点`);
  $('analysis-chart-note').textContent=`${downsampled?'曲线已抽点显示':'曲线显示实际输出样本'}；统计使用全部窗口样本。阴影仅标记基准工况窗口。`;
  geometry={xmin,xmax,L,w,W};
  let cursor=xmin;
  const show=t=>{cursor=t;const line=$('analysis-crosshair');if(line){line.setAttribute('x1',x(t));line.setAttribute('x2',x(t));line.setAttribute('opacity','.6');}$('analysis-readout').innerHTML=visible.map(r=>{const row=nearestSample(r.result.series,t),i=r.result.channels.indexOf(channel);return `<span><i style="background:${palette[chart.records.indexOf(r)]}"></i>${esc(r.name)}<strong>${row?num(row[i],3)+' '+CHANNELS[channel].unit:'该时间无数据'}</strong><small>${row?'采样 t = '+num(row[0],3)+' s':''}</small></span>`;}).join('');};
  target.onpointermove=e=>{const rect=target.querySelector('svg').getBoundingClientRect();const local=(e.clientX-rect.left)/rect.width*W;show(Math.max(xmin,Math.min(xmax,xmin+(local-L)/w*(xmax-xmin))));};
  target.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();window.dispatchEvent(new Event('tideflow:replay-pause'));const rows=record.result.series.filter(row=>row[0]>=xmin&&row[0]<=xmax),near=nearestSample(rows,cursor)||rows[0];if(!near)return;let index=rows.indexOf(near);index=e.key==='Home'?0:e.key==='End'?rows.length-1:index+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?10:1);show(rows[Math.max(0,Math.min(rows.length-1,index))][0]);};
  target.onfocus=()=>show(cursor);
  target.onpointerdown=()=>window.dispatchEvent(new CustomEvent('tideflow:replay-seek',{detail:{time:cursor}}));
  window.dispatchEvent(new CustomEvent('tideflow:analysis-plot',{detail:{record,records:visible,channel,start:xmin,end:xmax,width:w,readAt:show}}));
}
window.dispatchEvent(new Event('tideflow:analysis-request'));
