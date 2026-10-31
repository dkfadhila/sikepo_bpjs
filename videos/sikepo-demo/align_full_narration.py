"""Align three spoken blocks to twelve current slides and the existing demo scenes."""
from pathlib import Path
import json,subprocess,shutil,re,html
ROOT=Path(__file__).resolve().parents[2]
F=ROOT/'videos/sikepo-demo/narration-v3'
def seconds(path):return float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(path)]))['format']['duration'])
def anchor(name,phrase):
 a=json.loads((F/(name+'.alignment.json')).read_text(encoding='utf8'))['alignment']
 s=''.join(a['characters']);i=s.find(phrase)
 if i<0:raise ValueError(phrase)
 return a['character_start_times_seconds'][i]
source=F/'02-demo-source.mp3'
if not source.exists():shutil.copy2(F/'02-demo.mp3',source)
starts=[0]+[anchor('02-demo',x) for x in ['Saya masuk','Setelah dikirim','Nah,','Pada bagian','Itulah']]+[seconds(source)]
targets=[0,12,33.6666667,41.6666667,62.6666667,80.6666667,86.6333333]
filters=[];scenes=[]
for i,(a,b,x,y) in enumerate(zip(starts,starts[1:],targets,targets[1:])):
 rate=max(.85,min(1.1,(b-a)/(y-x)))
 filters.append(f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,atempo={rate},apad,atrim=duration={y-x}[a{i}]')
 scenes.append({'scene':i+1,'rawStart':a,'rawEnd':b,'audioStart':x,'audioEnd':y,'tempo':rate,'tailPauseSeconds':max(0,(y-x)-(b-a)/rate)})
filters.append(''.join(f'[a{i}]' for i in range(6))+'concat=n=6:v=0:a=1[out]')
subprocess.run(['ffmpeg','-v','error','-i',str(source),'-filter_complex',';'.join(filters),'-map','[out]','-c:a','libmp3lame','-b:a','192k','-y',str(F/'02-demo.mp3')],check=True)
pre=seconds(F/'01-pre-demo.mp3');demo=seconds(F/'02-demo.mp3');after=seconds(F/'03-after-demo.mp3')
prestarts=[0]+[anchor('01-pre-demo',p) for p in ['Nama lengkapnya','Latar belakangnya','Sekarang kita','Hasil keduanya']]+[pre]
afterstarts=[0]+[anchor('03-after-demo',p) for p in ['Ada dua proses','Untuk large language','Pada pengujian','Sebagai rangkuman','Demikian pengenalan']]+[after]
rows=[]
for i,(a,b) in enumerate(zip(prestarts,prestarts[1:])):rows.append({'slide':i+1,'start':a,'end':b,'block':'01-pre-demo','localStart':a})
rows.append({'slide':6,'start':pre,'end':pre+demo,'block':'02-demo','localStart':0})
for i,(a,b) in enumerate(zip(afterstarts,afterstarts[1:])):rows.append({'slide':i+7,'start':pre+demo+a,'end':pre+demo+b,'block':'03-after-demo','localStart':a})
total=pre+demo+after
report={'status':'Measured audio timing aligned to twelve slides; listener review of intonation remains','totalSeconds':total,'blocks':[{'id':'01-pre-demo','seconds':pre},{'id':'02-demo','seconds':demo},{'id':'03-after-demo','seconds':after}],'slides':rows,'demoScenes':scenes,'videoGenerated':False,'timingSource':'ElevenLabs character-level alignment; demo synchronized per source scene, with pitch-preserving tempo and short pauses'}
(F/'slide-timing.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for x in report['blocks']:subprocess.run(['ffmpeg','-v','error','-i',str(F/(x['id']+'.mp3')),'-f','null','-'],check=True)
plan=json.loads((F/'production.json').read_text());plan.update(status='Three full audio blocks generated, demo scene-aligned, full decode passed',voice='Zephlyn - Calm, Neutral and Measured',model='Eleven v4',totalSeconds=total,blocks=report['blocks'],videoAllowed=False);plan.pop('quotaEvidence',None);(F/'production.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'totalSeconds':total,'blocks':report['blocks'],'demoScenes':scenes},indent=2),flush=True)
