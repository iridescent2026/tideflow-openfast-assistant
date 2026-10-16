"""Produce traceable sensitivity observations; never invent a convergence pass mark."""
from pathlib import Path
import json,math,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine import RunManager,DEFAULTS,validate_params
from tools.build_samples import CASES

def window(result,start,end):
    rows=[r for r in result['series'] if start-1e-8<=r[0]<=end+1e-8]
    span=rows[-1][0]-rows[0][0]
    stats={}
    for i,name in enumerate(result['channels'][1:],1):
        mean=sum((rows[k+1][0]-rows[k][0])*(rows[k+1][i]+rows[k][i])/2 for k in range(len(rows)-1))/span
        rms=math.sqrt(sum((rows[k+1][0]-rows[k][0])*(rows[k+1][i]**2+rows[k][i]**2)/2 for k in range(len(rows)-1))/span)
        stats[name]={'mean':mean,'rms':rms,'max_abs':max(abs(r[i]) for r in rows)}
    return {'start':rows[0][0],'end':rows[-1][0],'samples':len(rows),'stats':stats}

def main():
    records=RunManager().list();selected=[]
    for p in CASES:
        record=next((r for r in records if r['status']=='completed' and validate_params(r['params'])==p),None)
        if record is None: raise RuntimeError('Missing actual completed run: '+p['name'])
        selected.append(record)
    base=selected[0];half=next(r for r in selected if r['params'].get('solver_dt')==.00625)
    long=next(r for r in selected if r['params']['duration']==600)
    step={}
    for name in base['result']['stats']:
        a=base['result']['stats'][name];b=half['result']['stats'][name]
        step[name]={'baseline_mean':a['mean'],'half_step_mean':b['mean'],
            'mean_change_over_baseline_rms':abs(a['mean']-b['mean'])/max(a['rms'],1e-9),
            'baseline_max_abs':a['max_abs'],'half_step_max_abs':b['max_abs']}
    seed_runs=[r for r in selected if r['params']['wave_mode']=='irregular' and r['params']['wave_height']==1.5]
    report={'schema':1,'status':'numerical-observations-not-professional-approval','step_comparison':step,
        'long_windows':[window(long['result'],a,b) for a,b in [(60,120),(180,300),(300,450),(450,600)]],
        'seed_statistics':[{'id':r['id'],'seed':r['params']['seed'],'stats':r['result']['stats']} for r in seed_runs],
        'runs':[{'id':r['id'],'name':r['name'],'params':validate_params(r['params']),'returncode':r['returncode'],
            'output_sha256':r['result']['output_sha256'],'input_sha256':r['input_sha256'],'engine_sha256':r['provenance']['engine_sha256']} for r in selected]}
    out=ROOT/'docs';out.mkdir(exist_ok=True)
    (out/'validation-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    lines=['# 真实算例与敏感性检查','',f'已完成 {len(selected)} 组 OpenFAST v5.0.0 数值运行。以下是复现与敏感性观察，不是专业签审或工程精度认证。','',
        '## 运行记录','','| 工况 | ID | 时长 / 分析起点 s | 求解步长 s | 平均功率 kW |','|---|---|---|---|---|']
    for r in selected:
        p=validate_params(r['params']);lines.append(f"| {r['name']} | {r['id']} | {p['duration']} / {p['discard']} | {p['solver_dt']} | {r['result']['stats']['GenPwr']['mean']:.3f} |")
    lines+=['','## 求解步长减半：相同 60—120 s 窗口','','| 通道 | 基准均值 | 半步长均值 | 均值变化 / 基准 RMS |','|---|---|---|---|']
    for name,s in step.items(): lines.append(f"| {name} | {s['baseline_mean']:.6g} | {s['half_step_mean']:.6g} | {s['mean_change_over_baseline_rms']:.3%} |")
    lines+=['','未预设通用通过阈值。需评审根据通道、频率、峰值及实际分析目标判断；均值相近不能代替时序、载荷或整体收敛检查。主 DT 与 HydroDyn RdtnDT 同步减半，使用 default 的模块及控制器通信间隔随主步长变化，因此属于耦合时间离散敏感性检查。','',
        '## 600 s 记录分窗','','| 窗口 s | 功率均值 kW | 纵摇均值 deg | 纵荡均值 m |','|---|---|---|---|']
    for w in report['long_windows']:
        s=w['stats'];lines.append(f"| {w['start']}—{w['end']} | {s['GenPwr']['mean']:.3f} | {s['PtfmPitch']['mean']:.4f} | {s['PtfmSurge']['mean']:.4f} |")
    lines+=['','不同窗口统计用于识别残余过渡，不能仅凭运行更久或相邻均值接近宣布稳态。','',
        '## 同一不规则海况的随机种子','','| 随机种子 | 功率均值 kW | 纵摇绝对峰值 deg | 纵荡绝对峰值 m |','|---|---|---|---|']
    for r in seed_runs:
        s=r['result']['stats'];lines.append(f"| {r['params']['seed']} | {s['GenPwr']['mean']:.3f} | {s['PtfmPitch']['max_abs']:.4f} | {s['PtfmSurge']['max_abs']:.4f} |")
    lines+=['','只有 3 个短时实现，不估计置信区间，不据此推断长期设计载荷。','',
        '输入、输出及引擎 SHA-256 见同目录 validation-results.json；原始输出及日志保留于 runtime/jobs/<ID>/。',
        '单变量对照包括仅改变风速、规则波高、波浪模式；旧“海况对比”同时改变波高和类型，保留作混杂示例。','',
        '待完成：专业模型复核、适用域及初始化审查、真实用户试用、真实模型解释质量评测。']
    (out/'真实算例验证报告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('Wrote numerical observations for',len(selected),'runs.')

if __name__=='__main__': main()
