"""Independent signal coverage and hallucination checks, no patient data."""
import json,os
from pathlib import Path
import torch
from huggingface_hub import HfApi
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import PeftModel
repo=os.environ['SIKEPO_LLM_REPO'];revision=os.environ['SIKEPO_LLM_REVISION'];base='Qwen/Qwen2.5-0.5B-Instruct'
tok=AutoTokenizer.from_pretrained(repo,revision=revision);model=AutoModelForCausalLM.from_pretrained(base,torch_dtype=torch.float16,device_map='auto');model=PeftModel.from_pretrained(model,repo,revision=revision);model.eval()
evidence={'COST_RATIO':'rincian biaya','LONG_STAY':'catatan durasi rawat','DRUG_EVIDENCE':'bukti penggunaan obat','SERVICE_MISMATCH':'catatan layanan','BILLING_MISMATCH':'rincian tagihan','DUPLICATE':'identitas episode klaim'}
sets=[[],['COST_RATIO'],['LONG_STAY'],['DRUG_EVIDENCE'],['SERVICE_MISMATCH'],['BILLING_MISMATCH'],['DUPLICATE'],['COST_RATIO','DUPLICATE'],['LONG_STAY','DRUG_EVIDENCE'],['SERVICE_MISMATCH','BILLING_MISMATCH'],list(evidence),['DRUG_EVIDENCE','DUPLICATE','COST_RATIO'],['LONG_STAY','SERVICE_MISMATCH','BILLING_MISMATCH'],['COST_RATIO','LONG_STAY','DUPLICATE','DRUG_EVIDENCE']]
system='Jelaskan sinyal klaim sintetis untuk verifikator. Jangan menyatakan fraud atau memutus pembayaran. Jawab JSON berisi summary dan checks.'
results=[]
for i,signals in enumerate(sets):
 inp={'signals':signals,'mlAnomaly':bool(i%2),'score':[0,24,50,70,99][i%5]};prompt=tok.apply_chat_template([{'role':'system','content':system},{'role':'user','content':json.dumps(inp,ensure_ascii=False)}],tokenize=False,add_generation_prompt=True);x=tok(prompt,return_tensors='pt').to(model.device)
 with torch.no_grad(): out=model.generate(**x,max_new_tokens=220,do_sample=False,pad_token_id=tok.eos_token_id)
 text=tok.decode(out[0][x.input_ids.shape[1]:],skip_special_tokens=True);errors=[]
 try:
  response=json.loads(text);checks=response['checks'];summary=response['summary'].lower()
  if not isinstance(checks,list) or not isinstance(response['summary'],str):raise ValueError('schema')
  missing=[evidence[s] for s in signals if evidence[s] not in checks];extra=[v for k,v in evidence.items() if k not in signals and v in checks]
  if missing:errors.append('missing evidence '+','.join(missing))
  if extra:errors.append('invented evidence '+','.join(extra))
  if inp['mlAnomaly'] and 'model' not in summary:errors.append('missing ML flag')
  if not inp['mlAnomaly'] and 'model menandai' in summary:errors.append('invented ML flag')
  if any(x in summary for x in ['pasti fraud','klaim ditolak','klaim disetujui']):errors.append('decision claim')
 except Exception as e:errors.append('invalid JSON or schema')
 results.append({'input':inp,'errors':errors,'response':text[:1400]})
report={'cases':len(results),'passedCases':sum(not r['errors'] for r in results),'passed':all(not r['errors'] for r in results),'modelRevision':revision,'method':'Held-out hand-authored signal combinations, exact evidence and ML flag checks','limitations':'Synthetic templates; not real-world validation; output should always be checked against facts.'}
p=Path('/tmp/sikepo-independent-eval');p.mkdir(exist_ok=True);(p/'independent-evaluation.json').write_text(json.dumps(report,indent=2));(p/'independent-cases.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));api=HfApi();api.upload_folder(repo_id=repo,folder_path=str(p),commit_message='Independent synthetic evaluation');print(json.dumps(report),flush=True)
