const SERIES=[{key:'power',label:'平均功率',unit:'kW',color:'#8aede2'},{key:'pitch',label:'纵摇绝对峰值',unit:'°',color:'#edc584'},{key:'surge',label:'纵荡绝对峰值',unit:'m',color:'#baacf3'}];
export function renderRecordedResponse(svg,record,mode='relative'){
 const result=record?.result;if(!result?.series?.length)return;
 const W=900,H=310,L=62,R=28,T=31,B=262;
 const defs=[['GenPwr','发电功率','#8aede2'],['PtfmPitch','平台纵摇','#edc584'],['PtfmSurge','平台纵荡','#baacf3']].slice(0,mode==='power'?1:3);
 const curves=defs.map(([key,label,color])=>({key,label,color,index:result.channels.indexOf(key),scale:mode==='power'?1:Math.max(1e-9,result.series.reduce((m,row)=>Math.max(m,Math.abs(row[result.channels.indexOf(key)])),0))/100})).filter(s=>s.index>=0);
 const start=result.series[0][0],end=result.series.at(-1)[0],values=curves.flatMap(s=>result.series.map(row=>row[s.index]/s.scale));
 let lo=values.reduce((m,v)=>Math.min(m,v),0),hi=values.reduce((m,v)=>Math.max(m,v),0);const pad=Math.max(.1,(hi-lo)*.1);lo-=pad;hi+=pad;
 const x=t=>L+(t-start)/Math.max(.001,end-start)*(W-L-R),y=v=>B-(v-lo)/(hi-lo)*(B-T);
 let html=`<text x="${L}" y="17" fill="#bdd5df" font-size="12">${mode==='power'?'发电功率 / kW':'各通道 / 本工况绝对峰值 %'} · 已保存的真实时序</text>`;
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;html+=`<path d="M${L} ${y(v)}H${W-R}" stroke="#a9d1db" stroke-opacity=".12"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" fill="#a9c5d1" font-size="12">${n(v,0)}</text>`;}
 for(let i=0;i<=6;i++){const t=start+(end-start)*i/6;html+=`<text x="${x(t)}" y="${B+22}" text-anchor="middle" fill="#a9c5d1" font-size="12">${n(t,0)}</text>`;}
 for(const s of curves){const stride=Math.max(1,Math.ceil(result.series.length/1000)),rows=result.series.filter((_,i)=>i%stride===0);if(rows.at(-1)!==result.series.at(-1))rows.push(result.series.at(-1));html+=`<path data-recorded-series="${s.key}" d="${rows.map((row,i)=>`${i?'L':'M'}${x(row[0]).toFixed(2)},${y(row[s.index]/s.scale).toFixed(2)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="1.8"/>`;}
 html+='<text x="872" y="306" text-anchor="end" fill="#a9c5d1" font-size="12">时间 / s</text>';
 svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('aria-label','当前工况已保存的真实响应曲线，模型调速不改写数据');svg.innerHTML=html;
}
const n=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
export function baselinePercent(value,base){return Number.isFinite(value)&&Number.isFinite(base)&&Math.abs(base)>1e-9?(value-base)/Math.abs(base)*100:null;}
export function responseSeries(anchors,baseline,mode='relative'){
  const defs=mode==='power'?SERIES.slice(0,1):SERIES;
  return defs.map(s=>({...s,values:anchors.map(a=>({rpm:a.rpm,value:mode==='power'?a[s.key]:baselinePercent(a[s.key],baseline[s.key])}))})).filter(s=>s.values.every(p=>Number.isFinite(p.value)));
}
export function renderResponseComparison(svg,anchors,baseline,estimate,mode='relative'){
  const curves=responseSeries(anchors,baseline,mode),W=900,H=310,L=62,R=28,T=31,B=262,w=W-L-R,h=B-T;
  const v=curves.flatMap(s=>s.values.map(p=>p.value));if(!v.length){svg.innerHTML='<text x="30" y="80" fill="#b8d1dc">基准接近零，无法计算相对变化；请切换功率视图。</text>';return;}
  let lo=Math.min(0,...v),hi=Math.max(0,...v);const pad=Math.max((hi-lo)*.12,.1);lo-=pad;hi+=pad;
  const minRpm=anchors[0].rpm,maxRpm=anchors.at(-1).rpm,x=rpm=>L+(rpm-minRpm)/(maxRpm-minRpm)*w,y=value=>B-(value-lo)/(hi-lo)*h;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('aria-label',mode==='power'?'平均功率与原工况基准对照，转速插值预览':'功率、纵摇和纵荡相对原工况的变化率，转速插值预览');
  let html=`<defs><linearGradient id="response-range" x2="1"><stop stop-color="#83e9df" stop-opacity=".02"/><stop offset="1" stop-color="#83e9df" stop-opacity=".1"/></linearGradient></defs><rect x="${Math.min(x(baseline.rpm),x(estimate.rpm))}" y="${T}" width="${Math.abs(x(estimate.rpm)-x(baseline.rpm))}" height="${h}" fill="url(#response-range)"/><text x="${L}" y="16" fill="#bfd5dd" font-size="12">${mode==='power'?'平均功率 / kW':'相对原工况变化 / %'}</text>`;
  for(let i=0;i<=4;i++){const value=lo+(hi-lo)*i/4,yy=y(value);html+=`<path d="M${L} ${yy}H${W-R}" stroke="#a9d1db" stroke-opacity=".11"/><text x="${L-10}" y="${yy+4}" text-anchor="end" fill="#a9c5d1" font-size="12">${n(value,mode==='power'?0:1)}</text>`;}
  for(let i=0;i<=5;i++){const rpm=minRpm+(maxRpm-minRpm)*i/5;html+=`<path d="M${x(rpm)} ${T}V${B}" stroke="#a9d1db" stroke-opacity=".06"/><text x="${x(rpm)}" y="${B+23}" text-anchor="middle" fill="#a9c5d1" font-size="12">${n(rpm,2)}</text>`;}
  const baselineY=y(mode==='power'?baseline.power:0);
  html+=`<path d="M${L} ${baselineY}H${W-R}" stroke="#ddeaf0" stroke-opacity=".65" stroke-dasharray="7 5"/><text x="${W-R-5}" y="${Math.max(17,baselineY-8)}" text-anchor="end" fill="#d3e4e9" font-size="11">原工况基准 ${mode==='power'?n(baseline.power)+' kW':'0%'}</text>`;
  curves.forEach((s,i)=>{html+=`<path data-response-series="${s.key}" d="${s.values.map((p,j)=>`${j?'L':'M'}${x(p.rpm)},${y(p.value)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-dasharray="${i===0?'':i===1?'8 4':'2 4'}"/>`;for(const p of s.values)html+=`<circle cx="${x(p.rpm)}" cy="${y(p.value)}" r="3.5" fill="#0c2b3b" stroke="${s.color}" stroke-width="1.5"/>`;const value=mode==='power'?estimate[s.key]:baselinePercent(estimate[s.key],baseline[s.key]);html+=`<circle cx="${x(estimate.rpm)}" cy="${y(value)}" r="5" fill="${s.color}" stroke="#123343" stroke-width="2"/>`;});
  html+=`<path d="M${x(estimate.rpm)} ${T}V${B}" stroke="#d1e8e9" stroke-opacity=".7" stroke-dasharray="3 4"/><text x="${Math.max(126,Math.min(W-126,x(estimate.rpm)))}" y="${H-5}" text-anchor="middle" fill="#c5e9e4" font-size="12">当前 ${n(estimate.rpm,3)} rpm · 转速 / rpm</text>`;
  svg.innerHTML=html;
}
