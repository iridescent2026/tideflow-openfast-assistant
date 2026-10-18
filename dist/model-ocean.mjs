// Composes the selected reference design around the existing interactive model.
const modelPage=document.getElementById('page-model');
const heading=modelPage.querySelector('.page-heading');heading.querySelector('p').textContent='三维结构探索';
const inspector=modelPage.querySelector('.part-inspector');
const frame=document.createElementNS('http://www.w3.org/2000/svg','svg');frame.classList.add('inspector-frame');frame.setAttribute('viewBox','0 0 100 100');frame.setAttribute('preserveAspectRatio','none');frame.setAttribute('aria-hidden','true');frame.innerHTML='<path d="M2 .15H92.3L99.85 4.5V98Q99.85 99.85 98 99.85H7.7L.15 95.5V2Q.15 .15 2 .15Z"/>';inspector.prepend(frame);
const foot=document.createElement('div');foot.className='ocean-inspector-foot';foot.textContent='参考结构 · 视觉示意';inspector.append(foot);
const icons={overview:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',front:'<rect x="3" y="8" width="18" height="12"/><path d="M7 20V11m5 9v-5m5 5V11M12 2v3M9 4l3-2 3 2"/>',top:'<path d="m12 3 9 8-9 8-9-8Z M7 15l5 5 5-5 M12 1v3M2 11h3M19 11h3"/>',fullscreen:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>'};
const captions={overview:'全景',front:'正视',top:'俯视',fullscreen:'全屏'};
for(const [mode,path] of Object.entries(icons)){const button=modelPage.querySelector(`[data-view="${mode}"]`);button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg><span>${captions[mode]}</span>`;button.setAttribute('aria-label',captions[mode]);}
modelPage.querySelector('[data-view=overview]').classList.add('active');
modelPage.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b||!['overview','front','top'].includes(b.dataset.view))return;modelPage.querySelectorAll('.stage-tools button').forEach(x=>x.classList.toggle('active',x===b));});
const stage=document.getElementById('model-stage');stage.insertAdjacentHTML('beforeend','<div class="ocean-depth" aria-hidden="true"><span>结构空间</span><i>VIEW / 示意景深</i></div><div class="ocean-compass" aria-hidden="true"><svg viewBox="0 0 30 58"><text x="15" y="9" fill="#9fc9d8" text-anchor="middle" font-size="10">N</text><ellipse cx="15" cy="35" rx="10" ry="18" fill="none" stroke="#509bb3"/><path d="m15 19-5 17 5-5 5 5Z" fill="#9ee7ed"/><path d="m15 51-5-15 5 4 5-4Z" fill="#236983"/></svg><p>OC4 / NREL 5 MW<small>模型结构 · 视觉示意</small></p></div>');
document.getElementById('account-launch')?.setAttribute('aria-label','登录或编辑个人资料');
let hasEntered=false;
function navigation(){if(document.body.dataset.page!=='model')return;if(!hasEntered&&innerWidth>900){hasEntered=true;const button=document.getElementById('sidebar-toggle');if(innerWidth>900&&button.getAttribute('aria-expanded')==='false')button.click();}}
new MutationObserver(navigation).observe(document.body,{attributes:true,attributeFilter:['data-page']});navigation();window.addEventListener('resize',navigation);
document.addEventListener('fullscreenchange',()=>{const button=modelPage.querySelector('[data-view=fullscreen]');button.querySelector('span').textContent=document.fullscreenElement?'退出':'全屏';button.setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏');});
