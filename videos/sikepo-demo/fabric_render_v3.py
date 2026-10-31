"""Isolated production for the latest portrait set and full 12-slide narration."""
from pathlib import Path
import json,sys,subprocess
import fabric_render as base
ROOT=base.ROOT
base.FOLDER=ROOT/'videos/sikepo-demo/narration-v3'
base.WORK=ROOT/'artifacts/demo-edit/fabric-production-v3'
base.WORK.mkdir(exist_ok=True)
base.PLAN=ROOT/'videos/sikepo-demo/presenter/render-plan-v3.json'
def key(account):
 file=ROOT/'.secrets'/({'third':'veed-third.env','primary':'veed.env','after':'veed-after-demo.env'}[account])
 value=next((x.split('=',1)[1].strip().strip('"').strip("'") for x in file.read_text(encoding='utf-8-sig').splitlines() if x.startswith('VEED_API_KEY=')),'')
 if not value:raise SystemExit('Missing configured credential: '+account)
 return value
base.key=key
def prepare():
 dest=base.FOLDER/'fabric-inputs';dest.mkdir(exist_ok=True)
 jobs=[]
 configs=[('01-pre-demo','master-neutral-v3.png',[0,53.984,106,base.probe(base.FOLDER/'01-pre-demo.mp3')]),('02-demo','demo-mouse-v2.png',[0,41.6666667,base.probe(base.FOLDER/'02-demo.mp3')]),('03-after-demo','after-demo-gesture-v2.png',[0,46,94.864,144,base.probe(base.FOLDER/'03-after-demo.mp3')])]
 for block,image,bounds in configs:
  for i in range(len(bounds)-1):
   account='after' if block=='03-after-demo' and i>0 else 'third'
   start=max(0,bounds[i]-(.5 if i else 0));end=min(bounds[-1],bounds[i+1]+(.5 if i<len(bounds)-2 else 0))
   name=f'v3-{block}-{i+1:02d}';audio=dest/(name+'.mp3')
   subprocess.run(['ffmpeg','-v','error','-ss',str(start),'-i',str(base.FOLDER/(block+'.mp3')),'-t',str(end-start),'-c:a','libmp3lame','-b:a','192k','-y',str(audio)],check=True)
   seconds=base.probe(audio)
   assert seconds<59
   jobs.append({'id':name,'block':block,'account':account,'image':image,'start':start,'end':end,'inputSeconds':seconds,'coreStart':bounds[i],'coreEnd':bounds[i+1],'estimatedUSD':round(seconds*.15,4),'image_url':base.BASE+'presenter/'+image,'audio_url':base.BASE+'narration-v3/fabric-inputs/'+audio.name})
 spends={a:round(sum(j['estimatedUSD'] for j in jobs if j['account']==a),2) for a in ['third','after']}
 assert spends['third']<=50 and spends['after']<=23.68 and sum(spends.values())<=70
 base.write(base.PLAN,{'version':3,'resolution':'720p','rateUSDPerSecond':.15,'estimatedUSD':round(sum(j['estimatedUSD'] for j in jobs),2),'accountEstimatesUSD':spends,'accountGuardUSD':{'third':50,'after':23.68},'sourceAudio':'narration-v3, 433.193333 seconds','layout':'Same first delivery layout: left material panel, right rail and small rounded presenter; demo uses full slide area','jobs':jobs})
 print('Prepared',len(jobs),'jobs',spends,flush=True)
if __name__=='__main__':
 mode=sys.argv[1] if len(sys.argv)>1 else 'poll'
 if mode=='prepare':prepare()
 else:
  plan=json.loads(base.PLAN.read_text())
  if mode=='submit':base.submit(plan)
  elif mode=='poll':base.poll(plan)
  else:raise SystemExit('prepare / submit / poll')
