"""Copy three verified blocks to Videos and make one continuous presenter file."""
from pathlib import Path
import json,subprocess,shutil

root=Path(__file__).resolve().parents[2]
sources=root/'videos/sikepo-demo/presenter/final'
work=root/'artifacts/demo-edit/fabric-production'
destination=Path.home()/'Videos/SIKEPO-Presenter'
destination.mkdir(exist_ok=True)
blocks=['01-pre-demo','02-demo','03-after-demo']
for name in blocks:
 video=sources/(name+'-720p.mp4')
 if not video.exists():raise SystemExit('All three verified blocks must exist first.')
 shutil.copy2(video,destination/video.name)
concat=work/'final-concat.txt'
concat.write_text(''.join("file '"+str(sources/(name+'-720p.mp4')).replace('\\','/')+"'\n" for name in blocks),encoding='utf8')
plan=json.loads((root/'videos/sikepo-demo/narration/production-plan.json').read_text(encoding='utf8'))
length=plan['totalNarrationSeconds']
audio=work/'continuous-narration.m4a'
command=['ffmpeg','-hide_banner','-loglevel','error']
for name in blocks:command+=['-i',str(root/'videos/sikepo-demo/narration'/(name+'.mp3'))]
command+=['-filter_complex',f'[0:a][1:a][2:a]concat=n=3:v=0:a=1,apad,atrim=0:{length:.8f}[a]','-map','[a]','-c:a','aac','-b:a','192k','-y',str(audio)]
subprocess.run(command,check=True)
full=destination/'SIKEPO-presenter-full-720p.mp4'
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(length),'-movflags','+faststart','-y',str(full)],check=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(full),'-f','null','-'],check=True)
print(str(full),flush=True)
