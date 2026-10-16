"""Read-only installation integrity check, shared by startup and the UI."""
from pathlib import Path
import hashlib,json,platform,sys
ROOT=Path(__file__).resolve().parents[1]

def inspect_installation(root=ROOT):
    runtime=Path(root)/'runtime';checks=[]
    def add(name,ok,detail): checks.append({'name':name,'ok':bool(ok),'detail':detail})
    add('Python',sys.version_info>=(3,10),platform.python_version())
    add('操作系统',sys.platform=='win32','首版引擎要求 Windows x64')
    try: manifest=json.loads((runtime/'manifest.json').read_text(encoding='utf-8'))
    except (OSError,ValueError):
        add('安装记录',False,'缺少或无法读取 runtime/manifest.json，请运行 install.ps1')
        return {'ready':False,'checks':checks}
    binary=runtime/'engine/OpenFAST.exe'
    add('引擎完整性',binary.exists() and hashlib.sha256(binary.read_bytes()).hexdigest()==manifest.get('engine_sha256'),'OpenFAST v5.0.0 SHA-256')
    invalid=[]
    for name,digest in manifest.get('files',{}).items():
        file=(runtime/'model'/name).resolve()
        if not file.is_relative_to((runtime/'model').resolve()) or not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest()!=digest:
            invalid.append(name)
    add('模型与控制器',bool(manifest.get('files')) and not invalid,' / '.join(invalid) if invalid else f"{len(manifest.get('files',{}))} 个文件哈希一致")
    add('内置算例',(Path(root)/'dist/samples.json').is_file(),'已完成的真实输出展示记录')
    return {'ready':all(c['ok'] for c in checks),'checks':checks}

if __name__=='__main__':
    report=inspect_installation()
    print(json.dumps(report,ensure_ascii=False,indent=2))
    raise SystemExit(0 if report['ready'] else 1)
