const { chromium } = require('C:/Users/12169/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/12169/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const results = [];
  for (const viewport of [{width:1920,height:1080},{width:1280,height:720}]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:8767/', {waitUntil:'networkidle'});
    await page.waitForSelector('.op-paper', {state:'attached'});
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('tideflow:navigate', {detail:'reports'})));
    await page.waitForFunction(() => document.body.dataset.page === 'reports');
    await page.waitForTimeout(300);
    const dimensions = () => {
      const selectors = ['.ow-reports','.ow-reports>.ow-content','.op-grid','.op-outline','.op-reader','.op-paper','.op-paper .report-body','.op-evidence'];
      const elements = Object.fromEntries(selectors.map(selector => {
        const el = document.querySelector(selector), r = el?.getBoundingClientRect(), s=el&&getComputedStyle(el);
        return [selector,el?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,overflowY:s.overflowY,minHeight:s.minHeight,gridTemplateRows:s.gridTemplateRows}:null];
      }));
      return {viewport:{width:innerWidth,height:innerHeight},page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},elements};
    };
    const initial = await page.evaluate(dimensions);
    const screenshot = path.join(__dirname, `report-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({path:screenshot});
    await page.evaluate(() => {
      const paper=document.querySelector('.op-paper');
      const report=paper.querySelector('.report-body') || paper.appendChild(Object.assign(document.createElement('article'),{className:'report-body'}));
      report.insertAdjacentHTML('beforeend','<h2>长正文布局检查</h2>'+Array.from({length:40},(_,i)=>'<p>报告校验段落 '+i+'：本检查仅验证长正文始终在报告区域内独立滚动，主要操作与依据面板保留在同一视口。</p>').join(''));
    });
    const longContent = await page.evaluate(dimensions);
    results.push({viewport,initial,longContent,screenshot});
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname,'report-layout-qa.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
