"""Extract viewer reference dimensions from the installed, pinned r-test inputs.

This exports geometry only; decorative fittings and illustrative mooring curves
are constructed separately in the viewer, never used as solver input.
"""
from pathlib import Path
import hashlib,json

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'runtime/model/glue-codes/openfast'
CASE=BASE/'5MW_OC4Semi_WSt_WavesWN'
PREFIX='NRELOffshrBsline5MW_OC4DeepCwindSemi_'

def rows(lines,header,count):
    start=next(i for i,line in enumerate(lines) if line.strip().startswith(header))+2
    return [line.split('!')[0].split() for line in lines[start:start+count]]

def main():
    paths=[CASE/(PREFIX+'HydroDyn.dat'),CASE/(PREFIX+'MoorDyn.dat'),
           BASE/'5MW_Baseline/NRELOffshrBsline5MW_AeroDyn_blade.dat',CASE/(PREFIX+'ElastoDyn.dat')]
    hydro,moor,blade,elasto=[p.read_text().splitlines() for p in paths]
    scalar=lambda key:float(next(line.split()[0] for line in elasto if len(line.split())>1 and line.split()[1]==key))
    data={
        'provenance':{'repository':'https://github.com/OpenFAST/r-test','revision':'dd5feaaaa500ba7283140107806300d551cff0a7',
                      'files':[{'path':str(p.relative_to(BASE)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]},
        'joints':{r[0]:list(map(float,r[1:4])) for r in rows(hydro,'JointID ',44)},
        'diameters':{r[0]:float(r[1]) for r in rows(hydro,'PropSetID ',4)},
        'members':[list(map(int,r[:5])) for r in rows(hydro,'MemberID  MJointID1',25)],
        'mooringPoints':[{'id':int(r[0]),'attachment':r[1],'xyz':list(map(float,r[2:5]))} for r in rows(moor,'ID     Attachment',6)],
        'mooringLines':[{'id':int(r[0]),'a':int(r[2]),'b':int(r[3]),'length':float(r[4])} for r in rows(moor,'ID      LineType',3)],
        'blade':[{'span':float(r[0]),'twist':float(r[4]),'chord':float(r[5])} for r in rows(blade,'BlSpn ',19)],
        'turbine':{key:scalar(key) for key in ['TipRad','HubRad','TowerHt','TowerBsHt','OverHang','ShftTilt','Twr2Shft']}}
    out=ROOT/'dist/assets/oc4-geometry.json'
    out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Exported {len(data["members"])} members, {len(data["blade"])} blade stations, 3 mooring lines.')

if __name__=='__main__':main()
