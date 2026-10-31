"""Submit exactly one bounded 720p Fabric quality test, then poll separately.

Credentials stay in .secrets/veed.env. Responses (including expiring media URLs)
stay in ignored artifacts. Never retry POST automatically after an uncertain error.
"""
from pathlib import Path
import json,sys,urllib.request,urllib.error

root=Path(__file__).resolve().parents[2]
work=root/'artifacts/demo-edit/veed-test'
work.mkdir(parents=True,exist_ok=True)
credential=(root/'.secrets/veed.env').read_text(encoding='utf-8-sig')
key=next((line.split('=',1)[1].strip().strip('"').strip("'") for line in credential.splitlines() if line.strip().startswith('VEED_API_KEY=')),'')
if not key:raise SystemExit('VEED key is not configured.')
record=work/'job.json'
headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','User-Agent':'SIKEPO-Presentation/1.0','X-Veed-Store-IO':'0'}
if sys.argv[1:] == ['submit']:
 if record.exists():raise SystemExit('Existing job record found; poll it instead of resubmitting.')
 base='https://raw.githubusercontent.com/dkfadhila/sikepo_bpjs/main/videos/sikepo-demo/'
 body={'image_url':base+'presenter/master-neutral-v1.png','audio_url':base+'narration/veed-test-11s.mp3','resolution':'720p'}
 for url in [body['image_url'],body['audio_url']]:
  with urllib.request.urlopen(url,timeout=30) as r:
   if r.status!=200:raise SystemExit('Input URL is unavailable.')
 # Ledger is written before the paid request, preventing automatic duplicate POST.
 state={'status':'SUBMISSION_STARTED','expectedSeconds':11,'resolution':'720p','rateUSDPerSecond':.15,'estimatedUSD':1.65,'overallUserCapUSD':45,'request':body}
 record.write_text(json.dumps(state,indent=2),encoding='utf8')
 req=urllib.request.Request('https://api.veed.io/v1/fabric-1.0',data=json.dumps(body).encode(),headers=headers,method='POST')
else:
 state=json.loads(record.read_text(encoding='utf8'))
 payload=state.get('response',{});payload=payload.get('data',payload)
 job_id=payload.get('job_id')
 if not job_id:raise SystemExit('No accepted job ID. Resolve the recorded submission before any new paid request.')
 req=urllib.request.Request('https://api.veed.io/v1/fabric-1.0/'+job_id,headers=headers)
try:
 with urllib.request.urlopen(req,timeout=60) as response:data=json.load(response)
 state['response']=data;payload=data.get('data',data);state['status']=payload.get('status','UNKNOWN')
 record.write_text(json.dumps(state,indent=2),encoding='utf8')
 print(json.dumps({k:payload.get(k) for k in ['job_id','status','credits_estimated','credits_charged','error'] if payload.get(k) is not None}))
 if state['status']=='COMPLETED':
  url=payload.get('result',{}).get('video',{}).get('url')
  if url:
   download=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'video/mp4,*/*'})
   with urllib.request.urlopen(download,timeout=120) as media:
    (work/'test-720p.mp4').write_bytes(media.read())
   print('Test video saved locally.')
except urllib.error.HTTPError as e:
 state['status']='HTTP_ERROR';state['httpStatus']=e.code
 state['errorBody']=e.read().decode(errors='replace')
 record.write_text(json.dumps(state,indent=2),encoding='utf8')
 print('VEED request failed with HTTP',e.code,'; no automatic POST retry.')
