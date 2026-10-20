// One opening composition: model, simulation summary and live trace.
const page=document.getElementById('page-analysis');
page.classList.add('analysis-hero-layout');
const hero=document.createElement('section');hero.className='analysis-opening';hero.setAttribute('aria-label','风机与仿真结果总览');
const model=document.createElement('div');model.className='opening-model';
model.innerHTML='<div class="opening-model-title"><span>ROTOR / LIVE EXPLORATION</span><h2>让响应，看得见。</h2></div>';
model.append(page.querySelector('.speed-scene'));
const control=document.createElement('div');control.className='opening-speed';
for(const selector of ['.speed-controls>label','#speed-input','#speed-rotation-period','.speed-range','#speed-unavailable'])control.append(page.querySelector(selector));
model.append(control);
const results=document.createElement('div');results.className='opening-results';results.append(page.querySelector('.metrics'),page.querySelector('.analysis-deck'));
hero.append(model,results);page.querySelector('.analysis-state').after(hero);
page.querySelector('.analysis-focus-nav').remove();
page.querySelector('.analysis-heading p').textContent='风机动态、真实响应与工况对照，一屏掌握。';
const settings=document.createElement('details');settings.className='opening-settings';settings.innerHTML='<summary>显示范围与回放说明</summary>';
const range=page.querySelector('.analysis-chart-tools');
if(range)settings.append(range);
const replayNote=page.querySelector('.analysis-replay>p');if(replayNote)settings.append(replayNote);
page.querySelector('.chart-legend').after(settings);
settings.append(page.querySelector('.analysis-readout'));
settings.append(page.querySelector('.analysis-chart-note'));
const caption=page.querySelector('.speed-scene-footer>span');caption.textContent='精细视觉模型 · 非工程几何';
window.dispatchEvent(new Event('tideflow:analysis-request'));


// Keep a faint full-result reference visible while the bright trace replays.
function addTraceReference(){
 const live=document.querySelector('#time-chart g[clip-path="url(#analysis-replay-clip)"]');
 if(!live||live.parentNode.querySelector('[data-trace-reference]'))return;
 const reference=live.cloneNode(true);reference.removeAttribute('clip-path');reference.setAttribute('data-trace-reference','');reference.setAttribute('opacity','.24');reference.setAttribute('aria-hidden','true');reference.style.pointerEvents='none';live.before(reference);
}
window.addEventListener('tideflow:analysis-plot',addTraceReference);
addTraceReference();

// Lead with the graph; contextual statistics remain available in one disclosure.
const dataDetails=document.createElement('details');dataDetails.className='opening-data-details';
dataDetails.innerHTML='<summary><span>工况与数据详情</span><span>统计指标 / 来源 / 导出 ↘</span></summary>';
hero.after(dataDetails);
const selection=page.querySelector('.analysis-selection'),runLabel=selection.querySelector(':scope>label');
runLabel.classList.add('opening-run-select');
const chartHead=page.querySelector('.trace-card>.card-head');chartHead.append(runLabel);
dataDetails.append(page.querySelector('.result-toolbar'),selection,page.querySelector('.metrics'));
dataDetails.append(page.querySelector('.analysis-heading-actions'));
dataDetails.append(page.querySelector('#export-csv'));
page.querySelector('.analysis-quick-compare .quick-label').textContent='对照';
page.addEventListener('click',event=>{if(event.target.closest('#analysis-more-comparison'))dataDetails.open=true;},true);
