"""Make a portable source archive without engines, credentials or caches."""
from pathlib import Path
import zipfile
ROOT=Path(__file__).resolve().parents[1]

def main():
    output=ROOT.parent/'output/offshore-assistant-v0.2-source.zip';output.parent.mkdir(exist_ok=True)
    excluded={'runtime','screenshots','__pycache__','.git','.openai','.venv','node_modules'}
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(ROOT.rglob('*')):
            relative=path.relative_to(ROOT)
            if not path.is_file() or excluded.intersection(relative.parts) or path.name.startswith('.env') or path.suffix in ('.pyc','.zip','.gz'): continue
            archive.write(path,Path(ROOT.name)/relative)
    print(output)
    print('Archive bytes:',output.stat().st_size)

if __name__=='__main__': main()
