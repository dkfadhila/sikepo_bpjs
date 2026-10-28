"""Bounded synthetic-only LoRA experiment. Not a validated decision maker."""
import os,json,random,re
from pathlib import Path
import torch
from datasets import Dataset
from huggingface_hub import HfApi
from transformers import AutoTokenizer,AutoModelForCausalLM,TrainingArguments,Trainer,DataCollatorForSeq2Seq
from peft import LoraConfig,get_peft_model
random.seed(28102026);torch.manual_seed(28102026)
base='Qwen/Qwen3-4B-Instruct-2507'
tok=AutoTokenizer.from_pretrained(base);tok.pad_token=tok.eos_token
model=AutoModelForCausalLM.from_pretrained(base,torch_dtype=torch.float16,device_map='auto')
model.config.use_cache=False
model.gradient_checkpointing_enable()
model=get_peft_model(model,LoraConfig(r=8,lora_alpha=16,lora_dropout=.05,target_modules=['q_proj','v_proj'],task_type='CAUSAL_LM'))
indicators=[('COST_RATIO','biaya melampaui acuan skenario','rincian biaya'),('LONG_STAY','durasi rawat melebihi acuan skenario','catatan durasi rawat'),('DRUG_EVIDENCE','bukti obat restriksi belum ada','bukti penggunaan obat'),('SERVICE_MISMATCH','jumlah layanan tidak sesuai','catatan layanan'),('BILLING_MISMATCH','total tagihan tidak sesuai','rincian tagihan'),('DUPLICATE','terdapat pengajuan pada episode yang sama','identitas episode klaim')]
system='Jelaskan sinyal klaim sintetis untuk verifikator. Jangan menyatakan fraud atau memutus pembayaran. Jawab JSON berisi summary dan checks.'
def example(i):
 r=random.Random(500000+i);n=r.randrange(0,7);items=r.sample(indicators,n);ml=r.choice([True,False]);weights={'COST_RATIO':30,'LONG_STAY':20,'DRUG_EVIDENCE':25,'SERVICE_MISMATCH':35,'BILLING_MISMATCH':25,'DUPLICATE':45};rule=min(99,sum(weights[x[0]] for x in items));score=max(rule,r.randrange(50,100) if ml else r.randrange(0,35))
 inp={'signals':[x[0] for x in items],'mlAnomaly':ml,'score':score}
 reasons=[x[1] for x in items]+(['model menandai pola tidak biasa'] if ml else [])
 summary=('Temuan perlu ditelaah: '+', '.join(reasons)+'.') if reasons else 'Tidak ada sinyal terpicu; verifikator tetap perlu memeriksa dokumen.'
 checks=[x[2] for x in items] or ['dokumen pendukung klaim']
 return inp,{'summary':summary,'checks':checks}
def build(i):
 inp,out=example(i);messages=[{'role':'system','content':system},{'role':'user','content':json.dumps(inp,ensure_ascii=False)}]
 prompt=tok.apply_chat_template(messages,tokenize=False,add_generation_prompt=True);answer=json.dumps(out,ensure_ascii=False)+tok.eos_token
 p=tok(prompt,add_special_tokens=False);a=tok(answer,add_special_tokens=False);return {'input_ids':p.input_ids+a.input_ids,'attention_mask':[1]*(len(p.input_ids)+len(a.input_ids)),'labels':[-100]*len(p.input_ids)+a.input_ids}
train=Dataset.from_list([build(i) for i in range(8000)])
args=TrainingArguments(output_dir='/tmp/sikepo-llm',per_device_train_batch_size=2,gradient_accumulation_steps=4,max_steps=600,learning_rate=2e-4,fp16=True,logging_steps=25,save_strategy='no',report_to='none',seed=28102026)
trainer=Trainer(model=model,args=args,train_dataset=train,data_collator=DataCollatorForSeq2Seq(tok,padding=True));trainer.train()
model.config.use_cache=True
model.eval();passes=0;results=[]
for i in range(8000,8020):
 inp,expected=example(i);prompt=tok.apply_chat_template([{'role':'system','content':system},{'role':'user','content':json.dumps(inp,ensure_ascii=False)}],tokenize=False,add_generation_prompt=True)
 inputs=tok(prompt,return_tensors='pt').to(model.device)
 with torch.no_grad():generated=model.generate(**inputs,max_new_tokens=180,do_sample=False,pad_token_id=tok.eos_token_id)
 text=tok.decode(generated[0][inputs.input_ids.shape[1]:],skip_special_tokens=True);ok=False
 try:
  out=json.loads(text);ok=isinstance(out.get('summary'),str) and len(out['summary'])>=10 and isinstance(out.get('checks'),list) and 0<len(out['checks'])<=6 and all(isinstance(x,str) for x in out['checks']) and not re.search(r'klaim (pasti fraud|disetujui|ditolak)',text,re.I)
 except (ValueError,AttributeError,TypeError):pass
 passes+=ok;results.append({'input':inp,'valid':ok,'generated':text[:1000]})
out=Path('/tmp/sikepo-export');out.mkdir(exist_ok=True);model.save_pretrained(out);tok.save_pretrained(out)
report={'baseModel':base,'method':'LoRA','syntheticOnly':True,'trainExamples':8000,'testExamples':20,'validTestResponses':passes,'passed':passes>=18,'limitations':['Template-generated examples and small holdout; not clinical or fraud validation','No automatic approval or rejection','Do not deploy until independently tested']}
(out/'evaluation.json').write_text(json.dumps(report,indent=2));(out/'cases.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));(out/'README.md').write_text('Private experimental LoRA adapter for synthetic SIKEPO claim explanations. No clinical or operational validation. Base: '+base)
api=HfApi();api.upload_folder(repo_id=os.environ['SIKEPO_LLM_REPO'],folder_path=str(out),commit_message='Upload bounded synthetic LoRA experiment')
print(json.dumps(report),flush=True)
