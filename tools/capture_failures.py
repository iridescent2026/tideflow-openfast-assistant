"""Capture actual OpenFAST failure logs from deliberately damaged private copies."""
from pathlib import Path
import hashlib,json,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import RUNTIME,MODEL_PATH,CASE,DEFAULTS,configure_case,replace_field,read_field,diagnose

def main():
    destination=ROOT/'tests/fixtures';destination.mkdir(parents=True,exist_ok=True)
    manifest=destination/'failures.json'
    previous=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else []
    corpus=[entry for entry in previous if entry.get('kind')=='actual-openfast-validation-failure']
    for name,expected in [('missing-inflow','missing-file'),('invalid-wind-type','invalid-input'),('missing-controller','controller')]:
        folder=RUNTIME/'failure-cases'/name
        if folder.exists():
            raise RuntimeError('Failure case exists; inspect it before repeating: '+str(folder))
        shutil.copytree(RUNTIME/'model',folder)
        case,fst,_=configure_case(folder,{**DEFAULTS,'duration':60,'discard':20})
        if name=='missing-inflow': replace_field(fst,'InflowFile','"intentionally-missing.dat"')
        elif name=='invalid-wind-type': replace_field(case/read_field(fst,'InflowFile'),'WindType',99)
        else:
            servo=case/read_field(fst,'ServoFile')
            replace_field(servo,'DLL_FileName','"intentionally-missing.dll"')
        process=subprocess.run([str(RUNTIME/'engine/OpenFAST.exe'),fst.name],cwd=case,capture_output=True,
            text=True,encoding='utf-8',errors='replace',timeout=90,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        text=(process.stdout+process.stderr).replace(str(ROOT),'[项目目录]')
        if process.returncode==0: raise RuntimeError('Injected fault did not fail: '+name)
        output=destination/(name+'.log');output.write_text(text,encoding='utf-8')
        corpus.append({'id':name,'kind':'actual-openfast-injected-fault','expected':expected,'returncode':process.returncode,
            'file':output.name,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            'matched':[f['code'] for f in diagnose(text)],'engine_version':'v5.0.0'})
        print(name,corpus[-1]['matched'],flush=True)
    (destination/'failures.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__': main()
