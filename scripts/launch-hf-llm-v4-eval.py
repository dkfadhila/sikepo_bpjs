import os,json,shlex
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi
load_dotenv('.env',override=True);record=Path('ml/hf-llm-v4-eval-job.json')
if record.exists():raise RuntimeError('Evaluation job already recorded')
api=HfApi();j=json.loads(Path('ml/hf-llm-v4-job.json').read_text(encoding='utf-8'));owner=j['namespace'];source=f'{owner}/sikepo-training-source';target=j['modelRepo'];info=api.repo_info(target)
if not info.private:raise RuntimeError('Expected private model')
api.upload_file(repo_id=source,path_or_fileobj='ml/eval-sikepo-llm.py',path_in_repo='eval-sikepo-llm.py',commit_message='Independent synthetic evaluation')
src=api.repo_info(source).sha;bootstrap=f"from huggingface_hub import hf_hub_download; import runpy; runpy.run_path(hf_hub_download('{source}','eval-sikepo-llm.py',revision='{src}'),run_name='__main__')"
cmd='pip install --quiet transformers==4.51.3 peft==0.15.2 accelerate==1.6.0 huggingface_hub==0.30.2 && python -u -c '+shlex.quote(bootstrap)
job=api.run_job(image='pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime',command=['bash','-lc',cmd],flavor='t4-small',timeout='30m',name='sikepo-explainer-v4-independent-test',env={'SIKEPO_LLM_REPO':target,'SIKEPO_LLM_REVISION':info.sha,'SIKEPO_BASE_MODEL':j['baseModel']},secrets={'HF_TOKEN':os.environ['HF_TOKEN']},labels={'project':'sikepo','privacy':'synthetic-only','purpose':'evaluation'})
r={'jobId':job.id,'namespace':owner,'url':f'https://huggingface.co/jobs/{owner}/{job.id}','modelRevision':info.sha,'hardware':'t4-small','timeoutMinutes':30,'maxComputeUSD':0.20,'attempts':1};record.write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r))
