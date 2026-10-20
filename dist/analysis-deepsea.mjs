// Approved deep-sea concept: real controls and results above a separate image asset.
const page=document.getElementById('page-analysis'),q=s=>page.querySelector(s),by=id=>document.getElementById(id);
page.classList.add('deepsea-design');
const icons={home:'<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/>',configure:'<path d="M3 5h7l2 3h9v13H3z M6 13h3l2-3 3 7 2-4h3"/>',analysis:'<path d="M3 3v18h18 M7 16v-5 M12 16V7 M17 16V4"/>',model:'<path d="m12 3 8 5v9l-8 5-8-5V8z M4 8l8 5 8-5 M12 13v9"/>',records:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v13c0 4 16 4 16 0V5 M4 11c0 4 16 4 16 0"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">${icons[name]}</svg>`;
const header=document.createElement('header');header.className='deepsea-header';
header.innerHTML='<a href="#home" class="deepsea-brand"><img src="./assets/tidal-mark.svg" alt=""><strong>潮汐</strong><span>TIDEFLOW</span></a><span class="deepsea-product">海上风电工程仿真与分析平台 <b>|</b> OpenFAST</span><div class="deepsea-header-right"><span class="deepsea-edition"><i></i>01 / 深海工业</span><span id="deepsea-condition"></span><button id="deepsea-help" aria-label="使用指南">?</button><button id="deepsea-account">工程师 <span>⌄</span></button></div>';
const rail=document.createElement('nav');rail.className='deepsea-rail';rail.setAttribute('aria-label','深海分析导航');
rail.innerHTML=[['home','项目'],['configure','工况'],['analysis','结果分析'],['model','模型设置'],['records','数据管理']].map(([key,label])=>`<button data-page="${key}" ${key==='analysis'?'aria-current="page"':''}>${icon(key)}<span>${label}</span></button>`).join('');
document.body.append(header,rail);
by('deepsea-help').onclick=()=>by('help-open').click();by('deepsea-account').onclick=()=>by('account-launch').click();
q('.analysis-heading h1').textContent='结果分析';q('.analysis-heading p').textContent='从响应，看机理，让风电更可靠。';
q('.analysis-heading').insertAdjacentHTML('beforeend','<div class="deepsea-heading-stamp"><span>OFFSHORE WIND<br>ENGINEERING ANALYTICS</span><b>TIDEFLOW<small>01 / 深海工业</small></b></div>');
q('.opening-model-title').innerHTML='<span>FLOATING<br>OFFSHORE WIND<br>SEMI-SUBMERSIBLE</span><i></i>';
q('.opening-model').insertAdjacentHTML('afterbegin','<div class="deepsea-compass" aria-hidden="true"><span>N</span><i></i><b>＋</b></div>');
q('.opening-model').insertAdjacentHTML('beforeend','<span class="deepsea-model-caption">NREL 5 MW / OC4<br>工程视觉示意</span>');
const trace=q('.trace-card'),bar=document.createElement('div');bar.className='deepsea-chartbar';trace.prepend(bar);
bar.append(q('.chart-tabs'),q('.opening-run-select'));
const advanced=document.createElement('div');advanced.className='deepsea-extra-channels';advanced.setAttribute('aria-label','其他时序指标');
for(const button of [...q('.chart-tabs').children].slice(4))advanced.append(button);
q('.opening-settings').append(advanced);
q('.card-head h2').innerHTML='时序结果 <span>Time Series Results</span>';
const replay=q('.analysis-replay');q('.opening-settings').append(replay);
q('.card-head').append(by('replay-toggle'));by('replay-toggle').classList.add('deepsea-play');
q('.opening-settings').append(by('analysis-quick-compare'));
q('.opening-settings summary').textContent='回放、对照与显示设置';
q('.speed-scene-footer').classList.add('deepsea-model-tools');
q('.opening-data-details>summary').innerHTML='<span>⇄　 工况与数据详情</span><span>⌄</span>';
const colors=['#56e7f1','#ffbd4b','#a77aff','#89a9ff'];
const sourceColors=['#80e3e0','#e9c47b','#b7a5ed','#e89eb0'];
const lineColor=el=>colors[sourceColors.indexOf(el.getAttribute('stroke'))]||el.getAttribute('stroke');
function styleChart(){
 const live=by('time-chart').querySelector('g[clip-path="url(#analysis-replay-clip)"]');
 if(live){[...live.children].forEach((el,i)=>{el.setAttribute('stroke',lineColor(el));el.removeAttribute('stroke-dasharray');el.setAttribute('stroke-width','1.75');});}
 const ghost=by('time-chart').querySelector('[data-trace-reference]');if(ghost)[...ghost.children].forEach((el,i)=>{el.setAttribute('stroke',lineColor(el));el.removeAttribute('stroke-dasharray');});
 by('time-chart').querySelector('svg')?.setAttribute('preserveAspectRatio','none');
 by('chart-legend').querySelectorAll('path').forEach((el,i)=>{el.setAttribute('stroke',lineColor(el));el.removeAttribute('stroke-dasharray');});
 by('chart-legend').querySelectorAll('button').forEach((button,i)=>button.style.setProperty('--series-color',colors[i%colors.length]));
}
window.addEventListener('tideflow:analysis-plot',styleChart);
window.addEventListener('tideflow:render',e=>{const r=e.detail.record;if(!r?.params)return;const p=r.params;by('deepsea-condition').textContent=`≋　海况 ${p.wave_mode==='regular'?'H':'Hs'} ${p.wave_height} m　 |　 T ${p.wave_period} s　 |　 风速 ${p.wind} m/s`;});
// A newly drawn chart replaces the real legend; apply its colors after render.
window.addEventListener('tideflow:chart',()=>queueMicrotask(styleChart));
window.dispatchEvent(new Event('tideflow:analysis-request'));styleChart();
function paintRotorFill(){const slider=by('speed-input'),a=Number(slider.min),b=Number(slider.max);slider.style.setProperty('--rotor-fill',(b>a?100*(Number(slider.value)-a)/(b-a):0)+'%');}
by('speed-input').addEventListener('input',paintRotorFill);
window.addEventListener('tideflow:speed-preview',paintRotorFill);
window.dispatchEvent(new Event('tideflow:speed-refresh'));paintRotorFill();
const tooltip=by('analysis-readout');tooltip.classList.add('deepsea-tooltip');trace.append(tooltip);
by('time-chart').addEventListener('pointerenter',()=>trace.classList.add('deepsea-reading'));
by('time-chart').addEventListener('pointerleave',()=>trace.classList.remove('deepsea-reading'));
by('time-chart').addEventListener('pointermove',event=>{const bounds=trace.getBoundingClientRect();tooltip.style.left=Math.max(12,Math.min(bounds.width-240,event.clientX-bounds.left+18))+'px';tooltip.style.top=Math.max(105,event.clientY-bounds.top-90)+'px';});

