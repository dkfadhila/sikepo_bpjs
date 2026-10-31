"""Generate full twelve-slide narration using a locally stored ElevenLabs key."""
from pathlib import Path
import urllib.request,urllib.error,json,base64,hashlib,subprocess

ROOT=Path(__file__).resolve().parents[2]
FOLDER=ROOT/'videos/sikepo-demo/narration-v3'
VOICE='3mAVBNEqop5UbHtD8oxQ'
key=(ROOT/'.secrets/elevenlabs.env').read_text(encoding='utf-8-sig').strip().split('=',1)[1]
for block in ['01-pre-demo','02-demo','03-after-demo']:
 audio=FOLDER/(block+'.mp3');ledger=FOLDER/(block+'.generation.json')
 if audio.exists():print(block,'already saved; no paid retry',flush=True);continue
 if ledger.exists():raise SystemExit('Existing request ledger requires review before another paid request: '+block)
 text=(FOLDER/(block+'.txt')).read_text(encoding='utf8')
 payload={'text':text,'model_id':'eleven_v4','language_code':'id','voice_settings':{'stability':.35,'similarity_boost':.75,'speed':.94},'seed':3102026}
 receipt={'block':block,'voice':VOICE,'model':'eleven_v4','characters':len(text),'textSha256':hashlib.sha256(text.encode()).hexdigest(),'status':'submitted','settings':payload['voice_settings']}
 ledger.write_text(json.dumps(receipt,indent=2),encoding='utf8')
 request=urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192',data=json.dumps(payload).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
 try:
  with urllib.request.urlopen(request,timeout=300) as response:
   result=json.load(response)
   receipt['requestId']=response.headers.get('request-id');receipt['characterCost']=response.headers.get('character-cost')
  audio.write_bytes(base64.b64decode(result.pop('audio_base64')))
  (FOLDER/(block+'.alignment.json')).write_text(json.dumps(result,ensure_ascii=False),encoding='utf8')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(audio)]))
  subprocess.run(['ffmpeg','-v','error','-i',str(audio),'-f','null','-'],check=True)
  receipt.update(status='succeeded',durationSeconds=float(probe['format']['duration']),decoder='passed')
  ledger.write_text(json.dumps(receipt,indent=2),encoding='utf8')
  print(block,receipt['durationSeconds'],'seconds',flush=True)
 except urllib.error.HTTPError as e:
  receipt.update(status='failed',httpStatus=e.code,error=e.read().decode()[:1000]);ledger.write_text(json.dumps(receipt,indent=2),encoding='utf8');raise SystemExit('API rejected '+block+': '+receipt['error'])
