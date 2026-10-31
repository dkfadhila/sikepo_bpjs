"""Bounded Fabric production. Local credentials; durable ledgers; no automatic POST retries."""
from pathlib import Path
import json,sys,subprocess,urllib.request,urllib.error,math,time

ROOT=Path(__file__).resolve().parents[2]
BASE='https://raw.githubusercontent.com/dkfadhila/sikepo_bpjs/main/videos/sikepo-demo/'
FOLDER=ROOT/'videos/sikepo-demo/narration'
WORK=ROOT/'artifacts/demo-edit/fabric-production'
WORK.mkdir(parents=True,exist_ok=True)
PLAN=ROOT/'videos/sikepo-demo/presenter/render-plan.json'
CAPS={'primary':45,'after':50}

def probe(path):
 return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
def key(account):
 file=ROOT/'.secrets'/('veed.env' if account=='primary' else 'veed-after-demo.env')
 value=next((l.split('=',1)[1].strip().strip('"').strip("'") for l in file.read_text(encoding='utf-8-sig').splitlines() if l.strip().startswith('VEED_API_KEY=')),'')
 if not value:raise SystemExit('Credential missing for '+account)
 return value
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8')
def prepare():
 inputs=[('01-pre-demo','primary','master-neutral-v1.png',[0,52.8,105,probe(FOLDER/'01-pre-demo.mp3')]),('02-demo','primary','demo-mouse.png',[0,41.666667,probe(FOLDER/'02-demo.mp3')]),('03-after-demo','after','after-demo-gesture.png',[0,52.3,105.9,155.1,probe(FOLDER/'03-after-demo.mp3')])]
 segment_dir=FOLDER/'fabric-inputs';segment_dir.mkdir(exist_ok=True)
 jobs=[]
 for block,account,image,bounds in inputs:
  for i in range(len(bounds)-1):
   start=max(0,bounds[i]-(.5 if i else 0));end=min(bounds[-1],bounds[i+1]+(.5 if i<len(bounds)-2 else 0))
   name=f'{block}-{i+1:02d}';audio=segment_dir/(name+'.mp3')
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-ss',str(start),'-i',str(FOLDER/(block+'.mp3')),'-t',str(end-start),'-c:a','libmp3lame','-b:a','192k','-y',str(audio)],check=True)
   seconds=probe(audio)
   if seconds>59:raise SystemExit('Segment exceeds safe per-request duration')
   jobs.append({'id':name,'block':block,'account':account,'image':image,'start':start,'end':end,'inputSeconds':seconds,'coreStart':bounds[i],'coreEnd':bounds[i+1],'estimatedUSD':round(seconds*.15,4),'image_url':BASE+'presenter/'+image,'audio_url':BASE+'narration/fabric-inputs/'+audio.name})
 total=sum(j['estimatedUSD'] for j in jobs)+1.65
 if total>70:raise SystemExit('Conservative project guard exceeded')
 for account in CAPS:
  spend=sum(j['estimatedUSD'] for j in jobs if j['account']==account)+(1.65 if account=='primary' else 0)
  if spend>CAPS[account]:raise SystemExit('Account budget exceeded')
 write(PLAN,{'resolution':'720p','rateUSDPerSecond':.15,'initialTestUSD':1.65,'expectedTotalIncludingTestUSD':round(total,2),'accountCapsUSD':CAPS,'conservativeTotalGuardUSD':70,'overlapSeconds':1,'note':'Three continuous audio masters. Video segments overlap by one second and are crossfaded, with original audio remuxed. No duplicated or cut words. Each job is submitted once.','jobs':jobs})
 print('Prepared',len(jobs),'jobs; total estimate including test USD',round(total,2))

def api(account,method,url,body=None):
 headers={'Authorization':'Bearer '+key(account),'Content-Type':'application/json','User-Agent':'SIKEPO-Presentation/1.0','X-Veed-Store-IO':'0'}
 request=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers=headers,method=method)
 with urllib.request.urlopen(request,timeout=60) as response:return json.load(response)

def submit(plan):
 for j in plan['jobs']:
  record=WORK/(j['id']+'.json')
  if record.exists():print(j['id'],'already recorded; not resubmitted',flush=True);continue
  # Confirm both inputs are reachable before writing the no-retry submission marker.
  for url in [j['image_url'],j['audio_url']]:
   with urllib.request.urlopen(url,timeout=30) as r:
    if r.status!=200:raise SystemExit('Input unavailable: '+j['id'])
  state={'id':j['id'],'account':j['account'],'status':'SUBMISSION_STARTED','expectedUSD':j['estimatedUSD']};write(record,state)
  try:
   response=api(j['account'],'POST','https://api.veed.io/v1/fabric-1.0',{'image_url':j['image_url'],'audio_url':j['audio_url'],'resolution':'720p'})
   payload=response.get('data',response);state.update({'response':response,'status':payload.get('status','UNKNOWN'),'job_id':payload.get('job_id')});write(record,state)
   print(j['id'],state['status'],state.get('job_id'),flush=True)
  except Exception as e:
   state['status']='SUBMISSION_UNCERTAIN';state['errorType']=type(e).__name__
   if isinstance(e,urllib.error.HTTPError):state.update({'httpStatus':e.code,'errorBody':e.read().decode(errors='replace')})
   write(record,state);print(j['id'],'submission stopped:',type(e).__name__,flush=True)
   raise SystemExit('Resolve ledger before submitting any further jobs. No paid retries.')

def poll(plan):
 counts={}
 for j in plan['jobs']:
  record=WORK/(j['id']+'.json')
  if not record.exists():counts['NOT_SUBMITTED']=counts.get('NOT_SUBMITTED',0)+1;continue
  state=json.loads(record.read_text(encoding='utf8'));job_id=state.get('job_id')
  if not job_id:print(j['id'],state['status']);continue
  video=WORK/(j['id']+'.mp4')
  if state['status']=='COMPLETED' and video.exists():counts['DOWNLOADED']=counts.get('DOWNLOADED',0)+1;continue
  response=api(j['account'],'GET','https://api.veed.io/v1/fabric-1.0/'+job_id)
  payload=response.get('data',response);state.update({'response':response,'status':payload.get('status','UNKNOWN')});write(record,state)
  if state['status']=='COMPLETED':
   url=payload.get('result',{}).get('video',{}).get('url')
   if url:
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'video/mp4,*/*'})
    with urllib.request.urlopen(req,timeout=120) as media:video.write_bytes(media.read())
    state['downloadedBytes']=video.stat().st_size;write(record,state)
  counts[state['status']]=counts.get(state['status'],0)+1
  print(j['id'],state['status'],'credits',payload.get('credits_charged'),flush=True)
 print(json.dumps(counts),flush=True)

if __name__=='__main__':
 mode=sys.argv[1] if len(sys.argv)>1 else 'poll'
 if mode=='prepare':prepare()
 else:
  plan=json.loads(PLAN.read_text(encoding='utf8'))
  if mode=='submit':submit(plan)
  elif mode=='poll':poll(plan)
  else:raise SystemExit('Use prepare, submit or poll')
