"""CPU training job: authored synthetic records only, no external health datasets.

HF_TOKEN is supplied by the job secret mechanism; it is never written to artifacts.
"""
import bisect, gzip, hashlib, json, math, os, platform, random, time
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import sklearn
from huggingface_hub import HfApi
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, confusion_matrix, precision_recall_fscore_support, roc_auc_score

SEED = 2802025
COUNT = int(os.environ.get('SIKEPO_ROWS', '5000000'))
DATA_REPO = os.environ['SIKEPO_DATA_REPO']
MODEL_REPO = os.environ['SIKEPO_MODEL_REPO']
OUT = Path('/tmp/sikepo-historical'); OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(SEED)
FEATURES = ['cost_ratio','los_ratio','missing_drug_evidence','service_gap_ratio','invoice_gap_ratio','duplicate_count','log_tariff']
DIAGNOSES = [
 ('J18.9',6200000,6),('A01.0',3800000,4),('E11.9',5100000,5),('I50.0',8300000,6),
 ('A09',2950000,3),('O82',7400000,4),('A90',4600000,5),('N18.9',9800000,7),
 ('J45.9',3400000,3),('I10',3100000,3),('K35.8',6700000,4),('S72.0',14000000,9),
 ('I63.9',11500000,8),('N20.0',5700000,4),('K80.2',7200000,5),('D50.9',3900000,4),
 ('H25.9',4200000,2),('J44.1',7800000,6),('E86',2500000,2),('L03.9',4100000,4),
 ('K29.7',2700000,3),('N39.0',3200000,3),('J06.9',1900000,2),('M54.5',3000000,3)]
SCENARIOS = ['baseline','cost_and_stay','drug_evidence','service_mismatch','billing_mismatch','duplicate','mixed','borderline']
WEIGHTS = [.70,.06,.05,.05,.05,.04,.02,.03]
# Authored trend weights inspired only by public aggregate direction. Not a reconstruction of BPJS.
YEAR_WEIGHTS = {2019:1.0,2020:.83,2021:.90,2022:1.16,2023:1.40,2024:1.55,2025:1.67}
dates=[]; cdf=[]; acc=0.
for offset in range((date(2025,12,31)-date(2019,1,1)).days+1):
 d=date(2019,1,1)+timedelta(days=offset)
 acc += YEAR_WEIGHTS[d.year]*(1+.12*math.sin(2*math.pi*d.timetuple().tm_yday/365.25))
 dates.append(d);cdf.append(acc)

X=np.lib.format.open_memmap(OUT/'features.npy',mode='w+',dtype='float32',shape=(COUNT,7))
y=np.lib.format.open_memmap(OUT/'injected.npy',mode='w+',dtype='uint8',shape=(COUNT,))
splits=np.lib.format.open_memmap(OUT/'split.npy',mode='w+',dtype='uint8',shape=(COUNT,))
files={year:gzip.open(OUT/f'claims-{year}.jsonl.gz','wt',encoding='utf-8',compresslevel=3) for year in range(2019,2026)}
years=Counter(); scenarios=Counter(); facilities=set(); diagnoses=set(); previous=None; fixtures=[]
start=time.monotonic()
try:
 for i in range(COUNT):
  scenario=rng.choices(SCENARIOS,WEIGHTS,k=1)[0]
  d=dates[bisect.bisect_left(cdf,rng.random()*acc)]
  facility=rng.randrange(1,1501); region=(facility-1)%38+1; facility_type=['A','B','C','D'][(facility-1)%4]
  diagnosis,base,stay=DIAGNOSES[rng.randrange(len(DIAGNOSES))]
  # Cost and duration have overlapping distributions, facility effects and temporal drift.
  tariff=round(base*(1+.045*(d.year-2019))*{'A':1.3,'B':1.12,'C':1.,'D':.9}[facility_type]*rng.uniform(.85,1.15)/1000)*1000
  normal=max(1,stay+rng.choice([-1,0,0,0,1])); los=max(1,round(normal+rng.gauss(0,1.1)))
  ratio=max(.35,rng.lognormvariate(-.04,.17)); service_count=rng.randrange(2,25); documented=service_count
  restricted=rng.random()<.18; evidence=True; dup=1
  if scenario in ['cost_and_stay','mixed']:ratio*=rng.uniform(1.1,2.3);los+=rng.randrange(1,9)
  if scenario in ['drug_evidence','mixed']:restricted=True;evidence=False
  if scenario in ['service_mismatch','mixed']:documented=max(0,service_count-rng.randrange(1,min(5,service_count)+1))
  if scenario=='borderline':ratio=rng.uniform(1.20,1.38);los=normal+rng.choice([1,2,3])
  amount=round(tariff*ratio/1000)*1000
  invoice=round(amount*rng.uniform(.58,.97)/1000)*1000 if scenario in ['billing_mismatch','mixed'] else amount
  episode=f'SYN-EP-{i+1:08d}'
  # Duplicate pairs are formed only after a nonduplicate, and inherit date/context so no time leakage.
  if scenario=='duplicate' and previous and previous['duplicateCount']==1:
   d=date.fromisoformat(previous['date']);facility=previous['facilityId'];region=previous['region'];facility_type=previous['type'];episode=previous['episodeId'];dup=2
   # Delay the previous row's serialization until the pair is known.
   previous['duplicateCount']=2
   X[i-1,5]=2;y[i-1]=1
  elif scenario=='duplicate':scenario='baseline'
  row={'id':f'SYN-{d.year}-{i+1:08d}','synthetic':True,'episodeId':episode,'date':d.isoformat(),
       'facilityId':facility,'facility':f'Fasilitas Sintetis {facility:04d}','region':region,'type':facility_type,
       'icd':diagnosis,'tariff':tariff,'amount':amount,'invoiceTotal':invoice,'normalLos':normal,'los':los,
       'serviceCount':service_count,'documentedServiceCount':documented,'restrictedDrug':restricted,
       'drugEvidence':evidence,'duplicateCount':dup,'injectedScenario':scenario}
  if previous:files[int(previous['date'][:4])].write(json.dumps(previous,separators=(',',':'))+'\n')
  previous=row
  X[i]=[amount/tariff,los/normal,int(restricted and not evidence),abs(service_count-documented)/service_count,abs(invoice-amount)/amount,dup,math.log1p(tariff)]
  y[i]=int(scenario not in ['baseline','borderline'])
  splits[i]=0 if d.year<=2023 else 1 if d.year==2024 else 2
  years[d.year]+=1;scenarios[scenario]+=1;facilities.add(facility);diagnoses.add(diagnosis)
  if (i+1)%250000==0:print(json.dumps({'stage':'generate','rows':i+1,'elapsedSeconds':round(time.monotonic()-start)}),flush=True)
 if previous:files[int(previous['date'][:4])].write(json.dumps(previous,separators=(',',':'))+'\n')
finally:
 for handle in files.values():handle.close()
X.flush();y.flush();splits.flush()
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
manifest={'datasetVersion':'sikepo-historical-3.0','seed':SEED,'rows':COUNT,'dateMin':'2019-01-01','dateMax':'2025-12-31',
 'yearCounts':dict(years),'scenarioCounts':dict(scenarios),'facilityCount':len(facilities),'diagnosisCount':len(diagnoses),
 'provenance':'Fully synthetic, authored distributions; public aggregate trend inspiration only. No JKN participant data or medical records used.',
 'privacy':'No real names, NIK, membership IDs, birthdates, addresses or patient records. No masking of original data because no original data was used.',
 'limitations':'Costs, stay norms, trend weights and labels are synthetic assumptions, not official tariffs, fraud findings or clinical guidance.',
 'files':[{'path':p.name,'sha256':digest(p),'bytes':p.stat().st_size} for p in sorted(OUT.glob('claims-*.gz'))]}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'stage':'fit','rows':int((splits==0).sum())}),flush=True)
model=IsolationForest(n_estimators=200,max_samples=512,random_state=SEED,contamination='auto',n_jobs=8)
model.fit(X[splits==0])
raw=np.empty(COUNT,dtype='float64')
for begin in range(0,COUNT,100000):raw[begin:begin+100000]=-model.score_samples(X[begin:begin+100000])
threshold=float(np.quantile(raw[(splits==1)&(y==0)],.95))
mask=splits==2;pred=raw[mask]>threshold;truth=y[mask]
p,r,f,_=precision_recall_fscore_support(truth,pred,average='binary',zero_division=0)
report={'modelVersion':'iforest-historical-3.0','datasetVersion':manifest['datasetVersion'],'rows':COUNT,'features':FEATURES,
 'seed':SEED,'splitMethod':'Temporal: train 2019-2023, calibration 2024, held-out development test 2025; duplicate pairs inherit dates',
 'splitCounts':{name:int((splits==i).sum()) for i,name in enumerate(['train','validation','test'])},
 'threshold':threshold,'thresholdMethod':'95th percentile of non-injected validation records; never test',
 'test':{'precision':float(p),'recall':float(r),'f1':float(f),'rocAuc':float(roc_auc_score(truth,raw[mask])),
         'averagePrecision':float(average_precision_score(truth,raw[mask])),'confusionMatrixTN_FP_FN_TP':confusion_matrix(truth,pred).ravel().tolist()},
 'sklearn':sklearn.__version__,'numpy':np.__version__,'python':platform.python_version(),'hardware':'Hugging Face CPU Upgrade, 8 vCPU',
 'elapsedSeconds':round(time.monotonic()-start),'limitations':['Synthetic scenario classification, not confirmed fraud','No validation on BPJS operational data',
 'Temporal test remains development evidence, not independent clinical validation','Labels describe injection rather than rule outcomes; distributions overlap',
 'No automatic payment, approval or rejection']}
trees=[]
for estimator in model.estimators_:
 t=estimator.tree_;trees.append({'left':t.children_left.tolist(),'right':t.children_right.tolist(),'feature':t.feature.tolist(),'threshold':t.threshold.tolist(),'samples':t.n_node_samples.tolist()})
modelout=OUT/'model';modelout.mkdir(exist_ok=True)
(modelout/'isolation-forest.json').write_text(json.dumps({'version':report['modelVersion'],'features':FEATURES,'maxSamples':int(model.max_samples_),'threshold':threshold,'trees':trees,'report':report},separators=(',',':'))+'\n',encoding='utf-8')
(modelout/'evaluation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
(modelout/'parity-fixtures.json').write_text(json.dumps([{'features':X[i].tolist(),'rawScore':float(raw[i])} for i in range(0,COUNT,max(1,COUNT//200))],indent=2)+'\n',encoding='utf-8')
(OUT/'README.md').write_text('''---
language: id
license: apache-2.0
tags:
- synthetic
- tabular
---
# SiKePO synthetic historical claims 2019–2025
Fully authored synthetic records. No actual JKN participant data, real hospital records or official tariff reconstruction.
See manifest.json for exact counts, date limits, seed, SHA-256 hashes and generation limitations.
injectedScenario is an experimental scenario label, not a fraud finding. Exclude it and all identifiers from model features.
Train: 2019–2023. Calibration: 2024. Development test: 2025. No 2026 dates.
''',encoding='utf-8')
(modelout/'README.md').write_text('''---
language: id
license: apache-2.0
tags:
- isolation-forest
- synthetic
---
# SiKePO historical Isolation Forest
CPU-trained novelty detection with seven numerical features. Synthetic evaluation only; not operational BPJS validation.
Output is a review priority, never an automatic approval, rejection, payment or fraud determination.
See evaluation.json for temporal splits, threshold, software versions, limitations and test metrics.
''',encoding='utf-8')
api=HfApi()
print(json.dumps({'stage':'upload','datasetRepo':DATA_REPO,'modelRepo':MODEL_REPO}),flush=True)
api.upload_folder(repo_id=DATA_REPO,repo_type='dataset',folder_path=OUT,allow_patterns=['claims-*.jsonl.gz','manifest.json','README.md'],commit_message='Generate authored synthetic historical claims 2019-2025')
api.upload_folder(repo_id=MODEL_REPO,repo_type='model',folder_path=modelout,commit_message='Train temporal-split historical Isolation Forest on HF CPU')
print(json.dumps({'stage':'complete','report':report}),flush=True)
