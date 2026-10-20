// A visual interpolation between compatible completed runs, never a new solver run.
const SAME=['wave_mode','wave_height','wave_period','seed','solver_dt','duration','discard'];
export function speedAnchors(records,base){
  if(!base?.result||base.source_kind==='imported-unverified'||!base.provenance?.rtest_sha)return [];
  const compatible=records.filter(r=>r.status==='completed'&&r.result&&r.source_kind!=='imported-unverified'&&r.case===base.case&&r.engine_version===base.engine_version&&r.provenance?.rtest_sha===base.provenance.rtest_sha&&r.provenance?.engine_sha256===base.provenance.engine_sha256&&SAME.every(k=>r.params[k]===base.params[k])&&r.result.analysis_start===base.result.analysis_start&&r.result.analysis_end===base.result.analysis_end);
  const anchors=compatible.map(r=>({id:r.id,name:r.name,rpm:r.result.stats.RotSpeed.mean,wind:r.params.wind,power:r.result.stats.GenPwr.mean,pitch:r.result.stats.PtfmPitch.max_abs,surge:r.result.stats.PtfmSurge.max_abs,energy:r.result.energy_kwh})).filter(a=>Object.entries(a).every(([k,v])=>['id','name'].includes(k)||Number.isFinite(v))).sort((a,b)=>a.rpm-b.rpm);
  // Equal mean speeds cannot define a single valued speed-response relationship.
  const unique=anchors.filter((a,i)=>!i||Math.abs(a.rpm-anchors[i-1].rpm)>.001);
  return unique.length>1&&unique.at(-1).rpm-unique[0].rpm>.02?unique:[];
}
export function estimateAtSpeed(anchors,rpm){
  if(anchors.length<2||!Number.isFinite(rpm)||rpm<anchors[0].rpm-1e-9||rpm>anchors.at(-1).rpm+1e-9)return null;
  const exact=anchors.find(a=>Math.abs(a.rpm-rpm)<1e-8);
  if(exact)return {...exact,kind:'record',lower:exact,upper:exact};
  const index=anchors.findIndex(a=>a.rpm>rpm);if(index<=0)return null;
  const lower=anchors[index-1],upper=anchors[index],f=(rpm-lower.rpm)/(upper.rpm-lower.rpm);
  const result={rpm,kind:'estimate',lower,upper};
  for(const key of ['wind','power','pitch','surge','energy'])result[key]=lower[key]+f*(upper[key]-lower[key]);
  return result;
}
export function playbackPosition(elapsed,start,end,secondsPerLoop=20,hold=.7){
  if(![elapsed,start,end,secondsPerLoop,hold].every(Number.isFinite)||end<=start||secondsPerLoop<=0||hold<0)return {time:start,cycle:0,holding:false};
  const duration=secondsPerLoop+hold,t=Math.max(0,elapsed),phase=t%duration;
  return {time:start+(end-start)*Math.min(1,phase/secondsPerLoop),cycle:Math.floor(t/duration),holding:phase>=secondsPerLoop};
}
