// Compose shared DOM before dependent enhancements; a broken optional scene must
// never prevent engineering, accounts or the real simulation form from loading.
export async function initializeWorkspace(load, report = () => {}) {
  for (const path of ['./pages.mjs?v=1.1.0', './project-enhance.mjs?v=0.7.0', './engineering-reading-detail.mjs?v=0.9.1']) {
    await load(path);
  }
  report('engineering-ready');
  const failures=[];
  for (const path of ['./configure-ocean.mjs?v=1.0.0', './app.mjs?v=1.1.0', './account-ui.mjs?v=0.5.3', './model-explorer.mjs?v=0.6.2', './model-ocean.mjs?v=0.6.1', './configure-lab.mjs?v=1.2.0', './ocean-workspace.mjs?v=1.3.0']) {
    try { await load(path); }
    catch(error) { failures.push({path,error}); report('module-error',{path,error}); }
  }
  return failures;
}
