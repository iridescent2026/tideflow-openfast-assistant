"""Test a source archive in an isolated directory without the installed engine."""
from pathlib import Path
import json,subprocess,sys,uuid,zipfile
ROOT=Path(__file__).resolve().parents[1]

def main():
    archive=ROOT.parent/'output/offshore-assistant-v0.2-source.zip'
    destination=ROOT/'runtime/portable-check'/uuid.uuid4().hex
    destination.mkdir(parents=True)
    with zipfile.ZipFile(archive) as source:
        for entry in source.infolist():
            if not (destination/entry.filename).resolve().is_relative_to(destination.resolve()):
                raise RuntimeError('Archive member escapes destination.')
        source.extractall(destination)
    project=destination/ROOT.name
    if (project/'runtime/engine').exists(): raise RuntimeError('Portable source archive unexpectedly contains the engine.')
    result=subprocess.run([sys.executable,'tools/check.py'],cwd=project,capture_output=True,text=True,encoding='utf-8',errors='replace')
    evidence=json.loads((project/'docs/software-checks.json').read_text(encoding='utf-8'))
    evidence.update(without_engine=True,source_archive=archive.name)
    (ROOT/'docs/portable-checks.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Portable source checks:', 'PASS' if result.returncode==0 else 'FAIL')
    if result.returncode:
        print((result.stdout+result.stderr).replace(str(destination),'[临时验证目录]'))
        raise SystemExit(1)

if __name__=='__main__': main()
