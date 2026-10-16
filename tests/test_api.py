import json,sys,threading,unittest,urllib.request,urllib.error
from pathlib import Path
from http.server import ThreadingHTTPServer
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Handler,TOKEN

class QuietHandler(Handler):
    def log_message(self,*args):pass

class APITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.base=f'http://127.0.0.1:{cls.server.server_port}'
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=2)
    def request(self,path,body=None,headers=None):
        req=urllib.request.Request(self.base+path,data=None if body is None else json.dumps(body).encode(),headers=headers or {})
        try:
            with urllib.request.urlopen(req,timeout=3) as r:return r.status,json.load(r)
        except urllib.error.HTTPError as e:return e.code,json.load(e)
    def test_health(self):
        code,data=self.request('/api/health');self.assertEqual(code,200);self.assertEqual(data['service'],'offshore-assistant')
        runtime=Path(__file__).resolve().parents[1]/'runtime'
        self.assertEqual(data['engine_ready'],(runtime/'engine/OpenFAST.exe').exists() and (runtime/'manifest.json').exists())
    def test_missing_token_rejected(self):
        self.assertEqual(self.request('/api/runs',{})[0],403)
    def test_external_origin_rejected(self):
        self.assertEqual(self.request('/api/runs',{},headers={'X-Run-Token':TOKEN,'Origin':'https://example.invalid'})[0],403)
    def test_malformed_payload_rejected(self):
        for body in [[],{'wind':100},{'duration':60,'discard':60}]:
            with self.subTest(body=body):self.assertEqual(self.request('/api/runs',body,{'X-Run-Token':TOKEN})[0],400)
    def test_log_diagnosis_evidence(self):
        code,data=self.request('/api/diagnose',{'log':'The file test.fst was not found\nAborting OpenFAST.'},{'X-Run-Token':TOKEN})
        self.assertEqual(code,200);self.assertEqual(data['findings'][0]['code'],'missing-file');self.assertIn('test.fst',data['findings'][0]['evidence'])
    def test_preflight_reports_verified_assets(self):
        code,data=self.request('/api/preflight');self.assertEqual(code,200)
        runtime=Path(__file__).resolve().parents[1]/'runtime'
        if (runtime/'engine/OpenFAST.exe').exists() and (runtime/'manifest.json').exists():
            self.assertTrue(data['ready']);self.assertTrue(all(c['ok'] for c in data['checks']))
        else:self.assertFalse(data['ready'])
    def test_ai_endpoint_requires_token_and_routes_without_persistence(self):
        self.assertEqual(self.request('/api/ai',{'probe':True})[0],403)
        with patch('server.chat',return_value={'text':'fake endpoint response'}) as mocked:
            code,data=self.request('/api/ai',{'probe':True},{'X-Run-Token':TOKEN})
            self.assertEqual(code,200);self.assertEqual(data['text'],'fake endpoint response');mocked.assert_called_once_with({'probe':True})

if __name__=='__main__':unittest.main()
