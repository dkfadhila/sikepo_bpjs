"""Launch exactly one bounded CPU job with private artifacts and no credentials in source."""
import json, os
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi
load_dotenv('.env', override=True)
if Path('ml/hf-job.json').exists():
 raise RuntimeError('A recorded training job already exists. Inspect it before deliberately launching another paid job.')
api=HfApi();owner=api.whoami()['name']
source=f'{owner}/sikepo-training-source'
dataset=f'{owner}/sikepo-synthetic-2019-2025'
model=f'{owner}/sikepo-iforest-2019-2025'
for repo,kind in [(source,'model'),(dataset,'dataset'),(model,'model')]:
 info=api.create_repo(repo_id=repo,repo_type=kind,private=True,exist_ok=True)
 # Refuse to upload health-themed artifacts into an existing public repo.
 if not api.repo_info(repo_id=repo,repo_type=kind).private:raise RuntimeError('Expected private repository')
api.upload_file(repo_id=source,path_or_fileobj='ml/hf_train_historical.py',path_in_repo='hf_train_historical.py',commit_message='Bounded CPU historical synthetic training script')
revision=api.repo_info(source).sha
bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','hf_train_historical.py',revision='{revision}'),run_name='__main__')"
job=api.run_job(image='python:3.12-slim',command=['bash','-lc','pip install --quiet numpy==2.2.6 scikit-learn==1.7.2 huggingface_hub==1.2.3 && python -u -c '+__import__('shlex').quote(bootstrap)],
 flavor='cpu-upgrade',timeout='1h',name='sikepo-5m-synthetic-2019-2025',
 env={'SIKEPO_ROWS':'5000000','SIKEPO_DATA_REPO':dataset,'SIKEPO_MODEL_REPO':model,'OMP_NUM_THREADS':'8'},
 secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','date-end':'2025-12-31'})
record={'jobId':job.id,'namespace':owner,'url':f'https://huggingface.co/jobs/{owner}/{job.id}',
 'datasetRepo':dataset,'modelRepo':model,'sourceRevision':revision,'rowsRequested':5000000,'dateMin':'2019-01-01','dateMax':'2025-12-31',
 'hardware':'cpu-upgrade','timeoutSeconds':3600,'hardwareRateUSDPerHour':.03,'computeCapUSD':.03,'attempts':1,
 'note':'Compute ceiling based on CLI hardware quote; storage governed separately by account quota. No GPU requested.'}
Path('ml/hf-job.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps(record,indent=2))
