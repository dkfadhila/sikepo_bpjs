"""Private, bounded inference for the independently tested NALAR adapter."""
import json
import os
import gradio as gr
import spaces
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

REPO = 'konigiri/sikepo-explainer-lora-experiment-v4'
REVISION = 'f93d42c68503f6b9f8d18dd2d018cb5bff91edd8'
BASE = 'Qwen/Qwen3-4B-Instruct-2507'
SYSTEM = 'Jelaskan sinyal klaim sintetis untuk verifikator. Jangan menyatakan fraud atau memutus pembayaran. Jawab JSON berisi summary dan checks.'
EVIDENCE = {'COST_RATIO':'rincian biaya','LONG_STAY':'catatan durasi rawat','DRUG_EVIDENCE':'bukti penggunaan obat','SERVICE_MISMATCH':'catatan layanan','BILLING_MISMATCH':'rincian tagihan','DUPLICATE':'identitas episode klaim'}
tokenizer = AutoTokenizer.from_pretrained(REPO, revision=REVISION)
base = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float16, low_cpu_mem_usage=True)
model = PeftModel.from_pretrained(base, REPO, revision=REVISION, torch_device='cpu').eval().to('cuda')

@spaces.GPU(duration=25)
def explain(payload):
    if not isinstance(payload, str) or len(payload) > 2000:
        raise gr.Error('Invalid request')
    data = json.loads(payload)
    if set(data) != {'signals','mlAnomaly','score'} or not isinstance(data['signals'],list) or len(data['signals'])>6 or any(s not in EVIDENCE for s in data['signals']) or type(data['mlAnomaly']) is not bool or type(data['score']) is not int or not 0<=data['score']<=99:
        raise gr.Error('Invalid claim indicators')
    prompt = tokenizer.apply_chat_template([{'role':'system','content':SYSTEM},{'role':'user','content':json.dumps(data,ensure_ascii=False)}],tokenize=False,add_generation_prompt=True)
    inputs = tokenizer(prompt,return_tensors='pt').to('cuda')
    with torch.inference_mode():
        output = model.generate(**inputs,max_new_tokens=220,do_sample=False,pad_token_id=tokenizer.eos_token_id)
    text = tokenizer.decode(output[0][inputs.input_ids.shape[1]:],skip_special_tokens=True)
    result = json.loads(text)
    if set(result)!={'summary','checks'} or not isinstance(result['summary'],str) or not isinstance(result['checks'],list):
        raise gr.Error('Invalid model response')
    expected = [EVIDENCE[s] for s in data['signals']] or ['dokumen pendukung klaim']
    if sorted(result['checks'])!=sorted(expected) or any(s in result['summary'].lower() for s in ['pasti fraud','klaim ditolak','klaim disetujui']):
        raise gr.Error('Model response failed evidence validation')
    return {'summary':result['summary'],'checks':result['checks'],'model':'NALAR-4B','revision':REVISION}

with gr.Blocks() as app:
    gr.Markdown('# NALAR by SIKEPO\nPrivate synthetic claim explanation service.')
    payload = gr.Textbox(label='Indicators',max_lines=1)
    output = gr.JSON(label='Explanation')
    gr.Button('Explain').click(explain,payload,output,api_name='explain',concurrency_limit=1)
app.queue(max_size=4).launch(show_error=False)
