"""Trusted local OpenFAST runner, parameter editor and traceable output analysis.

Only a bundled immutable model and a fixed executable are allowed. No shell commands,
user-supplied executable paths or arbitrary input archives are accepted by the API.
"""
from pathlib import Path
import copy, datetime, hashlib, json, math, re, shutil, statistics, subprocess, threading, time, uuid
from runtime_lock import RuntimeLease

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT/'runtime'
CASE = '5MW_OC4Semi_WSt_WavesWN'
MODEL_PATH = Path('glue-codes/openfast')/CASE
CHANNELS = {
    'GenPwr': {'label':'发电功率','unit':'kW'},
    'RotSpeed': {'label':'转子转速','unit':'rpm'},
    'PtfmPitch': {'label':'平台纵摇','unit':'deg'},
    'PtfmSurge': {'label':'平台纵荡','unit':'m'},
    'Wave1Elev': {'label':'波面高程','unit':'m'},
    'TwrBsMyt': {'label':'塔底弯矩','unit':'kN-m'},
}
DEFAULTS = {'name':'新建工况','wind':8.0,'wave_height':1.5,'wave_period':10.0,
            'wave_mode':'regular','duration':120,'discard':60,'seed':123456789,'solver_dt':.0125}

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def validate_params(data):
    if not isinstance(data,dict):
        raise ValueError('工况参数必须是 JSON 对象。')
    p = {k:data.get(k,v) for k,v in DEFAULTS.items()}
    if not isinstance(p['name'],str) or not p['name'].strip() or len(p['name'])>60:
        raise ValueError('工况名称应为 1—60 个字符。')
    p['name'] = p['name'].strip()
    limits={'wind':(4,18),'wave_height':(0,4),'wave_period':(5,15),'duration':(60,3600),'discard':(0,3590)}
    for key,(lo,hi) in limits.items():
        if isinstance(p[key],bool) or not isinstance(p[key],(int,float)) or not math.isfinite(p[key]) or not lo<=p[key]<=hi:
            raise ValueError(f'{key} 超出原型范围 [{lo}, {hi}]。')
    if p['wave_mode'] not in ('regular','irregular'):
        raise ValueError('波浪模式仅支持 regular 或 irregular。')
    if isinstance(p['solver_dt'],bool) or p['solver_dt'] not in (.0125,.00625):
        raise ValueError('求解步长仅支持 0.0125 或 0.00625 秒。')
    if isinstance(p['seed'],bool) or not isinstance(p['seed'],int) or not -2147483648<=p['seed']<=2147483647:
        raise ValueError('波浪随机种子必须是 32 位有符号整数。')
    if p['discard']>=p['duration']-10:
        raise ValueError('分析起点必须比仿真终点至少提前 10 秒。')
    if p['duration']%10 or p['discard']%10:
        raise ValueError('仿真时长与分析起点请使用 10 秒的整数倍。')
    return p

def replace_field(path, field, value):
    path=Path(path)
    text=path.read_bytes().decode('latin-1')
    pattern=re.compile(r'^([ \t]*)("[^"\r\n]*"|[^ \t\r\n]+)([ \t]+)'+re.escape(field)+r'(?=[ \t\r\n]|$)',re.MULTILINE)
    text,count=pattern.subn(lambda m:m.group(1)+str(value)+m.group(3)+field,text)
    if count!=1:
        raise ValueError(f'模型参数 {field} 应唯一，实际匹配 {count} 次：{path.name}')
    path.write_bytes(text.encode('latin-1'))

def read_field(path, field):
    text=Path(path).read_bytes().decode('latin-1')
    found=re.findall(r'^[ \t]*("[^"\r\n]*"|[^ \t\r\n]+)[ \t]+'+re.escape(field)+r'(?=[ \t\r\n]|$)',text,re.MULTILINE)
    if len(found)!=1:
        raise ValueError(f'无法唯一读取字段 {field}')
    return found[0].strip('"')

def configure_case(model_root, p):
    case=Path(model_root)/MODEL_PATH
    fst=case/(CASE+'.fst')
    inflow=(case/read_field(fst,'InflowFile')).resolve()
    sea=(case/read_field(fst,'SeaStFile')).resolve()
    hydro=(case/read_field(fst,'HydroFile')).resolve()
    for field,value in [('TMax',p['duration']),('DT',p.get('solver_dt',.0125)),('DT_Out',.1),('TStart',0),('OutFileFmt',1),('SttsTime',5)]:
        replace_field(fst,field,value)
    replace_field(inflow,'WindType',1)
    replace_field(inflow,'HWindSpeed',p['wind'])
    replace_field(hydro,'RdtnDT',p.get('solver_dt',.0125))
    for field,value in [('WaveMod',1 if p['wave_mode']=='regular' else 2),('WaveHs',p['wave_height']),
                        ('WaveTp',p['wave_period']),('WaveSeed(1)',p['seed']),('WaveTMax',max(600,p['duration']))]:
        replace_field(sea,field,value)
    files={str(f.relative_to(model_root)).replace('\\','/'):hashlib.sha256(f.read_bytes()).hexdigest() for f in [fst,inflow,sea,hydro]}
    return case,fst,files

def diagnose(log):
    text=log if isinstance(log,str) else '\n'.join(log)
    rules=[
        ('hydro-step','error',r'RdtnDT must be equal|RdtnDT must match',
         'HydroDyn 辐射步长与主步长不一致','核对 HydroDyn 的 RdtnDT 与主文件 DT；本固定模型要求二者一致，不能仅修改主文件步长。'),
        ('missing-file','error',r'not found(?! on line)|cannot open|could not open|does not exist|unable to open',
         '输入文件或依赖缺失','检查日志中的文件名、相对路径与控制器 DLL；从本工作台重新初始化官方模型。'),
        ('invalid-input','error',r'invalid input|invalid \w+ specified|error reading|trying to read|was not found on line|invalid numerical|invalid logical',
         '输入字段、格式或版本不匹配','核对报错字段及文件行号，确认引擎与算例版本匹配；不要在固定格式输入中随意增删行。'),
        ('controller','error',r'could not load.*dll|loadlibrary|dll.*could not|unable to load|controller.*error|BladedInterface_Init:The dynamic library|could not be loaded',
         '控制器加载或调用失败','检查 DISCON_OC3Hywind.dll 是否存在且来自匹配的官方 Windows 发布；核对系统架构。'),
        ('large-motion','warning',r'small angle|large rotation|angles in getsmllrotangs|large platform',
         '运动超出部分模型假设','检查平台运动曲线与初始条件，并由专业人员判断模型适用性；不能仅靠忽略警告继续解释结果。'),
        ('aero-warning','warning',r'bem.*turned off|low tsr|skewedwakecorrection|high.*induction|unsteadyaero.*disabled|turning off unsteady aerodynamics|polar has constant data',
         '气动模型适用性或启动状态提示','结合对应时刻的转速、风速和初始过渡段检查；这类警告不自动等于仿真失败。'),
        ('mooring-initialization','warning',r'catenary solve.*unsuccessful',
         '系泊初始化切换到动态松弛','初始悬链线求解未成功，引擎使用动态松弛初始化。结合后续 Fairlead tensions converged 与 MoorDyn initialization completed 核查，不能仅凭此行判定最终失败。'),
        ('numerical','error',r'\bnan\b|floating.*exception|numerical instability|severe.*convergence|failed to converge',
         '数值或收敛异常','核查模型、初始状态及工况；保留日志，先重跑官方基准，避免直接把异常输出当作有效结果。'),
    ]
    lines=text.splitlines()
    findings=[]
    for code,severity,pattern,title,advice in rules:
        matches=[i for i,line in enumerate(lines) if re.search(pattern,line,re.I)]
        if matches:
            evidence='\n'.join(lines[max(0,matches[0]-1):min(len(lines),matches[0]+3)])[:1200]
            findings.append({'code':code,'severity':severity,'title':title,'advice':advice,'evidence':evidence,'line':matches[0]+1,
                             'source':'https://openfast.readthedocs.io/en/main/source/user/hydrodyn/input_files.html' if code=='hydro-step' else 'https://openfast.readthedocs.io/en/main/source/working.html#troubleshooting-a-simulation'})
    if not any(f['severity']=='error' for f in findings) and re.search(r'fatal error|aborting openfast|error level.*fatal',text,re.I):
        findings.append({'code':'fatal','severity':'error','title':'引擎报告致命错误','advice':'当前规则未定位具体原因，请检查原始日志中 FATAL 前的调用链和报错内容。',
                         'evidence':'\n'.join(lines[-18:])[-1800:],'source':'https://openfast.readthedocs.io/en/main/source/working.html'})
    return findings

def parse_output(path, p):
    lines=Path(path).read_text(encoding='utf-8',errors='replace').splitlines()
    start=next((i for i,l in enumerate(lines) if re.match(r'^\s*Time\s+',l)),None)
    if start is None or start+2>=len(lines):
        raise ValueError('OpenFAST 文本输出缺少 Time 表头或数据。')
    names=lines[start].split()
    units=lines[start+1].split()
    if len(set(names))!=len(names) or len(units)!=len(names):
        raise ValueError('输出通道或单位表头不完整。')
    required=['Time','GenPwr','RotSpeed','PtfmPitch','PtfmSurge']
    if any(n not in names for n in required):
        raise ValueError('输出缺少必需通道：'+', '.join(n for n in required if n not in names))
    selected=[n for n in CHANNELS if n in names]
    expected_units={'Time':'s','GenPwr':'kW','RotSpeed':'rpm','PtfmPitch':'deg','PtfmSurge':'m','Wave1Elev':'m','TwrBsMyt':'kN-m'}
    for n in ['Time']+selected:
        if units[names.index(n)].strip('()')!=expected_units[n]:
            raise ValueError(f'{n} 单位不符合预期：{units[names.index(n)]}')
    indices=[names.index(n) for n in ['Time']+selected]
    rows=[]
    for line in lines[start+2:]:
        if not line.strip():
            continue
        values=line.split()
        if len(values)!=len(names):
            raise ValueError('输出存在不完整数值行，拒绝静默跳过。')
        row=[float(values[i].replace('D','E')) for i in indices]
        if not all(math.isfinite(v) for v in row):
            raise ValueError('输出存在 NaN 或无穷数值。')
        if rows and row[0]<=rows[-1][0]:
            raise ValueError('输出时间序列不是严格递增。')
        rows.append(row)
    if not rows or rows[0][0]<-.00001 or rows[0][0]>.11 or abs(rows[-1][0]-p['duration'])>.11:
        raise ValueError('仿真未达到请求的完整时间范围。')
    window=[r for r in rows if r[0]>=p['discard']-1e-7]
    if len(window)<2:
        raise ValueError('分析窗口内没有足够的数据。')
    span=window[-1][0]-window[0][0]
    def integrate(values):
        return sum((window[i+1][0]-window[i][0])*(values[i]+values[i+1])/2 for i in range(len(window)-1))
    stats={}
    for j,name in enumerate(selected,1):
        values=[r[j] for r in window]
        mean=integrate(values)/span
        rms=math.sqrt(max(0,integrate([v*v for v in values])/span))
        stats[name]={**CHANNELS[name],'mean':mean,'min':min(values),'max':max(values),
                     'max_abs':max(abs(v) for v in values),'rms':rms,'std':math.sqrt(max(0,rms*rms-mean*mean))}
    power=[r[1+selected.index('GenPwr')] for r in window]
    return {'channels':['Time']+selected,'units':['s']+[CHANNELS[n]['unit'] for n in selected],
            'series':rows,'stats':stats,'analysis_start':window[0][0],'analysis_end':window[-1][0],
            'analysis_samples':len(window),'energy_kwh':integrate(power)/3600,'full_samples':len(rows),
            'output_sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest()}

class RunManager:
    def __init__(self):
        self.lock=threading.RLock()
        self.jobs={}
        self.active=None
        self.process=None
        self.cancelled=set()
        self.jobs_dir=RUNTIME/'jobs'
        self.lease=RuntimeLease(RUNTIME/'engine.lock')
        self.jobs_dir.mkdir(parents=True,exist_ok=True)
        for f in self.jobs_dir.glob('*/record.json'):
            try:
                job=json.loads(f.read_text(encoding='utf-8'))
                if job.get('status') in ('running','preparing'):
                    if self._runtime_busy():
                        job['external_running']=True
                    else:
                        job.update(status='failed',error='本地服务在运行过程中退出；结果未确认完整。')
                self.jobs[job['id']]=job
            except (ValueError,KeyError):
                pass

    def _runtime_busy(self):
        if self.active:
            return True
        probe=RuntimeLease(RUNTIME/'engine.lock')
        try:
            probe.acquire()
            return False
        except RuntimeError:
            return True
        finally:
            probe.release()

    def _refresh_external(self):
        for run_id,old in list(self.jobs.items()):
            if not old.get('external_running'):
                continue
            try:
                job=json.loads((self.jobs_dir/run_id/'record.json').read_text(encoding='utf-8'))
                if job.get('status') in ('running','preparing'):
                    if self._runtime_busy():
                        job['external_running']=True
                    else:
                        job.update(status='failed',error='其他运行进程已退出，未找到完整完成记录。')
                self.jobs[run_id]=job
            except (OSError,ValueError):
                pass

    def health(self):
        binary=RUNTIME/'engine'/'OpenFAST.exe'
        manifest=RUNTIME/'manifest.json'
        return {'service':'offshore-assistant','schema':1,'engine_ready':binary.exists() and manifest.exists(),
                'engine_version':'v5.0.0','case':CASE,'active':self.active,'mode':'local'}

    def _save(self,job):
        folder=self.jobs_dir/job['id']
        folder.mkdir(parents=True,exist_ok=True)
        tmp=folder/'record.tmp'
        tmp.write_text(json.dumps(job,ensure_ascii=False),encoding='utf-8')
        tmp.replace(folder/'record.json')

    def list(self):
        with self.lock:
            self._refresh_external()
            return copy.deepcopy(sorted(self.jobs.values(),key=lambda j:j['created'],reverse=True))

    def get(self,run_id):
        with self.lock:
            self._refresh_external()
            if run_id not in self.jobs:
                raise KeyError('未找到该运行记录。')
            return copy.deepcopy(self.jobs[run_id])

    def submit(self,data):
        p=validate_params(data)
        with self.lock:
            if not self.health()['engine_ready']:
                raise RuntimeError('本机引擎尚未安装，请运行 python tools/setup_engine.py。')
            if self.active:
                raise RuntimeError('已有工况正在运行，请等待完成或取消后再提交。')
            self.lease.acquire()
            run_id=uuid.uuid4().hex
            job={'id':run_id,'name':p['name'],'params':p,'status':'preparing','progress':0,'created':now(),
                 'logs':[],'findings':[],'engine_version':'v5.0.0','case':CASE,'source_kind':'local-openfast'}
            self.jobs[run_id]=job
            self.active=run_id
            try:
                self._save(job)
                threading.Thread(target=self._execute,args=(run_id,),daemon=True).start()
            except Exception:
                self.active=None
                self.lease.release()
                raise
            return copy.deepcopy(job)

    def cancel(self,run_id):
        with self.lock:
            if self.active!=run_id:
                raise ValueError('该工况不在运行中。')
            self.cancelled.add(run_id)
            if self.process:
                self.process.terminate()
            return {'cancel_requested':True,'id':run_id}

    def _execute(self,run_id):
        job=self.jobs[run_id]
        started=time.monotonic()
        folder=self.jobs_dir/run_id
        p=job['params']
        try:
            manifest=json.loads((RUNTIME/'manifest.json').read_text(encoding='utf-8'))
            binary=RUNTIME/'engine'/'OpenFAST.exe'
            if hashlib.sha256(binary.read_bytes()).hexdigest()!=manifest['engine_sha256']:
                raise ValueError('仿真程序与安装记录的 SHA-256 不一致，请重新安装官方引擎。')
            for name,digest in manifest['files'].items():
                source=RUNTIME/'model'/name
                if not source.exists() or hashlib.sha256(source.read_bytes()).hexdigest()!=digest:
                    raise ValueError('官方参考模型缺失或已改变：'+name)
            model_root=folder/'model'
            shutil.copytree(RUNTIME/'model',model_root)
            case,fst,inputs=configure_case(model_root,p)
            with self.lock:
                job['provenance']={k:v for k,v in manifest.items() if k!='files'}
                job['input_sha256']=inputs
                job['started']=now()
                if run_id in self.cancelled:
                    job['status']='cancelled'
                    return
                job['status']='running'
                creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0)
                self.process=subprocess.Popen([str(binary),fst.name],cwd=case,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,
                                              text=True,encoding='utf-8',errors='replace',creationflags=creationflags)
            def timeout_run():
                with self.lock:
                    if self.active==run_id and self.process and self.process.poll() is None:
                        job['timeout']=True
                        self.process.terminate()
            timeout_seconds=max(600,p['duration']*8+120)
            job['timeout_seconds']=timeout_seconds
            timer=threading.Timer(timeout_seconds,timeout_run)
            timer.start()
            try:
                with (folder/'run.log').open('w',encoding='utf-8') as log:
                    for line in self.process.stdout:
                        log.write(line)
                        log.flush()
                        with self.lock:
                            job['logs'].append(line.rstrip())
                            job['logs']=job['logs'][-1200:]
                            match=re.search(r'Time:\s*([\d.Ee+-]+)\s+of',line)
                            if match:
                                job['progress']=min(99,float(match.group(1))/p['duration']*100)
                    code=self.process.wait()
            finally:
                timer.cancel()
            job['returncode']=code
            job['findings']=diagnose(job['logs'])
            if run_id in self.cancelled:
                job['status']='cancelled'
            elif job.get('timeout'):
                raise RuntimeError(f'单次仿真超过 {timeout_seconds} 秒，本机服务已停止进程。')
            elif code!=0 or re.search(r'aborting openfast|fatal error', '\n'.join(job['logs']), re.I):
                raise RuntimeError(f'OpenFAST 运行失败，退出码 {code}。请查看日志与排查建议。')
            else:
                output=case/(CASE+'.out')
                job['result']=parse_output(output,p)
                job['status']='completed'
                job['progress']=100
                job['artifacts']={'output':f'/api/runs/{run_id}/output','log':f'/api/runs/{run_id}/log'}
        except Exception as error:
            job['status']='cancelled' if run_id in self.cancelled else 'failed'
            job['error']=str(error)
            job['findings']=diagnose(job.get('logs',[]))
        finally:
            with self.lock:
                job['elapsed_seconds']=round(time.monotonic()-started,3)
                job['finished']=now()
                try:
                    self._save(job)
                finally:
                    self.active=None
                    self.process=None
                    self.cancelled.discard(run_id)
                    self.lease.release()

    def artifact(self,run_id,kind):
        job=self.get(run_id)
        if kind=='log':
            return self.jobs_dir/run_id/'run.log'
        if kind=='output' and job['status']=='completed':
            return self.jobs_dir/run_id/'model'/MODEL_PATH/(CASE+'.out')
        raise KeyError('该文件尚不可用。')
