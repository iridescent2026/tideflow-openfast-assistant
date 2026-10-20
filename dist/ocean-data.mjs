// Pure data operations shared by the interactive analysis workspace and tests.
export function rowAt(series,time){
 if(!series.length)return null;if(time<=series[0][0])return [...series[0]];if(time>=series.at(-1)[0])return [...series.at(-1)];
 let lo=0,hi=series.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(series[mid][0]<=time)lo=mid;else hi=mid;}
 const a=series[lo],b=series[hi],p=(time-a[0])/(b[0]-a[0]);return a.map((v,i)=>i===0?time:v+(b[i]-v)*p);
}
export function windowRows(series,start,end){if(!series.length||end<=start||end<series[0][0]||start>series.at(-1)[0])return [];const a=Math.max(start,series[0][0]),b=Math.min(end,series.at(-1)[0]);if(b<=a)return [];return [rowAt(series,a),...series.filter(row=>row[0]>a&&row[0]<b),rowAt(series,b)];}
export function windowStats(result,start,end){
 const rows=windowRows(result?.series||[],start,end);if(rows.length<2)return null;const span=rows.at(-1)[0]-rows[0][0],stats={};
 for(let j=1;j<result.channels.length;j++){let sum=0,square=0,min=Infinity,max=-Infinity;for(let i=0;i<rows.length;i++){const v=rows[i][j];min=Math.min(min,v);max=Math.max(max,v);if(i){const dt=rows[i][0]-rows[i-1][0],previous=rows[i-1][j];sum+=dt*(previous+v)/2;square+=dt*(previous*previous+v*v)/2;}}const mean=sum/span;stats[result.channels[j]]={mean,min,max,max_abs:Math.max(Math.abs(min),Math.abs(max)),rms:Math.sqrt(Math.max(0,square/span)),std:Math.sqrt(Math.max(0,square/span-mean*mean))};}
 return {start:rows[0][0],end:rows.at(-1)[0],span,rows,stats,energy_kwh:stats.GenPwr?stats.GenPwr.mean*span/3600:null};
}
export function commonBounds(records){const series=records.map(r=>r.result?.series).filter(s=>s?.length>1);if(!series.length)return null;const min=Math.max(...series.map(s=>s[0][0])),max=Math.min(...series.map(s=>s.at(-1)[0]));return max>min?{min,max}:null;}
export function clampWindow(bounds,start,end,minSpan=.1){const gap=Math.min(Math.max(minSpan,.001),bounds.max-bounds.min);const a=Math.max(bounds.min,Math.min(Number.isFinite(start)?start:bounds.min,bounds.max-gap));const b=Math.max(a+gap,Math.min(Number.isFinite(end)?end:bounds.max,bounds.max));return [a,b];}
export function panWindow(bounds,start,end,delta){const span=end-start,a=Math.max(bounds.min,Math.min(start+delta,bounds.max-span));return [a,a+span];}
export function revealFrame(elapsed,{draw=6000,hold=3000,staticMode=false}={}){if(staticMode)return {progress:1,holding:false};const t=Math.max(0,elapsed)%(draw+hold);return {progress:Math.min(1,t/draw),holding:t>=draw};}
export function logLevel(line){if(/\bfatal\b|aborting|\berror\b(?!s?\s*[:=]?\s*0)|\bfailed\b|exception/i.test(line)&&!/\b(no|0)\s+errors?\b/i.test(line))return 'error';if(/\bwarn(?:ing)?\b|small angle|large rotation/i.test(line))return 'warning';return 'info';}
export function csvCell(value){const s=String(value??'');return '"'+s.replace(/"/g,'""')+'"';}

export function initialWindow(bounds,a,b){const start=Math.max(bounds.min,a),end=Math.min(bounds.max,b);return end-start>=.1?clampWindow(bounds,start,end):[bounds.min,bounds.max];}
