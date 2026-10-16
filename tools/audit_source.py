"""Review Git's exact upload candidate list without printing possible secrets."""
from pathlib import Path
import json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]

def main():
    raw=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT)
    names=sorted(set(p for p in raw.decode('utf-8').split('\0') if p))
    patterns=[r'gh[pousr]_[A-Za-z0-9]{20,}',r'github_pat_[A-Za-z0-9_]{20,}',r'sk-[A-Za-z0-9_-]{24,}',
              r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----']
    problems=[];total=0
    for name in names:
        file=ROOT/name;data=file.read_bytes();total+=len(data)
        if name.split('/')[0] in ('runtime','screenshots','.openai') or file.name.startswith('.env'):
            problems.append({'file':name,'reason':'excluded data included'})
        if len(data)>10_000_000:problems.append({'file':name,'reason':'large source file'})
        text=data.decode('utf-8',errors='replace')
        if any(re.search(pattern,text) for pattern in patterns):problems.append({'file':name,'reason':'possible credential; inspect locally'})
        if re.search(r'[A-Z]:\\Users\\\d+\\',text):problems.append({'file':name,'reason':'absolute local user path'})
    print(json.dumps({'files':len(names),'bytes':total,'problems':problems},ensure_ascii=False))
    if problems:raise SystemExit(1)

if __name__=='__main__':main()
