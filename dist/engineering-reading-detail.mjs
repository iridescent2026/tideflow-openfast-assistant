import './engineering-reading.mjs?v=0.9.0';

const deep=document.getElementById('principle-deep');
const descriptions=['带透视层次的风浪环境示意','半透明机舱与风轮耦合关系示意','多层响应曲线原理示意，非仿真输出'];
deep.querySelectorAll('.tidal-step-visual').forEach((visual,i)=>{
  visual.innerHTML=`<div class="tidal-sprite-window tidal-sprite-${i}"><img src="./assets/tidal-principle-art-hd.png" alt="${descriptions[i]}" decoding="async" loading="lazy"></div>`;
  if(i===1)visual.insertAdjacentHTML('beforeend','<span class="tidal-diagram-label input-label">环境载荷</span><span class="tidal-diagram-label state-label">机组状态</span><span class="tidal-diagram-label control-label">控制动作</span><span class="tidal-diagram-label solver-label">耦合求解</span>');
});
deep.querySelector('.tidal-platform').innerHTML='<img src="./assets/tidal-platform-hd.png" alt="银白半透明浮式平台、支撑与系泊三维结构原理插图" loading="lazy" decoding="async">';

// Keep the original module IDs so topic selection continues updating both columns.
const moduleCard=deep.querySelector('.atlas-module-reading');
const right=deep.querySelector('.atlas-accordions');
const tools=right.querySelector('.tidal-reading-tools');
const legacy=document.createElement('div');legacy.hidden=true;
legacy.append(document.getElementById('atlas-question'),document.getElementById('atlas-answer'),document.getElementById('atlas-boundary'));
const info=document.createElement('section');info.className='tidal-module-info';
info.setAttribute('aria-label','当前模块说明');
info.innerHTML='<span class="tidal-section-label">MODULE NOTES / 模块说明</span>';
info.append(document.getElementById('atlas-reading-title'),document.getElementById('atlas-reading-text'),document.getElementById('atlas-reading-specs'));
const aiPanel=document.createElement('section');aiPanel.className='tidal-ask-ai';
aiPanel.innerHTML=`<div class="tidal-ai-heading"><h3>✧ 问问 AI</h3><button type="button" class="tidal-ai-connect">连接 AI ↗</button></div><p class="tidal-ai-hint">结合当前模块，继续了解原理与参数。</p><form class="tidal-ai-form"><label class="visually-hidden" for="tidal-ai-question">你想了解什么？</label><textarea id="tidal-ai-question" maxlength="600" rows="2" placeholder="例如：波高和周期会怎样影响平台运动？" required></textarea><div class="tidal-ai-submit"><small>问题与模块说明将发送至已连接模型</small><button type="submit">发送问题 ↗</button></div></form><p class="tidal-ai-answer" role="status" aria-live="polite" hidden></p>`;
right.replaceChildren(info,aiPanel,tools,legacy);
moduleCard.classList.add('tidal-image-card');
let requestId=null;
const form=aiPanel.querySelector('form'),question=aiPanel.querySelector('textarea'),answer=aiPanel.querySelector('.tidal-ai-answer'),send=aiPanel.querySelector('[type=submit]');
aiPanel.querySelector('.tidal-ai-connect').onclick=()=>document.getElementById('model-open').click();
form.onsubmit=e=>{
  e.preventDefault();const text=question.value.trim();if(!text||send.disabled)return;
  requestId=crypto.randomUUID();send.disabled=true;send.textContent='正在回答…';answer.hidden=false;answer.textContent='正在结合当前模块说明请求 AI…';
  window.dispatchEvent(new CustomEvent('tideflow:engineering-ask',{detail:{requestId,question:text,module:{name:moduleCard.querySelector('.kicker').textContent,title:info.querySelector('h3').textContent,description:info.querySelector('p').textContent,fields:info.querySelector('dl').textContent}}}));
};
window.addEventListener('tideflow:engineering-answer',e=>{
  if(e.detail.requestId!==requestId)return;
  send.disabled=false;send.textContent='发送问题 ↗';answer.textContent=e.detail.text;
});
new MutationObserver(()=>{requestId=null;send.disabled=false;send.textContent='发送问题 ↗';answer.hidden=true;}).observe(document.getElementById('page-engineering'),{attributes:true,attributeFilter:['data-topic']});
