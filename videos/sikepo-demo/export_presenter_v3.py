"""Export the three latest blocks and their continuous presenter master."""
from pathlib import Path
import subprocess,json,shutil
ROOT=Path(__file__).resolve().parents[2]
WORK=ROOT/'artifacts/demo-edit/fabric-production-v3'
SOURCE=ROOT/'videos/sikepo-demo/presenter/final-v3'
DEST=Path.home()/'Videos/SIKEPO-Presenter-v3';DEST.mkdir(exist_ok=True)
names=['01-pre-demo','02-demo','03-after-demo']
for name in names:shutil.copy2(SOURCE/(name+'-720p.mp4'),DEST/(name+'-720p.mp4'))
listing=WORK/'concat-presenter.txt';listing.write_text(''.join("file '"+(SOURCE/(name+'-720p.mp4')).as_posix()+"'\n" for name in names))
audio=ROOT/'videos/sikepo-demo/narration-v3/SIKEPO-narasi-lengkap.mp3'
total=json.loads((ROOT/'videos/sikepo-demo/narration-v3/slide-timing.json').read_text())['totalSeconds']
out=DEST/'SIKEPO-presenter-full-720p.mp4'
subprocess.run(['ffmpeg','-v','error','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(total),'-movflags','+faststart','-y',str(out)],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],check=True)
print(out,flush=True)
