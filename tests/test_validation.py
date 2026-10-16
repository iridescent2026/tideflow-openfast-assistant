import hashlib,json,sys,unittest,tempfile
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine import diagnose,validate_params,DEFAULTS,RunManager
from runtime_lock import RuntimeLease

class ValidationTests(unittest.TestCase):
    def test_actual_injected_fault_corpus(self):
        folder=ROOT/'tests/fixtures'
        for entry in json.loads((folder/'failures.json').read_text(encoding='utf-8')):
            with self.subTest(case=entry['id']):
                raw=(folder/entry['file']).read_bytes()
                self.assertEqual(hashlib.sha256(raw).hexdigest(),entry['sha256'])
                self.assertNotEqual(entry['returncode'],0)
                self.assertIn(entry['expected'],[f['code'] for f in diagnose(raw.decode('utf-8'))])
    def test_warnings_do_not_hide_unknown_fatal(self):
        result=diagnose('Turning off unsteady aerodynamics\nUnexpected fatal error\nAborting OpenFAST.')
        self.assertTrue(any(f['code']=='fatal' for f in result))
    def test_missing_input_field_is_not_a_missing_file(self):
        result=diagnose('DT was not found on line 8')
        self.assertEqual([f['code'] for f in result],['invalid-input'])
    def test_long_run_and_half_step_validation(self):
        self.assertEqual(validate_params({**DEFAULTS,'duration':3600,'discard':1200,'solver_dt':.00625})['solver_dt'],.00625)
        for change in [{'duration':3610},{'solver_dt':True},{'solver_dt':.1}]:
            with self.subTest(change=change),self.assertRaises(ValueError):validate_params({**DEFAULTS,**change})
    def test_os_lock_excludes_another_runner_and_releases(self):
        path=ROOT/'runtime/test-engine.lock';a=RuntimeLease(path);b=RuntimeLease(path)
        try:
            a.acquire()
            with self.assertRaises(RuntimeError):b.acquire()
            a.release();b.acquire()
        finally: a.release();b.release()
    def test_second_service_does_not_mislabel_live_external_job_as_failed(self):
        with tempfile.TemporaryDirectory() as folder:
            runtime=Path(folder);lease=RuntimeLease(runtime/'engine.lock');lease.acquire()
            record=runtime/'jobs/unit-test-external/record.json';record.parent.mkdir(parents=True)
            data={'id':'unit-test-external','created':'2026-10-16','status':'preparing'}
            record.write_text(json.dumps(data),encoding='utf-8')
            try:
                with patch('engine.RUNTIME',runtime):
                    manager=RunManager()
                    self.assertEqual(manager.get(data['id'])['status'],'preparing')
                    self.assertTrue(manager.get(data['id'])['external_running'])
                    data['status']='completed';record.write_text(json.dumps(data),encoding='utf-8')
                    lease.release()
                    self.assertEqual(manager.get(data['id'])['status'],'completed')
            finally:lease.release()

if __name__=='__main__': unittest.main()
