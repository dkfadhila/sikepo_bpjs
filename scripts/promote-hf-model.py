"""Materialize an already audited candidate; never run before both audit gates pass."""
import hashlib,json,shutil
from datetime import date
from pathlib import Path
base=Path('artifacts/hf-audit')
data_audit=json.loads((base/'dataset-audit.json').read_text())
case_audit=json.loads((base/'model-case-audit.json').read_text())
assert data_audit['passed'] and case_audit['passed']
source=json.loads((base/'operational-slice.json').read_text())
assert len(source)==10000
rows=[]
for i,c in enumerate(source):
 c=dict(c);c.pop('injectedScenario');original=c['id']
 c['id']=f'SYN-2512-{i+1:05d}';c['sourceId']=original
 c['city']=f"Wilayah sintetis {c.pop('region'):02d}"
 c['facilityId']=f"SYN-FK-{c['facilityId']:04d}"
 c['diagnosis']=f"Diagnosis skenario {c['icd']}"
 c['daysAgo']=(date(2025,12,31)-date.fromisoformat(c['date'])).days
 assert 0<=c['daysAgo']<31
 rows.append(c)
meta={'version':'sikepo-operational-3.0','seed':2802025,'generator':'ml/hf_train_historical.py',
 'anchorDate':'2025-12-31','dateMin':min(c['date'] for c in rows),'dateMax':max(c['date'] for c in rows),'count':len(rows),
 'historicalRows':data_audit['rowsChecked'],'historicalDateMin':data_audit['dateMin'],'historicalDateMax':data_audit['dateMax'],
 'historicalDatasetVersion':'sikepo-historical-3.0','historicalDatasetRevision':data_audit['datasetRevision'],
 'provenance':'Fully synthetic operational slice of the audited private HF historical corpus; no real participant data.',
 'tariffSource':'Authored scenario values; not official INA-CBG tariffs.',
 'duplicateContext':'duplicateCount describes the full historical corpus; a paired row may be outside this bounded operational slice.'}
out=Path('data/synthetic');payload=json.dumps({'metadata':meta,'claims':rows},indent=2)+'\n'
(out/'claims.json').write_text(payload,encoding='utf-8',newline='\n')
fields=list(rows[0]);csv=','.join(fields)+'\n'+'\n'.join(','.join(json.dumps(c[k],ensure_ascii=False) for k in fields) for c in rows)+'\n'
(out/'claims.csv').write_text(csv,encoding='utf-8',newline='\n')
(out/'manifest.json').write_text(json.dumps({**meta,'sha256':hashlib.sha256(payload.encode()).hexdigest(),'fields':fields},indent=2)+'\n',encoding='utf-8',newline='\n')
# Do not copy historical labels into the operational API or model features.
(out/'scenario-labels.json').write_text('[]\n',encoding='utf-8',newline='\n')
dest=Path('ml/artifacts')
for name in ['isolation-forest.json','evaluation.json','parity-fixtures.json']:shutil.copyfile(base/'model'/name,dest/name)
for name in ['dataset-audit.json','model-case-audit.json']:shutil.copyfile(base/name,dest/name)
shutil.copyfile(base/'dataset/manifest.json',dest/'historical-manifest.json')
model_bytes=(dest/'isolation-forest.json').read_bytes()
(dest/'provenance.json').write_text(json.dumps({'job':json.loads(Path('ml/hf-job.json').read_text()),'datasetAuditPassed':True,'caseAuditPassed':True,
 'modelSha256':hashlib.sha256(model_bytes).hexdigest(),'operationalDatasetSha256':hashlib.sha256(payload.encode()).hexdigest(),
 'note':'Historical corpus archived privately on Hugging Face; active MongoDB slice contains 10k claims only.'},indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'activeRows':len(rows),'trainingRows':data_audit['rowsChecked'],'activeDateMin':meta['dateMin'],'activeDateMax':meta['dateMax']}))
