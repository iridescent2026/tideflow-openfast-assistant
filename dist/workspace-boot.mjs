import {initializeWorkspace} from './workspace-startup.mjs?v=1.1.1';
const status=document.getElementById('workspace-loading');
function showFailure(message){
  status.hidden=false;
  status.replaceChildren(document.createTextNode(message));
  const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.onclick=()=>location.reload();status.append(retry);
}
try {
  const failures=await initializeWorkspace(path=>import(path),(state,detail)=>{
    if(state==='engineering-ready')document.documentElement.dataset.workspaceReady='true';
    if(state==='module-error')console.error('Workspace module failed:',detail.path,detail.error);
  });
  status.hidden=true;
  if(failures.length)showFailure('部分功能未能加载，请重新加载页面。');
} catch(error) {
  console.error('Workspace initialization failed:',error);
  showFailure('界面加载未完成，请重新加载以恢复海洋工作空间。');
}
