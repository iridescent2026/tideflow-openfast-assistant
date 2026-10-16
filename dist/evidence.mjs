export function selectKnowledge(entries,question,run){
 const text=(question+' '+(run?.findings||[]).map(f=>f.title).join(' ')).toLowerCase();
 return entries.map(e=>({entry:e,score:e.keywords.filter(k=>text.includes(k.toLowerCase())).length})).sort((a,b)=>b.score-a.score).filter(x=>x.score>0).slice(0,3).map(x=>x.entry);
}
export function comparisonNotes(records){
 if(records.length<2)return ['选择至少两个工况进行对照。'];
 const first=records[0],notes=[];
 const fields={wind:'风速',wave_height:'波高参数',wave_period:'周期参数',wave_mode:'波浪模式',seed:'随机种子',solver_dt:'求解步长',duration:'时长',discard:'分析起点'};
 for(const r of records.slice(1)){
  const changed=Object.keys(fields).filter(k=>(r.params[k]??(k==='solver_dt'?.0125:null))!==(first.params[k]??(k==='solver_dt'?.0125:null)));
  notes.push(`${r.name} 对比 ${first.name}：${changed.length?'改变 '+changed.map(k=>fields[k]).join('、'):'参数相同'}。${changed.length>1?'存在多个变化，不能把差异归因于单一因素。':''}`);
  if(r.case!==first.case||r.provenance?.rtest_sha!==first.provenance?.rtest_sha)notes.push('参考模型或版本不同，需核对可比性。');
  if(r.source_kind==='imported-unverified'||first.source_kind==='imported-unverified')notes.push('含导入结果，参数与来源待核验。');
 }
 if(records.some(r=>r.params.discard!==first.params.discard||r.params.duration!==first.params.duration))notes.push('分析窗口不一致，统计不可直接公平比较。');
 if(records.some(r=>r.params.wave_mode==='irregular'))notes.push('不规则波应比较多个随机种子及充分的统计时长。');
 return [...new Set(notes)];
}
export function windowReview(run){
 if(!run?.result)return {notes:['尚无完整结果。'],channels:[]};
 const r=run.result,rows=r.series.filter(row=>row[0]>=r.analysis_start&&row[0]<=r.analysis_end),middle=(r.analysis_start+r.analysis_end)/2;
 const halves=[rows.filter(row=>row[0]<=middle),rows.filter(row=>row[0]>=middle)];
 const metrics=values=>{if(values.length<2)return null;let a=0,b=0;for(let i=1;i<values.length;i++){const dt=values[i][0]-values[i-1][0];a+=dt*(values[i][1]+values[i-1][1])/2;b+=dt*(values[i][1]**2+values[i-1][1]**2)/2;}const span=values.at(-1)[0]-values[0][0];return {mean:a/span,rms:Math.sqrt(b/span)};};
 const channels=['GenPwr','PtfmPitch','PtfmSurge'].map(name=>{const index=r.channels.indexOf(name),parts=halves.map(h=>metrics(h.map(row=>[row[0],row[index]])));if(index<0||parts.some(p=>!p))return null;return {name,first:parts[0].mean,second:parts[1].mean,relative_shift:Math.abs(parts[1].mean-parts[0].mean)/Math.max(parts[0].rms,parts[1].rms,1e-9)};}).filter(Boolean);
 let minDt=Infinity,maxDt=0;for(let i=1;i<r.series.length;i++){const dt=r.series[i][0]-r.series[i-1][0];minDt=Math.min(minDt,dt);maxDt=Math.max(maxDt,dt);}
 const notes=[`窗口 ${r.analysis_start}—${r.analysis_end} s，前后半窗均值变化仅作过渡检查，不构成稳态判定。`];
 if(maxDt-minDt>1e-5)notes.push('输出采样间隔不均匀，存在缺口或变步长；需检查原始输出。');
 if(run.params.duration<=300)notes.push('当前是短时演示，应补充更长时长和窗口敏感性检查。');
 if(run.source_kind==='imported-unverified')notes.push('工况参数来自用户声明，未独立核验。');
 return {notes,channels,min_dt:minDt,max_dt:maxDt};
}
export function aiContext(run,question,knowledge,draft){return {
 name:run.name,status:run.status,source_kind:run.source_kind,params:run.params,
 draft_params:draft,draft_requires_run:!!draft&&['wind','wave_height','wave_period','wave_mode','duration','discard','seed','solver_dt'].some(k=>draft[k]!==run.params[k]),
 stats:run.result?.stats,energy_kwh:run.result?.energy_kwh,analysis_start:run.result?.analysis_start,analysis_end:run.result?.analysis_end,
 output_sha256:run.result?.output_sha256,findings:run.findings,log_excerpt:run.logs.slice(-50),window_review:windowReview(run),
 references:selectKnowledge(knowledge,question,run),limits:['公开参考模型，人工设定工况','未完成专业复核及工程认证','前后半窗差异小不自动证明稳态','不得外推全年发电或结构安全']};}
