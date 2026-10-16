"""Loopback-only UI/API service. POST requires same-origin browser requests."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
import argparse,json,re,secrets,threading,time
from engine import RunManager,diagnose
from ai_bridge import chat
from tools.doctor import inspect_installation

ROOT=Path(__file__).resolve().parent
manager=RunManager()
TOKEN=secrets.token_urlsafe(32)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)

    def send_json(self,data,status=200):
        raw=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers()
        self.wfile.write(raw)

    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')

    def do_GET(self):
        if not self.valid_host():
            return self.send_json({'error':'Host not allowed'},403)
        path=urlsplit(self.path).path
        if path=='/api/health':
            return self.send_json({**manager.health(),'token':TOKEN})
        if path=='/api/runs':
            return self.send_json({'runs':manager.list()})
        if path=='/api/preflight':
            return self.send_json(inspect_installation())
        match=re.fullmatch(r'/api/runs/([a-f0-9]{32})(?:/(log|output))?',path)
        if match:
            try:
                if not match[2]:
                    return self.send_json(manager.get(match[1]))
                artifact=manager.artifact(match[1],match[2])
                if not artifact.exists():
                    raise KeyError('文件尚未生成。')
                raw=artifact.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type','text/plain; charset=utf-8')
                self.send_header('Content-Length',str(len(raw)))
                self.send_header('Content-Disposition',f'attachment; filename="{match[1]}.{ "log" if match[2]=="log" else "out"}"')
                self.end_headers()
                self.wfile.write(raw)
                return
            except KeyError as e:
                return self.send_json({'error':str(e)},404)
        if path.startswith('/api/'):
            return self.send_json({'error':'Unknown API route'},404)
        return super().do_GET()

    def do_POST(self):
        origin=self.headers.get('Origin')
        expected={f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}
        if not self.valid_host() or (origin and origin not in expected) or not secrets.compare_digest(self.headers.get('X-Run-Token',''),TOKEN):
            return self.send_json({'error':'请从本机工作台发起操作。'},403)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=100000:
                return self.send_json({'error':'请求大小无效。'},413)
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict):
                raise ValueError('请求必须是 JSON 对象。')
            path=urlsplit(self.path).path
            if path=='/api/runs':
                return self.send_json(manager.submit(data),202)
            if path=='/api/diagnose':
                if not isinstance(data.get('log'),str):
                    raise ValueError('日志应为文本。')
                return self.send_json({'findings':diagnose(data['log'])})
            if path=='/api/ai':
                return self.send_json(chat(data))
            if path=='/api/shutdown':
                if manager.active:
                    manager.cancel(manager.active)
                self.send_json({'shutdown_requested':True})
                threading.Thread(target=self.server.shutdown,daemon=True).start()
                return
            match=re.fullmatch(r'/api/runs/([a-f0-9]{32})/cancel',path)
            if match:
                return self.send_json(manager.cancel(match[1]))
            return self.send_json({'error':'Unknown API route'},404)
        except (ValueError,KeyError) as error:
            return self.send_json({'error':str(error)},400)
        except RuntimeError as error:
            return self.send_json({'error':str(error)},409)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8766)
    args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Offshore Assistant: http://127.0.0.1:{args.port} (PID {__import__("os").getpid()})',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        if manager.active:
            manager.cancel(manager.active)
    finally:
        if manager.active:
            manager.cancel(manager.active)
            deadline=time.monotonic()+10
            while manager.active and time.monotonic()<deadline:
                time.sleep(.1)
        server.server_close()
