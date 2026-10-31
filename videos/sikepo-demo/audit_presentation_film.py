"""Audit the delivered MP4, add seekable chapters, and save visual/audio evidence."""
from pathlib import Path
import json,subprocess,hashlib
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'videos/sikepo-demo/presentation-film'
DEST=Path.home()/'Videos/SIKEPO-Presenter'
VIDEO=DEST/'SIKEPO-presentasi-lengkap-720p.mp4'
WORK=ROOT/'artifacts/demo-edit/presentation-film-audit'
WORK.mkdir(exist_ok=True)
timing=json.loads((ROOT/'videos/sikepo-demo/narration/timing.json').read_text())
def run(args):return subprocess.run(args,check=True,capture_output=True)
def probe(path):return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]).stdout)
info=probe(VIDEO)
video=next(s for s in info['streams'] if s['codec_type']=='video')
audio=next(s for s in info['streams'] if s['codec_type']=='audio')
assert (video['width'],video['height'])==(1280,720)
assert abs(float(info['format']['duration'])-timing['totalSeconds'])<.15
run(['ffmpeg','-v','error','-i',str(VIDEO),'-f','null','-'])

# Check rendered narration against its three continuous source blocks.
def pcm(path,extra=None):
 args=['ffmpeg','-v','error','-i',str(path)]
 args+=extra or []
 args+=['-vn','-ac','1','-ar','16000','-f','f32le','-']
 return np.frombuffer(run(args).stdout,dtype=np.float32)
actual=pcm(VIDEO)
reference=np.concatenate([pcm(ROOT/'videos/sikepo-demo/narration'/f'{block["id"]}.mp3') for block in timing['blocks']])
windows=[]
for second in [5,24,60,100,150,160,195,230,248,280,320,360,400]:
 a=actual[second*16000:(second+4)*16000]
 best=(-1,None)
 for offset in range(-1600,1601,16):
  start=second*16000+offset
  b=reference[start:start+len(a)]
  if len(b)!=len(a):continue
  corr=float(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-20))
  if corr>best[0]:best=(corr,offset/16000)
 windows.append({'seconds':second,'correlation':round(best[0],5),'offsetSeconds':best[1]})
assert min(x['correlation'] for x in windows)>.80,windows

titles=['Perkenalan','Ide dan tujuan','Latar belakang','Pipeline A1 A2 A3','Demo aplikasi','Fitur aplikasi','ML dan NALAR','Hasil pengujian','Studi kasus','Penutup']
metadata=[';FFMETADATA1','title=SIKEPO — Presentasi lengkap','artist=Decka Fadhila Tirta']
for entry,title in zip(timing['slides'],titles):
 metadata+=['[CHAPTER]','TIMEBASE=1/1000',f'START={round(entry["startSeconds"]*1000)}',f'END={round(entry["endSeconds"]*1000)}',f'title={entry["page"]:02} · {title}']
meta=WORK/'chapters.txt';meta.write_text('\n'.join(metadata)+'\n',encoding='utf8')
chaptered=DEST/'SIKEPO-presentasi-lengkap-720p-chapters.mp4'
run(['ffmpeg','-v','error','-i',str(VIDEO),'-i',str(meta),'-map','0','-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart','-y',str(chaptered)])
run(['ffmpeg','-v','error','-i',str(chaptered),'-f','null','-'])
chaptered.replace(VIDEO)

thumbs=[]
for entry in timing['slides']:
 sec=(entry['startSeconds']+entry['endSeconds'])/2
 frame=WORK/f'slide-{entry["page"]:02}.jpg'
 run(['ffmpeg','-v','error','-ss',str(sec),'-i',str(VIDEO),'-frames:v','1','-y',str(frame)])
 im=Image.open(frame).resize((640,360))
 tile=Image.new('RGB',(640,390),'#141b16');tile.paste(im,(0,30))
 ImageDraw.Draw(tile).text((12,9),f'{entry["page"]:02} | {sec:.2f}s | {titles[entry["page"]-1]}',fill='white')
 thumbs.append(tile)
sheet=Image.new('RGB',(1280,1950),'#141b16')
for n,im in enumerate(thumbs):sheet.paste(im,((n%2)*640,(n//2)*390))
sheet.save(DEST/'SIKEPO-presentasi-preview.jpg',quality=90)
report={'output':str(VIDEO),'width':1280,'height':720,'fps':video['r_frame_rate'],'durationSeconds':float(info['format']['duration']),'audioCodec':audio['codec_name'],'fullDecode':'passed','audioSourceCorrelation':windows,'chapters':10,'sha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'bytes':VIDEO.stat().st_size}
(PROJECT/'delivery-audit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2),flush=True)
