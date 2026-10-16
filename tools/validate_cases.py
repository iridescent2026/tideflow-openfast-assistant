"""Execute controlled OpenFAST checks. No fabricated observations or acceptance claims."""
from pathlib import Path
import json, sys, time
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import RunManager, DEFAULTS, validate_params

CASES=[
 {**DEFAULTS,'name':'单变量 · 规则波高 3 m','wave_height':3.0},
 {**DEFAULTS,'name':'单变量 · JONSWAP 1.5 m','wave_mode':'irregular'},
 {**DEFAULTS,'name':'随机种子 · JONSWAP / 234567890','wave_mode':'irregular','seed':234567890},
 {**DEFAULTS,'name':'随机种子 · JONSWAP / 345678901','wave_mode':'irregular','seed':345678901},
 {**DEFAULTS,'name':'步长复核 · DT 0.00625 s','solver_dt':.00625},
 {**DEFAULTS,'name':'时长复核 · 600 s / 排除前 300 s','duration':600,'discard':300},
]

def execute():
    manager=RunManager()
    for params in CASES:
        if any(j['status']=='completed' and validate_params(j['params'])==params for j in manager.list()):
            continue
        job=manager.submit(params)
        print('RUN',job['id'],params['name'],flush=True)
        previous=-1
        while manager.active:
            time.sleep(2)
            record=manager.get(job['id'])
            progress=int(record['progress']//10)*10
            if progress!=previous:
                print(record['status'],progress,flush=True);previous=progress
        record=manager.get(job['id'])
        print('RESULT',record['status'],record.get('error'),flush=True)
        if record['status']!='completed':
            raise RuntimeError(record.get('error','Validation run did not complete'))
    print('Validation simulations completed.',flush=True)

if __name__=='__main__': execute()
