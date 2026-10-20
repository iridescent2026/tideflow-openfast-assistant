// Presentation helpers; statistics remain computed by core.mjs from all samples.
export const PARAM_LABELS = {wind:'风速',wave_mode:'波浪模式',wave_height:'波高参数',wave_period:'周期参数',seed:'随机种子',solver_dt:'求解步长',duration:'仿真时长',discard:'分析起点'};
export function parameterChanges(base, record) {
  return Object.entries(PARAM_LABELS).filter(([key])=>base.params[key]!==record.params[key]).map(([key,label])=>({key,label,before:base.params[key],after:record.params[key]}));
}
export function comparableWindows(base, record) {
  return !!base?.result && !!record?.result && Math.abs(base.result.analysis_start-record.result.analysis_start)<1e-6 && Math.abs(base.result.analysis_end-record.result.analysis_end)<1e-6;
}
export function relativeChange(value, baseline) {
  return Number.isFinite(value)&&Number.isFinite(baseline)&&Math.abs(baseline)>1e-9 ? (value-baseline)/Math.abs(baseline)*100 : null;
}
export function nearestSample(series, time) {
  if (!series.length || time<series[0][0] || time>series.at(-1)[0]) return null;
  let lo=0,hi=series.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(series[mid][0]<time)lo=mid+1;else hi=mid;}
  return lo>0&&time-series[lo-1][0]<=series[lo][0]-time?series[lo-1]:series[lo];
}
export function validViewRange(start,end,extent) {
  return Number.isFinite(start)&&Number.isFinite(end)&&start>=extent[0]&&end<=extent[1]&&end>start;
}
