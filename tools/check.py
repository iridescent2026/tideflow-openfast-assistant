"""Run meaningful software checks and save exact outcomes, never physics approval."""
from pathlib import Path
import datetime,json,os,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]

def main():
    node=shutil.which('node')
    if not node:
        bundled=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
        if bundled.exists(): node=str(bundled)
    if not node: raise RuntimeError('Node.js is required only for the JavaScript checks, not for running the workbench.')
    groups=[('Python',[sys.executable,'-m','unittest','discover','-s','tests','-p','test_*.py']),
            ('JavaScript',[node,'--test','--test-reporter=spec','tests/core.test.mjs','tests/evidence.test.mjs','tests/model-geometry.test.mjs','tests/lab-state.test.mjs','tests/workspace-startup.test.mjs','tests/lab-interior.test.mjs','tests/ocean-data.test.mjs','tests/analysis-data.test.mjs','tests/motion-data.test.mjs','tests/response-plot.test.mjs','tests/analysis-integration.test.mjs'])]
    outcomes=[]
    env={**os.environ,'PYTHONUTF8':'1','NO_COLOR':'1'}
    for name,args in groups:
        result=subprocess.run(args,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',env=env)
        output=result.stdout+result.stderr
        print(name,'PASS' if result.returncode==0 else 'FAIL',flush=True)
        outcomes.append({'group':name,'returncode':result.returncode,'output':output.replace(str(ROOT),'[项目目录]')})
    folder=ROOT/'docs';folder.mkdir(exist_ok=True)
    (folder/'software-checks.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope':'software-and-protocol-only-not-physical-certification','groups':outcomes},ensure_ascii=False,indent=2),encoding='utf-8')
    if any(r['returncode'] for r in outcomes):
        for r in outcomes:
            if r['returncode']: print(r['output'])
        raise SystemExit(1)

if __name__=='__main__': main()
