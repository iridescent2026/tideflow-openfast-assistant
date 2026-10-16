import json,math,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import DEFAULTS,MODEL_PATH,CASE,configure_case,validate_params,replace_field,read_field,parse_output,diagnose

OUTPUT='''OpenFAST synthetic unit-test fixture only
Time GenPwr RotSpeed PtfmPitch PtfmSurge Wave1Elev
(s) (kW) (rpm) (deg) (m) (m)
0 1000 10 -2 3 0
10 1000 10 2 4 1
20 1000 10 -2 3 0
30 1000 10 2 4 -1
40 1000 10 -2 3 0
50 1000 10 2 4 1
60 1000 10 -2 3 0
'''

class EngineTests(unittest.TestCase):
    def test_params_reject_bad_ranges_and_bool(self):
        for p in [dict(wind=float('nan')),dict(wind=20),dict(wind=True),dict(seed=1.5),dict(duration=60,discard=60),dict(name='')]:
            with self.subTest(p=p),self.assertRaises(ValueError):validate_params({**DEFAULTS,**p})

    def test_parameter_replacement_preserves_other_fields_and_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'input.dat'
            path.write_bytes(b'header \x93test\x94\r\n  8.0 HWindSpeed - comment\r\n 9 OtherValue - HWindSpeed\r\n')
            replace_field(path,'HWindSpeed',11.5)
            self.assertEqual(read_field(path,'HWindSpeed'),'11.5')
            self.assertIn(b'9 OtherValue - HWindSpeed',path.read_bytes())
            self.assertIn(b'\x93test\x94',path.read_bytes())
            with self.assertRaises(ValueError):replace_field(path,'Missing',1)

    def test_duplicate_parameter_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'input.dat';p.write_text('8 X - first\n9 X - second\n')
            with self.assertRaises(ValueError):replace_field(p,'X',1)
    def test_long_run_updates_wave_duration_and_half_solver_step(self):
        with tempfile.TemporaryDirectory() as folder:
            case=Path(folder)/MODEL_PATH;case.mkdir(parents=True)
            fst=case/(CASE+'.fst')
            fst.write_text('"inflow.dat" InflowFile\n"sea.dat" SeaStFile\n"hydro.dat" HydroFile\n120 TMax\n0.0125 DT\n0.1 DT_Out\n0 TStart\n1 OutFileFmt\n5 SttsTime\n')
            (case/'inflow.dat').write_text('1 WindType\n8 HWindSpeed\n')
            (case/'sea.dat').write_text('1 WaveMod\n1.5 WaveHs\n10 WaveTp\n123 WaveSeed(1)\n600 WaveTMax\n')
            (case/'hydro.dat').write_text('0.0125 RdtnDT\n')
            configure_case(folder,{**DEFAULTS,'duration':3600,'solver_dt':.00625})
            self.assertEqual(read_field(fst,'DT'),'0.00625')
            self.assertEqual(read_field(case/'sea.dat','WaveTMax'),'3600')
            self.assertEqual(read_field(case/'hydro.dat','RdtnDT'),'0.00625')

    def parse_fixture(self,text=OUTPUT):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'result.out';path.write_text(text)
            return parse_output(path,{**DEFAULTS,'duration':60,'discard':20})

    def test_time_weighted_stats_and_energy_units(self):
        r=self.parse_fixture()
        self.assertAlmostEqual(r['stats']['GenPwr']['mean'],1000)
        self.assertAlmostEqual(r['energy_kwh'],1000*40/3600)
        self.assertEqual(r['analysis_samples'],5)
        self.assertAlmostEqual(r['stats']['PtfmPitch']['max_abs'],2)

    def test_invalid_output_rejected(self):
        bad=[OUTPUT.replace('(kW)','(W)'),OUTPUT.replace('60 1000','50 1000'),OUTPUT.replace('30 1000','30 NaN'),OUTPUT.rsplit('60 1000',1)[0],OUTPUT.replace('60 1000','70 1000'),OUTPUT.replace('\n0 1000','\n-1 1000')]
        for text in bad:
            with self.subTest(text=text[-80:]),self.assertRaises(ValueError):self.parse_fixture(text)

    def test_log_evidence_and_unknown_fatal(self):
        f=diagnose('FAST_Initialize\nFile missing.fst was not found\nAborting OpenFAST.')[0]
        self.assertEqual(f['code'],'missing-file')
        self.assertIn('missing.fst',f['evidence'])
        self.assertEqual(diagnose('unclassified fatal error')[0]['code'],'fatal')

    def test_normal_completion_not_misclassified(self):
        self.assertEqual(diagnose('OpenFAST terminated normally.'),[])

    def test_actual_samples_are_complete_and_hash_linked(self):
        data=json.loads((ROOT/'dist'/'samples.json').read_text(encoding='utf-8'))
        self.assertGreaterEqual(len(data['runs']),3)
        for r in data['runs']:
            self.assertEqual(r['status'],'completed')
            self.assertEqual(r['returncode'],0)
            self.assertEqual(r['result']['full_samples'],r['params']['duration']*10+1)
            self.assertEqual(r['result']['analysis_start'],r['params']['discard'])
            self.assertEqual(r['result']['analysis_end'],r['params']['duration'])
            self.assertRegex(r['result']['output_sha256'],r'^[a-f0-9]{64}$')
            self.assertTrue(any('terminated normally' in line for line in r['logs']))

if __name__=='__main__':unittest.main()
