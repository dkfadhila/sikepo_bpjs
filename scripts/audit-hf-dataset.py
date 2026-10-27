"""Read every private HF dataset row and independently recompute held-out model results."""
import gzip, hashlib, json, math
from collections import Counter
from datetime import date
from pathlib import Path
import numpy as np
from dotenv import load_dotenv
from huggingface_hub import HfApi,hf_hub_download
load_dotenv('.env',override=True)
root=Path('artifacts/hf-audit');job=json.loads(Path('ml/hf-job.json').read_text())
api=HfApi();info=api.repo_info(job['datasetRepo'],repo_type='dataset')
assert info.private
manifest=json.loads((root/'dataset/manifest.json').read_text())
model=json.loads((root/'model/isolation-forest.json').read_text())
N=manifest['rows'];seen=np.zeros(N,dtype=np.uint8);counts=np.zeros(N,dtype=np.uint8);episode_dates=np.full(N,-1,dtype=np.int16)
test_x=np.empty((model['report']['splitCounts']['test'],7),dtype=np.float32);test_y=np.empty(len(test_x),dtype=np.uint8)
fields={'id','synthetic','episodeId','date','facilityId','facility','region','type','icd','tariff','amount','invoiceTotal','normalLos','los','serviceCount','documentedServiceCount','restrictedDrug','drugEvidence','duplicateCount','injectedScenario'}
years=Counter();scenarios=Counter();facility=set();diagnoses=set();min_date='9999';max_date='';test_n=0;active=[];declared_duplicates=np.ones(N,dtype=np.uint8)
for entry in manifest['files']:
 p=Path(hf_hub_download(job['datasetRepo'],entry['path'],repo_type='dataset',revision=info.sha,local_dir=root/'dataset'))
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 assert h.hexdigest()==entry['sha256'],entry['path']
 assert p.stat().st_size==entry['bytes']
 with gzip.open(p,'rt',encoding='utf-8') as f:
  for line in f:
   c=json.loads(line);assert set(c)==fields
   assert c['synthetic'] is True and c['facility']==f"Fasilitas Sintetis {c['facilityId']:04d}"
   i=int(c['id'].split('-')[-1])-1;episode=int(c['episodeId'].split('-')[-1])-1
   assert 0<=i<N and 0<=episode<N and seen[i]==0
   seen[i]=1;counts[episode]+=1;declared_duplicates[i]=c['duplicateCount']
   ordinal=(date.fromisoformat(c['date'])-date(2019,1,1)).days
   assert 0<=ordinal<=(date(2025,12,31)-date(2019,1,1)).days
   assert episode_dates[episode] in [-1,ordinal]
   episode_dates[episode]=ordinal
   assert c['id'].startswith('SYN-'+c['date'][:4]+'-')
   assert c['date'][:4] in entry['path']
   assert c['amount']>0 and c['tariff']>0 and c['normalLos']>0 and c['los']>0
   assert 0<=c['documentedServiceCount']<=c['serviceCount']
   years[c['date'][:4]]+=1;scenarios[c['injectedScenario']]+=1;facility.add(c['facilityId']);diagnoses.add(c['icd'])
   min_date=min(min_date,c['date']);max_date=max(max_date,c['date'])
   if c['date'].startswith('2025'):
    test_x[test_n]=[c['amount']/c['tariff'],c['los']/c['normalLos'],int(c['restrictedDrug'] and not c['drugEvidence']),abs(c['serviceCount']-c['documentedServiceCount'])/c['serviceCount'],abs(c['invoiceTotal']-c['amount'])/c['amount'],c['duplicateCount'],math.log1p(c['tariff'])]
    test_y[test_n]=int(c['injectedScenario'] not in ['baseline','borderline'] or c['duplicateCount']>1);test_n+=1
   # Keep a bounded December 2025 operational slice; full archive stays private on HF.
   if c['date'].startswith('2025-12') and len(active)<10000:active.append(c)
 print(json.dumps({'verifiedFile':entry['path'],'rowsChecked':int(seen.sum())}),flush=True)
assert seen.sum()==N and test_n==len(test_x)
assert dict(years)==manifest['yearCounts'] and dict(scenarios)==manifest['scenarioCounts']
assert len(facility)==manifest['facilityCount'] and len(diagnoses)==manifest['diagnosisCount']
# Every marked duplicate is a pair, with no episode crossing a date or time split.
assert int((declared_duplicates==2).sum())==int((counts==2).sum())*2
assert counts.max()==2
assert min_date==manifest['dateMin'] and max_date==manifest['dateMax']
def avg(n):
 n=np.asarray(n);return np.where(n<=1,0,np.where(n==2,1,2*(np.log(np.maximum(1,n-1))+.5772156649015329)-2*(n-1)/np.maximum(1,n)))
paths=np.zeros(len(test_x))
for tree in model['trees']:
 left=np.array(tree['left']);right=np.array(tree['right']);feat=np.array(tree['feature']);threshold=np.array(tree['threshold']);samples=np.array(tree['samples'])
 node=np.zeros(len(test_x),dtype=np.int32);depth=np.zeros(len(test_x))
 while True:
  rows=np.flatnonzero(left[node]!=-1)
  if not len(rows):break
  current=node[rows];go_left=test_x[rows,feat[current]]<=threshold[current]
  node[rows]=np.where(go_left,left[current],right[current]);depth[rows]+=1
 paths+=depth+avg(samples[node])
scores=2**(-paths/(len(model['trees'])*float(avg(model['maxSamples']))));pred=scores>model['threshold']
confusion=[int(((test_y==0)&~pred).sum()),int(((test_y==0)&pred).sum()),int(((test_y==1)&~pred).sum()),int(((test_y==1)&pred).sum())]
assert confusion==model['report']['test']['confusionMatrixTN_FP_FN_TP'],(confusion,model['report']['test'])
report={'passed':True,'datasetRevision':info.sha,'rowsChecked':N,'allFileChecksumsVerified':True,'dateMin':min_date,'dateMax':max_date,'yearCounts':dict(years),
 'facilityCount':len(facility),'diagnosisCount':len(diagnoses),'duplicateEpisodes':int((counts==2).sum()),'noEpisodeDateLeakage':True,'exactSchemaWithoutParticipantIdentifiers':True,
 'heldOutRowsIndependentlyScored':test_n,'recomputedConfusionMatrix':confusion,'confusionMatchesHFReport':True}
(root/'dataset-audit.json').write_text(json.dumps(report,indent=2)+'\n')
(root/'operational-slice.json').write_text(json.dumps(active,separators=(',',':'))+'\n')
print(json.dumps(report,indent=2))
