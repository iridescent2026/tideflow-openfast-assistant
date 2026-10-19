import './engineering-reading-detail.mjs?v=0.9.1';

const $=id=>document.getElementById(id),page=$('page-configure'),form=$('case-form');
const card=page.querySelector('.config-card'),explainer=page.querySelector('.config-explainer');
const inputs=Object.fromEntries(['case-name','wind','wave-mode','wave-height','wave-period','duration','discard','seed','solver-dt','wind-value','draft-note'].map(id=>[id,$(id)]));
const run=$('run-button'),reset=$('reset-config'),notes=page.querySelector('.parameter-notes');
const validation=$('config-validation'),values=page.querySelector('.draft-values');
const summaryIds=['draft-duration','draft-window','draft-dt'].map(id=>$(id));
const icon=id=>({wind:'<path d="M3 8h17m-4-4c5-5 10 5 2 5M3 14h22m-7 4c5 5 10-5 2-5M4 20h8"/>',wave:'<path d="M2 8q5-6 11 0t11 0M2 15q5-6 11 0t11 0M2 22q5-6 11 0t11 0"/>',pulse:'<path d="M2 16h5l4-12 5 21 4-12 3 3h4"/>'}[id]);
const svg=id=>`<svg viewBox="0 0 28 28" aria-hidden="true">${icon(id)}</svg>`;
const field=(id,label)=>{const wrap=document.createElement('div');wrap.className='console-field';const text=document.createElement('label');text.htmlFor=id;text.textContent=label;if(id==='wave-height'||id==='wave-period')text.id=id+'-label';wrap.append(text,inputs[id]);return wrap;};

page.classList.add('ocean-console');
const heading=page.querySelector('.page-heading');
heading.className='console-heading';heading.innerHTML='<div><h1>工况配置 <span>SET THE CONDITIONS</span></h1><p>定义风与浪，开始一次真实计算。</p></div><nav class="console-progress" aria-label="配置步骤"><button type="button" data-console-step="environment" aria-current="step"><b>1</b><span>环境设置</span></button><button type="button" data-console-step="solver"><b>2</b><span>求解设置</span></button><button type="button" data-console-step="submit"><b>3</b><span>提交运行</span></button></nav>';

const environment=document.createElement('section');environment.className='console-environment';
environment.innerHTML='<div class="console-section-head"><h2><em>01</em> 环境参数</h2><button type="button" class="console-help">ⓘ 参数怎么选？</button></div>';
environment.append(field('case-name','工况名称'));
const wind=document.createElement('div');wind.className='console-wind';wind.innerHTML=`<label for="wind">风速</label><div class="console-wind-readout"><strong><span id="console-wind-output"></span><small> m/s</small></strong>${svg('wind')}</div><div class="console-slider"></div><div class="console-range"><span>4</span><span>18</span></div>`;
wind.querySelector('.console-slider').append(inputs.wind);inputs['wind-value'].className='visually-hidden';wind.append(inputs['wind-value']);environment.append(wind);
const waves=document.createElement('div');waves.className='console-wave-mode';waves.innerHTML=`<label for="wave-mode">波浪类型</label><div class="console-wave-options" role="group" aria-label="波浪类型"><button type="button" data-wave-mode="regular">规则波</button><button type="button" data-wave-mode="irregular">JONSWAP</button>${svg('wave')}</div>`;
inputs['wave-mode'].classList.add('visually-hidden');inputs['wave-mode'].tabIndex=-1;inputs['wave-mode'].setAttribute('aria-hidden','true');waves.append(inputs['wave-mode']);environment.append(waves);
const pair=document.createElement('div');pair.className='console-pair';pair.append(field('wave-height','波高 H / m'),field('wave-period','周期 T / s'));environment.append(pair);
const seed=field('seed','波浪随机种子 · 可复现');seed.classList.add('console-seed');environment.append(seed);
const solver=document.createElement('section');solver.className='console-solver';solver.innerHTML='<div class="console-section-head"><h2><em>02</em> 求解设置</h2></div>';
const solverFields=document.createElement('div');solverFields.className='console-solver-fields';solverFields.append(field('duration','仿真时长 / s'),field('discard','分析起点 / s'),field('solver-dt','求解步长 / s'));solver.append(solverFields);
form.replaceChildren(environment,solver,inputs['draft-note']);
card.replaceChildren(form);card.className='console-parameters';

const scene=document.createElement('section');scene.className='console-scene';scene.setAttribute('aria-label','固定参考模型与当前输入预览');
scene.innerHTML='<span class="console-model-label">OC4 / NREL 5 MW · 参考模型</span><svg class="console-scene-overlay" viewBox="0 0 800 600" aria-hidden="true"><defs><marker id="console-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6 2 3Z" fill="#b8efff"/></marker></defs><ellipse cx="405" cy="277" rx="340" ry="66" fill="none" stroke="#8fe5ff" stroke-width="1" stroke-dasharray="6 7" opacity=".5"/><g fill="none" stroke="#bcf3ff" stroke-width="1.2" marker-end="url(#console-arrow)" opacity=".7">'+Array.from({length:12},(_,i)=>`<path d="M${430+i%4*78} ${170+Math.floor(i/4)*29}l25-9"/>`).join('')+'</g><g fill="none" stroke="#5adaf2" stroke-width=".7" opacity=".4">'+Array.from({length:7},(_,i)=>`<path d="M620 ${470+i*10}C540 ${400+i*8} 725 ${420+i*8} 810 ${390+i*11}"/>`).join('')+'</g></svg><small class="console-scene-note">参考模型视觉示意 · 非仿真结果</small><div class="console-metrics"></div>';
values.className='console-draft-values';values.querySelectorAll(':scope>div').forEach((node,i)=>node.insertAdjacentHTML('afterbegin',svg(['wind','wave','pulse'][i])));
scene.querySelector('.console-metrics').append(values);scene.querySelector('.console-metrics').insertAdjacentHTML('beforeend','<div class="console-fixed"><span>水深 <b>200 m</b></span><span>波向 <b>0°</b></span></div>');
const layout=page.querySelector('.configure-layout');layout.className='console-layout';layout.replaceChildren(card,scene);

const dock=document.createElement('div');dock.className='console-dock';dock.innerHTML='<div class="console-check"><span class="console-check-icon" aria-hidden="true">✓</span></div><div class="console-runtime"><span>提交后调用本机 OpenFAST</span><span class="console-window">分析窗口 </span></div><div class="console-dock-actions"></div>';
dock.querySelector('.console-check').append(validation);dock.querySelector('.console-window').append(summaryIds.find(node=>node.id==='draft-window'));
run.setAttribute('form','case-form');reset.setAttribute('form','case-form');dock.querySelector('.console-dock-actions').append(reset,run);page.append(dock);
const hidden=document.createElement('div');hidden.hidden=true;hidden.append(...summaryIds.filter(node=>node.id!=='draft-window'));page.append(hidden);
const banner=$('mode-banner');banner.classList.add('console-service-details');page.append(banner);

const help=document.createElement('dialog');help.className='console-help-dialog';help.innerHTML='<div class="dialog-head"><h2>工况参数指南</h2><button type="button" class="close" aria-label="关闭参数指南">×</button></div>';
notes.open=true;help.append(notes);document.body.append(help);help.querySelector('button').onclick=()=>help.close();environment.querySelector('.console-help').onclick=()=>help.showModal();

function sync(){
 const irregular=inputs['wave-mode'].value==='irregular';seed.hidden=!irregular;
 page.querySelectorAll('[data-wave-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.waveMode===inputs['wave-mode'].value);b.setAttribute('aria-pressed',String(b.dataset.waveMode===inputs['wave-mode'].value));});
 $('console-wind-output').textContent=Number(inputs.wind.value).toFixed(1);inputs.wind.style.setProperty('--wind-fill',((Number(inputs.wind.value)-4)/14*100)+'%');
 dock.classList.toggle('invalid',validation.classList.contains('invalid'));dock.querySelector('.console-check-icon').textContent=validation.classList.contains('invalid')?'!':'✓';
}
page.querySelectorAll('[data-wave-mode]').forEach(button=>button.onclick=()=>{inputs['wave-mode'].value=button.dataset.waveMode;inputs['wave-mode'].dispatchEvent(new Event('input',{bubbles:true}));inputs['wave-mode'].dispatchEvent(new Event('change',{bubbles:true}));});
form.addEventListener('input',sync);form.addEventListener('change',sync);window.addEventListener('tideflow:render',sync);reset.addEventListener('click',()=>queueMicrotask(sync));
heading.querySelectorAll('[data-console-step]').forEach(button=>button.onclick=()=>{const id=button.dataset.consoleStep,target=id==='environment'?inputs['case-name']:id==='solver'?inputs.duration:run;target.focus();});
form.addEventListener('focusin',e=>{const step=e.target.closest('.console-solver')?'solver':'environment';heading.querySelectorAll('[data-console-step]').forEach(b=>{if(b.dataset.consoleStep===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});});
run.addEventListener('focus',()=>heading.querySelectorAll('[data-console-step]').forEach(b=>{if(b.dataset.consoleStep==='submit')b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}));
sync();
