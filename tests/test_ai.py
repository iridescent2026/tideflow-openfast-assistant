"""Protocol tests use an explicitly labelled local fake provider, not a real LLM."""
import json,threading,unittest,sys,urllib.request,urllib.error
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ai_bridge import chat,validate_connection

class FakeProvider(BaseHTTPRequestHandler):
    received=[]
    def log_message(self,*args): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        self.received.append({'body':body,'authorization':self.headers.get('Authorization')})
        if self.path=='/redirect':
            self.send_response(302);self.send_header('Location','http://127.0.0.1:1/leak');self.end_headers();return
        if self.path=='/unauthorized': code=401;result={'error':'secret-body-must-not-be-relayed'}
        elif self.path=='/bad': code=200;result={'choices':[]}
        else: code=200;result={'choices':[{'message':{'content':'FAKE PROVIDER: connection works'}}]}
        raw=json.dumps(result).encode();self.send_response(code);self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)

class AITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),FakeProvider)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.connection={'url':f'http://127.0.0.1:{cls.server.server_port}/chat','model':'fake-test-model','key':'unit-test-only'}
    @classmethod
    def tearDownClass(cls): cls.server.shutdown();cls.server.server_close();cls.thread.join(2)
    def test_probe_does_not_send_simulation(self):
        result=chat({**self.connection,'probe':True,'context':{'confidential':'do-not-send'}})
        self.assertIn('FAKE PROVIDER',result['text'])
        sent=FakeProvider.received[-1];self.assertEqual(sent['authorization'],'Bearer unit-test-only')
        self.assertNotIn('confidential',json.dumps(sent['body']))
    def test_evidence_and_question_reach_provider(self):
        chat({**self.connection,'question':'解释波高','context':{'references':[{'id':'K1'}],'stats':{'GenPwr':1}}})
        sent=FakeProvider.received[-1]['body'];self.assertIn('K1',sent['messages'][1]['content']);self.assertIn('不编造',sent['messages'][0]['content'])
    def test_http_errors_hide_provider_body_and_key(self):
        with self.assertRaises(RuntimeError) as ctx: chat({**self.connection,'url':self.connection['url'].replace('/chat','/unauthorized'),'probe':True})
        self.assertIn('401',str(ctx.exception));self.assertNotIn('secret',str(ctx.exception));self.assertNotIn('unit-test-only',str(ctx.exception))
    def test_bad_schema_rejected(self):
        with self.assertRaises(RuntimeError): chat({**self.connection,'url':self.connection['url'].replace('/chat','/bad'),'probe':True})
    def test_redirect_not_followed(self):
        with self.assertRaisesRegex(RuntimeError,'302'): chat({**self.connection,'url':self.connection['url'].replace('/chat','/redirect'),'probe':True})
    def test_bad_connections_rejected(self):
        for change in [{'url':'http://example.com/chat'},{'url':'https://user:pass@example.com/chat'},{'url':'https://example.com/chat?key=x'},{'key':'abc\r\nInjected: yes'},{'model':''}]:
            with self.subTest(change=change),self.assertRaises(ValueError): validate_connection({**self.connection,**change})

if __name__=='__main__': unittest.main()
