"""Explicitly invoked publishing helper; credentials stay in OS manager and memory."""
from pathlib import Path
import argparse,json,os,shutil,subprocess,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parents[1]
NAME='tideflow-openfast-assistant'

def git(*args):
    result=subprocess.run(['git',*args],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',env={**os.environ,'GCM_INTERACTIVE':'never'})
    if result.returncode: raise RuntimeError('Git operation failed: '+args[0]+'; '+result.stderr[:500])
    return result.stdout.strip()

def credential():
    result=subprocess.run(['git','-c','credential.helper=manager','credential','fill'],input='protocol=https\nhost=github.com\n\n',
        cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',env={**os.environ,'GCM_INTERACTIVE':'never'})
    if result.returncode: raise RuntimeError('GitHub credential unavailable; sign in with Git Credential Manager first.')
    values=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    token=values.get('password')
    if not token: raise RuntimeError('No saved GitHub token is available.')
    return token

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check-auth',action='store_true');parser.add_argument('--publish',action='store_true');args=parser.parse_args()
    if not (args.check_auth or args.publish): parser.error('Choose --check-auth or --publish explicitly.')
    token=credential()
    def api(path,body=None):
        request=urllib.request.Request('https://api.github.com'+path,data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'Tideflow-Publisher','Content-Type':'application/json'},
            method='GET' if body is None else 'POST')
        try:
            with urllib.request.urlopen(request,timeout=30) as response:return json.load(response)
        except urllib.error.HTTPError as error:
            code=error.code;error.close();raise RuntimeError(f'GitHub API {path}: HTTP {code}') from None
    account=api('/user')['login']
    print('Authenticated GitHub account:',account,flush=True)
    if args.check_auth:return
    # Publish only a reviewed, committed source tree. New remote only, never replace an existing repository.
    if not (ROOT/'.git').is_dir(): raise RuntimeError('Initialize and review the local source commit first.')
    if git('status','--porcelain'): raise RuntimeError('Working tree is not clean; review and commit first.')
    if git('remote'): raise RuntimeError('A remote is already configured; inspect it before publishing again.')
    tracked=git('ls-files').splitlines()
    forbidden=[p for p in tracked if p.split('/')[0] in ('runtime','screenshots','.openai') or Path(p).name.startswith('.env')]
    if forbidden: raise RuntimeError('Runtime or credential files must not be committed.')
    repo=api('/user/repos',{'name':NAME,'private':False,'description':'潮汐 TIDEFLOW：基于 OpenFAST 的海上风电仿真运行与结果分析智能助手','auto_init':False})
    if repo.get('private') or repo.get('owner',{}).get('login')!=account: raise RuntimeError('Unexpected repository destination or visibility.')
    url=repo['html_url'];print('Created public repository:',url,flush=True)
    git('remote','add','origin',url+'.git')
    git('-c','credential.helper=manager','push','-u','origin','main')
    local=git('rev-parse','HEAD');remote=git('-c','credential.helper=manager','ls-remote','origin','refs/heads/main').split()[0]
    if local!=remote: raise RuntimeError('Remote HEAD does not match the local source commit.')
    print('Verified remote commit:',remote,flush=True)
    print('Repository:',url,flush=True)

if __name__=='__main__':main()
