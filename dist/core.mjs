export const CHANNELS={GenPwr:{label:'发电功率',unit:'kW'},RotSpeed:{label:'转子转速',unit:'rpm'},PtfmPitch:{label:'平台纵摇',unit:'deg'},PtfmSurge:{label:'平台纵荡',unit:'m'},Wave1Elev:{label:'波面高程',unit:'m'},TwrBsMyt:{label:'塔底弯矩',unit:'kN-m'}};
export const DEFAULTS={name:'新建工况',wind:8,wave_height:1.5,wave_period:10,wave_mode:'regular',duration:120,discard:60,seed:123456789,solver_dt:.0125};
export const STATUS={completed:'已完成',failed:'失败',running:'运行中',preparing:'准备中',cancelled:'已取消'};
export function validateParams(raw){const p={...DEFAULTS,...raw};if(typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('工况名称应为 1—60 个字符。');p.name=p.name.trim();for(const [k,lo,hi] of [['wind',4,18],['wave_height',0,4],['wave_period',5,15],['duration',60,3600],['discard',0,3590]])if(!Number.isFinite(p[k])||p[k]<lo||p[k]>hi)throw Error(`${k} 应在 ${lo}—${hi} 范围内。`);if(![.0125,.00625].includes(p.solver_dt))throw Error('求解步长不支持。');if(!['regular','irregular'].includes(p.wave_mode))throw Error('波浪模式不支持。');if(!Number.isInteger(p.seed)||p.seed< -2147483648||p.seed>2147483647)throw Error('随机种子应为 32 位有符号整数。');if(p.discard>=p.duration-10)throw Error('分析窗口需至少 10 秒。');if(p.duration%10||p.discard%10)throw Error('仿真时长与分析起点需为 10 秒的整数倍。');return p;}
export function summarize(channels,units,series,params){
 const p=validateParams(params),required=['Time','GenPwr','RotSpeed','PtfmPitch','PtfmSurge'];
 if(!Array.isArray(channels)||!Array.isArray(units)||new Set(channels).size!==channels.length||channels[0]!=='Time'||units.length!==channels.length||required.some(k=>!channels.includes(k)))throw Error('结果缺少必需通道、单位或 Time 首列。');
 if(!Array.isArray(series)||series.length<2||series.length>100001)throw Error('输出数据行数应为 2—100001。');
 channels.forEach((name,i)=>{const expected=name==='Time'?'s':CHANNELS[name]?.unit;if(!expected||units[i]!==expected)throw Error(`不支持通道 ${name} 或单位 ${units[i]}。`);});
 let previous=-Infinity;for(const row of series){if(!Array.isArray(row)||row.length!==channels.length||row.some(v=>!Number.isFinite(v))||row[0]<=previous)throw Error('输出存在无效数值、缺失列或时间不递增。');previous=row[0];}
 if(series[0][0]<-.00001||series[0][0]>.11||Math.abs(series.at(-1)[0]-p.duration)>.11)throw Error('输出时间范围与工况声明不一致。');
 const window=series.filter(r=>r[0]>=p.discard-1e-7);if(window.length<2)throw Error('分析窗口数据不足。');const span=window.at(-1)[0]-window[0][0];
 const integral=values=>{let s=0;for(let i=0;i<window.length-1;i++)s+=(window[i+1][0]-window[i][0])*(values[i]+values[i+1])/2;return s;};
 const stats={};for(let j=1;j<channels.length;j++){const values=window.map(r=>r[j]),mean=integral(values)/span,rms=Math.sqrt(Math.max(0,integral(values.map(v=>v*v))/span));let min=Infinity,max=-Infinity,maxAbs=0;for(const v of values){min=Math.min(min,v);max=Math.max(max,v);maxAbs=Math.max(maxAbs,Math.abs(v));}stats[channels[j]]={...CHANNELS[channels[j]],mean,min,max,max_abs:maxAbs,rms,std:Math.sqrt(Math.max(0,rms*rms-mean*mean))};}
 return {channels,units,series,stats,analysis_start:window[0][0],analysis_end:window.at(-1)[0],analysis_samples:window.length,full_samples:series.length,energy_kwh:integral(window.map(r=>r[channels.indexOf('GenPwr')]))/3600};
}
export function parseOutput(text,params){
 const lines=text.split(/\r?\n/),start=lines.findIndex(l=>/^\s*Time\s+/.test(l));if(start<0||start+2>=lines.length)throw Error('找不到 OpenFAST 文本输出 Time 表头。');
 const names=lines[start].trim().split(/\s+/),allUnits=lines[start+1].trim().split(/\s+/);if(allUnits.length!==names.length||new Set(names).size!==names.length)throw Error('输出表头不完整或通道重复。');
 const channels=['Time',...Object.keys(CHANNELS).filter(n=>names.includes(n))],indices=channels.map(n=>names.indexOf(n)),units=indices.map(i=>allUnits[i]?.replace(/[()]/g,''));
 const series=[];for(const line of lines.slice(start+2)){if(!line.trim())continue;const values=line.trim().split(/\s+/);if(values.length!==names.length)throw Error('输出数据行不完整。');series.push(indices.map(i=>Number(values[i]?.replace(/[dD]/g,'E'))));}
 return summarize(channels,units,series,params);
}
export function validateRecord(raw,{imported=false}={}){
 if(!raw||typeof raw.id!=='string'||raw.id.length>100||typeof raw.name!=='string'||raw.name.length>120||!Object.keys(STATUS).includes(raw.status))throw Error('运行记录格式无效。');
 const record=JSON.parse(JSON.stringify(raw));record.params=validateParams(record.params);record.logs=Array.isArray(record.logs)?record.logs.slice(-1200).map(x=>String(x).slice(0,5000)):[];
 record.findings=diagnose(record.logs.join('\n'));
 if(record.status==='completed'){const r=record.result;if(!r)throw Error('完成记录缺少结果。');record.result={...summarize(r.channels,r.units,r.series,record.params),output_sha256:r.output_sha256||null};}
 if(imported){record.source_kind='imported-unverified';delete record.artifacts;}
 return record;
}
export function diagnose(text){const rules=[
 ['hydro-step','error',/RdtnDT must be equal|RdtnDT must match/i,'HydroDyn 辐射步长与主步长不一致','核对 HydroDyn 的 RdtnDT 与主文件 DT；本固定模型要求二者一致，不能仅修改主文件步长。'],
 ['missing-file','error',/not found(?! on line)|cannot open|could not open|does not exist|unable to open/i,'输入文件或依赖缺失','检查报错文件名、相对路径与控制器 DLL；重新初始化官方参考模型。'],
 ['invalid-input','error',/invalid input|invalid \w+ specified|error reading|trying to read|was not found on line|invalid numerical|invalid logical/i,'输入字段、格式或版本不匹配','根据日志检查字段及行号，核对引擎和算例版本，避免随意增删输入行。'],
 ['controller','error',/could not load.*dll|loadlibrary|dll.*could not|unable to load|controller.*error|BladedInterface_Init:The dynamic library|could not be loaded/i,'控制器加载或调用失败','核对 DISCON_OC3Hywind.dll 的来源、路径、版本与系统架构。'],
 ['large-motion','warning',/small angle|large rotation|angles in getsmllrotangs|large platform/i,'运动超出部分模型假设','检查平台运动和初始条件，由专业人员判断结果适用性。'],
 ['aero-warning','warning',/bem.*turned off|low tsr|skewedwakecorrection|high.*induction|unsteadyaero.*disabled|turning off unsteady aerodynamics|polar has constant data/i,'气动模型或启动状态提示','结合极曲线数据、对应时刻的转速和风速核查；警告不自动等于仿真失败。'],
 ['mooring-initialization','warning',/catenary solve.*unsuccessful/i,'系泊初始化切换到动态松弛','初始悬链线求解未成功，结合后续 Fairlead tensions converged 与 MoorDyn initialization completed 核查，不能仅凭此行判定最终失败。'],
 ['numerical','error',/\bnan\b|floating.*exception|numerical instability|severe.*convergence|failed to converge/i,'数值或收敛异常','先重跑基准，核查模型、工况和初始状态，避免分析异常结果。']];
 const lines=String(text).split(/\r?\n/),found=[];for(const [code,severity,re,title,advice] of rules){const index=lines.findIndex(l=>re.test(l));if(index>=0)found.push({code,severity,title,advice,evidence:lines.slice(Math.max(0,index-1),index+3).join('\n').slice(0,1200),source:code==='hydro-step'?'https://openfast.readthedocs.io/en/main/source/user/hydrodyn/input_files.html':'https://openfast.readthedocs.io/en/main/source/working.html#troubleshooting-a-simulation'});}
 if(!found.some(f=>f.severity==='error')&&/fatal error|aborting openfast|error level.*fatal/i.test(text))found.push({code:'fatal',severity:'error',title:'引擎报告致命错误',advice:'规则未定位具体原因，请检查 FATAL 前的原始调用链。',evidence:lines.slice(-18).join('\n').slice(-1800),source:'https://openfast.readthedocs.io/en/main/source/working.html'});return found;
}
export function ruleExplanation(run,topic='summary'){
 if(!run)return '先选择一个工况，查看可追溯的运行结果。';
 if(run.status!=='completed')return `当前工况状态：${STATUS[run.status]}。${run.error||'尚无完整有效结果。'}\n请检查原始日志，完成前不生成性能结论。`;
 const r=run.result,p=run.params,kind=p.wave_mode==='regular'?'规则波':'JONSWAP 不规则波';
 let s=`分析基于 ${r.analysis_start}—${r.analysis_end} s 的 ${r.analysis_samples} 个输出样本，已排除前 ${p.discard} s。风速 ${p.wind} m/s，${kind}波高参数 ${p.wave_height} m，周期参数 ${p.wave_period} s。\n\n`;
 if(topic==='motion')s+=`平台纵摇绝对峰值 ${r.stats.PtfmPitch.max_abs.toFixed(3)}°，纵荡绝对峰值 ${r.stats.PtfmSurge.max_abs.toFixed(3)} m。请同时查看全时段曲线，确认初始过渡是否仍影响窗口；这些数值不等于结构安全评价。`;
 else if(topic==='wave')s+=`规则波模式下，WaveHs 表示波高、WaveTp 表示周期；不规则波模式下，二者为显著波高与峰值周期。随机种子用于复现不规则波序列。短时序列的样本统计不一定等于目标海况参数。`;
 else if(topic==='limits')s+='该算例是公开参考风机模型，风与浪为人工设定工况，不代表真实海域观测。短时工况仅用于演示，未进行充分稳态、疲劳或极限工况验证；不能从单一窗口推算全年发电量或直接给出安全结论。';
 else s+=`平均发电功率 ${r.stats.GenPwr.mean.toFixed(1)} kW，平均转速 ${r.stats.RotSpeed.mean.toFixed(2)} rpm。窗口发电量 ${r.energy_kwh.toFixed(2)} kWh 由功率对时间积分得到。比较时请控制其他参数，并核对分析窗口与随机种子。`;
 return s+'\n\n以上为依据仿真数据的规则解释；连接大模型后可进一步讨论。';
}
