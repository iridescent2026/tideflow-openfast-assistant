"""Install pinned official OpenFAST assets and a matching reference model locally."""
from pathlib import Path, PurePosixPath
import concurrent.futures, hashlib, json, posixpath, re, sys, time, urllib.request

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'runtime'
VERSION = 'v5.0.0'
RTEST_SHA = 'dd5feaaaa500ba7283140107806300d551cff0a7'
CASE = '5MW_OC4Semi_WSt_WavesWN'
CASE_PATH = f'glue-codes/openfast/{CASE}/{CASE}.fst'
HEADERS = {'User-Agent': 'OffshoreAssistant/1.0'}

def download(url, path, git_sha=None, digest=None):
    path = Path(path)
    if path.exists():
        data = path.read_bytes()
        good = (not git_sha or hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest() == git_sha)
        good = good and (not digest or hashlib.sha256(data).hexdigest() == digest)
        if good:
            return data
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=100) as response:
                data = response.read()
            if git_sha and hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest() != git_sha:
                raise ValueError('Official Git blob checksum mismatch: '+str(path))
            if digest and hashlib.sha256(data).hexdigest() != digest:
                raise ValueError('Official asset SHA-256 mismatch')
            temp = path.with_name(path.name+'.part')
            temp.write_bytes(data)
            temp.replace(path)
            return data
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2*(attempt+1))

def main():
    RUNTIME.mkdir(parents=True, exist_ok=True)
    release_path = RUNTIME/'release.json'
    if release_path.exists():
        release = json.loads(release_path.read_text(encoding='utf-8'))
    else:
        release = json.loads(download(f'https://api.github.com/repos/OpenFAST/openfast/releases/tags/{VERSION}', release_path))
    if release['tag_name'] != VERSION:
        raise ValueError('Unexpected engine version')
    asset = next(a for a in release['assets'] if a['name']=='OpenFAST_Double_Release.exe')
    expected_digest = asset.get('digest')
    if expected_digest:
        expected_digest = expected_digest.removeprefix('sha256:')
    tree_path = RUNTIME/'tree.json'
    if tree_path.exists():
        tree = json.loads(tree_path.read_text(encoding='utf-8'))
    else:
        tree = json.loads(download(f'https://api.github.com/repos/OpenFAST/r-test/git/trees/{RTEST_SHA}?recursive=1', tree_path))
    if tree.get('sha') != RTEST_SHA:
        raise ValueError('Unexpected reference model revision')
    entries = {v['path']:v for v in tree['tree'] if v['type']=='blob'}
    hashes = {}
    def get_file(name):
        if not name.startswith('glue-codes/openfast/') and name!='LICENSE':
            raise ValueError('Model reference outside permitted upstream tree')
        url = f'https://raw.githubusercontent.com/OpenFAST/r-test/{RTEST_SHA}/{name}'
        raw = download(url, RUNTIME/'model'/name, git_sha=entries[name]['sha'])
        hashes[name] = hashlib.sha256(raw).hexdigest()
        return raw
    def install_model():
        todo = {CASE_PATH, 'LICENSE'}
        visited = set()
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            while todo:
                names = sorted(todo-visited)
                if not names:
                    break
                todo = set()
                for name, raw in zip(names, pool.map(get_file,names)):
                    visited.add(name)
                    text = raw.decode('utf-8', errors='replace')
                    for quoted in re.findall(r'"([^"\r\n]+)"',text):
                        # Resolve references only against the immutable official tree.
                        candidate=posixpath.normpath(posixpath.join(posixpath.dirname(name),quoted.replace('\\','/')))
                        if candidate in entries and not candidate.endswith(('.out','.outb','.bts')):
                            todo.add(candidate)
                        else:
                            todo.update(p for p in entries if p.startswith(candidate+'.') and p.endswith(('.1','.3','.hst','.12d','.12s','.ssexctn','.ssradiation')))
        print('Verified model files:',len(visited),flush=True)
    def install_binary():
        print('Downloading official OpenFAST double-precision executable...',flush=True)
        binary = download(asset['browser_download_url'],RUNTIME/'engine'/'OpenFAST.exe',digest=expected_digest)
        return hashlib.sha256(binary).hexdigest()
    def install_controller():
        controller = next(a for a in release['assets'] if a['name']=='DISCON_OC3Hywind.dll')
        digest = (controller.get('digest') or '').removeprefix('sha256:') or None
        data = download(controller['browser_download_url'], RUNTIME/'model'/'glue-codes'/'openfast'/'5MW_Baseline'/'ServoData'/'DISCON_OC3Hywind.dll', digest=digest)
        hashes['glue-codes/openfast/5MW_Baseline/ServoData/DISCON_OC3Hywind.dll']=hashlib.sha256(data).hexdigest()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        binary_future=pool.submit(install_binary)
        model_future=pool.submit(install_model)
        model_future.result()
        install_controller()
        binary_sha=binary_future.result()
    provenance={'engine_version':VERSION,'engine_url':asset['browser_download_url'],'engine_sha256':binary_sha,
                'official_asset_digest':expected_digest,'rtest_sha':RTEST_SHA,'case':CASE,'files':hashes,
                'reference_url':f'https://github.com/OpenFAST/r-test/tree/{RTEST_SHA}/glue-codes/openfast/{CASE}'}
    (RUNTIME/'manifest.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
    print('Engine and model ready.',flush=True)

if __name__=='__main__':
    main()
