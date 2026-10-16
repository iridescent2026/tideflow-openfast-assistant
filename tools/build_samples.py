"""Run the controlled OpenFAST validation set and package actual records."""
from pathlib import Path
import json,sys,time
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import RunManager,DEFAULTS,validate_params,diagnose
from tools.validate_cases import CASES as VALIDATION_CASES

CASES=[
 {**DEFAULTS,'name':'基准 · 8 m/s / 规则波 1.5 m'},
 {**DEFAULTS,'name':'风速对比 · 11.5 m/s / 规则波 1.5 m','wind':11.5},
 {**DEFAULTS,'name':'海况对比 · 8 m/s / 不规则波 3 m','wave_mode':'irregular','wave_height':3.0},
]+VALIDATION_CASES

def export_samples(manager):
    completed=[r for r in manager.list() if r['status']=='completed']
    samples=[]
    for p in CASES:
        record=next((r for r in completed if validate_params(r['params'])==p),None)
        if record:
            record['source_kind']='bundled-openfast'
            record['params']=validate_params(record['params'])
            record['findings']=diagnose(record.get('logs',[]))
            record['logs']=[line.replace(str(ROOT),'[项目目录]') for line in record.get('logs',[])]
            record.pop('artifacts',None)
            samples.append(record)
    (ROOT/'dist'/'samples.json').write_text(json.dumps({'schema':1,'runs':samples},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    license_path=ROOT/'runtime'/'model'/'LICENSE'
    if license_path.exists():
        (ROOT/'dist'/'MODEL-LICENSE.txt').write_bytes(license_path.read_bytes())
    print('Packaged actual simulations:',len(samples),flush=True)

if __name__=='__main__':
    manager=RunManager()
    export_samples(manager)
    if '--export-only' in sys.argv:
        raise SystemExit(0)
    for params in CASES:
        if any(j['status']=='completed' and validate_params(j['params'])==params for j in manager.list()):
            continue
        job=manager.submit(params)
        print('RUN',job['id'],params['name'],flush=True)
        last=-1
        while manager.active:
            time.sleep(3)
            current=manager.get(job['id'])
            if int(current['progress'])!=last:
                last=int(current['progress'])
                print(current['status'],last,flush=True)
        record=manager.get(job['id'])
        print('RESULT',record['status'],record.get('error'),record.get('elapsed_seconds'),flush=True)
        if record['status']!='completed':
            print('\n'.join(record['logs'][-30:]),flush=True)
            raise SystemExit(1)
        export_samples(manager)
