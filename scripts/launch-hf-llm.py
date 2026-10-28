import os,json,shlex
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi
load_dotenv('.env',override=True)
record=Path('ml/hf-llm-job.json')
if record.exists():raise RuntimeError('A training job is already recorded; inspect before another paid attempt')
api=HfApi();owner=api.whoami()['name'];source=f'{owner}/sikepo-training-source';target=f'{owner}/sikepo-explainer-lora-experiment'
for repo in [source,target]:
 api.create_repo(repo_id=repo,private=True,exist_ok=True)
 if not api.repo_info(repo).private:raise RuntimeError('Expected private repository')
api.upload_file(repo_id=source,path_or_fileobj='ml/train-sikepo-llm.py',path_in_repo='train-sikepo-llm.py',commit_message='Synthetic-only LoRA experiment')
revision=api.repo_info(source).sha
bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','train-sikepo-llm.py',revision='{revision}'),run_name='__main__')"
cmd='pip install --quiet transformers==4.51.3 datasets==3.5.1 peft==0.15.2 accelerate==1.6.0 huggingface_hub==0.30.2 && python -u -c '+shlex.quote(bootstrap)
job=api.run_job(image='pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime',command=['bash','-lc',cmd],flavor='t4-small',timeout='45m',name='sikepo-explainer-synthetic-experiment',env={'SIKEPO_LLM_REPO':target},secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','purpose':'experiment'})
obj={'jobId':job.id,'namespace':owner,'url':f'https://huggingface.co/jobs/{owner}/{job.id}','sourceRevision':revision,'modelRepo':target,'hardware':'t4-small','hourlyUSD':0.40,'timeoutMinutes':45,'maxComputeUSD':0.30,'attempts':1,'baseModel':'Qwen/Qwen2.5-0.5B-Instruct','status':'submitted','note':'Experimental synthetic LoRA, model is not deployed automatically.'}
record.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8');print(json.dumps(obj))
