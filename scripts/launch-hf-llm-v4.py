import os,json,shlex
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi
load_dotenv('.env',override=True)
record=Path('ml/hf-llm-v4-job.json')
if record.exists():raise RuntimeError('A training job is already recorded; inspect before another paid attempt')
api=HfApi();owner=api.whoami()['name'];source=f'{owner}/sikepo-training-source';target=f'{owner}/sikepo-explainer-lora-experiment-v4'
for repo in [source,target]:
 api.create_repo(repo_id=repo,private=True,exist_ok=True)
 if not api.repo_info(repo).private:raise RuntimeError('Expected private repository')
api.upload_file(repo_id=source,path_or_fileobj='ml/train-sikepo-llm-v3.py',path_in_repo='train-sikepo-llm-v3.py',commit_message='Synthetic-only LoRA experiment')
revision=api.repo_info(source).sha
bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','train-sikepo-llm-v3.py',revision='{revision}'),run_name='__main__')"
cmd='pip install --quiet transformers==4.51.3 datasets==3.5.1 peft==0.15.2 accelerate==1.6.0 huggingface_hub==0.30.2 && python -u -c '+shlex.quote(bootstrap)
job=api.run_job(image='pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime',command=['bash','-lc',cmd],flavor='a100-large',timeout='90m',name='sikepo-explainer-synthetic-experiment-v4',env={'SIKEPO_LLM_REPO':target},secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','purpose':'experiment'})
obj={'jobId':job.id,'namespace':owner,'url':f'https://huggingface.co/jobs/{owner}/{job.id}','sourceRevision':revision,'modelRepo':target,'hardware':'a100-large','hourlyUSD':2.50,'timeoutMinutes':90,'maxComputeUSD':3.75,'attempts':1,'baseModel':'Qwen/Qwen3-4B-Instruct-2507','status':'submitted','note':'Experimental synthetic LoRA, model is not deployed automatically.'}
record.write_text(json.dumps(obj,indent=2)+'\n',encoding='utf-8');print(json.dumps(obj))
