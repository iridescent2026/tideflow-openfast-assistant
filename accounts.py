"""Local account identities. Simulation workspaces remain shared on this host."""
import base64,hashlib,hmac,json,re,secrets,sqlite3,time
from pathlib import Path
from http.cookies import SimpleCookie,CookieError
from contextlib import contextmanager

COOKIE='tideflow_session'
LIFETIME=7*24*3600

class Accounts:
    def __init__(self,path):
        self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True)
        with self.db() as db:
            db.execute('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,account TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL,profile TEXT NOT NULL,created REAL NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires REAL NOT NULL)')

    @contextmanager
    def db(self):
        db=sqlite3.connect(self.path,timeout=10);db.row_factory=sqlite3.Row
        try:
            with db:yield db
        finally:db.close()

    @staticmethod
    def password_hash(password,salt):
        return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),310000).hex()

    @staticmethod
    def profile(data):
        result={}
        for field,limit in [('display_name',30),('affiliation',80),('specialty',60),('email',120),('bio',300)]:
            value=data.get(field,'')
            if not isinstance(value,str) or len(value)>limit: raise ValueError(f'资料字段 {field} 超过长度限制。')
            result[field]=value.strip()
        if not result['display_name']: raise ValueError('请填写昵称。')
        if result['email'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',result['email']): raise ValueError('邮箱格式不正确。')
        avatar=data.get('avatar','')
        if not isinstance(avatar,str): raise ValueError('头像格式不正确。')
        if avatar:
            match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)',avatar)
            if not match or len(avatar)>720000: raise ValueError('请上传小于 512 KB 的 PNG、JPEG 或 WebP 头像。')
            try: raw=base64.b64decode(match[2],validate=True)
            except ValueError: raise ValueError('头像编码不正确。') from None
            if len(raw)>524288: raise ValueError('头像应小于 512 KB。')
            kind=match[1]
            valid=(kind=='png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or (kind=='jpeg' and raw.startswith(b'\xff\xd8\xff')) or (kind=='webp' and raw[:4]==b'RIFF' and raw[8:12]==b'WEBP')
            if not valid: raise ValueError('头像内容与图片类型不一致。')
            if kind=='png' and (len(raw)<24 or max(int.from_bytes(raw[16:20],'big'),int.from_bytes(raw[20:24],'big'))>4096): raise ValueError('头像尺寸过大。')
        result['avatar']=avatar
        return result

    def public(self,row):
        return {'id':row['id'],'account':row['account'],'created':row['created'],**json.loads(row['profile'])}

    def register(self,data):
        account=data.get('account','');password=data.get('password','')
        if not isinstance(account,str) or not re.fullmatch(r'[A-Za-z0-9_]{3,32}',account): raise ValueError('账号需为 3—32 位字母、数字或下划线。')
        if not isinstance(password,str) or not 8<=len(password)<=128: raise ValueError('密码长度应为 8—128 位。')
        profile=self.profile({'display_name':data.get('display_name',account)})
        salt=secrets.token_hex(16);uid=secrets.token_hex(16)
        try:
            with self.db() as db:
                db.execute('INSERT INTO users VALUES(?,?,?,?,?,?)',(uid,account.lower(),salt,self.password_hash(password,salt),json.dumps(profile,ensure_ascii=False),time.time()))
        except sqlite3.IntegrityError: raise ValueError('该账号已存在，请登录或更换账号。') from None
        return self.create_session(uid)

    def login(self,data):
        account=data.get('account','');password=data.get('password','')
        if not isinstance(account,str) or not isinstance(password,str) or len(password)>128: raise ValueError('账号或密码不正确。')
        with self.db() as db: row=db.execute('SELECT * FROM users WHERE account=?',(account.lower(),)).fetchone()
        # Perform the same expensive check for absent accounts.
        digest=self.password_hash(password,row['salt'] if row else '00'*16)
        if not row or not hmac.compare_digest(digest,row['password']): raise ValueError('账号或密码不正确。')
        return self.create_session(row['id'])

    def create_session(self,uid):
        token=secrets.token_urlsafe(32);digest=hashlib.sha256(token.encode()).hexdigest()
        with self.db() as db:
            db.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
            db.execute('INSERT INTO sessions VALUES(?,?,?)',(digest,uid,time.time()+LIFETIME))
            row=db.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone()
        return self.public(row),f'{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={LIFETIME}'

    def session_digest(self,cookie):
        parsed=SimpleCookie()
        try: parsed.load(cookie or '');token=parsed[COOKIE].value
        except (KeyError,ValueError,CookieError): return ''
        return hashlib.sha256(token.encode()).hexdigest()

    def current(self,cookie):
        digest=self.session_digest(cookie)
        if not digest:return None
        with self.db() as db:
            row=db.execute('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.digest=? AND sessions.expires>?',(digest,time.time())).fetchone()
        return self.public(row) if row else None

    def update(self,cookie,data):
        user=self.current(cookie)
        if not user: raise PermissionError('登录已失效，请重新登录。')
        profile=self.profile(data)
        with self.db() as db:
            db.execute('UPDATE users SET profile=? WHERE id=?',(json.dumps(profile,ensure_ascii=False),user['id']))
        return {**user,**profile}

    def logout(self,cookie):
        with self.db() as db: db.execute('DELETE FROM sessions WHERE digest=?',(self.session_digest(cookie),))
        return f'{COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
