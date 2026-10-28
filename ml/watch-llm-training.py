"""One-shot HF watcher: start an independent test after training, never deploy."""
import json,os,time,shlex
from pathlib import Path
from huggingface_hub import HfApi,hf_hub_download
api=HfApi();owner=os.environ['SIKEPO_OWNER'];job_id=os.environ['SIKEPO_TRAIN_JOB'];repo=os.environ['SIKEPO_LLM_REPO'];source=os.environ['SIKEPO_SOURCE'];source_rev=os.environ['SIKEPO_SOURCE_REV'];base=os.environ['SIKEPO_BASE_MODEL']
deadline=time.monotonic()+5700
while time.monotonic()<deadline:
 job=api.inspect_job(job_id=job_id,namespace=owner);stage=job.status.stage
 if stage in ['ERROR','CANCELED','DELETED']:raise RuntimeError('Training ended without a model: '+stage)
 if stage=='COMPLETED':break
 time.sleep(30)
else:raise TimeoutError('Training did not finish in watcher window')
info=api.repo_info(repo);assert info.private
report=json.loads(Path(hf_hub_download(repo,'evaluation.json',revision=info.sha)).read_text())
if not report.get('passed'):raise RuntimeError('Training format checks failed; independent evaluation not launched')
if api.file_exists(repo,'independent-evaluation-job.json'):raise RuntimeError('Evaluation already dispatched; refusing duplicate')
bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','eval-sikepo-llm.py',revision='{source_rev}'),run_name='__main__')"
cmd='pip install --quiet transformers==4.51.3 peft==0.15.2 accelerate==1.6.0 huggingface_hub==0.30.2 && python -u -c '+shlex.quote(bootstrap)
job=api.run_job(image='pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime',command=['bash','-lc',cmd],flavor='t4-small',timeout='30m',name='sikepo-explainer-v4-independent-test',env={'SIKEPO_LLM_REPO':repo,'SIKEPO_LLM_REVISION':info.sha,'SIKEPO_BASE_MODEL':base},secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','purpose':'evaluation'})
record={'jobId':job.id,'namespace':owner,'url':f'https://huggingface.co/jobs/{owner}/{job.id}','modelRevision':info.sha,'hardware':'t4-small','timeoutMinutes':30,'maxComputeUSD':0.20,'attempts':1,'automaticDeployment':False}
api.upload_file(repo_id=repo,path_or_fileobj=json.dumps(record,indent=2).encode(),path_in_repo='independent-evaluation-job.json',commit_message='Record independent evaluation dispatch');print(json.dumps(record),flush=True)
