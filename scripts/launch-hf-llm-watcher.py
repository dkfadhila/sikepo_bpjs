import json,os,shlex
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi
load_dotenv('.env',override=True);record=Path('ml/hf-llm-v4-watcher.json')
if record.exists():raise RuntimeError('Watcher already recorded')
a=HfApi();j=json.loads(Path('ml/hf-llm-v4-job.json').read_text());source=f"{j['namespace']}/sikepo-training-source"
for path in ['ml/eval-sikepo-llm.py','ml/watch-llm-training.py']:a.upload_file(repo_id=source,path_or_fileobj=path,path_in_repo=Path(path).name,commit_message='Prepare bounded independent LLM evaluation')
rev=a.repo_info(source).sha;bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','watch-llm-training.py',revision='{rev}'),run_name='__main__')"
command='pip install --quiet huggingface_hub==2.2.0 && python -u -c '+shlex.quote(bootstrap)
job=a.run_job(image='python:3.12-slim',command=['bash','-lc',command],flavor='cpu-basic',timeout='100m',name='sikepo-v4-test-watcher',env={'SIKEPO_OWNER':j['namespace'],'SIKEPO_TRAIN_JOB':j['jobId'],'SIKEPO_LLM_REPO':j['modelRepo'],'SIKEPO_SOURCE':source,'SIKEPO_SOURCE_REV':rev,'SIKEPO_BASE_MODEL':j['baseModel']},secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','purpose':'one-shot-evaluation'})
r={'jobId':job.id,'namespace':j['namespace'],'url':f"https://huggingface.co/jobs/{j['namespace']}/{job.id}",'sourceRevision':rev,'hardware':'cpu-basic','timeoutMinutes':100,'maxWatcherComputeUSD':0.017,'maxEvaluationComputeUSD':0.20,'automaticDeployment':False};record.write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r))
