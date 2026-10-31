"""Join overlapping Fabric shots into three continuous presenter blocks.

Crossfade video only. The untouched block narration replaces generated clip
audio, so no word repeats, gaps, or double voices are introduced at joins.
"""
from pathlib import Path
import json,subprocess,sys

ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'artifacts/demo-edit/fabric-production'
PLAN=json.loads((ROOT/'videos/sikepo-demo/presenter/render-plan.json').read_text(encoding='utf8'))
OUT=ROOT/'videos/sikepo-demo/presenter/final'
OUT.mkdir(exist_ok=True)

def run(args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-filter_complex_threads','1',*args],check=True)
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)]))
reports=[]
FADE=4/30
for block in ['01-pre-demo','02-demo','03-after-demo']:
 jobs=[j for j in PLAN['jobs'] if j['block']==block]
 if not all((WORK/(j['id']+'.mp4')).exists() and (WORK/(j['id']+'.mp4')).stat().st_size>1000 for j in jobs):
  print(block,'not ready; no partial final exported',flush=True);continue
 normalized=[]
 for index,j in enumerate(jobs):
  dst=WORK/(j['id']+'-normalized-v2.mp4')
  if not dst.exists():
   begin=max(0,j['coreStart']-(FADE/2 if index else 0))
   finish=min(jobs[-1]['coreEnd'],j['coreEnd']+(FADE/2 if index<len(jobs)-1 else 0))
   length=finish-begin
   run(['-ss',str(begin-j['start']),'-i',str(WORK/(j['id']+'.mp4')),'-vf','scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=30,setsar=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.1','-t',str(length),'-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','90000','-y',str(dst)])
  normalized.append(dst)
 master=ROOT/'videos/sikepo-demo/narration'/(block+'.mp3')
 expected=duration(master);final=OUT/(block+'-720p.mp4')
 if not final.exists():
  args=[]
  for video in normalized:args+=['-i',str(video)]
  args+=['-i',str(master)]
  filters=[]
  for i in range(len(normalized)):filters.append(f'[{i}:v]settb=AVTB,setpts=PTS-STARTPTS[v{i}]')
  previous='v0'
  for i in range(1,len(normalized)):
   overlap=FADE
   label=f'join{i}'
   offset=jobs[i]['coreStart']-FADE/2
   filters.append(f'[{previous}][v{i}]xfade=transition=fade:duration={overlap:.8f}:offset={offset:.8f}[{label}]')
   previous=label
  args+=['-filter_complex',';'.join(filters),'-map',f'[{previous}]','-map',f'{len(normalized)}:a:0','-t',str(expected),'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-movflags','+faststart','-y',str(final)]
  run(args)
 actual=duration(final)
 run(['-i',str(final),'-f','null','-'])
 reports.append({'block':block,'file':str(final.relative_to(ROOT)).replace('\\','/'),'expectedSeconds':expected,'actualSeconds':actual,'differenceSeconds':round(actual-expected,5),'width':1280,'height':720,'sourceVideoSegments':len(jobs),'audio':'original continuous narration block','videoJoin':'4-frame dissolve centered at sentence boundary; shortened after visible ghosting in the initial 1-second dissolve'})
 print(block,'finished:',actual,'seconds',flush=True)
(OUT/'verification.json').write_text(json.dumps(reports,indent=2),encoding='utf8')
